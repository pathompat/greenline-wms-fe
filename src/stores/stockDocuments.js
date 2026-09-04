import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  apiGetReceipts, apiGetReceipt, apiCreateReceipt,
  apiUpdateReceipt, apiReplaceReceiptItems, apiCancelReceipt,
} from '@/api/receipts'
import {
  apiGetRequisitions, apiGetRequisition, apiCreateRequisition,
  apiUpdateRequisition, apiReplaceRequisitionItems, apiCancelRequisition,
} from '@/api/requisitions'
import {
  apiGetStockReturns, apiGetStockReturn, apiCreateStockReturn,
  apiUpdateStockReturn, apiReplaceStockReturnItems, apiCancelStockReturn,
} from '@/api/stockReturns'

/**
 * The backend keeps the three stock documents as three resources — receipts,
 * requisitions and stock returns — because the direction each applies to stock
 * is fixed per table. They share one request/response shape, so this store
 * drives all three through one set of actions keyed by `kind`.
 */
export const DOC_KINDS = {
  receipt: {
    key: 'receipt',
    label: 'ใบรับเข้า',
    shortLabel: 'รับเข้า',
    routeSegment: 'receipt',
    badgeClass: 'doc-receipt',
    icon: 'pi pi-download',
    // What posting the document does to stock — shown to the operator before
    // they confirm, since posting cannot be undone.
    effect: 'เพิ่มสต๊อก',
    api: {
      list: apiGetReceipts, get: apiGetReceipt, create: apiCreateReceipt,
      update: apiUpdateReceipt, replaceItems: apiReplaceReceiptItems, cancel: apiCancelReceipt,
    },
  },
  requisition: {
    key: 'requisition',
    label: 'ใบเบิก-จ่าย',
    shortLabel: 'เบิก-จ่าย',
    routeSegment: 'requisition',
    badgeClass: 'doc-requisition',
    icon: 'pi pi-upload',
    effect: 'ตัดสต๊อก',
    api: {
      list: apiGetRequisitions, get: apiGetRequisition, create: apiCreateRequisition,
      update: apiUpdateRequisition, replaceItems: apiReplaceRequisitionItems, cancel: apiCancelRequisition,
    },
  },
  return: {
    key: 'return',
    label: 'ใบคืนสินค้า',
    shortLabel: 'คืนสินค้า',
    routeSegment: 'return',
    badgeClass: 'doc-return',
    icon: 'pi pi-replay',
    effect: 'คืนเข้าสต๊อก',
    api: {
      list: apiGetStockReturns, get: apiGetStockReturn, create: apiCreateStockReturn,
      update: apiUpdateStockReturn, replaceItems: apiReplaceStockReturnItems, cancel: apiCancelStockReturn,
    },
  },
}

/**
 * `DRAFT → IN_PROCESS → SUCCESS` is forward-only, and entering `SUCCESS` is what
 * moves stock. `CANCELED` is reached only by deleting a draft or in-process
 * document. The labels spell out that "สำเร็จ" already touched stock, because
 * that step cannot be taken back.
 */
export const DOC_STATUSES = {
  DRAFT: { label: 'ร่าง', class: 'doc-status-draft', icon: 'pi pi-file-edit' },
  IN_PROCESS: { label: 'รออนุมัติ', class: 'doc-status-pending', icon: 'pi pi-clock' },
  SUCCESS: { label: 'สำเร็จ', class: 'doc-status-approved', icon: 'pi pi-check-circle' },
  CANCELED: { label: 'ยกเลิก', class: 'doc-status-cancelled', icon: 'pi pi-times-circle' },
}

export function statusLabel(status) { return DOC_STATUSES[status]?.label || status || '-' }
export function statusClass(status) { return DOC_STATUSES[status]?.class || 'doc-status-draft' }
export function statusIcon(status) { return DOC_STATUSES[status]?.icon || 'pi pi-file' }

/** Header fields are editable only while the document is still a draft. */
export function isEditable(doc) { return doc?.status === 'DRAFT' }
/** A posted document has already moved stock and can no longer be cancelled. */
export function isCancellable(doc) { return doc?.status === 'DRAFT' || doc?.status === 'IN_PROCESS' }

function emptyList() {
  return { data: [], page: 1, limit: 20, total: 0, totalPages: 0 }
}

export const useStockDocumentStore = defineStore('stockDocuments', () => {
  // One list slot per kind, so switching tabs does not discard the other pages.
  const lists = ref({ receipt: emptyList(), requisition: emptyList(), return: emptyList() })
  const listLoading = ref({ receipt: false, requisition: false, return: false })
  const current = ref(null)
  const currentLoading = ref(false)
  const saving = ref(false)

  function apiFor(kind) {
    const config = DOC_KINDS[kind]
    if (!config) throw new Error(`Unknown stock document kind: ${kind}`)
    return config.api
  }

  async function fetchList(kind, params = {}) {
    listLoading.value[kind] = true
    try {
      const { data } = await apiFor(kind).list(params)
      lists.value[kind] = data
      return data
    } finally {
      listLoading.value[kind] = false
    }
  }

  async function fetchOne(kind, id) {
    currentLoading.value = true
    try {
      const { data } = await apiFor(kind).get(id)
      current.value = data
      return data
    } finally {
      currentLoading.value = false
    }
  }

  /** Creates the document and its lines in one call; it starts as `DRAFT`. */
  async function create(kind, payload) {
    saving.value = true
    try {
      const { data } = await apiFor(kind).create(payload)
      return data
    } finally {
      saving.value = false
    }
  }

  async function update(kind, id, payload) {
    saving.value = true
    try {
      const { data } = await apiFor(kind).update(id, payload)
      if (current.value?.id === id) current.value = data
      return data
    } finally {
      saving.value = false
    }
  }

  async function replaceItems(kind, id, items) {
    saving.value = true
    try {
      const { data } = await apiFor(kind).replaceItems(id, items)
      if (current.value?.id === id) current.value = data
      return data
    } finally {
      saving.value = false
    }
  }

  /** Sends a draft for approval. */
  function submit(kind, id) { return update(kind, id, { status: 'IN_PROCESS' }) }

  /**
   * Posts the document: the balance updates, the movement rows and the status
   * flip all commit together, so a rejected line (insufficient stock) rolls the
   * whole thing back and the document stays where it was.
   */
  function post(kind, id) { return update(kind, id, { status: 'SUCCESS' }) }

  /** Cancels a draft or in-process document (sets CANCELED and soft-deletes). */
  async function cancel(kind, id) {
    saving.value = true
    try {
      await apiFor(kind).cancel(id)
      const list = lists.value[kind]
      list.data = list.data.filter((doc) => doc.id !== id)
      if (current.value?.id === id) current.value = { ...current.value, status: 'CANCELED' }
    } finally {
      saving.value = false
    }
  }

  /** Creates a document and immediately walks it to `status`, in that order. */
  async function createAs(kind, payload, status) {
    const created = await create(kind, payload)
    if (status === 'DRAFT') return created
    return update(kind, created.id, { status })
  }

  return {
    lists, listLoading, current, currentLoading, saving,
    fetchList, fetchOne, create, update, replaceItems,
    submit, post, cancel, createAs,
  }
})
