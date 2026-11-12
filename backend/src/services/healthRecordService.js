// Validates readings and reads or changes records in PostgreSQL.
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const { TIME_SLOTS, validateHealthRecord } = require('../validators/healthRecordValidator');

const SLOT_HOUR = {
  Morning: '06:00:00',
  'After breakfast': '09:00:00',
  'After lunch': '13:00:00',
  'After dinner': '19:00:00',
};
const RECORD_FIELDS = `id, user_id, reading_date, time_slot,
  value::integer AS glucose_value, unit, source, notes, created_at, measured_at`;

function validate(body, partial = false) {
  const errors = validateHealthRecord(body, partial);
  if (errors.length) throw new AppError(errors.join(' '), 400, 'VALIDATION_ERROR');
}

function validId(id) {
  if (!/^\d+$/.test(String(id)) || Number(id) < 1) {
    throw new AppError('Reading id must be a positive integer.', 400, 'VALIDATION_ERROR');
  }
  return String(id);
}

function duplicateError(slot) {
  return new AppError(`You already have a ${slot} reading for this date.`, 409, 'DUPLICATE_READING');
}

function translateDatabaseError(error, slot) {
  if (error.code === '23505' && error.constraint === 'unique_user_daily_slot') throw duplicateError(slot);
  if (error.code === '23514') throw new AppError('Value must be between 40 and 600 mg/dl.', 400, 'INVALID_GLUCOSE_VALUE');
  throw error;
}

// Lock the user row so simultaneous writes obey the daily limit.
async function beginUserTransaction(userId) {
  const client = await pool.connect();
  await client.query('BEGIN');
  const user = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
  if (!user.rowCount) {
    await client.query('ROLLBACK');
    client.release();
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }
  return client;
}

// Validate the reading and enforce the daily limit in one transaction.
async function create(userId, input) {
  validate(input);
  const value = Number(input.glucose_value ?? input.value);
  let client;
  try {
    client = await beginUserTransaction(userId);
    const count = await client.query(
      'SELECT COUNT(*)::int AS total FROM health_records WHERE user_id = $1 AND reading_date = $2 AND metric_type = $3',
      [userId, input.reading_date, 'glucose'],
    );
    const duplicate = await client.query(
      'SELECT 1 FROM health_records WHERE user_id = $1 AND reading_date = $2 AND time_slot = $3 AND metric_type = $4',
      [userId, input.reading_date, input.time_slot, 'glucose'],
    );
    if (duplicate.rowCount && count.rows[0].total >= 4) {
      throw new AppError('You can add only 4 readings per day.', 400, 'DAILY_READING_LIMIT');
    }
    if (duplicate.rowCount) throw duplicateError(input.time_slot);
    if (count.rows[0].total >= 4) {
      throw new AppError('You can add only 4 readings per day.', 400, 'DAILY_READING_LIMIT');
    }

    const measuredAt = new Date(`${input.reading_date}T${SLOT_HOUR[input.time_slot]}Z`);
    const result = await client.query(
      `INSERT INTO health_records
        (user_id, metric_type, value, unit, measured_at, source, reading_date, time_slot)
       VALUES ($1, 'glucose', $2, 'mg/dl', $3, 'manual', $4, $5)
       RETURNING ${RECORD_FIELDS}`,
      [userId, value, measuredAt, input.reading_date, input.time_slot],
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    translateDatabaseError(error, input.time_slot);
  } finally {
    client?.release();
  }
}

// Every list query is scoped to the signed-in user ID.
async function list(userId, query = {}) {
  const where = ['user_id = $1', "metric_type = 'glucose'"];
  const values = [userId];
  for (const [key, operator] of [['date', '='], ['from', '>='], ['to', '<=']]) {
    if (!query[key]) continue;
    if (!validateHealthRecord({ reading_date: query[key] }, true).every((message) => message !== 'Please enter a valid reading date.' && message !== 'Date cannot be in the future.')) {
      throw new AppError('Date filters must be valid and cannot be in the future.', 400, 'VALIDATION_ERROR');
    }
    values.push(query[key]);
    where.push(`reading_date ${operator} $${values.length}`);
  }
  if (query.from && query.to && query.from > query.to) {
    throw new AppError('from must not be after to.', 400, 'VALIDATION_ERROR');
  }
  function positiveInteger(value, name, fallback, maximum = Number.MAX_SAFE_INTEGER) {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
      throw new AppError(`${name} must be a positive integer.`, 400, 'VALIDATION_ERROR');
    }
    return Math.min(Number(value), maximum);
  }
  const page = positiveInteger(query.page, 'page', 1);
  const limit = positiveInteger(query.limit, 'limit', 20, 100);
  if (!Number.isSafeInteger((page - 1) * limit)) {
    throw new AppError('page is too large.', 400, 'VALIDATION_ERROR');
  }
  const conditions = where.join(' AND ');
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM health_records WHERE ${conditions}`, values);
  values.push(limit, (page - 1) * limit);
  const result = await pool.query(
    `SELECT ${RECORD_FIELDS} FROM health_records WHERE ${conditions}
     ORDER BY reading_date DESC, measured_at DESC, id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  const totalReadings = count.rows[0].total;
  const totalPages = Math.ceil(totalReadings / limit);
  return {
    readings: result.rows,
    currentPage: page,
    limit,
    totalReadings,
    totalPages,
    // Retain the original names for existing API consumers and reports.
    items: result.rows,
    page,
    total: totalReadings,
  };
}

