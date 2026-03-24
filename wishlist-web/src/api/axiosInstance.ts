import axios, { type AxiosError } from 'axios';
import { getAccessToken, removeAccessToken } from '../utils/storage';
import { notifyUnauthorized } from './authSession';

const SKIP_401_REDIRECT_SUBSTRINGS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

function shouldRedirectOn401(url: string): boolean {
  return !SKIP_401_REDIRECT_SUBSTRINGS.some((fragment) => url.includes(fragment));
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = typeof error.config?.url === 'string' ? error.config.url : '';

    if (status === 401 && shouldRedirectOn401(url)) {
      removeAccessToken();
      notifyUnauthorized();
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

export default api;
