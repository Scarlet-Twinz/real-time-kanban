import axios from 'axios';
import { getAccessToken } from './auth';

export const api = axios.create({
  baseURL: 'http://localhost:4000',
});

// Automatically attach the token to requests if it exists
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});