async function getById(userId, id) {
  const result = await pool.query(
    `SELECT ${RECORD_FIELDS} FROM health_records
     WHERE id = $1 AND user_id = $2 AND metric_type = 'glucose'`,
    [validId(id), userId],
  );
  if (!result.rowCount) throw new AppError('Reading not found.', 404, 'READING_NOT_FOUND');
  return result.rows[0];
}

// Check ownership and slot conflicts before saving changes.
async function update(userId, id, input) {
  validId(id);
  validate(input, true);
  let client;
  try {
    client = await beginUserTransaction(userId);
    const current = await client.query(
      `SELECT ${RECORD_FIELDS} FROM health_records
       WHERE id = $1 AND user_id = $2 AND metric_type = 'glucose' FOR UPDATE`,
      [id, userId],
    );
    if (!current.rowCount) throw new AppError('Reading not found.', 404, 'READING_NOT_FOUND');
    const reading = { ...current.rows[0], ...input };
    reading.glucose_value = Number(input.glucose_value ?? input.value ?? current.rows[0].glucose_value);
    validate(reading);

    const duplicate = await client.query(
      `SELECT 1 FROM health_records
       WHERE user_id = $1 AND reading_date = $2 AND time_slot = $3 AND metric_type = 'glucose' AND id <> $4`,
      [userId, reading.reading_date, reading.time_slot, id],
    );
    if (duplicate.rowCount) throw duplicateError(reading.time_slot);
    const count = await client.query(
      `SELECT COUNT(*)::int AS total FROM health_records
       WHERE user_id = $1 AND reading_date = $2 AND metric_type = 'glucose' AND id <> $3`,
      [userId, reading.reading_date, id],
    );
    if (count.rows[0].total >= 4) {
      throw new AppError('You can add only 4 readings per day.', 400, 'DAILY_READING_LIMIT');
    }

    const measuredAt = new Date(`${reading.reading_date}T${SLOT_HOUR[reading.time_slot]}Z`);
    const result = await client.query(
      `UPDATE health_records SET value = $1, reading_date = $2, time_slot = $3,
        measured_at = $4
       WHERE id = $5 AND user_id = $6 AND metric_type = 'glucose'
       RETURNING ${RECORD_FIELDS}`,
      [reading.glucose_value, reading.reading_date, reading.time_slot, measuredAt, id, userId],
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    translateDatabaseError(error, input.time_slot);
  } finally {
    client?.release();
  }
}

// The user ID prevents deleting readings owned by others.
async function remove(userId, id) {
  const result = await pool.query(
    `DELETE FROM health_records WHERE id = $1 AND user_id = $2 AND metric_type = 'glucose' RETURNING id`,
    [validId(id), userId],
  );
  if (!result.rowCount) throw new AppError('Reading not found.', 404, 'READING_NOT_FOUND');
  return { id: result.rows[0].id };
}

module.exports = { create, list, getById, update, remove, duplicateError };
