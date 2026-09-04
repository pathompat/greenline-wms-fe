import apiClient from './axios'

// ใบเบิก-จ่าย — posting one subtracts stock (rejected if it would go negative).
// Same query/-mutation surface as receipts; see src/api/receipts.js.
export const apiGetRequisitions = (params) => apiClient.get('/api/requisitions', { params })
export const apiGetRequisition = (id) => apiClient.get(`/api/requisitions/${id}`)
export const apiCreateRequisition = (data) => apiClient.post('/api/requisitions', data)
export const apiUpdateRequisition = (id, data) => apiClient.patch(`/api/requisitions/${id}`, data)
export const apiReplaceRequisitionItems = (id, items) =>
  apiClient.patch(`/api/requisitions/${id}/items`, { items })
export const apiCancelRequisition = (id) => apiClient.delete(`/api/requisitions/${id}`)
