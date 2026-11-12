import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import SlotCard from '../components/SlotCard.jsx';
import ReadingFormModal from '../components/ReadingFormModal.jsx';
import ReportCard from '../components/ReportCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Toast from '../components/Toast.jsx';
import { glucoseApi, reportsApi } from '../api/api.js';
import { formatDate, today } from '../date.js';
import './Dashboard.css';

const MonthlyGlucoseChart = lazy(() =>
  import('../components/MonthlyGlucoseChart.jsx'),
);

const SLOTS = [
  { name: 'Morning', helper: 'Fasting' },
  { name: 'After breakfast', helper: 'After your first meal' },
  { name: 'After lunch', helper: 'After your midday meal' },
  { name: 'After dinner', helper: 'After your evening meal' },
];

const REPORT_TABS = [
  { id: 'daily', label: 'Daily' },
  { id: 'monthToDate', label: 'Month-to-date' },
  { id: 'previousMonth', label: 'Previous month' },
];

// Check report dates before formatting them.
function isValidReportDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(value + 'T00:00:00.000Z');
  return (
    Number.isFinite(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

// Normalize API values so incomplete reports cannot crash the page.
function normalizeReport(data, reportType) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The report response is invalid. Please try again.');
  }

  const totalReadings = Number(data.total_readings);
  if (!Number.isInteger(totalReadings) || totalReadings < 0) {
    throw new Error('The report response is missing a valid reading count.');
  }

  if (
    !isValidReportDate(data.from) ||
    !isValidReportDate(data.to) ||
    data.from > data.to
  ) {
    throw new Error('The report response has an invalid date range.');
  }

  function normalizeStat(value, label) {
    if (value == null) {
      return null;
    }

    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new Error('The report contains an invalid ' + label + ' value.');
    }

    return number;
  }

  const highest = normalizeStat(data.highest, 'highest');
  const lowest = normalizeStat(data.lowest, 'lowest');
  const average = normalizeStat(data.average, 'average');

  if (
    totalReadings > 0 &&
    (highest == null || lowest == null || average == null)
  ) {
    throw new Error('The report summary is incomplete. Please try again.');
  }

  let readings = [];
  if (reportType === 'daily') {
    if (
      !Array.isArray(data.readings) ||
      data.readings.some(
        (reading) => !reading || typeof reading !== 'object',
      ) ||
      data.readings.length !== totalReadings
    ) {
      throw new Error('The daily report is incomplete. Please try again.');
    }

    readings = data.readings;
  }

  return {
    ...data,
    total_readings: totalReadings,
    highest,
    lowest,
    average,
    readings,
  };
}


