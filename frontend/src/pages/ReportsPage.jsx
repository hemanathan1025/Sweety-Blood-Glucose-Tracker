// Legacy report page retained for earlier app navigation.
import { useState } from 'react';
import { api, dateLabel, today } from '../api.js';

export default function ReportsPage() {
  const [kind, setKind] = useState('daily');
  const [date, setDate] = useState(today());
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function generate(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const reportPath =
        kind === 'daily'
          ? 'daily'
          : kind === 'month-to-date'
            ? 'month-to-date'
            : 'monthly';
      const result = await api(
        '/reports/' +
          reportPath +
          '?date=' +
          encodeURIComponent(date),
      );

      setReport(result.data);
    } catch (requestError) {
      setError(requestError.message);
      setReport(null);
    } finally {
      setBusy(false);
    }
  }

  function changeKind(event) {
    const nextKind = event.target.value;
    setKind(nextKind);
    setReport(null);

    if (nextKind !== 'monthly' && date > today()) {
      setDate(today());
    }
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <h2>Reports</h2>
          <p>Summaries use readings saved to your account.</p>
        </div>
      </div>

      <form
        className="report-controls panel"
        onSubmit={generate}
      >
        <label>
          Report type
          <select value={kind} onChange={changeKind}>
            <option value="daily">Daily</option>
            <option value="month-to-date">Month to date</option>
            <option value="monthly">Previous month</option>
          </select>
        </label>

        <label>
          {kind === 'monthly'
            ? 'Date used to select previous month'
            : 'Through date'}
          <input
            type="date"
            value={daards">
                <article className="panel">
                  <small>Highest</small>
                  <strong>{report.highest} mg/dl</strong>
                </article>
                <article className="panel">
                  <small>Lowest</small>
                  <strong>{report.lowest} mg/dl</strong>
                </article>
                <article className="panel">
                  <small>Average</small>
                  <strong>
                    {Number(report.average).toFixed(1)} mg/dl
                  </strong>
                </article>
                <article className="panel">
                  <small>Total readings</small>
                  <strong>{report.total_readings}</strong>
                </article>
              </div>

              {report.readings && (
                <div className="panel table-panel">
                  <h3>Readings for {dateLabel(report.from)}</h3>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Time slot</th>
                          <th>Value</th>
                          <th>Recorded at</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.readings.map((reading) => (
                          <tr key={reading.id}>
                            <td>{reading.time_slot}</td>
                            <td>
                              <b>{reading.glucose_value} mg/dl</b>
                            </td>
                            <td>
                              {new Date(
                                reading.measured_at,
                              ).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
