<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">สินค้า / SKU</div>
        <div class="page-subtitle">จัดการรายการสินค้าทั้งหมด ({{ masterStore.productListMeta.total }} รายการ)</div>
      </div>
      <RouterLink to="/master/products/create">
        <Button label="เพิ่มสินค้า" icon="pi pi-plus" class="btn-primary" />
      </RouterLink>
    </div>

    <div class="page-card">
      <!-- Toolbar -->
      <div class="toolbar">
        <span class="p-input-icon-left search-wrap">
          <i class="pi pi-search" />
          <InputText v-model="search" placeholder="ค้นหาชื่อสินค้า..." style="padding-left: 2.2rem; width: 280px;" />
        </span>
        <Dropdown
          v-model="filterCategory"
          :options="categoryOptions"
          optionLabel="name"
          optionValue="id"
          placeholder="ทุกประเภท"
          showClear
          style="width: 180px;"
        />
      </div>

      <DataTable
        :value="masterStore.productList"
        lazy
        :paginator="true"
        :rows="masterStore.productListMeta.limit"
        :first="first"
        :totalRecords="masterStore.productListMeta.total"
        :rowsPerPageOptions="[15, 20, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="{first}–{last} จาก {totalRecords}"
        size="small"
        stripedRows
        :loading="masterStore.productListLoading"
        @page="onPage"
      >
        <template #empty>
          <div class="empty-state">ไม่มีข้อมูลสินค้า</div>
        </template>
        <Column field="sku" header="SKU" style="width: 110px; font-family: monospace; font-size: 12px;" sortable />
        <Column field="name" header="ชื่อสินค้า" sortable />
        <Column header="ประเภทสินค้า" style="width: 140px;">
          <template #body="{ data }">
            <span class="cat-badge" :style="{ background: getCatColor(data.categoryId) + '22', color: getCatColor(data.categoryId) }">
              {{ getCatName(data.categoryId) }}
            </span>
          </template>
        </Column>
        <Column header="หน่วย" style="width: 80px;">
          <template #body="{ data }">{{ getUnitAbbr(data.unitId) }}</template>
        </Column>
        <Column field="productType" header="Product Type" style="width: 140px;" />
        <Column header="Min Stock" style="width: 100px; text-align: right;">
          <template #body="{ data }">{{ data.minStock }}</template>
        </Column>
        <Column header="Lot" style="width: 70px; text-align: center;">
          <template #body="{ data }">
            <i :class="data.hasLot ? 'pi pi-check-circle' : 'pi pi-minus-circle'"
               :style="{ color: data.hasLot ? 'var(--gl-success)' : 'var(--gl-text-muted)' }" />
          </template>
        </Column>
        <Column header="จัดการ" style="width: 110px;">
          <template #body="{ data }">
            <div class="action-btns">
              <RouterLink :to="`/master/products/${data.id}/edit`">
                <Button icon="pi pi-pencil" size="small" text rounded />
              </RouterLink>
              <Button icon="pi pi-trash" size="small" text rounded severity="danger"
                @click="confirmDelete(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useMasterStore } from '@/stores/master'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const masterStore = useMasterStore()
const confirm = useConfirm()
const toast = useToast()

const search = ref('')
const filterCategory = ref(null)

const categoryOptions = computed(() => masterStore.categories)
// Paginator's row offset, derived from the current server page.
const first = computed(() => (masterStore.productListMeta.page - 1) * masterStore.productListMeta.limit)

function getCatName(id) { return masterStore.getCategoryById(id)?.name || '-' }
function getCatColor(id) { return masterStore.getCategoryById(id)?.color || '#888' }
function getUnitAbbr(id) { return masterStore.getUnitById(id)?.abbr || '-' }

// Fetch one server page with the current filters applied.
// Note: the backend ignores name/SKU terms of 3 characters or fewer.
function loadPage(page = 1, limit = masterStore.productListMeta.limit) {
  return masterStore
    .fetchProductList({
      page,
      limit,
      title: search.value,
      categoryIds: filterCategory.value ? [filterCategory.value] : [],
    })
    .catch(() => toast.add({ severity: 'error', summary: 'โหลดข้อมูลล้มเหลว', life: 3000 }))
}

function onPage(e) {
  // e.page is 0-based; e.rows is the (possibly changed) page size.
  loadPage(e.page + 1, e.rows)
}

// Search (debounced) and category filter both reset back to the first page.
watchDebounced(search, () => loadPage(1), { debounce: 400 })
watchDebounced(filterCategory, () => loadPage(1), { debounce: 0 })

onMounted(() => {
  loadPage(1)
  if (!masterStore.categories.length) masterStore.fetchCategories()
  if (!masterStore.units.length) masterStore.fetchUnits()
})

function confirmDelete(product) {
  confirm.require({
    message: `ต้องการลบสินค้า "${product.name}" ใช่หรือไม่?`,
    header: 'ยืนยันการลบ',
    icon: 'pi pi-trash',
    acceptLabel: 'ลบสินค้า',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await masterStore.deleteProduct(product.id)
        toast.add({ severity: 'success', summary: 'ลบสำเร็จ', detail: product.name, life: 3000 })
        // If the deleted row was the last one on this page, step back a page.
        const m = masterStore.productListMeta
        const page = masterStore.productList.length <= 1 && m.page > 1 ? m.page - 1 : m.page
        await loadPage(page)
      } catch (e) {
        const msg = e.response?.data?.message || 'เกิดข้อผิดพลาด'
        toast.add({ severity: 'error', summary: msg, life: 4000 })
      }
    }
  })
}
</script>

<style scoped>
.search-wrap { display: flex; align-items: center; position: relative; }
.search-wrap i { position: absolute; left: 0.75rem; z-index: 1; color: var(--gl-text-muted); }
.cat-badge { padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; }
.action-btns { display: flex; gap: 4px; }
.text-danger { color: var(--gl-red); font-weight: 600; }
.empty-state { text-align: center; padding: 24px; color: var(--gl-text-muted); font-size: 14px; }
</style>