// Match the chart period to the selected report date and tab.
function getMonthlyChartRange(selectedDate, reportType) {
  const date = isValidReportDate(selectedDate) ? selectedDate : today();
  const selected = new Date(date + 'T00:00:00.000Z');
  const year = selected.getUTCFullYear();
  const month = selected.getUTCMonth();

  const from =
    reportType === 'previousMonth'
      ? new Date(Date.UTC(year, month - 1, 1))
      : new Date(Date.UTC(year, month, 1));
  const to =
    reportType === 'previousMonth'
      ? new Date(Date.UTC(year, month, 0))
      : selected;

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(today());
  const [readings, setReadings] = useState([]);
  const [readingsLoading, setReadingsLoading] = useState(true);
  const [readingsError, setReadingsError] = useState('');
  const [history, setHistory] = useState({ readings: [], currentPage: 1, limit: 20, totalReadings: 0, totalPages: 0 });
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyVersion, setHistoryVersion] = useState(0);
  const [reportType, setReportType] = useState('daily');
  const [reportState, setReportState] = useState({
    key: '',
    data: null,
  });
  const [reportLoading, setReportLoading] = useState(true);
  const [reportErrorState, setReportErrorState] = useState({
    key: '',
    message: '',
  });
  const [reportVersion, setReportVersion] = useState(0);
  const [chartState, setChartState] = useState({
    key: '',
    loading: true,
    readings: [],
    error: '',
  });
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  // Ignore old results as soon as the selected report period changes.
  const reportKey = [reportType, selectedDate, reportVersion].join('|');
  const report = reportState.key === reportKey ? reportState.data : null;
  const reportError =
    reportErrorState.key === reportKey ? reportErrorState.message : '';

  const chartRange = useMemo(
    () => getMonthlyChartRange(selectedDate, reportType),
    [selectedDate, reportType],
  );
  const chartKey = [
    chartRange.from,
    chartRange.to,
    reportVersion,
  ].join('|');
  const currentChartState =
    chartState.key === chartKey ? chartState : null;

  // Use the slot name as a key to make each card easy to render.
  const readingBySlot = useMemo(
    () =>
      Object.fromEntries(
        readings.map((reading) => [reading.time_slot, reading]),
      ),
    [readings],
  );

  const loadReadings = useCallback(async () => {
    setReadingsLoading(true);
    setReadingsError('');

    try {
      const dailyReadings = await glucoseApi.list(selectedDate);
      setReadings(dailyReadings);
    } catch (error) {
      setReadingsError(error.message);
    } finally {
      setReadingsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  useEffect(() => {
    let isActive = true;
    setHistoryLoading(true);
    setHistoryError('');
    glucoseApi.listPage({ page: historyPage, limit: 20, from: historyFrom, to: historyTo })
      .then((result) => {
        if (!isActive) return;
        setHistory(result);
        if (result.totalPages > 0 && historyPage > result.totalPages) {
          setHistoryPage(result.totalPages);
        }
      })
      .catch((error) => {
        if (isActive) setHistoryError(error.message);
      })
      .finally(() => {
        if (isActive) setHistoryLoading(false);
      });
    return () => { isActive = false; };
  }, [historyPage, historyFrom, historyTo, historyVersion]);

  useEffect(() => {
    let isActive = true;
    const requestKey = [reportType, selectedDate, reportVersion].join('|');

    setReportLoading(true);
    setReportErrorState({
      key: requestKey,
      message: '',
    });

    reportsApi[reportType](selectedDate)
      .then((result) => {
        if (isActive) {
          setReportState({
            key: requestKey,
            data: normalizeReport(result, reportType),
          });
        }
      })
      .catch((error) => {
        if (isActive) {
          setReportErrorState({
            key: requestKey,
            message: error.message,
          });
        }
      })
      .finally(() => {
        if (isActive) {
          setReportLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [reportType, selectedDate, reportVersion]);

  useEffect(() => {
    let isActive = true;
    const requestKey = chartKey;

    setChartState({
      key: requestKey,
      loading: true,
      readings: [],
      error: '',
    });

    glucoseApi
      .listRange(chartRange.from, chartRange.to)
      .then((result) => {
        if (isActive) {
          setChartState({
            key: requestKey,
            loading: false,
            readings: result,
            error: '',
          });
        }
      })
      .catch((error) => {
        if (isActive) {
          setChartState({
            key: requestKey,
            loading: false,
            readings: [],
            error: error.message,
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [chartKey, chartRange.from, chartRange.to]);

  async function saveReading(values) {
    if (modal.reading) {
      await glucoseApi.update(modal.reading.id, values);
    } else {
      await glucoseApi.create(values);
    }

    // Refresh report values after a successful add or edit.
    setReportVersion((version) => version + 1);
    setHistoryVersion((version) => version + 1);

    if (values.reading_date !== selectedDate) {
      setSelectedDate(values.reading_date);
    }

    setModal(null);
    setToast({
      type: 'success',
      message: modal.reading ? 'Reading updated.' : 'Reading saved.',
    });

    if (values.reading_date === selectedDate) {
      await loadReadings();
    }
  }

  async function deleteReading(reading) {
    const shouldDelete = window.confirm(
      'Delete this glucose reading? This cannot be undone.',
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await glucoseApi.remove(reading.id);
      setReportVersion((version) => version + 1);
      setHistoryVersion((version) => version + 1);
      setToast({ type: 'success', message: 'Reading deleted.' });
      await loadReadings();
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    }
  }

  function openNewReading(slotName) {
    setModal({ reading: null, slot: slotName });
  }

  function openEditReading(reading) {
    setModal({ reading, slot: reading.time_slot });
  }

  return (
    <div className="dashboard-shell">
      <Navbar />

      <main className="dashboard-main">
        <section className="dashboard-heading">
          <div>
            <span className="eyebrow">YOUR HEALTH OVERVIEW</span>
            <h1>Blood glucose tracker</h1>
            <p>Record a reading and review your personal trends.</p>
          </div>

          <label className="date-control" htmlFor="dashboard-date">
            <span>Reading date</span>
            <input
              id="dashboard-date"
              type="date"
              value={selectedDate}
              max={today()}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
        </section>

        <section className="dashboard-section history-section" aria-labelledby="history-title">
          <div className="section-heading history-heading">
            <div>
              <h2 id="history-title">Reading history</h2>
              <p>Browse your readings by date range.</p>
            </div>
            <div className="history-filters">
              <label>From <input aria-label="History from date" type="date" value={historyFrom} max={today()} onChange={(event) => { setHistoryFrom(event.target.value); setHistoryPage(1); }} /></label>
              <label>To <input aria-label="History to date" type="date" value={historyTo} max={today()} onChange={(event) => { setHistoryTo(event.target.value); setHistoryPage(1); }} /></label>
              <button className="button button-secondary" type="button" onClick={() => { setHistoryFrom(''); setHistoryTo(''); setHistoryPage(1); }}>Clear dates</button>
            </div>
          </div>
          {historyError && <div className="inline-error" role="alert">{historyError}</div>}
          {historyLoading ? <div className="loading-panel"><span className="spinner" aria-label="Loading reading history" /></div> : history.totalReadings === 0 ? (
            <p className="history-empty">No readings found for this date range.</p>
          ) : (
            <>
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead><tr><th>Date</th><th>Time</th><th>Glucose</th><th>Actions</th></tr></thead>
                  <tbody>{history.readings.map((reading) => <tr key={reading.id}>
                    <td>{formatDate(reading.reading_date)}</td><td>{reading.time_slot}</td>
                    <td>{reading.glucose_value} mg/dl</td>
                    <td className="history-actions"><button type="button" onClick={() => openEditReading(reading)}>Edit</button><button type="button" onClick={() => deleteReading(reading)}>Delete</button></td>
                  </tr>)}</tbody>
                </table>
              </div>
              <div className="history-pagination">
                <span>Page {history.currentPage} of {history.totalPages} · {history.totalReadings} total readings</span>
                <div>
                  <button className="button button-secondary" type="button" disabled={history.currentPage <= 1} onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}>Previous</button>
                  <button className="button button-secondary" type="button" disabled={history.currentPage >= history.totalPages} onClick={() => setHistoryPage((page) => page + 1)}>Next</button>
                </div>
              </div>
            </>
          )}
        </section>

        <section
          className="dashboard-section"
          aria-labelledby="slots-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="slots-title">Today's reading slots</h2>
              <p>{formatDate(selectedDate)}</p>
            </div>

            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                const firstEmptySlot = SLOTS.find(
                  (slot) => !readingBySlot[slot.name],
                );
                openNewReading(firstEmptySlot?.name || 'Morning');
              }}
            >
              + Add reading
            </button>
          </div>

          {readingsError && (
            <div className="inline-error" role="alert">
              {readingsError}
            </div>
          )}

          {readingsLoading ? (
            <div className="loading-panel">
              <span className="spinner" aria-label="Loading readings" />
            </div>
          ) : (
            <div className="slot-grid">
              {SLOTS.map((slot) => (
                <SlotCard
                  key={slot.name}
                  slot={slot}
                  reading={readingBySlot[slot.name]}
                  onAdd={openNewReading}
                  onEdit={openEditReading}
                  onDelete={deleteReading}
                />
              ))}
            </div>
          )}
        </section>

        <section
          className="dashboard-section report-section"
          aria-labelledby="report-title"
        >
          <div className="section-heading report-heading">
            <div>
              <h2 id="report-title">Your reports</h2>
              <p>Summaries use readings saved to your account.</p>
            </div>

            <div
              className="report-tabs"
              role="tablist"
              aria-label="Report period"
            >
              {REPORT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={reportType === tab.id}
                  className={
                    'report-tab' +
                    (reportType === tab.id ? ' active' : '')
                  }
                  onClick={() => setReportType(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {!reportLoading && reportError && (
            <div className="inline-error" role="alert">
              {reportError}
            </div>
          )}

          {reportLoading || (!report && !reportError) ? (
            <div className="loading-panel">
              <span className="spinner" aria-label="Loading report" />
            </div>
          ) : reportError ? null : report && report.total_readings > 0 ? (
            <>
              <ReportCard report={report} />

              {reportType === 'daily' && (
                <section
                  className="daily-reading-list"
                  aria-labelledby="daily-list-title"
                >
                  <h3 id="daily-list-title">
                    Readings for {formatDate(report.from)}
                  </h3>

                  <div className="daily-list-rows">
                    {report.readings.map((reading) => (
                      <div
                        className="daily-list-row"
                        key={reading.id}
                      >
                        <span>{reading.time_slot}</span>
                        <strong>
                          {reading.glucose_value}{' '}
                          <small>mg/dl</small>
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <EmptyState />
          )}

          <Suspense
            fallback={
              <div className="loading-panel">
                <span className="spinner" aria-label="Loading chart" />
              </div>
            }
          >
            <MonthlyGlucoseChart
              from={chartRange.from}
              to={chartRange.to}
              readings={currentChartState?.readings || []}
              loading={!currentChartState || currentChartState.loading}
              error={currentChartState?.error || ''}
            />
          </Suspense>
        </section>
      </main>

      <ReadingFormModal
        open={Boolean(modal)}
        reading={modal?.reading}
        initialDate={selectedDate}
        initialSlot={modal?.slot}
        onClose={() => setModal(null)}
        onSave={saveReading}
      />

      <Toast
        toast={toast}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
