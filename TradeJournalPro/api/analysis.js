import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const analysisApi = axios.create({
    baseURL: `${API_BASE_URL}/analysis`,
    headers: { 'Content-Type': 'application/json' },
});

const documentsApi = axios.create({
    baseURL: `${API_BASE_URL}/documents`,
});

const getAuthHeaders = (token) => ({
    headers: { Authorization: `Bearer ${token}` },
});

export const getAiAnalysis = async (token, symbol, resolution = '60', category) => {
    try {
        const response = await analysisApi.post('/ai', { symbol, resolution, category }, getAuthHeaders(token));
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to get AI analysis';
    }
};

export const getDocuments = async (token, category) => {
    try {
        const params = category ? { category } : {};
        const response = await documentsApi.get('/', { ...getAuthHeaders(token), params });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to fetch documents';
    }
};

export const uploadDocument = async (token, file, category, description) => {
    try {
        const formData = new FormData();
        formData.append('file', {
            uri: file.uri,
            name: file.name || 'document',
            type: file.mimeType || 'application/octet-stream',
        });
        if (category) formData.append('category', category);
        if (description) formData.append('description', description);

        const response = await documentsApi.post('/', formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to upload document';
    }
};

export const deleteDocument = async (token, id) => {
    try {
        const response = await documentsApi.delete(`/${id}`, getAuthHeaders(token));
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to delete document';
    }
};
