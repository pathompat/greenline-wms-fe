import apiClient from './axios'

// Paginated: params { search, page, limit }. Answers
// { page, limit, total, totalPages, data }. Callers that need the whole set
// (dropdowns) page through it via `fetchAllPages` in the master store.
export const apiGetUnits = (params) => apiClient.get('/api/units', { params })
export const apiCreateUnit = (data) => apiClient.post('/api/units', data)
export const apiUpdateUnit = (id, data) => apiClient.put(`/api/units/${id}`, data)
export const apiDeleteUnit = (id) => apiClient.delete(`/api/units/${id}`)
