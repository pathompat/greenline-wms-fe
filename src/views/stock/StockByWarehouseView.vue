<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">สต๊อกแยกคลัง</div>
        <div class="page-subtitle">
          จำนวนคงเหลือของแต่ละสินค้าในคลังที่เลือก — รวมทุก Lot ของสินค้านั้นเข้าด้วยกัน
        </div>
      </div>
      <Button
        icon="pi pi-refresh"
        label="รีเฟรช"
        outlined
        :loading="stockStore.summaryLoading"
        @click="load()"
      />
    </div>

    <!-- Warehouse tabs — the list is always scoped to exactly one warehouse -->
    <div class="wh-tabs">
      <button
        v-for="wh in masterStore.warehouses"
        :key="wh.id"
        :class="['wh-tab', { active: activeWh === wh.id }]"
        @click="selectWarehouse(wh.id)"
      >
        <i class="pi pi-building" />
        {{ wh.name }}
      </button>
      <span v-if="!masterStore.warehouses.length" class="wh-empty">
        <i class="pi pi-spin pi-spinner" /> กำลังโหลดคลัง...
      </span>
    </div>

    <div class="page-card">
      <div class="toolbar">
        <span class="search-wrap">
          <i class="pi pi-search" />
          <InputText
            v-model="search"
            placeholder="ค้นหารหัส หรือ ชื่อสินค้า..."
            style="padding-left: 2.2rem; width: 280px"
          />
          <i v-if="search" class="pi pi-times clear-icon" @click="search = ''" />
        </span>

        <Dropdown
          v-model="filterCategory"
          :options="masterStore.categories"
          optionLabel="name"
          optionValue="id"
          placeholder="ทุกหมวดหมู่"
          showClear
          filter
          style="width: 190px"
        />

        <Dropdown
          v-model="filterProductType"
          :options="productTypes"
          placeholder="ทุกประเภท"
          showClear
          style="width: 170px"
        />

        <ToggleButton
          v-model="lowStockOnly"
          onLabel="เฉพาะที่ต่ำกว่าขั้นต่ำ"
          offLabel="เฉพาะที่ต่ำกว่าขั้นต่ำ"
          onIcon="pi pi-exclamation-triangle"
          offIcon="pi pi-filter"
          class="low-toggle"
        />

        <Button
          v-if="hasFilters"
          label="ล้างตัวกรอง"
          icon="pi pi-filter-slash"
          text
          size="small"
          @click="resetFilters"
        />

      </div>

      <div class="summary-row">
        <span class="summary-label">รวมคงเหลือทุกหน้า</span>
        <span class="summary-value">{{ formatQty(stockStore.summaryTotalQuantity) }}</span>
      </div>

      <DataTable
        :value="rows"
        size="small"
        stripedRows
        lazy
        :loading="stockStore.summaryLoading"
        :paginator="true"
        :rows="limit"
        :totalRecords="meta.total"
        :first="(meta.page - 1) * limit"
        :rowsPerPageOptions="[20, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="{first}–{last} จาก {totalRecords} รายการ"
        :sortField="sortField"
        :sortOrder="sortOrder"
        @page="onPage"
        @sort="onSort"
        :rowClass="rowClass"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-inbox" />
            <div>{{ hasFilters ? 'ไม่พบสินค้าที่ตรงกับตัวกรอง' : 'ยังไม่มีสต๊อกในคลังนี้' }}</div>
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

        <Column field="sku" header="รหัส" style="width: 130px" sortable>
          <template #body="{ data }">
            <span class="mono">{{ data.sku }}</span>
          </template>
        </Column>

        <Column field="name" header="ชื่อสินค้า" sortable>
          <template #body="{ data }">
            <div class="prod-name">{{ data.name }}</div>
            <div v-if="data.hasLot" class="prod-sub">
              <i class="pi pi-tags" /> {{ data.lotCount }} Lot
            </div>
          </template>
        </Column>

        <Column header="หมวดหมู่" style="width: 160px">
          <template #body="{ data }">
            <span class="cat-chip">{{ data.category.name }}</span>
          </template>
        </Column>

        <Column header="ประเภท" style="width: 130px">
          <template #body="{ data }">
            <span :class="['status-badge', productTypeClass(data.productType)]">
              {{ data.productType }}
            </span>
          </template>
        </Column>

        <Column field="quantity" header="คงเหลือ" style="width: 130px" sortable>
          <template #body="{ data }">
            <div class="qty-cell">
              <span :class="data.belowMinStock ? 'qty-low' : 'qty-ok'">
                {{ formatQty(data.quantity) }}
              </span>
              <span class="unit">{{ data.unit.code }}</span>
            </div>
          </template>
        </Column>

        <Column header="ขั้นต่ำ" style="width: 100px">
          <template #body="{ data }">
            <span class="muted">{{ data.minStock > 0 ? formatQty(data.minStock) : '—' }}</span>
          </template>
        </Column>

        <Column header="สถานะ" style="width: 150px">
          <template #body="{ data }">
            <span v-if="data.belowMinStock" class="status-badge status-hold">
              <i class="pi pi-exclamation-circle" /> ต่ำกว่าขั้นต่ำ
            </span>
            <span v-else-if="data.quantity <= 0" class="status-badge doc-status-draft">
              <i class="pi pi-minus-circle" /> หมด
            </span>
            <span v-else class="status-badge status-fg">
              <i class="pi pi-check-circle" /> ปกติ
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
import { useMasterStore } from '@/stores/master'
import { useStockStore } from '@/stores/stock'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import ToggleButton from 'primevue/togglebutton'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const toast = useToast()
const masterStore = useMasterStore()
const stockStore = useStockStore()

