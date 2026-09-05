<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Lot Tracking (FIFO)</div>
        <div class="page-subtitle">
          ติดตาม Lot สินค้า — เรียงตามวันรับเข้า ใช้ของเก่าก่อน (First In First Out)
        </div>
      </div>
      <Button
        icon="pi pi-refresh"
        label="รีเฟรช"
        outlined
        :loading="stockStore.lotListLoading"
        @click="load()"
      />
    </div>

    <div class="page-card">
      <div class="toolbar">
        <span class="search-wrap">
          <i class="pi pi-search" />
          <InputText v-model="lotNo" placeholder="ค้นหา Lot No..." style="padding-left: 2.2rem; width: 220px" />
          <i v-if="lotNo" class="pi pi-times clear-icon" @click="lotNo = ''" />
        </span>

        <span class="search-wrap">
          <i class="pi pi-box" />
          <InputText
            v-model="productName"
            placeholder="ค้นหาชื่อสินค้า..."
            style="padding-left: 2.2rem; width: 240px"
          />
          <i v-if="productName" class="pi pi-times clear-icon" @click="productName = ''" />
        </span>

        <Dropdown
          v-model="status"
          :options="STATUS_OPTIONS"
          optionLabel="label"
          optionValue="value"
          placeholder="ทุกสถานะ"
          showClear
          style="width: 160px"
        />

        <Button
          v-if="hasFilters"
          label="ล้างตัวกรอง"
          icon="pi pi-filter-slash"
          text
          size="small"
          @click="resetFilters"
        />

        <div class="toolbar-right">
          <span class="hint">
            <i class="pi pi-info-circle" />
            กรองด้วยชื่อสินค้าเพื่อดูลำดับ FIFO ของสินค้านั้นโดยเฉพาะ
          </span>
        </div>
      </div>

      <DataTable
        :value="rows"
        size="small"
        stripedRows
        lazy
        :loading="stockStore.lotListLoading"
        :paginator="true"
        :rows="limit"
        :totalRecords="meta.total"
        :first="(meta.page - 1) * limit"
        :rowsPerPageOptions="[20, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="{first}–{last} จาก {totalRecords} Lot"
        @page="onPage"
        :rowClass="rowClass"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-tags" />
            <div>{{ hasFilters ? 'ไม่พบ Lot ที่ตรงกับตัวกรอง' : 'ยังไม่มี Lot ในระบบ' }}</div>
            <Button
              v-if="hasFilters"
              label="ล้างตัวกรอง"
              icon="pi pi-filter-slash"
              text
              size="small"
              @click="resetFilters"
            />
          </div>
        </template>

        <Column header="ลำดับ" style="width: 78px">
          <template #body="{ index }">
            <span :class="['fifo-badge', fifoClass(fifoRank(index))]">#{{ fifoRank(index) }}</span>
          </template>
        </Column>

        <Column header="Lot No." style="width: 210px">
          <template #body="{ data }">
            <span class="lot-no">{{ data.lotNo }}</span>
          </template>
        </Column>

        <Column header="สินค้า">
          <template #body="{ data }">
            <div class="prod-name">{{ data.product.name }}</div>
            <div class="prod-sub mono">{{ data.product.sku }}</div>
          </template>
        </Column>

        <Column header="Supplier" style="width: 180px">
          <template #body="{ data }">
            <template v-if="data.supplier">
              <div>{{ data.supplier.name }}</div>
              <div class="prod-sub mono">{{ data.supplier.code }}</div>
            </template>
            <span v-else class="muted" title="Lot นี้ถูกสร้างอัตโนมัติตอนรับเข้า จึงไม่มี Supplier">
              —
            </span>
          </template>
        </Column>

        <Column header="วันรับเข้า" style="width: 115px">
          <template #body="{ data }">{{ formatDate(data.receivedDate) }}</template>
        </Column>

        <Column header="วันหมดอายุ" style="width: 150px">
          <template #body="{ data }">
            <template v-if="data.expiryDate">
              <span :class="expiryClass(data.expiryDate)">{{ formatDate(data.expiryDate) }}</span>
              <div v-if="expiryNote(data.expiryDate)" class="expiry-note" :class="expiryClass(data.expiryDate)">
                {{ expiryNote(data.expiryDate) }}
              </div>
            </template>
            <span v-else class="muted">—</span>
          </template>
        </Column>

        <Column header="ต้นทุน/หน่วย" style="width: 110px">
          <template #body="{ data }">
            <span class="muted">{{ data.unitCost != null ? formatQty(data.unitCost) : '—' }}</span>
          </template>
        </Column>

        <Column header="คงเหลือ" style="width: 110px">
          <template #body="{ data }">
            <span :class="data.quantity > 0 ? 'qty-ok' : 'muted'">{{ formatQty(data.quantity) }}</span>
          </template>
        </Column>

        <Column header="สถานะ" style="width: 110px">
          <template #body="{ data }">
            <span :class="['status-badge', data.status === 'ACTIVE' ? 'status-fg' : 'doc-status-draft']">
              <i :class="data.status === 'ACTIVE' ? 'pi pi-check-circle' : 'pi pi-minus-circle'" />
              {{ data.status === 'ACTIVE' ? 'ใช้งาน' : 'ใช้หมด' }}
            </span>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { useToast } from 'primevue/usetoast'
