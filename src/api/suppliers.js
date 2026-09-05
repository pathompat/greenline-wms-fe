import apiClient from './axios'

// Paginated: params { search, page, limit }. Answers
// { page, limit, total, totalPages, data }. Callers that need the whole set
// (dropdowns) page through it via `fetchAllPages` in the master store.
export const apiGetSuppliers = (params) => apiClient.get('/api/suppliers', { params })
export const apiCreateSupplier = (data) => apiClient.post('/api/suppliers', data)
export const apiUpdateSupplier = (id, data) => apiClient.put(`/api/suppliers/${id}`, data)
export const apiDeleteSupplier = (id) => apiClient.delete(`/api/suppliers/${id}`)
