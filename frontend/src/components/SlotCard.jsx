import './SlotCard.css';

// The badge color follows the tracker ranges from the glucose UI.
function getBadgeClass(value) {
  if (value < 70) return 'badge-low';
  if (value > 180) return 'badge-veryhigh';
  if (value <= 140) return 'badge-normal';
  return 'badge-high';
}

export default function SlotCard({
  slot,
  reading,
  onAdd,
  onEdit,
  onDelete,
}) {
  return (
    <article className="slot-card">
      <div className="slot-card-top">
        <div>
          <h2>{slot.name}</h2>
          <p>{slot.helper}</p>
        </div>
        <span className="slot-dot" aria-hidden="true" />
      </div>

      {reading ? (
        <>
          <div className="slot-reading">
            <span
              className={
                'glucose-badge ' +
                getBadgeClass(Number(reading.glucose_value))
              }
            >
              {reading.glucose_value}
            </span>
            <span className="slot-unit">mg/dl</span>
          </div>

          <div className="slot-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => onEdit(reading)}
            >
              Edit
            </button>
            <button
              className="button button-danger-quiet"
              type="button"
              onClick={() => onDelete(reading)}
            >
              Delete
            </button>
          </div>
        </>
      ) : (
        <div className="slot-empty">
          <span className="slot-empty-mark" aria-hidden="true">
            +
          </span>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => onAdd(slot.name)}
          >
            Add reading
          </button>
        </div>
      )}
    </article>
  );
}
