import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { STOCK, LOTS, HOLD_ITEMS, STOCK_TRANSFERS } from '@/data/mockData'
import { apiGetStocks, apiGetLots } from '@/api/stocks'

function makeId(prefix) { return `${prefix}${Date.now()}` }

function emptyPage(limit = 20) {
  return { data: [], page: 1, limit, total: 0, totalPages: 0 }
}

export const useStockStore = defineStore('stock', () => {
  // ---- Mock state (hold, transfer and reprocess have no API yet) ----
  const stock = ref([...STOCK])
  const lots = ref([...LOTS])
  const holdItems = ref([...HOLD_ITEMS])
  const transfers = ref([...STOCK_TRANSFERS])

  // ---- API-backed state ----
  // On-hand per product per warehouse, summed over lots (GET /stocks).
  const summary = ref(emptyPage())
  const summaryLoading = ref(false)
  // Across every row the filters match, not just the page the table shows.
  const summaryTotalQuantity = ref(0)
  // Lots with product, supplier and on-hand quantity (GET /stocks/lots).
  const lotList = ref(emptyPage())
  const lotListLoading = ref(false)

  // get qty for a product in a warehouse
  function getQty(productId, warehouseId) {
    const s = stock.value.find(s => s.productId === productId && s.warehouseId === warehouseId)
    return s ? s.qty : 0
  }

  function getAllQty(productId) {
    return stock.value.filter(s => s.productId === productId).reduce((sum, s) => sum + s.qty, 0)
  }

  function getStockByWarehouse(warehouseId) {
    return stock.value.filter(s => s.warehouseId === warehouseId)
  }

  function getLotsForProduct(productId) {
    return lots.value
      .filter(l => l.productId === productId && l.remaining > 0)
      .sort((a, b) => new Date(a.receiveDate) - new Date(b.receiveDate)) // FIFO
  }

  // Deduct stock (when issuing)
  function deductStock(productId, warehouseId, qty, lotId) {
    const s = stock.value.find(s => s.productId === productId && s.warehouseId === warehouseId)
    if (s) {
      s.qty = Math.max(0, s.qty - qty)
    }
    if (lotId) {
      const lot = lots.value.find(l => l.id === lotId)
      if (lot) lot.remaining = Math.max(0, lot.remaining - qty)
    }
  }

  // Add stock (when receiving or returning)
  function addStock(productId, warehouseId, qty, stockStatus, lotData) {
    const s = stock.value.find(s => s.productId === productId && s.warehouseId === warehouseId)
    if (s) {
      s.qty += qty
    } else {
      stock.value.push({ id: makeId('S'), productId, warehouseId, qty, stockStatus: stockStatus || 'RM' })
    }
    if (lotData) {
      lots.value.push({ ...lotData, id: makeId('LOT'), remaining: qty })
    }
  }

  // Hold management
  function holdStock(data) {
    holdItems.value.push({ ...data, id: makeId('HLD'), status: 'hold', resolvedAt: null })
    // Deduct from regular stock
    deductStock(data.productId, data.warehouseId, data.qty, data.lotId)
  }

  function releaseHold(holdId, resolution) {
    const h = holdItems.value.find(h => h.id === holdId)
    if (h) {
      h.status = 'released'
      h.resolution = resolution
      h.resolvedAt = new Date().toISOString()
      // Add back to stock
      addStock(h.productId, h.warehouseId, h.qty, 'RM')
    }
  }

  function sendToReprocess(holdId) {
    const h = holdItems.value.find(h => h.id === holdId)
    if (h) {
      h.status = 'reprocess'
      h.resolvedAt = new Date().toISOString()
    }
  }

  // Stock transfer
  function transferStock(data) {
    const { fromWarehouseId, toWarehouseId, productId, qty, lotId } = data
    deductStock(productId, fromWarehouseId, qty, null)
    addStock(productId, toWarehouseId, qty, 'RM')
    transfers.value.push({
      ...data,
      id: makeId('TRF'),
      status: 'completed',
      transferredAt: new Date().toISOString(),
    })
  }

  // Min stock check
  const lowStockItems = computed(() => {
    return [] // computed in notification store
  })

  // ---- API-backed actions ----

  /** One page of `GET /stocks` — the "stock by warehouse" table. */
  async function fetchSummary(params = {}) {
    summaryLoading.value = true
    try {
      const { data } = await apiGetStocks(params)
      summary.value = data
      summaryTotalQuantity.value = data.totalQuantity ?? 0
      return data
    } finally {
      summaryLoading.value = false
    }
  }

  /** One page of `GET /stocks/lots` — the lot tracking table, FIFO-ordered. */
  async function fetchLotList(params = {}) {
    lotListLoading.value = true
    try {
      const { data } = await apiGetLots(params)
      lotList.value = data
      return data
    } finally {
      lotListLoading.value = false
    }
  }

  /**
   * Batches of one product in one warehouse, oldest first — what a document
   * line's lot picker offers. Returned rather than stored, because each line
   * asks about a different product.
   *
   * An issue may only draw on a batch that still holds something, so it asks for
   * `ACTIVE` only. A return puts goods back into the batch they came from, which
   * is usually at zero by then, so it has to see emptied batches too.
   */
  async function fetchAvailableLots(productId, warehouseId, { inStockOnly = true } = {}) {
    if (!productId || !warehouseId) return []
    const { data } = await apiGetLots({
      productId,
      warehouseId,
      status: inStockOnly ? 'ACTIVE' : undefined,
      limit: 100,
    })
    return data.data
  }

  /** Total on hand for one product in one warehouse, summed over its lots. */
  async function fetchOnHand(productId, warehouseId) {
    if (!productId || !warehouseId) return 0
    const { data } = await apiGetStocks({ productId, warehouseId, limit: 100 })
    return data.data.reduce((sum, row) => sum + (row.quantity || 0), 0)
  }

  return {
    stock, lots, holdItems, transfers,
    getQty, getAllQty, getStockByWarehouse, getLotsForProduct,
    deductStock, addStock, holdStock, releaseHold, sendToReprocess, transferStock,
    lowStockItems,
    summary, summaryLoading, summaryTotalQuantity, fetchSummary,
    lotList, lotListLoading, fetchLotList,
    fetchAvailableLots, fetchOnHand,
  }
})
