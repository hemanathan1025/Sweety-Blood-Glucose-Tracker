import { useEffect, useState } from 'react';
import { TIME_SLOTS, validateReading } from '../validation.js';
import { today } from '../date.js';
import './ReadingFormModal.css';

export default function ReadingFormModal({
  open,
  reading,
  initialDate,
  initialSlot,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState({
    reading_date: today(),
    time_slot: TIME_SLOTS[0],
    glucose_value: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    // Reuse the selected reading's values when editing.
    setErrors({});
    setForm({
      reading_date: reading
        ? String(reading.reading_date).slice(0, 10)
        : initialDate || today(),
      time_slot: reading
        ? reading.time_slot
        : initialSlot || TIME_SLOTS[0],
      glucose_value: reading
        ? String(reading.glucose_value)
        : '',
    });
  }, [open, reading, initialDate, initialSlot]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    // Let keyboard users close the dialog with Escape.
    function closeWithEscape(event) {
      if (event.key === 'Escape' && !saving) {
        onClose();
      }
    }

    window.addEventListener('keydown', closeWithEscape);
    return () => {
      window.removeEventListener('keydown', closeWithEscape);
    };
  }, [open, saving, onClose]);

  if (!open) {
    return null;
  }

  function change(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();

    // Run the same client-side rules before sending a request.
    const validationErrors = validateReading(form, today());
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);

    try {
      await onSave({
        ...form,
        glucose_value: Number(form.glucose_value),
      });
    } catch (error) {
      setErrors({ api: error.message });
    } finally {
      setSaving(false);
    }
  }

  function closeFromBackdrop(event) {
    const clickedBackdrop = event.target === event.currentTarget;

    if (clickedBackdrop && !saving) {
      onClose();
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={closeFromBackdrop}
    >
      <section
        className="reading-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reading-modal-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">GLUCOSE READING</span>
            <h2 id="reading-modal-title">
              {reading ? 'Edit reading' : 'Add reading'}
            </h2>
          </div>

          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close dialog"
          >
            X
          </button>
        </div>

        <form className="form-stack" onSubmit={submit} noValidate>
          <label htmlFor="reading-date">Date</label>
          <input
            id="reading-date"
            name="reading_date"
            type="date"
            value={form.reading_date}
            max={today()}
            onChange={change}
            required
          />
          {errors.reading_date && (
            <span className="field-error">{errors.reading_date}</span>
          )}

          <label htmlFor="reading-slot">Time slot</label>
          <select
            id="reading-slot"
            name="time_slot"
            value={form.time_slot}
            onChange={change}
            required
          >
            {TIME_SLOTS.map((slot) => (
              <option value={slot} key={slot}>
                {slot}
              </option>
            ))}
          </select>
          {errors.time_slot && (
            <span className="field-error">{errors.time_slot}</span>
          )}

          <label htmlFor="glucose-value">
            Glucose value <span>(mg/dl)</span>
          </label>
          <input
            id="glucose-value"
            name="glucose_value"
            type="number"
            inputMode="numeric"
            min="40"
            max="600"
            step="1"
            value={form.glucose_value}
            onChange={change}
            placeholder="For example, 105"
          />
          {errors.glucose_value && (
            <span className="field-error">
              {errors.glucose_value}
            </span>
          )}

          {errors.api && (
            <div className="form-api-error" role="alert">
              {errors.api}
            </div>
          )}

          <div className="modal-actions">
            <button
              className="button button-primary"
              type="submit"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span
                    className="spinner spinner-small"
                    aria-hidden="true"
                  />
                  Saving
                </>
              ) : reading ? (
                'Save changes'
              ) : (
                'Save reading'
              )}
            </button>

            <button
              className="button button-secondary"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
