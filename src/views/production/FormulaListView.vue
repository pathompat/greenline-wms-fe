<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">สูตร / BOM</div>
        <div class="page-subtitle">จัดการสูตรการผลิตทั้งหมด ({{ filtered.length }} สูตร)</div>
      </div>
      <RouterLink to="/production/formulas/create">
        <Button label="เพิ่มสูตร" icon="pi pi-plus" class="btn-primary" />
      </RouterLink>
    </div>

    <div class="page-card">
      <div class="toolbar">
        <span class="p-input-icon-left search-wrap">
          <i class="pi pi-search" />
          <InputText v-model="search" placeholder="ค้นหารหัส / ชื่อสูตร..." style="padding-left:2.2rem; width:280px;" />
        </span>
        <Dropdown v-model="filterActive" :options="activeOptions" optionLabel="label" optionValue="value"
          placeholder="ทุกสถานะ" showClear style="width:150px;" />
      </div>

      <DataTable :value="filtered" :paginator="true" :rows="15" :loading="loading"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
        currentPageReportTemplate="{first}–{last} จาก {totalRecords}" size="small" stripedRows>
        <template #empty>
          <div class="empty-state">ไม่มีข้อมูลสูตร</div>
        </template>
        <Column field="code" header="รหัส" style="width:120px; font-family:monospace; font-size:12px;" sortable />
        <Column field="name" header="ชื่อสูตร" sortable />
        <Column header="ประเภทอาหาร" style="width:120px;">
          <template #body="{ data }">{{ animalLabel(data.animalType) }}</template>
        </Column>
        <Column header="บรรจุภัณฑ์" style="width:140px;">
          <template #body="{ data }">{{ packagingLabel(data.packagingType) }}</template>
        </Column>
        <Column header="สถานะ" style="width:100px;">
          <template #body="{ data }">
            <span :class="['status-badge', data.active ? 'status-fg' : 'status-hold']">
              {{ data.active ? 'ใช้งาน' : 'ปิดใช้' }}
            </span>
          </template>
        </Column>
        <Column header="จัดการ" style="width:110px;">
          <template #body="{ data }">
            <div class="action-btns">
              <RouterLink :to="`/production/formulas/${data.id}/edit`">
                <Button icon="pi pi-pencil" size="small" text rounded />
              </RouterLink>
              <Button icon="pi pi-trash" size="small" text rounded severity="danger" @click="confirmDelete(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useProductionStore } from '@/stores/production'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const productionStore = useProductionStore()
const confirm = useConfirm()
const toast = useToast()

const loading = ref(false)

async function fetchFormulas() {
  loading.value = true
  try {
    await productionStore.fetchFormulas()
  } catch {
    toast.add({ severity: 'error', summary: 'โหลดข้อมูลล้มเหลว', life: 3000 })
  } finally {
    loading.value = false
  }
}

onMounted(fetchFormulas)

const search = ref('')
const filterActive = ref(null)

const activeOptions = [
  { label: 'ใช้งาน', value: true },
  { label: 'ปิดใช้', value: false },
]

const filtered = computed(() =>
  productionStore.formulas.filter(f => {
    const q = search.value.toLowerCase()
    const matchText = !q || (f.code || '').toLowerCase().includes(q) || f.name.toLowerCase().includes(q)
    const matchActive = filterActive.value === null || f.active === filterActive.value
    return matchText && matchActive
  })
)

function animalLabel(t) {
  return { dog: 'หมา', cat: 'แมว' }[t] || '—'
}
function packagingLabel(t) {
  return { can: 'Can', spout_pouch: 'Spout pouch' }[t] || '—'
}

function confirmDelete(formula) {
  confirm.require({
    message: `ต้องการลบสูตร "${formula.name}" ใช่หรือไม่?`,
    header: 'ยืนยันการลบ',
    icon: 'pi pi-trash',
    acceptLabel: 'ลบสูตร',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await productionStore.deleteFormula(formula.id)
        toast.add({ severity: 'success', summary: 'ลบสำเร็จ', detail: formula.name, life: 3000 })
      } catch (e) {
        const msg = e.response?.data?.message || 'เกิดข้อผิดพลาด'
        toast.add({ severity: 'error', summary: Array.isArray(msg) ? msg.join(', ') : msg, life: 4000 })
      }
    }
  })
}
</script>

<style scoped>
.search-wrap { display: flex; align-items: center; position: relative; }
.search-wrap i { position: absolute; left: 0.75rem; z-index: 1; color: var(--gl-text-muted); }
.action-btns { display: flex; gap: 4px; }
.empty-state { text-align: center; padding: 24px; color: var(--gl-text-muted); font-size: 14px; }
.mixsize-chip {
  background: #e0f2fe;
  color: #0369a1;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
