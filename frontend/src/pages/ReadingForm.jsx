// Legacy standalone form retained for older pages.
import { useEffect, useState } from 'react';
import { TIME_SLOTS, validateReading } from '../validation.js';
import { today } from '../api.js';

export default function ReadingForm({
  reading,
  onSave,
  onCancel,
}) {
  const [values, setValues] = useState({
    reading_date: today(),
    time_slot: TIME_SLOTS[0],
    glucose_value: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!reading) {
      return;
    }

    setValues({
      reading_date: reading.reading_date.slice(0, 10),
      time_slot: reading.time_slot,
      glucose_value: reading.glucose_value,
    });
  }, [reading]);

  function change(event) {
    const { name, value } = event.target;
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();

    const validationErrors = validateReading(values, today());
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setBusy(true);

    try {
      await onSave({
        ...values,
        glucose_value: Number(values.glucose_value),
      });
    } catch (error) {
      setErrors({ request: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label>
        Reading date
        <input
          name="reading_date"
          type="date"
          value={values.reading_date}
          onChange={change}
          max={today()}
          required
        />
        {errors.reading_date && (
          <small>{errors.reading_date}</small>
        )}
      </label>

      <label>
        Time slot
        <select
          name="time_slot"
          value={values.time_slot}
          onChange={change}
        >
          {TIME_SLOTS.map((slot) => (
            <option key={slot}>{slot}</option>
          ))}
        </select>
        {errors.time_slot && (
          <small>{errors.time_slot}</small>
        )}
      </label>

      <label>
        Glucose value (mg/dl)
        <input
          name="glucose_value"
          type="number"
          min="40"
          max="600"
          step="1"
          value={values.glucose_value}
          onChange={change}
          placeholder="For example, 105"
          required
        />
        {errors.glucose_value && (
          <small>{errors.glucose_value}</small>
        )}
      </label>

      {errors.request && (
        <div className="alert error" role="alert">
          {errors.request}
        </div>
      )}

      <div className="button-row">
        <button className="button primary" disabled={busy}>
          {busy
            ? 'Saving...'
            : reading
              ? 'Save changes'
              : 'Save reading'}
        </button>

        {onCancel && (
          <button
            className="button secondary"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
