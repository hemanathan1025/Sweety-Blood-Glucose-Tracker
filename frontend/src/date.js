// Keep all date comparisons on the app's configured local calendar.
export const APP_TIME_ZONE = 'Asia/Kolkata';

export function today(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const dateParts = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );

  return (
    dateParts.year +
    '-' +
    dateParts.month +
    '-' +
    dateParts.day
  );
}

export function formatDate(value) {
  if (!value) {
    return '';
  }

  // Use UTC noon to avoid shifting the day in other browser time zones.
  const dateAtNoonUtc = new Date(
    String(value).slice(0, 10) + 'T12:00:00Z',
  );

  return dateAtNoonUtc.toLocaleDateString(undefined, {
    timeZone: APP_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
