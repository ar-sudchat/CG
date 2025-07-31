import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const accountsApi = axios.create({
  baseURL: `${API_BASE_URL}/accounts`,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const getAccounts = async (token) => {
  try {
    const response = await accountsApi.get('/', getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch accounts';
  }
};

export const createAccount = async (accountData, token) => {
  try {
    const response = await accountsApi.post('/', accountData, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to create account';
  }
};

export const getAccountById = async (id, token) => {
  try {
    const response = await accountsApi.get(`/${id}`, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch account details';
  }
};

export const updateAccount = async (id, accountData, token) => {
  try {
    const response = await accountsApi.put(`/${id}`, accountData, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to update account';
  }
};

export const deleteAccount = async (id, token) => {
  try {
    const response = await accountsApi.delete(`/${id}`, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to delete account';
  }
};