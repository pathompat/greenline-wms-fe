import apiClient from './axios'

// Paginated: params { search, page, limit }. Answers
// { page, limit, total, totalPages, data }. Callers that need the whole set
// (dropdowns) page through it via `fetchAllPages` in the master store.
export const apiGetMachines = (params) => apiClient.get('/api/machines', { params })
export const apiGetMachine = (id) => apiClient.get(`/api/machines/${id}`)
export const apiCreateMachine = (data) => apiClient.post('/api/machines', data)
export const apiUpdateMachine = (id, data) => apiClient.put(`/api/machines/${id}`, data)
export const apiDeleteMachine = (id) => apiClient.delete(`/api/machines/${id}`)
