// Checks reading validation and monthly report date rules.
const test = require('node:test');
const assert = require('node:assert/strict');
const { TIME_SLOTS, isValidDate, validateHealthRecord } = require('../src/validators/healthRecordValidator');
const { previousMonthRange } = require('../src/services/reportService');
const { todayInAppTimezone } = require('../src/utils/date');

const valid = { glucose_value: 40, reading_date: '2026-10-15', time_slot: 'Morning' };

test('accepts each permitted time slot and both value limits', () => {
  for (const time_slot of TIME_SLOTS) assert.deepEqual(validateHealthRecord({ ...valid, time_slot }, false, '2026-10-15'), []);
  assert.deepEqual(validateHealthRecord({ ...valid, glucose_value: 600 }, false, '2026-10-15'), []);
});
test('returns the required missing and invalid-value messages', () => {
  assert.ok(validateHealthRecord({ ...valid, glucose_value: '' }, false, '2026-10-15').includes('Please enter a glucose value.'));
  for (const glucose_value of [39, 601, 40.5, '40.5']) {
    assert.ok(validateHealthRecord({ ...valid, glucose_value }, false, '2026-10-15').includes('Value must be between 40 and 600 mg/dl.'));
  }
});
test('rejects invalid dates, future dates, and invalid slots', () => {
  assert.equal(isValidDate('2025-02-30'), false);
  assert.ok(validateHealthRecord({ ...valid, reading_date: '2025-02-30' }, false, '2026-10-15').some((error) => error.includes('valid reading date')));
  assert.ok(validateHealthRecord({ ...valid, reading_date: '2026-10-16' }, false, '2026-10-15').includes('Date cannot be in the future.'));
  assert.ok(validateHealthRecord({ ...valid, time_slot: 'Random' }, false, '2026-10-15').some((error) => error.includes('valid time slot')));
});
test('accepts partial updates while rejecting empty updates', () => {
  assert.deepEqual(validateHealthRecord({ glucose_value: 100 }, true, '2026-10-15'), []);
  assert.ok(validateHealthRecord({}, true, '2026-10-15').some((error) => error.includes('at least one field')));
});
test('uses the Asia/Kolkata date at the UTC boundary and still rejects future readings', () => {
  const localToday = todayInAppTimezone(new Date('2026-11-11T19:34:00.000Z'));
  assert.equal(localToday, '2026-11-12');
  assert.deepEqual(validateHealthRecord({ ...valid, reading_date: localToday }, false, localToday), []);
  assert.ok(validateHealthRecord({ ...valid, reading_date: '2026-11-13' }, false, localToday).includes('Date cannot be in the future.'));
});
test('previous-month report accepts valid future selectors and uses complete calendar months', () => {
  assert.deepEqual(previousMonthRange('2026-10-15'), { from: '2026-09-01', to: '2026-09-30' });
  assert.deepEqual(previousMonthRange('2027-01-15'), { from: '2026-12-01', to: '2026-12-31' });
  assert.deepEqual(previousMonthRange('2026-03-31'), { from: '2026-02-01', to: '2026-02-28' });
});