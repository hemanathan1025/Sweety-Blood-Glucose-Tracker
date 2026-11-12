// Provides the current date in the app calendar timezone.
const APP_TIME_ZONE = 'Asia/Kolkata';

function todayInAppTimezone(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const dateParts = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map(({ type, value }) => [type, value]),
  );
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

module.exports = { APP_TIME_ZONE, todayInAppTimezone };
