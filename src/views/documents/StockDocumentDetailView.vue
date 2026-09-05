<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">
          {{ config.label }}
          <span v-if="doc" class="mono doc-no">{{ doc.docNo }}</span>
        </div>
        <div class="page-subtitle">
          รายละเอียดเอกสาร — การอนุมัติขั้นสุดท้ายจะ{{ config.effect }}ทันที
        </div>
      </div>
      <div class="header-actions">
        <RouterLink :to="`/documents/${kind}`">
          <Button label="ย้อนกลับ" icon="pi pi-arrow-left" outlined />
        </RouterLink>
        <RouterLink v-if="doc?.status === 'DRAFT'" :to="`/documents/${kind}/${doc.id}/edit`">
          <Button label="แก้ไข" icon="pi pi-pencil" outlined />
        </RouterLink>
        <Button
          v-if="doc?.status === 'DRAFT'"
          label="ส่งอนุมัติ"
          icon="pi pi-send"
          outlined
          :loading="docStore.saving"
          @click="changeStatus('IN_PROCESS')"
        />
        <!--
          A draft can be posted without passing through approval: the backend
          only forbids moving a status backwards, so DRAFT → SUCCESS is a legal
          jump and is what "create and post" already does.
        -->
        <Button
          v-if="doc?.status === 'DRAFT' || doc?.status === 'IN_PROCESS'"
          :label="config.postLabel"
          icon="pi pi-check-circle"
          class="btn-primary"
          :loading="docStore.saving"
          @click="confirmPost"
        />
        <Button
          v-if="canCancel"
          label="ยกเลิกเอกสาร"
          icon="pi pi-times"
          outlined
          severity="danger"
          :loading="docStore.saving"
          @click="confirmCancel"
        />
      </div>
    </div>

    <div v-if="docStore.currentLoading" class="page-card loading-card">
      <i class="pi pi-spin pi-spinner" /> กำลังโหลดเอกสาร...
    </div>

    <div v-else-if="doc" class="page-card">
      <!-- Where the document is in its lifecycle -->
      <div class="status-track">
        <div
          v-for="step in statusSteps"
          :key="step.value"
          :class="['track-step', trackStepClass(step.value)]"
        >
          <i :class="step.icon" />
          <span>{{ step.label }}</span>
        </div>
        <span v-if="doc.status === 'CANCELED'" class="status-badge doc-status-cancelled cancel-flag">
          <i class="pi pi-times-circle" /> ยกเลิกแล้ว
        </span>
        <span v-else-if="doc.status === 'SUCCESS'" class="posted-note">
          <i class="pi pi-lock" /> ตัดสต๊อกแล้ว — แก้ไขไม่ได้
        </span>
      </div>

      <div class="doc-info-grid">
        <div class="doc-info-item">
          <span class="di-label">เลขที่เอกสาร</span>
          <span class="di-val mono">{{ doc.docNo }}</span>
        </div>
        <div class="doc-info-item">
          <span class="di-label">ประเภท</span>
          <span :class="['status-badge', config.badgeClass]">
            <i :class="config.icon" /> {{ config.shortLabel }}
          </span>
        </div>
        <div class="doc-info-item">
          <span class="di-label">สถานะ</span>
          <span :class="['status-badge', statusClass(doc.status)]">
            <i :class="statusIcon(doc.status)" /> {{ statusLabel(doc.status) }}
          </span>
        </div>
        <div class="doc-info-item">
          <span class="di-label">คลัง</span>
          <span class="di-val">{{ warehouseName(doc.warehouseId) }}</span>
        </div>
        <div class="doc-info-item">
          <span class="di-label">วันที่เอกสาร</span>
          <span class="di-val">{{ formatThaiDate(doc.docDate) }}</span>
        </div>
        <div v-if="kind === 'receipt'" class="doc-info-item">
          <span class="di-label">Supplier</span>
          <span class="di-val">{{ supplierName(doc.supplierId) }}</span>
        </div>
        <div class="doc-info-item">
          <span class="di-label">สร้างเมื่อ</span>
          <span class="di-val">{{ formatThaiDateTime(doc.createdAt) }}</span>
        </div>
        <div class="doc-info-item form-full">
          <span class="di-label">หมายเหตุ</span>
          <span class="di-val">{{ doc.remark || '—' }}</span>
        </div>
      </div>

      <div class="divider" />

      <h3 class="items-title">
        รายการสินค้า
        <span class="count-pill">{{ doc.items?.length || 0 }}</span>
      </h3>

      <DataTable :value="doc.items" size="small" stripedRows class="mt-8">
        <template #empty>
          <div class="empty-items"><i class="pi pi-inbox" /> เอกสารนี้ยังไม่มีรายการ</div>
        </template>

        <Column header="#" style="width: 44px">
          <template #body="{ index }">{{ index + 1 }}</template>
        </Column>

        <Column header="สินค้า">
          <template #body="{ data }">
            <div class="prod-name">{{ productName(data.productId) }}</div>
            <div class="prod-sub mono">{{ productSku(data.productId) }}</div>
          </template>
        </Column>

        <Column header="Lot" style="width: 230px">
          <template #body="{ data }">
            <template v-if="data.lot">
              <div class="mono lot-no">{{ data.lot.lotNo }}</div>
              <div v-if="data.lot.expiryDate" class="prod-sub">
                หมดอายุ {{ formatThaiDate(data.lot.expiryDate) }}
              </div>
            </template>
            <!-- A draft receipt has a typed batch number but no lot row yet. -->
            <template v-else-if="data.lotNo">
              <div class="mono lot-no">{{ data.lotNo }}</div>
              <div class="prod-sub">จะสร้าง Lot เมื่อรับเข้า</div>
            </template>
            <span v-else class="muted">—</span>
          </template>
        </Column>

        <Column header="จำนวน" style="width: 140px">
          <template #body="{ data }">
            <span class="qty-ok">{{ formatQty(data.quantity) }}</span>
            <span class="unit"> {{ unitCodeOf(data.productId) }}</span>
          </template>
        </Column>

        <Column v-if="kind === 'receipt'" header="ต้นทุน/หน่วย" style="width: 130px">
          <template #body="{ data }">
            <span class="muted">{{ data.unitCost != null ? formatQty(data.unitCost) : '—' }}</span>
          </template>
        </Column>
      </DataTable>
    </div>

    <div v-else class="page-card empty-items">
      <i class="pi pi-exclamation-triangle" />
      <div>ไม่พบเอกสารนี้ หรืออาจถูกยกเลิกไปแล้ว</div>
      <RouterLink :to="`/documents/${kind}`">
        <Button label="กลับไปหน้ารายการ" text />
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useMasterStore } from '@/stores/master'
import {
  DOC_KINDS,
  useStockDocumentStore,
  statusClass,
  statusIcon,
  statusLabel,
} from '@/stores/stockDocuments'
import { formatThaiDate, formatThaiDateTime } from '@/utils/date'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const route = useRoute()
const toast = useToast()
const confirm = useConfirm()
const masterStore = useMasterStore()
const docStore = useStockDocumentStore()

