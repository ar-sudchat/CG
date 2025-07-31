import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const tradesApi = axios.create({
  baseURL: `${API_BASE_URL}/trades`,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const getTrades = async (token) => {
  try {
    const response = await tradesApi.get('/', getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch trades';
  }
};

export const createTrade = async (tradeData, token) => {
  try {
    const response = await tradesApi.post('/', tradeData, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to create trade';
  }
};

export const getTradeById = async (id, token) => {
  try {
    const response = await tradesApi.get(`/${id}`, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch trade details';
  }
};

export const updateTrade = async (id, tradeData, token) => {
  try {
    const response = await tradesApi.put(`/${id}`, tradeData, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to update trade';
  }
};

export const deleteTrade = async (id, token) => {
  try {
    const response = await tradesApi.delete(`/${id}`, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to delete trade';
  }
};