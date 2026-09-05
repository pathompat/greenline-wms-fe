<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">เครื่องจักร</div>
        <div class="page-subtitle">จัดการเครื่องจักรที่ใช้ในการผลิต ({{ masterStore.machineListMeta.total }} เครื่อง)</div>
      </div>
      <Button label="เพิ่มเครื่องจักร" icon="pi pi-plus" class="btn-primary" @click="openDialog()" />
    </div>

    <div class="page-card">
      <div class="toolbar">
        <span class="search-wrap">
          <i class="pi pi-search" />
          <InputText
            v-model="search"
            placeholder="ค้นหารหัส ชื่อ หรือผู้ผลิต..."
            style="padding-left: 2.2rem; width: 280px"
          />
          <i v-if="search" class="pi pi-times clear-icon" @click="search = ''" />
        </span>
      </div>
      <DataTable
        :value="masterStore.machineList"
        :loading="loading"
        size="small"
        stripedRows
        lazy
        :paginator="true"
        :rows="masterStore.machineListMeta.limit"
        :first="(masterStore.machineListMeta.page - 1) * masterStore.machineListMeta.limit"
        :totalRecords="masterStore.machineListMeta.total"
        :rowsPerPageOptions="[20, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="{first}–{last} จาก {totalRecords} เครื่อง"
        @page="onPage"
      >
        <template #empty>
          <div class="empty-state">ไม่มีข้อมูลเครื่องจักร</div>
        </template>
        <Column field="code" header="รหัสเครื่อง" style="width: 140px; font-family: monospace" sortable />
        <Column field="name" header="ชื่อเครื่องจักร" sortable />
        <Column header="ประเภท" style="width: 180px">
          <template #body="{ data }">
            <span class="type-badge">{{ typeLabel(data.type) }}</span>
          </template>
        </Column>
        <Column header="สถานะ" style="width: 100px">
          <template #body="{ data }">
            <span :class="['status-badge', data.isActive ? 'status-fg' : 'status-hold']">
              {{ data.isActive ? "ใช้งาน" : "ระงับ" }}
            </span>
          </template>
        </Column>
        <Column header="จัดการ" style="width: 100px">
          <template #body="{ data }">
            <div class="action-btns">
              <Button icon="pi pi-pencil" size="small" text rounded @click="openDialog(data)" />
              <Button icon="pi pi-trash" size="small" text rounded severity="danger" @click="confirmDelete(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="showDialog"
      :header="editing ? 'แก้ไขเครื่องจักร' : 'เพิ่มเครื่องจักร'"
      :modal="true"
      :style="{ width: '400px' }"
      :closable="!saving"
    >
      <div class="dialog-form">
        <div>
          <label class="field-label">รหัสเครื่อง <span class="req">*</span></label>
          <InputText v-model="form.code" class="w-full" placeholder="เช่น HM-001" />
        </div>
        <div>
          <label class="field-label">ชื่อเครื่องจักร <span class="req">*</span></label>
          <InputText v-model="form.name" class="w-full" placeholder="เช่น Homo Mixer 1" />
        </div>
        <div>
          <label class="field-label">ประเภท <span class="req">*</span></label>
          <Dropdown
            v-model="form.type"
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            placeholder="เลือกประเภท"
          />
        </div>
        <div>
          <label class="field-label">ชื่อผู้ผลิต/จำหน่าย</label>
          <InputText v-model="form.manufacturer" class="w-full" placeholder="เช่น Silverson" />
        </div>
        <div>
          <label class="field-label">รุ่น/Serial No.</label>
          <InputText v-model="form.serialNo" class="w-full" placeholder="เช่น L4RT-A" />
        </div>
        <div>
          <label class="field-label">วันที่ติดตั้ง</label>
          <Calendar v-model="form.installedAt" dateFormat="dd/mm/yy" placeholder="วด/ดือ/ปี" class="w-full" showIcon />
        </div>
        <div>
          <label class="field-label">พื้นที่ติดตั้ง</label>
          <InputText v-model="form.installedArea" class="w-full" placeholder="เช่น อาคาร A ไลน์ 2" />
        </div>
        <div v-if="editing" class="active-row">
          <label class="field-label" style="margin: 0">สถานะ</label>
          <div class="active-toggle">
            <ToggleSwitch v-model="form.isActive" inputId="isActive" />
            <label for="isActive" style="font-size: 13px; cursor: pointer">
              {{ form.isActive ? "ใช้งาน" : "ระงับการใช้งาน" }}
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
import { useMasterStore } from "@/stores/master";
import Button from "primevue/button";
import Calendar from "primevue/calendar";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import InputText from "primevue/inputtext";
import ToggleSwitch from "primevue/toggleswitch";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";
import { watchDebounced } from "@vueuse/core";

