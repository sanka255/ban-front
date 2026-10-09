import axios from 'axios';

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '');
const baseURL = normalizedApiBaseUrl
  ? normalizedApiBaseUrl.endsWith('/api/banquet')
    ? normalizedApiBaseUrl
    : normalizedApiBaseUrl.endsWith('/api')
      ? `${normalizedApiBaseUrl}/banquet`
      : `${normalizedApiBaseUrl}/api/banquet`
  : '/api/banquet';

const client = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the JWT from localStorage on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('synora_banquet_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Surface 401/403 errors as a readable message
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token expired or missing — clear storage and reload
      localStorage.removeItem('synora_banquet_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
