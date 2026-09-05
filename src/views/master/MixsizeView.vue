<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Mixsize</div>
        <div class="page-subtitle">จัดการขนาด Mixsize ({{ masterStore.mixsizes.length }} รายการ)</div>
      </div>
      <Button label="เพิ่ม Mixsize" icon="pi pi-plus" class="btn-primary" @click="openDialog()" />
    </div>

    <div class="page-card">
      <DataTable :value="masterStore.mixsizes" size="small" stripedRows>
        <Column header="ขนาด" sortable>
          <template #body="{ data }">
            {{ data.size.toLocaleString() }}
          </template>
        </Column>
        <Column header="หน่วย" style="width:180px;">
          <template #body="{ data }">
            {{ getUnitName(data.unitId) }}
          </template>
        </Column>
        <Column header="แสดง" style="width:140px;">
          <template #body="{ data }">
            <code class="display-badge">{{ getMixsizeLabel(data) }}</code>
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

    <Dialog v-model:visible="showDialog" :header="editing ? 'แก้ไข Mixsize' : 'เพิ่ม Mixsize'"
      :modal="true" :style="{ width: '380px' }">
      <div class="dialog-form">
        <div>
          <label class="field-label">ขนาด Mixsize <span class="req">*</span></label>
          <InputNumber v-model="form.size" :min="1" style="width:100%;" placeholder="เช่น 300" />
        </div>
        <div>
          <label class="field-label">หน่วย <span class="req">*</span></label>
          <Dropdown v-model="form.unitId" :options="masterStore.units" optionLabel="name" optionValue="id"
            placeholder="เลือกหน่วย" style="width:100%;">
            <template #option="{ option }">
              {{ option.name }} ({{ option.abbr }})
            </template>
            <template #value="{ value }">
              <span v-if="value">{{ getUnitName(value) }} ({{ getUnitAbbr(value) }})</span>
              <span v-else class="p-placeholder">เลือกหน่วย</span>
            </template>
          </Dropdown>
        </div>
      </div>
      <template #footer>
        <Button label="ยกเลิก" outlined @click="showDialog = false" />
        <Button :label="editing ? 'บันทึก' : 'เพิ่ม'" class="btn-primary" @click="handleSave" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useMasterStore } from '@/stores/master'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'

const masterStore = useMasterStore()
const confirm = useConfirm()
const toast = useToast()

onMounted(() => {
  if (!masterStore.units.length) masterStore.fetchUnits()
})

const showDialog = ref(false)
const editing = ref(null)
const form = ref({ size: null, unitId: null })

function getUnitName(unitId) {
  return masterStore.getUnitById(unitId)?.name || '-'
}
function getUnitAbbr(unitId) {
  return masterStore.getUnitById(unitId)?.abbr || ''
}
function getMixsizeLabel(mx) {
  const abbr = masterStore.getUnitById(mx.unitId)?.abbr || ''
  return `${mx.size.toLocaleString()} ${abbr}`
}

function openDialog(item = null) {
  editing.value = item
  if (item) form.value = { size: item.size, unitId: item.unitId }
  else form.value = { size: null, unitId: null }
  showDialog.value = true
}

function handleSave() {
  if (!form.value.size || !form.value.unitId) {
    toast.add({ severity: 'warn', summary: 'กรุณากรอกข้อมูลให้ครบ', life: 3000 })
    return
  }
  if (editing.value) {
    masterStore.updateMixsize(editing.value.id, form.value)
    toast.add({ severity: 'success', summary: 'แก้ไขสำเร็จ', life: 3000 })
  } else {
    masterStore.addMixsize(form.value)
    toast.add({ severity: 'success', summary: 'เพิ่มสำเร็จ', life: 3000 })
  }
  showDialog.value = false
}

function confirmDelete(item) {
  confirm.require({
    message: `ลบ Mixsize "${getMixsizeLabel(item)}" ใช่หรือไม่?`,
    header: 'ยืนยันการลบ',
    icon: 'pi pi-trash',
    acceptLabel: 'ลบ Mixsize',
    acceptClass: 'p-button-danger',
    accept: () => {
      masterStore.deleteMixsize(item.id)
      toast.add({ severity: 'success', summary: 'ลบสำเร็จ', life: 3000 })
    }
  })
}
</script>

<style scoped>
.display-badge {
  background: var(--gl-bg);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}
.action-btns { display: flex; gap: 4px; }
.dialog-form { display: flex; flex-direction: column; gap: 14px; }
</style>
