<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">ชื่อแบรนด์</div>
        <div class="page-subtitle">จัดการชื่อแบรนด์ ({{ masterStore.brandListMeta.total }} รายการ)</div>
      </div>
      <Button label="เพิ่มแบรนด์" icon="pi pi-plus" class="btn-primary" @click="openDialog()" />
    </div>

    <div class="page-card">
      <div class="toolbar">
        <span class="search-wrap">
          <i class="pi pi-search" />
          <InputText
            v-model="search"
            placeholder='ค้นหาชื่อแบรนด์ หรือชื่อลูกค้า...'
            style="padding-left: 2.2rem; width: 280px"
          />
          <i v-if="search" class="pi pi-times clear-icon" @click="search = ''" />
        </span>
      </div>
      <DataTable
        :value="masterStore.brandList"
        :loading="loading"
        size="small"
        stripedRows
        lazy
        :paginator="true"
        :rows="masterStore.brandListMeta.limit"
        :first="(masterStore.brandListMeta.page - 1) * masterStore.brandListMeta.limit"
        :totalRecords="masterStore.brandListMeta.total"
        :rowsPerPageOptions="[20, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="{first}–{last} จาก {totalRecords} รายการ"
        @page="onPage"
      >
        <template #empty>
          <div class="empty-state">ไม่มีข้อมูลแบรนด์</div>
        </template>
        <Column field="name" header="ชื่อแบรนด์" sortable />
        <Column field="customer" header="ชื่อลูกค้า/บริษัท" sortable>
          <template #body="{ data }">
            {{ data.customer || '—' }}
          </template>
        </Column>
        <Column header="สถานะ" style="width:100px;">
          <template #body="{ data }">
            <span :class="['status-badge', data.isActive ? 'status-fg' : 'status-hold']">
              {{ data.isActive ? 'ใช้งาน' : 'ระงับ' }}
            </span>
          </template>
        </Column>
        <Column header="จัดการ" style="width:100px;">
          <template #body="{ data }">
            <div class="action-btns">
              <Button icon="pi pi-pencil" size="small" text rounded @click="openDialog(data)" />
              <Button icon="pi pi-trash" size="small" text rounded severity="danger" @click="confirmDelete(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="showDialog" :header="editing ? 'แก้ไขแบรนด์' : 'เพิ่มแบรนด์'"
      :modal="true" :style="{ width: '380px' }" :closable="!saving">
      <div class="dialog-form">
        <div>
          <label class="field-label">ชื่อแบรนด์ <span class="req">*</span></label>
          <InputText v-model="form.name" style="width:100%;" placeholder="เช่น Kandy" />
        </div>
        <div>
          <label class="field-label">ชื่อลูกค้า/บริษัท <span class="req">*</span></label>
          <InputText v-model="form.customer" style="width:100%;" placeholder="เช่น บริษัท เอซีเอ็มอี จำกัด" />
        </div>
        <div v-if="editing" class="active-row">
          <label class="field-label" style="margin: 0">สถานะ</label>
          <div class="active-toggle">
            <ToggleSwitch v-model="form.isActive" inputId="isActive" />
            <label for="isActive" style="font-size: 13px; cursor: pointer">
              {{ form.isActive ? 'ใช้งาน' : 'ระงับการใช้งาน' }}
            </label>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="ยกเลิก" outlined @click="showDialog = false" :disabled="saving" />
        <Button :label="editing ? 'บันทึก' : 'เพิ่ม'" class="btn-primary" :loading="saving" @click="handleSave" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useMasterStore } from '@/stores/master'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'

const masterStore = useMasterStore()
const confirm = useConfirm()
const toast = useToast()

const search = ref('')
const loading = ref(false)
const showDialog = ref(false)
const saving = ref(false)
const editing = ref(null)
const form = ref({ name: '', customer: '', isActive: true })

// Fetches one server page; the search term is applied by the backend.
async function loadPage(page = masterStore.brandListMeta.page, limit = masterStore.brandListMeta.limit) {
  loading.value = true
  try {
    await masterStore.fetchBrandList({ page, limit, search: search.value })
  } catch {
    toast.add({ severity: 'error', summary: 'โหลดข้อมูลล้มเหลว', life: 3000 })
  } finally {
    loading.value = false
  }
}

function onPage(e) {
  // e.page is 0-based; e.rows is the (possibly changed) page size.
  loadPage(e.page + 1, e.rows)
}

// Typing hits the server, so wait for a pause and start back at page 1.
watchDebounced(search, () => loadPage(1), { debounce: 400 })

onMounted(() => loadPage(1))

function openDialog(item = null) {
  editing.value = item
  form.value = item
    ? { name: item.name, customer: item.customer || '', isActive: item.isActive }
    : { name: '', customer: '', isActive: true }
  showDialog.value = true
}

async function handleSave() {
  if (!form.value.name?.trim()) {
    toast.add({ severity: 'warn', summary: 'กรุณากรอกชื่อแบรนด์', life: 3000 })
    return
  }
  if (!form.value.customer?.trim()) {
    toast.add({ severity: 'warn', summary: 'กรุณากรอกชื่อลูกค้า/บริษัท', life: 3000 })
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await masterStore.updateBrand(editing.value.id, {
        name: form.value.name,
        customer: form.value.customer || undefined,
        isActive: form.value.isActive,
      })
      toast.add({ severity: 'success', summary: 'แก้ไขสำเร็จ', life: 3000 })
    } else {
      await masterStore.addBrand({ name: form.value.name, customer: form.value.customer || undefined })
      toast.add({ severity: 'success', summary: 'เพิ่มสำเร็จ', life: 3000 })
    }
    await loadPage()
    showDialog.value = false
  } catch (e) {
    const msg = e.response?.data?.message || 'เกิดข้อผิดพลาด'
    toast.add({ severity: 'error', summary: Array.isArray(msg) ? msg.join(', ') : msg, life: 4000 })
  } finally {
    saving.value = false
  }
}

function confirmDelete(item) {
  confirm.require({
    message: `ลบแบรนด์ "${item.name}" ใช่หรือไม่?`,
    header: 'ยืนยันการลบ',
    icon: 'pi pi-trash',
    acceptLabel: 'ลบแบรนด์',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await masterStore.deleteBrand(item.id)
        await loadPage()
        toast.add({ severity: 'success', summary: 'ลบสำเร็จ', life: 3000 })
      } catch (e) {
        const msg = e.response?.data?.message || 'เกิดข้อผิดพลาด'
        toast.add({ severity: 'error', summary: msg, life: 4000 })
      }
    }
  })
}
</script>

<style scoped>
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
.action-btns { display: flex; gap: 4px; }
.dialog-form { display: flex; flex-direction: column; gap: 14px; }
.active-row { display: flex; align-items: center; gap: 16px; }
.active-toggle { display: flex; align-items: center; gap: 8px; }
.empty-state { text-align: center; padding: 24px; color: var(--gl-text-muted); font-size: 14px; }
</style>