/** Which of the three documents this page is showing; set on the route. */
const kind = computed(() => route.meta.docKind)

// The final step reads differently per document, because what it does differs.
const POST_LABELS = {
  receipt: 'รับเข้าและเพิ่มสต๊อก',
  requisition: 'จ่ายของ (ตัดสต๊อก)',
  return: 'รับคืนเข้าสต๊อก',
}
const DONE_LABELS = { receipt: 'รับเข้าแล้ว', requisition: 'จ่ายแล้ว', return: 'คืนแล้ว' }

const config = computed(() => ({
  ...DOC_KINDS[kind.value],
  postLabel: POST_LABELS[kind.value],
}))

const statusSteps = computed(() => [
  { value: 'DRAFT', label: 'ร่าง', icon: 'pi pi-file-edit' },
  { value: 'IN_PROCESS', label: 'รออนุมัติ', icon: 'pi pi-clock' },
  { value: 'SUCCESS', label: DONE_LABELS[kind.value], icon: 'pi pi-check-circle' },
])

const doc = computed(() => docStore.current)
const canCancel = computed(() => doc.value?.status === 'DRAFT' || doc.value?.status === 'IN_PROCESS')

function trackStepClass(step) {
  if (doc.value?.status === 'CANCELED') return 'muted-step'
  const order = ['DRAFT', 'IN_PROCESS', 'SUCCESS']
  const current = order.indexOf(doc.value?.status)
  const index = order.indexOf(step)
  if (index < current) return 'done'
  if (index === current) return 'current'
  return ''
}

function productName(id) {
  return masterStore.getProductById(id)?.name || '(ไม่พบสินค้า)'
}
function productSku(id) {
  return masterStore.getProductById(id)?.sku || '-'
}
function unitCodeOf(productId) {
  return masterStore.getUnitById(masterStore.getProductById(productId)?.unitId)?.code || ''
}
function warehouseName(id) {
  return masterStore.getWarehouseById(id)?.name || `คลัง #${id}`
}
function supplierName(id) {
  return id ? masterStore.getSupplierById(id)?.name || `Supplier #${id}` : '—'
}
function formatQty(value) {
  return Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 4 })
}

