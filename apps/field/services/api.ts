import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AuthTokens, AuthUser, HarvestLotOffline } from '../types';
import { Storage } from './storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Flag to prevent infinite retry loops on refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

// Request interceptor: inject JWT Bearer token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const tokens = await Storage.getTokens();
      if (tokens?.access_token) {
        config.headers.Authorization = `Bearer ${tokens.access_token}`;
      }
    } catch (err) {
      console.warn('[API] Error attaching auth token:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => apiClient(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const tokens = await Storage.getTokens();
      if (!tokens?.refresh_token) {
        await Storage.clearAll();
        return Promise.reject(error);
      }

      const response = await axios.post<{ tokens: AuthTokens }>(
        `${API_BASE_URL}/api/v1/auth/refresh`,
        { refresh_token: tokens.refresh_token },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const newTokens = response.data.tokens;
      await Storage.saveTokens(newTokens);

      processQueue(null);
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as Error);
      await Storage.clearAll();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// Typed API helper methods
export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const res = await apiClient.post<{ user: AuthUser; tokens: AuthTokens }>('/api/v1/auth/login', {
      email,
      password,
    });
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } catch {
      // Ignore network failures on logout
    } finally {
      await Storage.clearAll();
    }
  },

  // Harvest Lot Upload (Sync)
  async uploadLot(lot: HarvestLotOffline): Promise<{ id: string; success: boolean }> {
    const headers: Record<string, string> = {
      'X-Idempotency-Key': lot.id,
    };

    if (lot.image_path) {
      const formData = new FormData();
      formData.append('id', lot.id);
      formData.append('session_id', lot.session_id);
      formData.append('worker_id', lot.worker_id);
      formData.append('weight_kg', String(lot.weight_kg));
      formData.append('grade', lot.grade);
      formData.append('confidence', String(lot.confidence));
      formData.append('created_at', lot.created_at);

      // React Native FormData file shape
      const filename = lot.image_path.split('/').pop() || 'leaf.jpg';
      const fileData = {
        uri: lot.image_path,
        name: filename,
        type: 'image/jpeg',
      } as unknown as Blob;

      formData.append('image', fileData);

      const res = await apiClient.post<{ id: string; success: boolean }>('/api/v1/lots', formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    }

    // JSON upload when no local image path
    const res = await apiClient.post<{ id: string; success: boolean }>(
      '/api/v1/lots',
      {
        id: lot.id,
        session_id: lot.session_id,
        worker_id: lot.worker_id,
        weight_kg: lot.weight_kg,
        grade: lot.grade,
        confidence: lot.confidence,
        created_at: lot.created_at,
      },
      { headers }
    );
    return res.data;
  },

  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const res = await apiClient.get('/health', { timeout: 3000 });
      return res.status === 200;
    } catch {
      return false;
    }
  },
};

export default apiClient;
