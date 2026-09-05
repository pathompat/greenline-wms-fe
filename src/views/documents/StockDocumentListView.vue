<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">{{ config.label }}</div>
        <div class="page-subtitle">
          {{ config.listSubtitle }} — ทั้งหมด {{ list.total }} ฉบับ
        </div>
      </div>
      <RouterLink :to="`/documents/${kind}/create`">
        <Button :label="`สร้าง${config.label}`" icon="pi pi-plus" class="btn-primary" />
      </RouterLink>
    </div>

    <div class="page-card">
      <div class="toolbar">
        <span class="search-wrap">
          <i class="pi pi-search" />
          <InputText
            v-model="itemName"
            placeholder="ค้นหาจากชื่อสินค้าในเอกสาร..."
            style="padding-left: 2.2rem; width: 260px"
          />
          <i v-if="itemName" class="pi pi-times clear-icon" @click="itemName = ''" />
        </span>

        <span class="search-wrap">
          <i class="pi pi-user" />
          <InputText
            v-model="userName"
            placeholder="ผู้สร้างเอกสาร..."
            style="padding-left: 2.2rem; width: 200px"
          />
          <i v-if="userName" class="pi pi-times clear-icon" @click="userName = ''" />
        </span>

        <Dropdown
          v-model="filterStatus"
          :options="STATUS_OPTIONS"
          optionLabel="label"
          optionValue="value"
          placeholder="ทุกสถานะ"
          showClear
          style="width: 160px"
        />

        <Dropdown
          v-model="filterWarehouse"
          :options="masterStore.warehouses"
          optionLabel="name"
          optionValue="id"
          placeholder="ทุกคลัง"
          showClear
          filter
          style="width: 170px"
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

      <DataTable
        :value="list.data"
        size="small"
        stripedRows
        lazy
        :loading="docStore.listLoading[kind]"
        :paginator="true"
        :rows="limit"
        :totalRecords="list.total"
        :first="(list.page - 1) * limit"
        :rowsPerPageOptions="[15, 30, 50]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="{first}–{last} จาก {totalRecords} เอกสาร"
        @page="onPage"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-file" />
            <div>{{ hasFilters ? 'ไม่พบเอกสารที่ตรงกับตัวกรอง' : `ยังไม่มี${config.label}` }}</div>
            <RouterLink v-if="!hasFilters" :to="`/documents/${kind}/create`">
              <Button :label="`สร้าง${config.label}`" icon="pi pi-plus" text size="small" />
            </RouterLink>
          </div>
        </template>

        <Column header="เลขที่เอกสาร" style="width: 170px">
          <template #body="{ data }">
            <RouterLink :to="`/documents/${kind}/${data.id}`" class="doc-link mono">
              {{ data.docNo }}
            </RouterLink>
          </template>
        </Column>

        <Column header="คลัง" style="width: 160px">
          <template #body="{ data }">{{ warehouseName(data.warehouseId) }}</template>
        </Column>

        <Column header="วันที่เอกสาร" style="width: 130px">
          <template #body="{ data }">{{ formatThaiDate(data.docDate) }}</template>
        </Column>

        <Column header="สถานะ" style="width: 140px">
          <template #body="{ data }">
            <span :class="['status-badge', statusClass(data.status)]">
              <i :class="statusIcon(data.status)" /> {{ statusLabel(data.status) }}
            </span>
          </template>
        </Column>

        <Column header="รายการ" style="width: 90px">
          <template #body="{ data }">{{ data.items?.length ?? 0 }}</template>
        </Column>

        <Column header="หมายเหตุ">
          <template #body="{ data }">
            <span class="remark">{{ data.remark || '—' }}</span>
          </template>
        </Column>

        <Column header="สร้างเมื่อ" style="width: 150px">
          <template #body="{ data }">
            <span class="muted small">{{ formatThaiDateTime(data.createdAt) }}</span>
          </template>
        </Column>

        <Column header="จัดการ" style="width: 130px">
          <template #body="{ data }">
            <div class="action-btns">
              <RouterLink :to="`/documents/${kind}/${data.id}`">
                <Button icon="pi pi-eye" size="small" text rounded v-tooltip="'ดูรายละเอียด'" />
              </RouterLink>
              <RouterLink
                v-if="data.status === 'DRAFT'"
                :to="`/documents/${kind}/${data.id}/edit`"
              >
                <Button icon="pi pi-pencil" size="small" text rounded v-tooltip="'แก้ไข'" />
              </RouterLink>
              <Button
                v-if="data.status === 'DRAFT'"
                icon="pi pi-send"
                size="small"
                text
                rounded
                v-tooltip="'ส่งอนุมัติ'"
                @click="changeStatus(data, 'IN_PROCESS')"
              />
              <Button
                v-if="data.status === 'DRAFT' || data.status === 'IN_PROCESS'"
                icon="pi pi-check"
                size="small"
                text
                rounded
                severity="success"
                v-tooltip="config.effect"
                @click="confirmPost(data)"
              />
              <Button
                v-if="data.status === 'DRAFT' || data.status === 'IN_PROCESS'"
                icon="pi pi-times"
                size="small"
                text
                rounded
                severity="danger"
                v-tooltip="'ยกเลิกเอกสาร'"
                @click="confirmCancel(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useMasterStore } from '@/stores/master'
