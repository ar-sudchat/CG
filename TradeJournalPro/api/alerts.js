import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const alertsApi = axios.create({
    baseURL: `${API_BASE_URL}/alerts`,
    headers: { 'Content-Type': 'application/json' },
});

const getAuthHeaders = (token) => ({
    headers: { Authorization: `Bearer ${token}` },
});

export const getAlerts = async (token, status) => {
    try {
        const params = status ? { status } : {};
        const response = await alertsApi.get('/', { ...getAuthHeaders(token), params });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to fetch alerts';
    }
};

export const createAlert = async (token, alertData) => {
    try {
        const response = await alertsApi.post('/', alertData, getAuthHeaders(token));
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to create alert';
    }
};

export const updateAlert = async (token, id, alertData) => {
    try {
        const response = await alertsApi.put(`/${id}`, alertData, getAuthHeaders(token));
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to update alert';
    }
};

export const deleteAlert = async (token, id) => {
    try {
        const response = await alertsApi.delete(`/${id}`, getAuthHeaders(token));
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to delete alert';
    }
};

export const getAlertHistory = async (token) => {
    try {
        const response = await alertsApi.get('/history', getAuthHeaders(token));
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to fetch alert history';
    }
};
