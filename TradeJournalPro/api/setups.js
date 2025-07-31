import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const setupsApi = axios.create({
  baseURL: `${API_BASE_URL}/setups`,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const getSetups = async (token) => {
  try {
    const response = await setupsApi.get('/', getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch setups';
  }
};

export const createSetup = async (setupData, token) => {
  try {
    const response = await setupsApi.post('/', setupData, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to create setup';
  }
};

export const getSetupById = async (id, token) => {
  try {
    const response = await setupsApi.get(`/${id}`, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch setup details';
  }
};

export const updateSetup = async (id, setupData, token) => {
  try {
    const response = await setupsApi.put(`/${id}`, setupData, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to update setup';
  }
};

export const deleteSetup = async (id, token) => {
  try {
    const response = await setupsApi.delete(`/${id}`, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to delete setup';
  }
};