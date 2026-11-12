// These tests cover value limits and the Asia/Kolkata date boundary.
import assert from 'node:assert/strict';
import test from 'node:test';
import { today } from './date.js';
import { TIME_SLOTS, validateReading } from './validation.js';

const validReading = {
  reading_date: '2026-11-10',
  time_slot: 'Morning',
  glucose_value: 40,
};

test('accepts valid values and each supported time slot', () => {
  for (const timeSlot of TIME_SLOTS) {
    const reading = {
      ...validReading,
      time_slot: timeSlot,
    };

    assert.deepEqual(
      validateReading(reading, '2026-11-10'),
      {},
    );
  }

  assert.deepEqual(
    validateReading(
      { ...validReading, glucose_value: 600 },
      '2026-11-10',
    ),
    {},
  );
});

test('uses the Asia/Kolkata date at the UTC day boundary', () => {
  const localDate = today(
    new Date('2026-11-11T19:34:00.000Z'),
  );

  assert.equal(localDate, '2026-11-12');

  const validToday = validateReading(
    {
      ...validReading,
      reading_date: localDate,
      glucose_value: 120,
    },
    localDate,
  );
  assert.deepEqual(validToday, {});

  const tomorrow = validateReading(
    {
      ...validReading,
      reading_date: '2026-11-13',
      glucose_value: 120,
    },
    localDate,
  );
  assert.equal(
    tomorrow.reading_date,
    'Date cannot be in the future.',
  );
});

test('returns the required value and date validation messages', () => {
  const missingValue = validateReading(
    { ...validReading, glucose_value: '' },
    '2026-11-10',
  );
  assert.equal(
    missingValue.glucose_value,
    'Please enter a glucose value.',
  );

  for (const glucoseValue of [39, 601, 50.5]) {
    const invalidValue = validateReading(
      { ...validReading, glucose_value: glucoseValue },
      '2026-11-10',
    );

    assert.equal(
      invalidValue.glucose_value,
      'Value must be between 40 and 600 mg/dl.',
    );
  }

  const futureDate = validateReading(
    { ...validReading, reading_date: '2026-11-11' },
    '2026-11-10',
  );
  assert.equal(
    futureDate.reading_date,
    'Date cannot be in the future.',
  );
});
