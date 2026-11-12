// Shown when the selected report range has no glucose readings.
import './EmptyState.css';

export default function EmptyState() {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <svg
          viewBox="0 0 48 48"
          role="presentation"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 8h16l7 7v25H13z" />
          <path d="M29 8v8h7M19 24h11M19 30h11" />
          <circle cx="14" cy="36" r="8" />
          <path d="M14 32v8M10 36h8" />
        </svg>
      </span>

      <strong>No readings yet for this period.</strong>
      <p>Add a glucose reading to see it in your summary.</p>
    </div>
  );
}
