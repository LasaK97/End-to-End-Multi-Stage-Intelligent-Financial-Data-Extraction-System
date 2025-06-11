import axios, { AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';
import type { ApiError } from '../types/common';
import { useAppStore } from '../stores/useAppStore';
import { API_ENDPOINTS } from './constants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const apiError: ApiError = {
          message: error.message,
          status: error.response?.status || 0,
          details: error.response?.data as string,
        };

        const { systemStatus } = useAppStore.getState();
        const healthEndpoint = API_ENDPOINTS.HEALTH;

        const isHealthCheckRequest = error.config?.url?.endsWith(healthEndpoint);

        if (isHealthCheckRequest && (systemStatus === 'unavailable' || systemStatus === 'error')) {
        } else if (!error.response) {
          toast.error('Unable to connect to the server. Please check your connection or try again later.');
        } else if (error.response.status === 404) {
          // Specific 404

        } else if (error.response.status >= 500) {
          toast.error('A server error occurred. Please try again later.');
        } else if (apiError.message) {
          toast.error(apiError.message);
        } else {
          toast.error('An unexpected error occurred.');
        }

        return Promise.reject(apiError);
      }
    );
  }

  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }
}

export const apiClient = new ApiClient();