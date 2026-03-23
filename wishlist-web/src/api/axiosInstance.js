// src/api/axiosInstance.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Убедитесь, что адрес верный
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Безопасно проверяем, был ли это запрос на логин
    const url = error.config?.url || '';
    const isLoginRequest = url.includes('/login') || url.includes('/auth/login');

    // Если ошибка 401 и это НЕ страница входа — выкидываем из системы
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    
    // Обязательно возвращаем ошибку дальше!
    return Promise.reject(error);
  }
);

export default api;