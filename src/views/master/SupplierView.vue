<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">ซัพพลายเออร์</div>
        <div class="page-subtitle">จัดการรายชื่อผู้จำหน่าย ({{ masterStore.supplierListMeta.total }} ราย)</div>
      </div>
      <Button label="เพิ่มซัพพลายเออร์" icon="pi pi-plus" class="btn-primary" @click="openDialog()" />
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
        :value="masterStore.supplierList"
        :loading="loading"
        size="small"
        stripedRows
        lazy
        :paginator="true"
        :rows="masterStore.supplierListMeta.limit"
        :first="(masterStore.supplierListMeta.page - 1) * masterStore.supplierListMeta.limit"
        :totalRecords="masterStore.supplierListMeta.total"
        :rowsPerPageOptions="[20, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="{first}–{last} จาก {totalRecords} ราย"
        @page="onPage"
      >
        <template #empty>
          <div class="empty-state">ไม่มีข้อมูลซัพพลายเออร์</div>
        </template>
        <Column field="code" header="รหัส" style="width: 110px; font-family: monospace" sortable />
        <Column field="name" header="ชื่อบริษัท/ผู้จำหน่าย" sortable />
        <Column field="manufacturerName" header="ชื่อผู้ผลิต" sortable>
          <template #body="{ data }">{{ data.manufacturerName || '—' }}</template>
        </Column>
        <Column field="address" header="ที่อยู่">
          <template #body="{ data }">{{ data.address || '—' }}</template>
        </Column>
        <Column field="telephone" header="เบอร์โทร" style="width: 130px">
          <template #body="{ data }">{{ data.telephone || '—' }}</template>
        </Column>
        <Column field="email" header="อีเมล">
          <template #body="{ data }">{{ data.email || '—' }}</template>
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
      :header="editing ? 'แก้ไขซัพพลายเออร์' : 'เพิ่มซัพพลายเออร์'"
      :modal="true"
      :style="{ width: '440px' }"
      :closable="!saving"
    >
      <div class="dialog-form">
        <div>
          <label class="field-label">รหัส <span class="req">*</span></label>
          <InputText v-model="form.code" class="w-full" placeholder="เช่น SUP006" />
        </div>
        <div>
          <label class="field-label">ชื่อบริษัท <span class="req">*</span></label>
          <InputText v-model="form.name" class="w-full" placeholder="ชื่อบริษัท/ผู้จำหน่าย" />
        </div>
        <div>
          <label class="field-label">ชื่อผู้ผลิต (Manufacturer Name) <span class="req">*</span></label>
          <InputText v-model="form.manufacturerName" class="w-full" placeholder="ชื่อผู้ผลิต" />
        </div>
        <div>
          <label class="field-label">ที่อยู่ (Address)</label>
          <InputText v-model="form.address" class="w-full" placeholder="ที่อยู่" />
        </div>
        <div>
          <label class="field-label">เบอร์โทร (Telephone No)</label>
          <InputText v-model="form.telephone" class="w-full" placeholder="เช่น 02-123-4567" />
        </div>
        <div>
          <label class="field-label">อีเมล (E-mail)</label>
          <InputText v-model="form.email" class="w-full" placeholder="เช่น contact@acme.com" />
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
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";
import { watchDebounced } from "@vueuse/core";

const masterStore = useMasterStore();
const confirm = useConfirm();
const toast = useToast();

const loading = ref(false);
const showDialog = ref(false);
const saving = ref(false);
const editing = ref(null);
const search = ref("");
const form = ref(defaultForm());

function defaultForm() {
  return { code: "", name: "", manufacturerName: "", address: "", telephone: "", email: "" };
}


// Fetches one server page; the search term is applied by the backend.
async function loadPage(page = masterStore.supplierListMeta.page, limit = masterStore.supplierListMeta.limit) {
  loading.value = true;
  try {
    await masterStore.fetchSupplierList({ page, limit, search: search.value });
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
        manufacturerName: item.manufacturerName || "",
        address: item.address || "",
        telephone: item.telephone || "",
        email: item.email || "",
      }
    : defaultForm();
  showDialog.value = true;
}

async function handleSave() {
  if (!form.value.code?.trim() || !form.value.name?.trim() || !form.value.manufacturerName?.trim()) {
    toast.add({ severity: "warn", summary: "กรุณากรอกรหัส ชื่อบริษัท และชื่อผู้ผลิตให้ครบ", life: 3000 });
    return;
  }
  saving.value = true;
  // `email` is validated with @IsEmail on the backend, so send undefined (not "")
  // when the optional fields are blank.
  const payload = {
    code: form.value.code,
    name: form.value.name,
    manufacturerName: form.value.manufacturerName || undefined,
    address: form.value.address || undefined,
    telephone: form.value.telephone || undefined,
    email: form.value.email || undefined,
  };
  try {
    if (editing.value) {
      await masterStore.updateSupplier(editing.value.id, payload);
      toast.add({ severity: "success", summary: "แก้ไขสำเร็จ", life: 3000 });
    } else {
      await masterStore.addSupplier(payload);
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
    message: `ลบ "${item.name}" ใช่หรือไม่?`,
    header: "ยืนยันการลบ",
    icon: "pi pi-trash",
    acceptLabel: "ลบซัพพลายเออร์",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await masterStore.deleteSupplier(item.id);
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
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-wrap i {
  position: absolute;
  left: 0.75rem;
  z-index: 1;
  color: var(--gl-text-muted);
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
}
.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--gl-text-muted);
  font-size: 14px;
}
</style>
