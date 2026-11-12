import axios from 'axios';

const TOKEN_KEY = 'sweety_token';

// Use one client so every request shares the API URL and auth behavior.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // A 401 means this saved login can no longer be used.
    if (
      error.response?.status === 401 &&
      localStorage.getItem(TOKEN_KEY)
    ) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('sweety:unauthorized'));
    }

    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'The request failed.';

    return Promise.reject(new Error(message));
  },
);

export const authApi = {
  register: (details) =>
    apiClient.post('/auth/register', details),

  login: (credentials) =>
    apiClient.post('/auth/login', credentials),

  profile: () =>
    apiClient.get('/auth/me'),

  // The profile form sends only a name; email and password stay unchanged.
  updateProfile: (name) =>
    apiClient.put('/auth/me', { full_name: name }),
};

export const glucoseApi = {
  async list(date) {
    const result = await apiClient.get('/health-records', {
      params: { date, limit: 100 },
    });

    return result.data.items;
  },

  // Fetch every reading in a date range, following the API's page limit.
  async listRange(from, to) {
    const pageSize = 100;
    let page = 1;
    let total = 0;
    const readings = [];

    do {
      const result = await apiClient.get('/health-records', {
        params: {
          from,
          to,
          page,
          limit: pageSize,
        },
      });
      const data = result.data;

      if (!data || !Array.isArray(data.items)) {
        throw new Error('The readings response is incomplete.');
      }

      const pageTotal = Number(data.total);
      if (!Number.isInteger(pageTotal) || pageTotal < 0) {
        throw new Error('The readings response has an invalid total.');
      }

      if (page === 1) {
        total = pageTotal;
      }

      readings.push(...data.items);

      if (data.items.length === 0 || readings.length >= total) {
        break;
      }

      page += 1;
    } while ((page - 1) * pageSize < total);

    return readings;
  },

  async listPage({ page = 1, limit = 20, from, to } = {}) {
    const result = await apiClient.get('/health-records', {
      params: { page, limit, ...(from ? { from } : {}), ...(to ? { to } : {}) },
    });
    const data = result.data;
    if (!data || !Array.isArray(data.readings)) {
      throw new Error('The readings response is incomplete.');
    }
    return data;
  },

  async summary() {
    const pageSize = 100;
    let page = 1;
    let total = 0;
    let count = 0;
    let sum = 0;
    let latest = null;

    // The API caps each page at 100; fetch every page for account-wide stats.
    do {
      const result = await apiClient.get('/health-records', {
        params: { page, limit: pageSize },
      });
      const data = result.data;
      const items = data.items || [];

      if (page === 1) {
        total = Number(data.total) || items.length;
        latest = items[0] || null;
      }

      for (const item of items) {
        const value = Number(item.glucose_value ?? item.value);

        if (Number.isFinite(value)) {
          sum += value;
          count += 1;
        }
      }

      if (items.length === 0) {
        break;
      }

      page += 1;
    } while ((page - 1) * pageSize < total);

    return {
      totalReadings: total,
      average: count ? sum / count : null,
      latest,
    };
  },

  async create(reading) {
    const result = await apiClient.post('/health-records', reading);
    return result.data;
  },

  async update(id, reading) {
    const result = await apiClient.put(
      '/health-records/' + id,
      reading,
    );
    return result.data;
  },

  async remove(id) {
    const result = await apiClient.delete('/health-records/' + id);
    return result.data;
  },
};

export const reportsApi = {
  async daily(date) {
    const result = await apiClient.get('/reports/daily', {
      params: { date },
    });
    return result.data;
  },

  async monthToDate(date) {
    const result = await apiClient.get('/reports/month-to-date', {
      params: { date },
    });
    return result.data;
  },

  async previousMonth(date) {
    const result = await apiClient.get('/reports/monthly', {
      params: { date },
    });
    return result.data;
  },
};
