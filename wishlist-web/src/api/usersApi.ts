import api from './axiosInstance';
import type { User } from '../types';

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<User>('/users/me');
  return data;
}
