import apiClient from './axios'

// ใบรับเข้า (goods receipt) — posting one adds stock.
// GET /receipts is paginated: params { statuses, warehouseId, userName, itemName,
// sortBy, sortOrder, items, page, limit }. `statuses` accepts CSV ("DRAFT,IN_PROCESS").
export const apiGetReceipts = (params) => apiClient.get('/api/receipts', { params })
export const apiGetReceipt = (id) => apiClient.get(`/api/receipts/${id}`)
export const apiCreateReceipt = (data) => apiClient.post('/api/receipts', data)
// PATCH accepts every header field while DRAFT, and only `status` afterwards.
// Moving to SUCCESS is what posts the lines to stock.
export const apiUpdateReceipt = (id, data) => apiClient.patch(`/api/receipts/${id}`, data)
export const apiReplaceReceiptItems = (id, items) =>
  apiClient.patch(`/api/receipts/${id}/items`, { items })
// DELETE cancels (sets CANCELED + soft-deletes); allowed from DRAFT or IN_PROCESS.
export const apiCancelReceipt = (id) => apiClient.delete(`/api/receipts/${id}`)
