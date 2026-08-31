// ==========================================
// CAMADA CENTRALIZADA DE REQUISIÇÕES HTTP / API
// ==========================================

import { state } from './state.js';

export async function apiFetch(url, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };

    if (state.adminToken) {
        defaultHeaders['Authorization'] = `Bearer ${state.adminToken}`;
    }

    const mergedOptions = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...(options.headers || {})
        }
    };

    // Cache-busting automático em GET
    let finalUrl = url;
    if (!options.method || options.method.toUpperCase() === 'GET') {
        const sep = finalUrl.includes('?') ? '&' : '?';
        if (!finalUrl.includes('_t=')) {
            finalUrl = `${finalUrl}${sep}_t=${Date.now()}`;
        }
    }

    const response = await fetch(finalUrl, mergedOptions);
    return response;
}

export async function apiGet(url) {
    const res = await apiFetch(url, { method: 'GET' });
    return res.json();
}

export async function apiPost(url, body) {
    const res = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(body)
    });
    return res.json();
}

export async function apiPut(url, body) {
    const res = await apiFetch(url, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
    return res.json();
}

export async function apiDelete(url) {
    const res = await apiFetch(url, { method: 'DELETE' });
    return res.json();
}