import {
  DOC_KINDS,
  useStockDocumentStore,
  statusClass,
  statusIcon,
  statusLabel,
} from '@/stores/stockDocuments'
import { formatThaiDate, formatThaiDateTime } from '@/utils/date'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const route = useRoute()
const toast = useToast()
const confirm = useConfirm()
const masterStore = useMasterStore()
const docStore = useStockDocumentStore()

const STATUS_OPTIONS = [
  { label: 'ร่าง', value: 'DRAFT' },
  { label: 'รออนุมัติ', value: 'IN_PROCESS' },
  { label: 'สำเร็จ', value: 'SUCCESS' },
]

/** Which of the three documents this page lists; set on the route. */
const kind = computed(() => route.meta.docKind)

// What each list is for, in the words of the job it belongs to.
const SUBTITLES = {
  receipt: 'เอกสารรับสินค้าเข้าคลัง',
  requisition: 'เอกสารเบิกสินค้าออกจากคลัง',
  return: 'เอกสารคืนสินค้ากลับเข้าคลัง',
}

const config = computed(() => ({
  ...DOC_KINDS[kind.value],
  listSubtitle: SUBTITLES[kind.value],
}))

const itemName = ref('')
const userName = ref('')
const filterStatus = ref(null)
const filterWarehouse = ref(null)
const page = ref(1)
const limit = ref(15)

const list = computed(() => docStore.lists[kind.value])
const hasFilters = computed(
  () => !!itemName.value || !!userName.value || !!filterStatus.value || !!filterWarehouse.value,
)

function warehouseName(id) {
  return masterStore.getWarehouseById(id)?.name || `คลัง #${id}`
}

async function load() {
  try {
    await docStore.fetchList(kind.value, {
      // `items=true` embeds each document's lines, which is what the row's
      // line-count column shows; the backend loads them for the whole page in
      // one query, so it is not an N+1.
      items: true,
      statuses: filterStatus.value || undefined,
      warehouseId: filterWarehouse.value ?? undefined,
      userName: userName.value || undefined,
      itemName: itemName.value || undefined,
      page: page.value,
      limit: limit.value,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'โหลดรายการเอกสารไม่สำเร็จ',
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
  itemName.value = ''
  userName.value = ''
  filterStatus.value = null
  filterWarehouse.value = null
  reload()
}

function onPage(event) {
  page.value = event.page + 1
  limit.value = event.rows
  load()
}

watchDebounced([itemName, userName], reload, { debounce: 350 })
watch([filterStatus, filterWarehouse], reload)

// The three list routes share this component, so moving between them reuses the
// instance: only the route's `docKind` changes.
watch(kind, () => {
  resetFilters()
})

function reportError(error, summary) {
  const raw = error.response?.data?.message
  toast.add({
    severity: 'error',
    summary,
    detail: Array.isArray(raw) ? raw.join(', ') : raw || error.message,
    life: 6000,
  })
}

async function changeStatus(doc, status) {
  try {
    await docStore.update(kind.value, doc.id, { status })
    toast.add({
      severity: 'success',
      summary: status === 'SUCCESS' ? `${config.value.effect}แล้ว` : 'ส่งอนุมัติแล้ว',
      detail: doc.docNo,
      life: 4000,
    })
    load()
  } catch (error) {
    reportError(error, 'ดำเนินการไม่สำเร็จ')
  }
}

function confirmPost(doc) {
  confirm.require({
    header: `ยืนยัน${config.value.effect}`,
    message: `ระบบจะ${config.value.effect}ตามเอกสาร ${doc.docNo} ทันที เมื่อทำแล้วจะแก้ไขหรือยกเลิกไม่ได้`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: `ยืนยัน ${config.value.effect}`,
    rejectLabel: 'ยกเลิก',
    acceptClass: 'btn-primary',
    accept: () => changeStatus(doc, 'SUCCESS'),
  })
}

function confirmCancel(doc) {
  confirm.require({
    header: 'ยกเลิกเอกสาร',
    icon: 'pi pi-times-circle',
    message: `ต้องการยกเลิกเอกสาร ${doc.docNo} หรือไม่? เลขที่เอกสารนี้จะถูกปล่อยให้ใช้ซ้ำได้`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'ยกเลิกเอกสาร',
    rejectLabel: 'ไม่',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await docStore.cancel(kind.value, doc.id)
        toast.add({ severity: 'success', summary: 'ยกเลิกเอกสารแล้ว', detail: doc.docNo, life: 4000 })
        load()
      } catch (error) {
        reportError(error, 'ยกเลิกไม่สำเร็จ')
      }
    },
  })
}

onMounted(() => {
  if (!masterStore.warehouses.length) masterStore.fetchWarehouses()
  load()
})
</script>

<style scoped>
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-wrap > .pi-search,
.search-wrap > .pi-user {
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

.doc-link {
  color: var(--gl-navy);
  font-weight: 600;
  font-size: 12px;
  text-decoration: none;
}
.doc-link:hover {
  text-decoration: underline;
}
.mono {
  font-family: var(--gl-font-mono);
}
.muted {
  color: var(--gl-text-muted);
}
.small {
  font-size: 12px;
}
.remark {
  font-size: 12px;
  color: var(--gl-text-muted);
}
.action-btns {
  display: flex;
  gap: 2px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 36px 12px;
  color: var(--gl-text-muted);
}
.empty-state .pi-file {
  font-size: 30px;
  opacity: 0.5;
}
</style>
