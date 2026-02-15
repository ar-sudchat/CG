import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const pricesApi = axios.create({
    baseURL: `${API_BASE_URL}/prices`,
    headers: { 'Content-Type': 'application/json' },
});

const getAuthHeaders = (token) => ({
    headers: { Authorization: `Bearer ${token}` },
});

export const getLivePrices = async (token) => {
    try {
        const response = await pricesApi.get('/live', getAuthHeaders(token));
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to fetch live prices';
    }
};

export const getSupportedPairs = async (token) => {
    try {
        const response = await pricesApi.get('/pairs', getAuthHeaders(token));
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to fetch pairs';
    }
};

export const getCandles = async (token, symbol, resolution = '60', from, to) => {
    try {
        const response = await pricesApi.get(`/candles/${encodeURIComponent(symbol)}`, {
            ...getAuthHeaders(token),
            params: { resolution, from, to },
        });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to fetch candles';
    }
};

export const getIndicators = async (token, symbol, resolution = '60') => {
    try {
        const response = await pricesApi.get(`/indicators/${encodeURIComponent(symbol)}`, {
            ...getAuthHeaders(token),
            params: { resolution },
        });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to fetch indicators';
    }
};

export const getSmcPatterns = async (token, symbol, resolution = '60') => {
    try {
        const response = await pricesApi.get(`/smc/${encodeURIComponent(symbol)}`, {
            ...getAuthHeaders(token),
            params: { resolution },
        });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to fetch SMC patterns';
    }
};
