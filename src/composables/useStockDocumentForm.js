import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { DOC_KINDS, useStockDocumentStore } from '@/stores/stockDocuments'

/**
 * The save side of the three stock-document forms. They differ in what a line
 * looks like and what has to be true before it can be saved, so validation and
 * payload building stay in each view; everything after that — walking the
 * document to a status, confirming the irreversible step, reporting the outcome
 * — is identical and lives here.
 *
 * @param {'receipt'|'requisition'|'return'} kind
 * @param {object} hooks
 * @param {() => string|null} hooks.validate  message to show, or null when valid
 * @param {() => object} hooks.buildPayload   the create/update body
 */
export function useStockDocumentForm(kind, { validate, buildPayload }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const store = useStockDocumentStore()
  const config = DOC_KINDS[kind]

  const saving = ref(false)

  const SUCCESS_SUMMARY = {
    DRAFT: 'บันทึกฉบับร่างแล้ว',
    IN_PROCESS: 'ส่งอนุมัติแล้ว',
    SUCCESS: 'บันทึกและตัดสต๊อกแล้ว',
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
   * Creates the document and walks it to `targetStatus`.
   * `SUCCESS` posts it to stock, which is why it asks first.
   */
  async function save(targetStatus) {
    const problem = validate()
    if (problem) {
      warn(problem)
      return null
    }

    saving.value = true
    try {
      const doc = await store.createAs(kind, buildPayload(), targetStatus)
      toast.add({
        severity: 'success',
        summary: SUCCESS_SUMMARY[targetStatus],
        detail: `${config.label} ${doc.docNo}`,
        life: 4000,
      })
      router.push('/documents')
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
      acceptClass: 'p-button-danger',
      accept: () => save('SUCCESS'),
    })
  }

  return { saving, saveDraft, submit, confirmAndPost, reportError, warn }
}