const masterStore = useMasterStore();
const confirm = useConfirm();
const toast = useToast();

const typeOptions = [
  { label: "Homo Mixer", value: "HOMO_MIXER" },
  { label: "Ribbon Mixer", value: "RIBBON_MIXER" },
];
function typeLabel(value) {
  return typeOptions.find((t) => t.value === value)?.label || value;
}

const search = ref("");
const loading = ref(false);
const showDialog = ref(false);
const saving = ref(false);
const editing = ref(null);
const form = ref(defaultForm());

function defaultForm() {
  return {
    code: "",
    name: "",
    type: null,
    manufacturer: "",
    serialNo: "",
    installedAt: null,
    installedArea: "",
    isActive: true,
  };
}

// Backend `installedAt` is a 'YYYY-MM-DD' string; Calendar works with a Date object.
function toDateStr(d) {
  if (!d) return undefined;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return undefined;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Fetches one server page; the search term is applied by the backend.
async function loadPage(page = masterStore.machineListMeta.page, limit = masterStore.machineListMeta.limit) {
  loading.value = true;
  try {
    await masterStore.fetchMachineList({ page, limit, search: search.value });
  } catch {
    toast.add({ severity: "error", summary: "โหลดข้อมูลล้มเหลว", life: 3000 });
  } finally {
    loading.value = false;
  }
}

function onPage(e) {
  // e.page is 0-based; e.rows is the (possibly changed) page size.
  loadPage(e.page + 1, e.rows);
}

// Typing hits the server, so wait for a pause and start back at page 1.
watchDebounced(search, () => loadPage(1), { debounce: 400 });

onMounted(() => loadPage(1));

function openDialog(item = null) {
  editing.value = item;
  form.value = item
    ? {
        code: item.code,
        name: item.name,
        type: item.type,
        manufacturer: item.manufacturer || "",
        serialNo: item.serialNo || "",
        installedAt: parseDate(item.installedAt),
        installedArea: item.installedArea || "",
        isActive: item.isActive,
      }
    : defaultForm();
  showDialog.value = true;
}

async function handleSave() {
  if (!form.value.code || !form.value.name || !form.value.type) {
    toast.add({ severity: "warn", summary: "กรุณากรอกข้อมูลให้ครบ", life: 3000 });
    return;
  }
  saving.value = true;
  const payload = {
    code: form.value.code,
    name: form.value.name,
    type: form.value.type,
    manufacturer: form.value.manufacturer || undefined,
    serialNo: form.value.serialNo || undefined,
    installedAt: toDateStr(form.value.installedAt),
    installedArea: form.value.installedArea || undefined,
  };
  try {
    if (editing.value) {
      await masterStore.updateMachine(editing.value.id, { ...payload, isActive: form.value.isActive });
      toast.add({ severity: "success", summary: "แก้ไขสำเร็จ", life: 3000 });
    } else {
      await masterStore.addMachine(payload);
      toast.add({ severity: "success", summary: "เพิ่มสำเร็จ", life: 3000 });
    }
    await loadPage();
    showDialog.value = false;
  } catch (e) {
    const msg = e.response?.data?.message || "เกิดข้อผิดพลาด";
    toast.add({ severity: "error", summary: Array.isArray(msg) ? msg.join(", ") : msg, life: 4000 });
  } finally {
    saving.value = false;
  }
}

function confirmDelete(item) {
  confirm.require({
    message: `ลบเครื่องจักร "${item.name}" ใช่หรือไม่?`,
    header: "ยืนยันการลบ",
    icon: "pi pi-trash",
    acceptLabel: "ลบเครื่องจักร",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await masterStore.deleteMachine(item.id);
        await loadPage();
        toast.add({ severity: "success", summary: "ลบสำเร็จ", life: 3000 });
      } catch (e) {
        const msg = e.response?.data?.message || "เกิดข้อผิดพลาด";
        toast.add({ severity: "error", summary: msg, life: 4000 });
      }
    },
  });
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
.type-badge {
  background: var(--gl-bg);
  border: 1px solid var(--gl-border);
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--gl-navy);
}
.action-btns {
  display: flex;
  gap: 4px;
}
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  .p-inputtext {
    width: 100%;
  }
  .p-select {
    width: 100%;
  }
}
.active-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.active-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}
.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--gl-text-muted);
  font-size: 14px;
}
</style>