function reportError(error, summary) {
  const raw = error.response?.data?.message
  toast.add({
    severity: 'error',
    summary,
    detail: Array.isArray(raw) ? raw.join(', ') : raw || error.message,
    life: 6000,
  })
}

async function changeStatus(status) {
  try {
    await docStore.update(kind.value, doc.value.id, { status })
    toast.add({
      severity: 'success',
      summary: status === 'SUCCESS' ? `${config.value.effect}เรียบร้อยแล้ว` : 'ส่งอนุมัติแล้ว',
      detail: doc.value.docNo,
      life: 4000,
    })
  } catch (error) {
    reportError(error, 'ดำเนินการไม่สำเร็จ')
  }
}

function confirmPost() {
  confirm.require({
    header: `ยืนยัน${config.value.effect}`,
    message: `ระบบจะ${config.value.effect}ตามรายการในเอกสารนี้ทันที เมื่อทำแล้วจะแก้ไขหรือยกเลิกไม่ได้ ต้องการดำเนินการต่อหรือไม่?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: `ยืนยัน ${config.value.effect}`,
    rejectLabel: 'ยกเลิก',
    acceptClass: 'btn-primary',
    accept: () => changeStatus('SUCCESS'),
  })
}

function confirmCancel() {
  confirm.require({
    header: 'ยกเลิกเอกสาร',
    icon: 'pi pi-times-circle',
    message: `ต้องการยกเลิกเอกสาร ${doc.value.docNo} หรือไม่? เลขที่เอกสารนี้จะถูกปล่อยให้ใช้ซ้ำได้`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'ยกเลิกเอกสาร',
    rejectLabel: 'ไม่',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await docStore.cancel(kind.value, doc.value.id)
        toast.add({ severity: 'success', summary: 'ยกเลิกเอกสารแล้ว', life: 4000 })
      } catch (error) {
        reportError(error, 'ยกเลิกไม่สำเร็จ')
      }
    },
  })
}

async function load() {
  try {
    await docStore.fetchOne(kind.value, route.params.id)
  } catch (error) {
    docStore.current = null
    reportError(error, 'โหลดเอกสารไม่สำเร็จ')
  }
}

onMounted(() => {
  if (!masterStore.warehouses.length) masterStore.fetchWarehouses()
  if (!masterStore.products.length) masterStore.fetchProducts()
  if (!masterStore.units.length) masterStore.fetchUnits()
  if (!masterStore.suppliers.length) masterStore.fetchSuppliers()
  load()
})

// The three detail routes share this component, so navigating between them
// reuses the instance and only the params change.
watch(() => [route.params.id, route.meta.docKind], load)
</script>

<style scoped>
.divider {
  height: 1px;
  background: var(--gl-border);
  margin: 20px 0;
}
.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.doc-no {
  font-size: 15px;
  color: var(--gl-text-muted);
  margin-left: 8px;
}

.status-track {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.track-step {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  background: var(--gl-bg);
  color: var(--gl-text-muted);
  border: 1px solid var(--gl-border);
}
.track-step.done {
  background: #d1fae5;
  color: #065f46;
  border-color: #a7f3d0;
}
.track-step.current {
  background: var(--gl-navy);
  color: #fff;
  border-color: var(--gl-navy);
}
.track-step.muted-step {
  opacity: 0.45;
}
.cancel-flag {
  margin-left: 4px;
}
.posted-note {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 4px;
  font-size: 12px;
  color: var(--gl-text-muted);
}

.doc-info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.doc-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}
.di-label {
  font-size: 11px;
  color: var(--gl-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.di-val {
  font-size: 14px;
  font-weight: 500;
  color: var(--gl-text);
}

.items-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--gl-navy);
  display: flex;
  align-items: center;
  gap: 8px;
}
.count-pill {
  background: var(--gl-navy);
  color: #fff;
  border-radius: 999px;
  padding: 1px 9px;
  font-size: 11px;
  font-weight: 600;
}
.mt-8 {
  margin-top: 10px;
}

.prod-name {
  font-weight: 500;
}
.prod-sub {
  font-size: 11px;
  color: var(--gl-text-muted);
}
.mono {
  font-family: var(--gl-font-mono);
}
.lot-no {
  font-size: 12px;
  color: var(--gl-navy);
  font-weight: 600;
}
.muted {
  color: var(--gl-text-muted);
}
.unit {
  font-size: 11px;
  color: var(--gl-text-muted);
}
.qty-ok {
  font-weight: 600;
  color: var(--gl-navy);
}

.empty-items {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: var(--gl-text-muted);
}
.empty-items .pi-inbox,
.empty-items .pi-exclamation-triangle {
  font-size: 28px;
  opacity: 0.5;
}
.loading-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--gl-text-muted);
  padding: 40px;
}
</style>
