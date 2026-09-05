import { computed, ref, unref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { DOC_KINDS, useStockDocumentStore } from '@/stores/stockDocuments'

/**
 * The save side of the three stock-document forms. They differ in what a line
 * looks like and what has to be true before it can be saved, so validation and
 * payload building stay in each view; everything after that — creating or
 * updating, walking the document to a status, confirming the irreversible step,
 * reporting the outcome — is identical and lives here.
 *
 * @param {'receipt'|'requisition'|'return'} kind
 * @param {object} hooks
 * @param {() => string|null} hooks.validate  message to show, or null when valid
 * @param {() => object} hooks.buildPayload   the create/update body
 * @param {import('vue').Ref<number|null>} [hooks.documentId]
 *   The draft being edited; absent or null means this is a new document.
 */
export function useStockDocumentForm(kind, { validate, buildPayload, documentId }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const store = useStockDocumentStore()
  const config = DOC_KINDS[kind]

  const saving = ref(false)
  const isEditing = computed(() => !!unref(documentId))

  const SAVE_SUMMARY = {
    DRAFT: 'บันทึกฉบับร่างแล้ว',
    IN_PROCESS: 'ส่งอนุมัติแล้ว',
    SUCCESS: `${config.effect}เรียบร้อยแล้ว`,
  }

  function warn(message) {
    toast.add({ severity: 'warn', summary: message, life: 3500 })
  }

  function reportError(error, fallback) {
    // Nest sends `message` as a string or an array of validation failures.
    const raw = error.response?.data?.message
    const detail = Array.isArray(raw) ? raw.join(', ') : raw || error.message
    toast.add({ severity: 'error', summary: fallback, detail, life: 6000 })
  }

  /**
   * Writes an existing draft back.
   *
   * The header and the lines are separate endpoints and both are `DRAFT`-only,
   * so they have to land before any status change — hence the fixed order.
   */
  async function updateDraft(id, targetStatus) {
    const { items, ...header } = buildPayload()
    await store.update(kind, id, header)
    const saved = await store.replaceItems(kind, id, items)
    if (targetStatus !== 'DRAFT') {
      return store.update(kind, id, { status: targetStatus })
    }
    return saved
  }

  /** Saves the form and walks the document to `targetStatus`. */
  async function save(targetStatus) {
    const problem = validate()
    if (problem) {
      warn(problem)
      return null
    }

    saving.value = true
    try {
      const id = unref(documentId)
      const doc = id
        ? await updateDraft(id, targetStatus)
        : await store.createAs(kind, buildPayload(), targetStatus)
      toast.add({
        severity: 'success',
        summary: SAVE_SUMMARY[targetStatus],
        detail: `${config.label} ${doc.docNo}`,
        life: 4000,
      })
      // Editing returns to the document just saved; creating goes to the list,
      // where the new document is the one at the top.
      router.push(id ? `/documents/${kind}/${id}` : `/documents/${kind}`)
      return doc
    } catch (error) {
      reportError(error, `บันทึก${config.label}ไม่สำเร็จ`)
      return null
    } finally {
      saving.value = false
    }
  }

  function saveDraft() {
    return save('DRAFT')
  }

  function submit() {
    return save('IN_PROCESS')
  }

  /**
   * Posting moves stock and cannot be undone — a posted document is locked — so
   * the operator is told exactly what will happen before it runs.
   */
  function confirmAndPost() {
    const problem = validate()
    if (problem) {
      warn(problem)
      return
    }
    confirm.require({
      header: `ยืนยัน${config.effect}`,
      message: `ระบบจะบันทึก${config.label}และ${config.effect}ทันที เมื่อทำแล้วจะแก้ไขหรือยกเลิกไม่ได้ ต้องการดำเนินการต่อหรือไม่?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: `ยืนยัน ${config.effect}`,
      rejectLabel: 'ยกเลิก',
      acceptClass: 'btn-primary',
      accept: () => save('SUCCESS'),
    })
  }

  return { saving, isEditing, saveDraft, submit, confirmAndPost, reportError, warn }
}
