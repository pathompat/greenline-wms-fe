import apiClient from './axios'

// Paginated: params { search, page, limit }. Answers
// { page, limit, total, totalPages, data }. Callers that need the whole set
// (dropdowns) page through it via `fetchAllPages` in the master store.
export const apiGetBrands = (params) => apiClient.get('/api/brands', { params })
export const apiCreateBrand = (data) => apiClient.post('/api/brands', data)
export const apiUpdateBrand = (id, data) => apiClient.put(`/api/brands/${id}`, data)
export const apiDeleteBrand = (id) => apiClient.delete(`/api/brands/${id}`)