import { useStockStore } from '@/stores/stock'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const toast = useToast()
const stockStore = useStockStore()

// The backend derives this from the on-hand quantity; `lots` has no status column.
const STATUS_OPTIONS = [
  { label: 'ใช้งาน (มีของ)', value: 'ACTIVE' },
  { label: 'ใช้หมดแล้ว', value: 'OUT' },
]

/** Days before expiry at which a lot is called out as "ใกล้หมดอายุ". */
const NEAR_EXPIRY_DAYS = 30

const lotNo = ref('')
const productName = ref('')
const status = ref(null)
const page = ref(1)
const limit = ref(20)

const meta = computed(() => stockStore.lotList)
const rows = computed(() => stockStore.lotList.data)
const hasFilters = computed(() => !!lotNo.value || !!productName.value || !!status.value)

async function load() {
  try {
    await stockStore.fetchLotList({
      lotNo: lotNo.value || undefined,
      productName: productName.value || undefined,
      status: status.value ?? undefined,
      page: page.value,
      limit: limit.value,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'โหลดข้อมูล Lot ไม่สำเร็จ',
      detail: error.response?.data?.message || error.message,
      life: 5000,
    })
  }
}

function reload() {
  page.value = 1
  load()
}

function resetFilters() {
  lotNo.value = ''
  productName.value = ''
  status.value = null
  reload()
}

function onPage(event) {
  page.value = event.page + 1
  limit.value = event.rows
  load()
}

watchDebounced([lotNo, productName], reload, { debounce: 350 })
watch(status, reload)

/**
 * The list arrives FIFO-ordered from the server, so a row's position in the
 * whole result set is its consumption order. Filtered to one product, that is
 * exactly the per-product FIFO rank.
 */
function fifoRank(index) {
  return (meta.value.page - 1) * meta.value.limit + index + 1
}

function fifoClass(rank) {
  return rank <= 3 ? `fifo-${rank}` : 'fifo-rest'
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatQty(value) {
  return Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 4 })
}

/** Whole days from today to the expiry date; negative once it has passed. */
function daysToExpiry(value) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(value)
  expiry.setHours(0, 0, 0, 0)
  return Math.round((expiry - today) / 86400000)
}

function expiryClass(value) {
  const days = daysToExpiry(value)
  if (days < 0) return 'text-red'
  if (days <= NEAR_EXPIRY_DAYS) return 'text-orange'
  return ''
}

function expiryNote(value) {
  const days = daysToExpiry(value)
  if (days < 0) return `หมดอายุแล้ว ${Math.abs(days)} วัน`
  if (days === 0) return 'หมดอายุวันนี้'
  if (days <= NEAR_EXPIRY_DAYS) return `เหลือ ${days} วัน`
  return ''
}

/** Only a lot that still holds stock is worth flagging as expiring. */
function rowClass(data) {
  if (data.quantity <= 0 || !data.expiryDate) return ''
  const days = daysToExpiry(data.expiryDate)
  if (days < 0) return 'row-expired'
  if (days <= NEAR_EXPIRY_DAYS) return 'row-near-expiry'
  return ''
}

onMounted(load)
</script>

<style scoped>
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-wrap > .pi-search,
.search-wrap > .pi-box {
  position: absolute;
  left: 0.75rem;
  z-index: 1;
  color: var(--gl-text-muted);
}
.clear-icon {
  position: absolute;
  right: 0.75rem;
  cursor: pointer;
  color: var(--gl-text-muted);
  font-size: 12px;
}
.clear-icon:hover {
  color: var(--gl-red);
}

.toolbar-right {
  margin-left: auto;
}
.hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--gl-text-muted);
}

.lot-no {
  font-family: var(--gl-font-mono);
  font-size: 12px;
  color: var(--gl-navy);
  font-weight: 600;
}
.prod-name {
  font-weight: 500;
}
.prod-sub {
  font-size: 11px;
  color: var(--gl-text-muted);
  margin-top: 2px;
}
.mono {
  font-family: var(--gl-font-mono);
}
.muted {
  color: var(--gl-text-muted);
}

.fifo-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}
.fifo-1 {
  background: #dcfce7;
  color: #14532d;
  border: 1px solid #86efac;
}
.fifo-2 {
  background: #fef9c3;
  color: #713f12;
  border: 1px solid #fde047;
}
.fifo-3 {
  background: #fef2f2;
  color: #7f1d1d;
  border: 1px solid #fca5a5;
}
.fifo-rest {
  background: var(--gl-bg);
  color: var(--gl-text-muted);
}

.qty-ok {
  font-weight: 600;
  color: var(--gl-navy);
}
.text-red {
  color: var(--gl-red);
  font-weight: 600;
}
.text-orange {
  color: var(--gl-warning);
  font-weight: 600;
}
.expiry-note {
  font-size: 11px;
  margin-top: 2px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 36px 12px;
  color: var(--gl-text-muted);
}
.empty-state .pi-tags {
  font-size: 30px;
  opacity: 0.5;
}

:deep(.row-expired) {
  background: #fff5f5 !important;
}
:deep(.row-near-expiry) {
  background: #fffbeb !important;
}
</style>
