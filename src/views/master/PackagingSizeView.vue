<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">ขนาดบรรจุภัณฑ์</div>
        <div class="page-subtitle">จัดการขนาดบรรจุภัณฑ์ ({{ masterStore.packagingSizeListMeta.total }} รายการ)</div>
      </div>
      <Button label="เพิ่มขนาด" icon="pi pi-plus" class="btn-primary" @click="openDialog()" />
    </div>

    <div class="page-card">
      <div class="toolbar">
        <span class="search-wrap">
          <i class="pi pi-search" />
          <InputText
            v-model="search"
            placeholder='ค้นหาชื่อขนาด หน่วย หรือประเภทบรรจุ...'
            style="padding-left: 2.2rem; width: 280px"
          />
          <i v-if="search" class="pi pi-times clear-icon" @click="search = ''" />
        </span>
      </div>
      <DataTable
        :value="masterStore.packagingSizeList"
        :loading="loading"
        size="small"
        stripedRows
        lazy
        :paginator="true"
        :rows="masterStore.packagingSizeListMeta.limit"
        :first="(masterStore.packagingSizeListMeta.page - 1) * masterStore.packagingSizeListMeta.limit"
        :totalRecords="masterStore.packagingSizeListMeta.total"
        :rowsPerPageOptions="[20, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="{first}–{last} จาก {totalRecords} รายการ"
        @page="onPage"
      >
        <template #empty>
          <div class="empty-state">ไม่มีข้อมูลขนาดบรรจุภัณฑ์</div>
        </template>
        <Column header="ขนาด" sortable>
          <template #body="{ data }">
            {{ data.sizeValue.toLocaleString() }}
          </template>
        </Column>
        <Column header="หน่วย" style="width:120px;">
          <template #body="{ data }">
            {{ data.unit || '-' }}
          </template>
        </Column>
        <Column header="แสดง" style="width:160px;">
          <template #body="{ data }">
            <code class="display-badge">{{ data.label }}</code>
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

    <Dialog v-model:visible="showDialog" :header="editing ? 'แก้ไขขนาดบรรจุภัณฑ์' : 'เพิ่มขนาดบรรจุภัณฑ์'"
      :modal="true" :style="{ width: '380px' }" :closable="!saving">
      <div class="dialog-form">
        <div>
          <label class="field-label">ขนาด <span class="req">*</span></label>
          <InputNumber v-model="form.sizeValue" :min="0" :minFractionDigits="0" :maxFractionDigits="3" style="width:100%;" placeholder="เช่น 70" />
        </div>
        <div>
          <label class="field-label">หน่วย <span class="req">*</span></label>
          <InputText v-model="form.unit" style="width:100%;" placeholder="เช่น g" />
        </div>
        <div>
          <label class="field-label">ป้ายแสดง <span class="req">*</span></label>
          <InputText v-model="form.label" style="width:100%;" placeholder="เช่น 70g bag" />
        </div>
        <div>
          <label class="field-label">ประเภทบรรจุภัณฑ์</label>
          <InputText v-model="form.packagingType" style="width:100%;" placeholder="เช่น ถุง" />
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
import InputNumber from 'primevue/inputnumber'
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
const form = ref(defaultForm())

function defaultForm() {
  return { sizeValue: null, unit: 'g', label: '', packagingType: '', isActive: true }
}

// Fetches one server page; the search term is applied by the backend.
async function loadPage(page = masterStore.packagingSizeListMeta.page, limit = masterStore.packagingSizeListMeta.limit) {
  loading.value = true
  try {
    await masterStore.fetchPackagingSizeList({ page, limit, search: search.value })
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
    ? {
        sizeValue: item.sizeValue,
        unit: item.unit,
        label: item.label,
        packagingType: item.packagingType || '',
        isActive: item.isActive,
      }
    : defaultForm()
  showDialog.value = true
}

async function handleSave() {
  if (!form.value.sizeValue || !form.value.unit || !form.value.label) {
    toast.add({ severity: 'warn', summary: 'กรุณากรอกข้อมูลให้ครบ', life: 3000 })
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await masterStore.updatePackagingSize(editing.value.id, {
        sizeValue: form.value.sizeValue,
        unit: form.value.unit,
        label: form.value.label,
        packagingType: form.value.packagingType || undefined,
        isActive: form.value.isActive,
      })
      toast.add({ severity: 'success', summary: 'แก้ไขสำเร็จ', life: 3000 })
    } else {
      await masterStore.addPackagingSize({
        sizeValue: form.value.sizeValue,
        unit: form.value.unit,
        label: form.value.label,
        packagingType: form.value.packagingType || undefined,
      })
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
    message: `ลบขนาด "${item.label}" ใช่หรือไม่?`,
    header: 'ยืนยันการลบ',
    icon: 'pi pi-trash',
    acceptLabel: 'ลบขนาด',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await masterStore.deletePackagingSize(item.id)
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
.display-badge {
  background: var(--gl-bg);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}
.action-btns { display: flex; gap: 4px; }
.dialog-form { display: flex; flex-direction: column; gap: 14px; }
.active-row { display: flex; align-items: center; gap: 16px; }
.active-toggle { display: flex; align-items: center; gap: 8px; }
.empty-state { text-align: center; padding: 24px; color: var(--gl-text-muted); font-size: 14px; }
</style>