const search = ref('')
const filterCategory = ref(null)
const filterProductType = ref(null)
const lowStockOnly = ref(false)
// Always one warehouse; `null` only until the warehouse list has loaded.
const activeWh = ref(null)
const page = ref(1)
const limit = ref(20)
const sortField = ref('name')
const sortOrder = ref(1)

const meta = computed(() => stockStore.summary)
const rows = computed(() => stockStore.summary.data)

// `productType` is a free-form varchar on the backend and this factory files
// its products under Thai labels, so the options are read off the products
// actually in the catalogue rather than hard-coded.
const productTypes = computed(() =>
  [...new Set(masterStore.products.map((p) => p.productType).filter(Boolean))].sort(),
)

const hasFilters = computed(
  () => !!search.value || !!filterCategory.value || !!filterProductType.value || lowStockOnly.value,
)

async function load() {
  // Nothing to ask for until a warehouse is chosen; the tabs pick one as soon
  // as the warehouse list arrives.
  if (activeWh.value === null) return
  try {
    await stockStore.fetchSummary({
      warehouseId: activeWh.value,
      search: search.value || undefined,
      categoryId: filterCategory.value ?? undefined,
      productType: filterProductType.value ?? undefined,
      lowStockOnly: lowStockOnly.value || undefined,
      sortBy: sortField.value,
      sortOrder: sortOrder.value === -1 ? 'DESC' : 'ASC',
      page: page.value,
      limit: limit.value,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'โหลดข้อมูลสต๊อกไม่สำเร็จ',
      detail: error.response?.data?.message || error.message,
      life: 5000,
    })
  }
}

/** Any filter change starts over at page 1 — staying on page 5 of a new result set is confusing. */
function reload() {
  page.value = 1
  load()
}

function selectWarehouse(id) {
  if (activeWh.value === id) return
  activeWh.value = id
  reload()
}

function resetFilters() {
  search.value = ''
  filterCategory.value = null
  filterProductType.value = null
  lowStockOnly.value = false
  reload()
}

function onPage(event) {
  page.value = event.page + 1
  limit.value = event.rows
  load()
}

function onSort(event) {
  sortField.value = event.sortField || 'name'
  sortOrder.value = event.sortOrder || 1
  reload()
}

// Typing hits the server, so wait for a pause rather than firing per keystroke.
watchDebounced(search, reload, { debounce: 350 })
watch([filterCategory, filterProductType, lowStockOnly], reload)

function formatQty(value) {
  const n = Number(value || 0)
  // Quantities are numeric(12,3); show decimals only when there are any.
  return n.toLocaleString('th-TH', { maximumFractionDigits: 3 })
}

// Known codes keep their colour; anything else gets a neutral chip.
function productTypeClass(type) {
  return { RM: 'status-rm', Semi: 'status-semi', FG: 'status-fg' }[type] || 'doc-status-draft'
}

function rowClass(data) {
  return data.belowMinStock ? 'row-low-stock' : ''
}

onMounted(async () => {
  if (!masterStore.categories.length) masterStore.fetchCategories()
  // The product cache is what the "ประเภท" filter offers.
  if (!masterStore.products.length) masterStore.fetchProducts()
  if (!masterStore.warehouses.length) await masterStore.fetchWarehouses()
  if (activeWh.value === null && masterStore.warehouses.length) {
    activeWh.value = masterStore.warehouses[0].id
  }
  load()
})
</script>

<style scoped>
.wh-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.wh-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 8px;
  border: 1px solid var(--gl-border);
  background: var(--gl-surface);
  cursor: pointer;
  font-family: var(--gl-font);
  font-size: 13px;
  color: var(--gl-text-muted);
  transition: all 0.15s;
}
.wh-tab:hover {
  background: var(--gl-bg);
}
.wh-tab.active {
  background: var(--gl-navy);
  color: #fff;
  border-color: var(--gl-navy);
}
.wh-empty {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 4px;
  font-size: 13px;
  color: var(--gl-text-muted);
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-wrap > .pi-search {
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

.low-toggle :deep(.p-togglebutton-checked) {
  background: var(--gl-red-light);
  color: var(--gl-red);
  border-color: var(--gl-red);
}

/* Its own row under the filters: in the toolbar it was the first thing to wrap
   and ended up colliding with the table. */
.summary-row {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 2px 12px;
}
.summary-label {
  font-size: 12px;
  color: var(--gl-text-muted);
}
.summary-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--gl-navy);
  font-variant-numeric: tabular-nums;
}

.mono {
  font-family: var(--gl-font-mono);
  font-size: 12px;
  color: var(--gl-navy);
}
.prod-name {
  font-weight: 500;
}
.prod-sub {
  font-size: 11px;
  color: var(--gl-text-muted);
  margin-top: 2px;
}
.cat-chip {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  background: var(--gl-bg);
  color: var(--gl-text-muted);
}

.qty-cell {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 5px;
}
.qty-low {
  color: var(--gl-red);
  font-weight: 700;
}
.qty-ok {
  color: var(--gl-navy);
  font-weight: 600;
}
.unit {
  font-size: 11px;
  color: var(--gl-text-muted);
}
.muted {
  color: var(--gl-text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 36px 12px;
  color: var(--gl-text-muted);
}
.empty-state .pi-inbox {
  font-size: 30px;
  opacity: 0.5;
}

:deep(.row-low-stock) {
  background: #fffbfb !important;
}
</style>
