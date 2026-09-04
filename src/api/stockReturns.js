import apiClient from './axios'

// ใบคืน — posting one adds stock back, but never invents a lot: a returned
// lot-tracked item must name the batch it was issued from.
export const apiGetStockReturns = (params) => apiClient.get('/api/stock-returns', { params })
export const apiGetStockReturn = (id) => apiClient.get(`/api/stock-returns/${id}`)
export const apiCreateStockReturn = (data) => apiClient.post('/api/stock-returns', data)
export const apiUpdateStockReturn = (id, data) => apiClient.patch(`/api/stock-returns/${id}`, data)
export const apiReplaceStockReturnItems = (id, items) =>
  apiClient.patch(`/api/stock-returns/${id}/items`, { items })
export const apiCancelStockReturn = (id) => apiClient.delete(`/api/stock-returns/${id}`)
