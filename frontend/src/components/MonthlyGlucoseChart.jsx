import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { APP_TIME_ZONE, formatDate } from '../date.js';
import './MonthlyGlucoseChart.css';

const SLOT_ORDER = {
  Morning: 0,
  'After breakfast': 1,
  'After lunch': 2,
  'After dinner': 3,
};

// Turn API readings into points and keep them in date and slot order.
function buildChartData(readings) {
  if (!Array.isArray(readings)) {
    return [];
  }

  return readings
    .map((reading) => {
      const date = String(reading?.reading_date || '').slice(0, 10);
      const rawValue = reading?.glucose_value ?? reading?.value;
      const value = Number(rawValue);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        rawValue == null ||
        rawValue === '' ||
        !Number.isFinite(value)
      ) {
        return null;
      }

      const dateForDisplay = new Date(date + 'T12:00:00Z');
      const dateLabel = dateForDisplay.toLocaleDateString(undefined, {
        timeZone: APP_TIME_ZONE,
        month: 'short',
        day: 'numeric',
      });

      return {
        date,
        dateLabel,
        timeSlot: reading.time_slot || 'Reading',
        value,
      };
    })
    .filter(Boolean)
    .sort((first, second) => {
      const dateOrder = first.date.localeCompare(second.date);
      if (dateOrder !== 0) {
        return dateOrder;
      }

      return (
        (SLOT_ORDER[first.timeSlot] ?? 4) -
        (SLOT_ORDER[second.timeSlot] ?? 4)
      );
    });
}

function ReadingTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const reading = payload[0].payload;

  return (
    <div className="monthly-chart-tooltip">
      <strong>{formatDate(reading.date)}</strong>
      <span>{reading.timeSlot}</span>
      <b>{reading.value} mg/dl</b>
    </div>
  );
}

export default function MonthlyGlucoseChart({
  from,
  to,
  readings,
  loading,
  error,
}) {
  const chartData = buildChartData(readings);

  return (
    <section
      className="monthly-chart-card"
      aria-labelledby="monthly-chart-title"
    >
      <div className="monthly-chart-heading">
        <div>
          <h3 id="monthly-chart-title">Monthly glucose readings</h3>
          <p>
            {formatDate(from)} - {formatDate(to)}
          </p>
        </div>
        <span className="monthly-chart-unit">Glucose (mg/dl)</span>
      </div>

      {loading ? (
        <div className="monthly-chart-message" role="status">
          <span className="spinner" aria-label="Loading chart readings" />
        </div>
      ) : error ? (
        <div className="inline-error" role="alert">
          {error}
        </div>
      ) : chartData.length === 0 ? (
        <div className="monthly-chart-empty" role="status">
          <svg
            viewBox="0 0 48 48"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 39h34M10 34l9-10 8 6 11-15" />
            <circle cx="19" cy="24" r="2" />
            <circle cx="27" cy="30" r="2" />
            <circle cx="38" cy="15" r="2" />
          </svg>
          <strong>No glucose readings for this period yet.</strong>
          <span>Add a reading to see your monthly trend.</span>
        </div>
      ) : (
        <div
          className="monthly-chart-plot"
          role="img"
          aria-label="Line chart of glucose readings by date"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 12, right: 12, bottom: 8, left: 8 }}
            >
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                minTickGap={24}
              />
              <YAxis
                width={64}
                domain={['auto', 'auto']}
                allowDecimals={false}
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: 'Glucose (mg/dl)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'var(--muted)',
                  fontSize: 11,
                }}
              />
              <Tooltip content={<ReadingTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                name="Glucose"
                stroke="var(--primary)"
                strokeWidth={3}
                dot={{ r: 3, fill: 'var(--primary)' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
