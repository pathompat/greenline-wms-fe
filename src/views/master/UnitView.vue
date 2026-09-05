<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">หน่วยนับ</div>
        <div class="page-subtitle">จัดการหน่วยนับสินค้า ({{ masterStore.unitListMeta.total }} หน่วย)</div>
      </div>
      <Button label="เพิ่มหน่วย" icon="pi pi-plus" class="btn-primary" @click="openDialog()" />
    </div>

    <div class="page-card">
      <div class="toolbar">
        <span class="search-wrap">
          <i class="pi pi-search" />
          <InputText
            v-model="search"
            placeholder="ค้นหารหัส หรือ ชื่อหน่วย..."
            style="padding-left: 2.2rem; width: 280px"
          />
          <i v-if="search" class="pi pi-times clear-icon" @click="search = ''" />
        </span>
      </div>
      <DataTable
        :value="masterStore.unitList"
        :loading="loading"
        size="small"
        stripedRows
        lazy
        :paginator="true"
        :rows="masterStore.unitListMeta.limit"
        :first="(masterStore.unitListMeta.page - 1) * masterStore.unitListMeta.limit"
        :totalRecords="masterStore.unitListMeta.total"
        :rowsPerPageOptions="[20, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="{first}–{last} จาก {totalRecords} หน่วย"
        @page="onPage"
      >
        <template #empty>
          <div class="empty-state">ไม่มีข้อมูลหน่วยนับ</div>
        </template>
        <Column field="code" header="รหัส" style="width: 100px; font-family: monospace" sortable />
        <Column field="name" header="ชื่อหน่วย" sortable />
        <Column header="ใช้งาน (SKU)" style="width: 120px">
          <template #body="{ data }">
            <span class="count-badge">{{ getUsageCount(data.id) }}</span>
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
      :header="editing ? 'แก้ไขหน่วย' : 'เพิ่มหน่วยนับ'"
      :modal="true"
      :style="{ width: '360px' }"
      :closable="!saving"
    >
      <div class="dialog-form">
        <div>
          <label class="field-label">รหัส <span class="req">*</span></label>
          <InputText v-model="form.code" class="w-full" placeholder="เช่น KG" />
        </div>
        <div>
          <label class="field-label">ชื่อหน่วย <span class="req">*</span></label>
          <InputText v-model="form.name" class="w-full" placeholder="เช่น กิโลกรัม" />
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

const search = ref("");
const loading = ref(false);
const showDialog = ref(false);
const saving = ref(false);
const editing = ref(null);
const form = ref({ code: "", name: "" });

function getUsageCount(unitId) {
  return masterStore.products.filter((p) => p.unitId === unitId).length;
}

// Fetches one server page; the search term is applied by the backend.
async function loadPage(page = masterStore.unitListMeta.page, limit = masterStore.unitListMeta.limit) {
  loading.value = true;
  try {
    await masterStore.fetchUnitList({ page, limit, search: search.value });
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

onMounted(() => {
  loadPage(1);
  if (!masterStore.products.length) masterStore.fetchProducts();
});

function openDialog(item = null) {
  editing.value = item;
  form.value = item ? { code: item.code, name: item.name } : { code: "", name: "" };
  showDialog.value = true;
}

async function handleSave() {
  if (!form.value.code || !form.value.name) {
    toast.add({ severity: "warn", summary: "กรุณากรอกข้อมูลให้ครบ", life: 3000 });
    return;
  }
  saving.value = true;
  try {
    if (editing.value) {
      await masterStore.updateUnit(editing.value.id, { code: form.value.code, name: form.value.name });
      toast.add({ severity: "success", summary: "แก้ไขสำเร็จ", life: 3000 });
    } else {
      await masterStore.addUnit({ code: form.value.code, name: form.value.name });
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
    message: `ลบหน่วย "${item.name}" ใช่หรือไม่?`,
    header: "ยืนยันการลบ",
    icon: "pi pi-exclamation-triangle",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await masterStore.deleteUnit(item.id);
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
.count-badge {
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
.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--gl-text-muted);
  font-size: 14px;
}
</style>
