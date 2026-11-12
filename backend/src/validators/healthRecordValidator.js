// Contains shared rules for glucose values, dates, and slots.
const { todayInAppTimezone } = require('../utils/date');

const TIME_SLOTS = Object.freeze([
  'Morning',
  'After breakfast',
  'After lunch',
  'After dinner',
]);

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

// Partial updates validate only the fields that were sent.
function validateHealthRecord(body = {}, partial = false, today = todayInAppTimezone()) {
  const errors = [];
  const hasValue = Object.hasOwn(body, 'glucose_value') || Object.hasOwn(body, 'value');
  const value = body.glucose_value ?? body.value;

  if (!partial || hasValue) {
    if (value === '' || value === undefined || value === null) errors.push('Please enter a glucose value.');
    else if (!Number.isInteger(Number(value)) || Number(value) < 40 || Number(value) > 600) errors.push('Value must be between 40 and 600 mg/dl.');
  }

  if (!partial || Object.hasOwn(body, 'reading_date')) {
    if (!isValidDate(body.reading_date)) errors.push('Please enter a valid reading date.');
    else if (body.reading_date > today) errors.push('Date cannot be in the future.');
  }

  if ((!partial || Object.hasOwn(body, 'time_slot')) && !TIME_SLOTS.includes(body.time_slot)) errors.push('Please select a valid time slot.');
  if (partial && !hasValue && !Object.hasOwn(body, 'reading_date') && !Object.hasOwn(body, 'time_slot')) errors.push('Provide at least one field to update.');
  return errors;
}

module.exports = { TIME_SLOTS, isValidDate, validateHealthRecord };