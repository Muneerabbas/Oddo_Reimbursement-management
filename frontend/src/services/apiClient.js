import axios from 'axios';
import loadingService from './loadingService';
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from '../utils/authStorage';

export const AUTH_SESSION_EXPIRED_EVENT = 'auth:logout';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshQueue = [];

const notifyLoggedOut = () => {
  clearAuthStorage();
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
};

const processRefreshQueue = (error, accessToken = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }
    resolve(accessToken);
  });
  refreshQueue = [];
};

const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('Missing refresh token');
  }

  const response = await axios.post(
    `${apiClient.defaults.baseURL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  const payload = response?.data || {};
  const accessToken = payload.accessToken || payload.token;
  if (!accessToken) {
    throw new Error('Refresh token request did not return an access token.');
  }

  setAuthTokens({
    accessToken,
    refreshToken: payload.refreshToken || refreshToken,
  });

  return accessToken;
};

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (!config.skipGlobalLoader) {
      loadingService.startLoading();
      config.__loaderStarted = true;
    }

    return config;
  },
  (error) => {
    if (error.config?.__loaderStarted) {
      loadingService.stopLoading();
    }
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    if (response.config?.__loaderStarted) {
      loadingService.stopLoading();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};

    if (originalRequest.__loaderStarted) {
      loadingService.stopLoading();
      originalRequest.__loaderStarted = false;
    }

    const status = error.response?.status;
    const isUnauthorized = status === 401;
    const isRefreshRequest = (originalRequest.url || '').includes('/auth/refresh');
    const hasRefreshToken = !!getRefreshToken();

    if (
      isUnauthorized
      && hasRefreshToken
      && !originalRequest._retry
      && !isRefreshRequest
      && !originalRequest.skipAuthRefresh
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshedAccessToken = await refreshAccessToken();
        processRefreshQueue(null, refreshedAccessToken);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${refreshedAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(refreshError, null);
        notifyLoggedOut();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (isUnauthorized) {
      notifyLoggedOut();
    }

    return Promise.reject(error);
  },
);

export default apiClient;
