import apiClient from './axios'

// Paginated: params { search, page, limit }. Answers
// { page, limit, total, totalPages, data }. Callers that need the whole set
// (dropdowns) page through it via `fetchAllPages` in the master store.
export const apiGetPackageSizes = (params) => apiClient.get('/api/package-sizes', { params })
export const apiCreatePackageSize = (data) => apiClient.post('/api/package-sizes', data)
export const apiUpdatePackageSize = (id, data) => apiClient.put(`/api/package-sizes/${id}`, data)
export const apiDeletePackageSize = (id) => apiClient.delete(`/api/package-sizes/${id}`)
