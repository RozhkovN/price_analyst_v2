import axios, { AxiosError } from "axios";
import type { RefreshTokenResponse } from "@/types/auth.type";

/**
 * Настройка axios interceptors для работы с access/refresh токенами
 * - Добавляет access token в заголовок каждого запроса
 * - Обрабатывает 401 (истёк access token) и 402 (истёкла подписка) ответы
 * - Автоматически обновляет access token используя refresh token
 */
export const setupAxiosInterceptors = (authHelpers: {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setAccessToken: (token: string, expiresIn: number) => void;
  logout: () => void;
}) => {
  let isRefreshing = false;
  let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: AxiosError) => void;
  }> = [];

  const processQueue = (error: AxiosError | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else if (token) {
        prom.resolve(token);
      }
    });

    isRefreshing = false;
    failedQueue = [];
  };

  // Request interceptor - добавить access token в каждый запрос
  axios.interceptors.request.use(
    (config) => {
      const token = authHelpers.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - обработить ошибки и обновить токен
  axios.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as any;

      // 401 Unauthorized - access token истёк, пробуем обновить
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Если уже обновляем токен, добавляем запрос в очередь
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(axios(originalRequest));
              },
              reject: (err: AxiosError) => {
                reject(err);
              },
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = authHelpers.getRefreshToken();
          if (!refreshToken) {
            throw new Error("No refresh token available");
          }

          const response = await axios.post<RefreshTokenResponse>(
            `${import.meta.env.VITE_API_URL}/auth/refresh`,
            { refreshToken }
          );

          const { accessToken, expiresIn } = response.data;
          authHelpers.setAccessToken(accessToken, expiresIn);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          processQueue(null, accessToken);

          return axios(originalRequest);
        } catch (err) {
          processQueue(err as AxiosError, null);
          authHelpers.logout();
          return Promise.reject(err);
        }
      }

      // 402 Payment Required - подписка истекла
      if (error.response?.status === 402) {
        authHelpers.logout();
        // Редирект на страницу профиля/подписки обработается в компоненте
      }

      return Promise.reject(error);
    }
  );
};
