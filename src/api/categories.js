import apiClient from './axios'

// Paginated: params { search, page, limit }. Answers
// { page, limit, total, totalPages, data }. Callers that need the whole set
// (dropdowns) page through it via `fetchAllPages` in the master store.
export const apiGetCategories = (params) => apiClient.get('/api/categories', { params })
export const apiCreateCategory = (data) => apiClient.post('/api/categories', data)
export const apiUpdateCategory = (id, data) => apiClient.put(`/api/categories/${id}`, data)
export const apiDeleteCategory = (id) => apiClient.delete(`/api/categories/${id}`)
