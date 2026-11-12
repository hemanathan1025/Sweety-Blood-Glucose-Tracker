// Shared client-side rules for glucose reading forms.
import { today } from './date.js';

export const TIME_SLOTS = [
  'Morning',
  'After breakfast',
  'After lunch',
  'After dinner',
];

export function validateReading(
  { reading_date, time_slot, glucose_value },
  currentDate = today(),
) {
  const errors = {};
  const valueIsMissing =
    glucose_value === '' ||
    glucose_value === undefined ||
    glucose_value === null;
  const valueIsInvalid =
    !Number.isInteger(Number(glucose_value)) ||
    Number(glucose_value) < 40 ||
    Number(glucose_value) > 600;

  if (valueIsMissing) {
    errors.glucose_value = 'Please enter a glucose value.';
  } else if (valueIsInvalid) {
    errors.glucose_value =
      'Value must be between 40 and 600 mg/dl.';
  }

  if (!isValidDate(reading_date)) {
    errors.reading_date = 'Please enter a valid reading date.';
  } else if (reading_date > currentDate) {
    errors.reading_date = 'Date cannot be in the future.';
  }

  if (!TIME_SLOTS.includes(time_slot)) {
    errors.time_slot = 'Please select a valid time slot.';
  }

  return errors;
}

function isValidDate(value) {
  const hasDateFormat =
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value);

  if (!hasDateFormat) {
    return false;
  }

  const parsedDate = new Date(value + 'T00:00:00.000Z');
  const parsedValueIsValid = !Number.isNaN(parsedDate.valueOf());

  return (
    parsedValueIsValid &&
    parsedDate.toISOString().slice(0, 10) === value
  );
}
