import axios from 'axios';
import type { Article } from './types';

const api = axios.create({
    baseURL: 'http://localhost:3000/api', // Should be env variable
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

export const login = async (username: string, password: string): Promise<{ token: string }> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
};

export const getMe = async (): Promise<any> => {
    const response = await api.get('/auth/me');
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

export const updateArticle = async (id: string, data: Partial<Article> & { status?: string }): Promise<Article> => {
    const response = await api.put(`/content/${id}`, data);
    return response.data;
};

export const publishToPlatform = async (id: string, platform: string, accessToken?: string): Promise<{ message: string; platformId?: string }> => {
    const response = await api.post(`/content/${id}/publish`, { platform, accessToken });
    return response.data;
};

export const unpublishFromPlatform = async (id: string, platform: string): Promise<{ message: string }> => {
    const response = await api.post(`/content/${id}/unpublish`, { platform });
    return response.data;
};

export const unpublishAllFromArticle = async (id: string): Promise<{ message: string }> => {
    const response = await api.post(`/content/${id}/unpublish-all`);
    return response.data;
};



export default api;

