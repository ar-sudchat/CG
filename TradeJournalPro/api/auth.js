import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const authApi = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const loginUser = async (username, password) => {
  try {
    const response = await authApi.post('/login', { username, password });
    return response.data; // Contains user info and token
  } catch (error) {
    throw error.response?.data?.message || 'Login failed';
  }
};

export const registerUser = async (username, email, password) => {
  try {
    const response = await authApi.post('/register', { username, email, password });
    return response.data; // Contains user info and token
  } catch (error) {
    throw error.response?.data?.message || 'Registration failed';
  }
};

export const getMyProfile = async (token) => {
  try {
    const response = await authApi.get('/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch profile';
  }
};

export const updateMyPreferences = async (token, preferences) => {
  try {
    const response = await authApi.put('/preferences', preferences, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data; // Should return updated preferences
  } catch (error) {
    throw error.response?.data?.message || 'Failed to update preferences';
  }
};