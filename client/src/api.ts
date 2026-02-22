import axios from 'axios';
import type { Article } from './types';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3003/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const login = async (username: string, password: string): Promise<{ token: string; user: any }> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
};

export const getMe = async (): Promise<any> => {
    const response = await api.get('/auth/me');
    return response.data;
};

export const checkSetupStatus = async (): Promise<{ needsSetup: boolean }> => {
    const response = await api.get('/auth/setup-status');
    return response.data;
};

export const registerAdmin = async (username: string, password: string): Promise<{ token: string; user: any }> => {
    const response = await api.post('/auth/register-admin', { username, password });
    return response.data;
};

export const createUser = async (userData: { username: string; password: string; role?: string }): Promise<any> => {
    const response = await api.post('/auth/create-user', userData);
    return response.data;
};

export const changePassword = async (passwordData: { oldPassword: string; newPassword: string }): Promise<any> => {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
};

export interface PaginatedArticles {
    data: Article[];
    meta: {
        total: number;
        page: number;
        limit: number;
        hasNextPage: boolean;
        nextPage: number | null;
    };
}

export const getArticles = async (page = 1, limit = 10, search = '', publishedOnly = false): Promise<PaginatedArticles> => {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search ? { search } : {}),
        ...(publishedOnly ? { publishedOnly: 'true' } : {})
    });
    const response = await api.get(`/content?${params.toString()}`);
    return response.data;
};

export const getArticle = async (id: string): Promise<Article> => {
    const response = await api.get(`/content/${id}`);
    return response.data;
};

export const createArticle = async (url: string, type: 'YOUTUBE' | 'MEDIUM'): Promise<Article> => {
    const response = await api.post('/content', { url, type });
    return response.data;
};

export const deleteArticle = async (id: string): Promise<void> => {
    await api.delete(`/content/${id}`);
};

export const reprocessArticle = async (id: string): Promise<{ message: string }> => {
    const response = await api.post(`/content/${id}/reprocess`);
    return response.data;
};

export const updateArticle = async (id: string, data: Partial<Article> & { status?: string }): Promise<Article> => {
    const response = await api.put(`/content/${id}`, data);
    return response.data;
};

export const publishToPlatform = async (id: string, platform: string, accessToken?: string, language: string = 'DE'): Promise<{ message: string; platformId?: string }> => {
    const response = await api.post(`/content/${id}/publish`, { platform, accessToken, language });
    return response.data;
};

export const unpublishFromPlatform = async (id: string, platform: string, language: string = 'DE'): Promise<{ message: string }> => {
    const response = await api.post(`/content/${id}/unpublish`, { platform, language });
    return response.data;
};

export const unpublishAllFromArticle = async (id: string): Promise<{ message: string }> => {
    const response = await api.post(`/content/${id}/unpublish-all`);
    return response.data;
};

export const getShareUrl = async (id: string, platform: string, language: string = 'DE'): Promise<{ shareUrl: string }> => {
    const response = await api.get(`/content/${id}/share-url`, { params: { platform, language } });
    return response.data;
};

export const uploadImage = async (file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/content/upload-image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export default api;

