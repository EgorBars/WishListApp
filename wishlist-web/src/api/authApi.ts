import api from './axiosInstance';
import type { User } from '../types';

export async function registerRequest(email: string, password: string): Promise<User> {
  const { data } = await api.post<User>('/auth/register', { email, password });
  return data;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<{ access_token: string; token_type: string }> {
  const { data } = await api.post<{ access_token: string; token_type: string }>('/auth/login', {
    username: email,
    password,
  });
  return data;
}

export async function forgotPasswordRequest(email: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email });
  return data;
}

export async function resetPasswordRequest(token: string, newPassword: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/reset-password', {
    token,
    new_password: newPassword,
  });
  return data;
}
