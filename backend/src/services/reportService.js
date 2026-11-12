// Builds date ranges and glucose summaries for each user.
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const { isValidDate } = require('../validators/healthRecordValidator');
const { todayInAppTimezone } = require('../utils/date');

// Daily and month-to-date reports do not accept future dates.
function selectedDate(value) {
  const date = value || todayInAppTimezone();
  if (!isValidDate(date)) throw new AppError('Date must use valid YYYY-MM-DD format.', 400, 'VALIDATION_ERROR');
  if (date > todayInAppTimezone()) throw new AppError('Date cannot be in the future.', 400, 'VALIDATION_ERROR');
  return date;
}

// Return the full calendar month before the selector date.
function previousMonthRange(value) {
  const date = value || todayInAppTimezone();
  if (!isValidDate(date)) throw new AppError('Date must use valid YYYY-MM-DD format.', 400, 'VALIDATION_ERROR');
  const selected = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 0));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

// Calculate totals for one user and one date range.
async function summarize(userId, from, to) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS total_readings, MAX(value) AS highest,
            MIN(value) AS lowest, ROUND(AVG(value), 1) AS average
     FROM health_records
     WHERE user_id = $1 AND metric_type = 'glucose' AND reading_date BETWEEN $2 AND $3`,
    [userId, from, to],
  );
  const row = result.rows[0];
  return {
    from,
    to,
    total_readings: row.total_readings,
    highest: row.highest === null ? null : Number(row.highest),
    lowest: row.lowest === null ? null : Number(row.lowest),
    average: row.average === null ? null : Number(row.average),
  };
}

async function daily(userId, value) {
  const date = selectedDate(value);
  const summary = await summarize(userId, date, date);
  const readings = await pool.query(
    `SELECT id, reading_date, time_slot, value::integer AS glucose_value, unit, measured_at
     FROM health_records
     WHERE user_id = $1 AND metric_type = 'glucose' AND reading_date = $2
     ORDER BY CASE time_slot WHEN 'Morning' THEN 1 WHEN 'After breakfast' THEN 2
       WHEN 'After lunch' THEN 3 WHEN 'After dinner' THEN 4 ELSE 5 END`,
    [userId, date],
  );
  return { ...summary, readings: readings.rows };
}

async function monthToDate(userId, value) {
  const to = selectedDate(value);
  const date = new Date(`${to}T00:00:00.000Z`);
  const from = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10);
  return summarize(userId, from, to);
}

async function monthly(userId, value) {
  const range = previousMonthRange(value);
  return summarize(userId, range.from, range.to);
}

module.exports = { daily, monthToDate, monthly, previousMonthRange, summarize };