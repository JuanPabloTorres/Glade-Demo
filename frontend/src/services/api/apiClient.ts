import type { AxiosRequestConfig } from "axios";
import { http } from "../../api/http";

export const apiClient = {
  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await http.get<T>(path, config);
    return response.data;
  },
  async post<TResponse, TBody>(path: string, body: TBody, config?: AxiosRequestConfig): Promise<TResponse> {
    const response = await http.post<TResponse>(path, body, config);
    return response.data;
  },
  async put<TResponse, TBody>(path: string, body: TBody, config?: AxiosRequestConfig): Promise<TResponse> {
    const response = await http.put<TResponse>(path, body, config);
    return response.data;
  },
  async patch<TResponse, TBody>(path: string, body: TBody, config?: AxiosRequestConfig): Promise<TResponse> {
    const response = await http.patch<TResponse>(path, body, config);
    return response.data;
  },
  async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await http.delete<T>(path, config);
    return response.data;
  },
};
