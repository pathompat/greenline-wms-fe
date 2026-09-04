import apiClient from './axios'

// On-hand per product per warehouse, summed over the product's lots — the
// "stock by warehouse" screen. params { warehouseId, productId, search,
// categoryId, productType, lowStockOnly, sortBy, sortOrder, page, limit }.
// The envelope also carries `totalQuantity` across every matching row, not just
// the page.
export const apiGetStocks = (params) => apiClient.get('/api/stocks', { params })

// Lots with their product, supplier and on-hand quantity, ordered FIFO.
// params { lotNo, productName, productId, warehouseId, status: 'ACTIVE' | 'OUT',
// page, limit }. Passing `warehouseId` scopes the quantity to that warehouse —
// this is what a document line's lot picker reads.
export const apiGetLots = (params) => apiClient.get('/api/stocks/lots', { params })

// params { warehouseId, startDate, endDate, page, limit }
export const apiGetStockMovements = (params) =>
  apiClient.get('/api/stocks/movements', { params })
