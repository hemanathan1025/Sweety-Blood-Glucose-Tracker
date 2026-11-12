import { formatDate } from '../date.js';
import './ReportCard.css';

export default function ReportCard({ report }) {
  // Keep the labels and values together so the cards stay consistent.
  const stats = [
    {
      label: 'Highest',
      value: report.highest == null
        ? '-'
        : report.highest + ' mg/dl',
      className: 'stat-high',
    },
    {
      label: 'Lowest',
      value: report.lowest == null
        ? '-'
        : report.lowest + ' mg/dl',
      className: 'stat-low',
    },
    {
      label: 'Average',
      value: report.average == null
        ? '-'
        : Number(report.average).toFixed(1) + ' mg/dl',
      className: 'stat-average',
    },
    {
      label: 'Count',
      value: String(report.total_readings),
      className: 'stat-count',
    },
  ];

  return (
    <section className="report-card" aria-label="Report summary">
      <div className="report-date-range">
        <span className="report-calendar-icon" aria-hidden="true">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="4" width="14" height="13" rx="2" />
            <path d="M6.5 2.5v4M13.5 2.5v4M3.5 8h13" />
          </svg>
        </span>
        <span>
          {formatDate(report.from)} - {formatDate(report.to)}
        </span>
      </div>

      <div className="report-stats">
        {stats.map((stat) => (
          <article
            className={'report-stat ' + stat.className}
            key={stat.label}
          >
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
