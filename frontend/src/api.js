// Fetch helper retained for the earlier pages that still import this file.
import { APP_TIME_ZONE, today } from './date.js';

export { today };

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function api(path, options = {}) {
  const token = localStorage.getItem('sweety_token');

  const response = await fetch(API_BASE + path, {
    ...options,
    headers: {
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token
        ? { Authorization: 'Bearer ' + token }
        : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      result.error?.message ||
      result.message ||
      'The request failed.';

    throw new Error(message);
  }

  return result;
}

export function dateLabel(value) {
  if (!value) {
    return '-';
  }

  const dateAtNoon = new Date(
    String(value).slice(0, 10) + 'T12:00:00',
  );

  return dateAtNoon.toLocaleDateString(undefined, {
    timeZone: APP_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
