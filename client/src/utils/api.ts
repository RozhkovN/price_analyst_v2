/**
 * Утилита для получения базового URL API
 * Использует переменную окружения VITE_API_URL или fallback на относительный путь
 */
export const getApiUrl = (): string => {
  // Получаем URL из переменных окружения
  const envUrl = import.meta.env.VITE_API_URL;
  
  // Если URL установлен и не пустой, используем его
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim();
  }
  
  // Fallback: используем относительный путь (nginx проксирует /api/)
  // Это работает для production, когда фронтенд и бэкенд на одном домене
  return '/api';
};

/**
 * Создает полный URL для API запроса
 * @param endpoint - endpoint API (например, '/auth/login')
 * @returns полный URL для запроса
 */
export const createApiUrl = (endpoint: string): string => {
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Если baseUrl уже содержит /api, не дублируем
  if (baseUrl.endsWith('/api')) {
    return `${baseUrl}${cleanEndpoint}`;
  }
  
  // Если baseUrl заканчивается на /, убираем его
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  return `${cleanBaseUrl}${cleanEndpoint}`;
};

