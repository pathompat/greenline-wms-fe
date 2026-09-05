<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">
          {{ isEditing ? 'แก้ไขใบคืนสินค้า' : 'สร้างใบคืนสินค้า (Return)' }}
          <span v-if="isEditing && docNo" class="mono doc-no">{{ docNo }}</span>
        </div>
        <div class="page-subtitle">
          คืนสินค้าที่เหลือจากการผลิตกลับเข้าคลัง — ของที่คืนต้องระบุ Lot เดิมที่เบิกออกไป
        </div>
      </div>
      <RouterLink :to="backTo">
        <Button label="ย้อนกลับ" icon="pi pi-arrow-left" outlined />
      </RouterLink>
    </div>

    <div v-if="loadingDoc" class="page-card loading-card">
      <i class="pi pi-spin pi-spinner" /> กำลังโหลดเอกสาร...
    </div>

    <div v-else class="page-card">
      <div class="form-grid-3">
        <div>
          <label class="field-label">คลังที่รับคืน <span class="req">*</span></label>
          <Dropdown
            v-model="form.warehouseId"
            :options="masterStore.warehouses"
            optionLabel="name"
            optionValue="id"
            placeholder="เลือกคลัง"
            filter
            class="w-full"
            @change="onWarehouseChange"
          />
        </div>
        <div>
          <label class="field-label">วันที่เอกสาร <span class="req">*</span></label>
          <Calendar v-model="form.docDate" dateFormat="dd/mm/yy" showIcon class="w-full" />
        </div>
        <div>
          <label class="field-label">เหตุผลการคืน / หมายเหตุ</label>
          <InputText
            v-model="form.remark"
            class="w-full"
            :maxlength="500"
            placeholder="เช่น เหลือจาก Batch #001"
          />
        </div>
      </div>

      <div class="divider" />

      <div class="items-header">
        <h3 class="items-title">
          รายการที่คืน
          <span v-if="form.items.length" class="count-pill">{{ form.items.length }}</span>
        </h3>
        <Dropdown
          v-model="productToAdd"
          :options="masterStore.products"
          optionLabel="name"
          optionValue="id"
          filter
          filterPlaceholder="พิมพ์ชื่อหรือรหัสสินค้า..."
          :filterFields="['name', 'sku']"
          :placeholder="form.warehouseId ? 'เลือกสินค้าเพื่อเพิ่ม' : 'เลือกคลังก่อน'"
          :disabled="!form.warehouseId"
          class="add-picker"
          @change="addItem"
        >
          <template #option="{ option }">
            <div class="opt">
              <span class="opt-name">{{ option.name }}</span>
              <span class="opt-sku">{{ option.sku }}</span>
              <span v-if="option.hasLot" class="opt-lot">Lot</span>
            </div>
          </template>
        </Dropdown>
      </div>

      <Message v-if="!form.warehouseId" severity="info" :closable="false">
        เลือกคลังก่อน เพื่อให้ระบบดึง Lot ที่เคยเบิกออกจากคลังนี้มาให้เลือก
      </Message>

      <DataTable v-if="form.items.length" :value="form.items" size="small">
        <Column header="#" style="width: 44px">
          <template #body="{ index }">{{ index + 1 }}</template>
        </Column>

        <Column header="สินค้า" style="min-width: 200px">
          <template #body="{ data }">
            <div class="prod-name">{{ productOf(data).name }}</div>
            <div class="prod-sub mono">{{ productOf(data).sku }}</div>
          </template>
        </Column>

        <Column header="Lot ที่คืนเข้า" style="width: 270px">
          <template #body="{ data }">
            <Dropdown
              v-if="productOf(data).hasLot"
              v-model="data.lotId"
              :options="lotsFor(data.productId)"
              optionLabel="lotLabel"
              optionValue="id"
              :loading="lotsLoading[data.productId]"
              :placeholder="lotPlaceholder(data.productId)"
              :class="['w-full', { 'p-invalid': !data.lotId }]"
              emptyMessage="ไม่พบ Lot ของสินค้านี้ในคลังนี้"
            >
              <template #option="{ option }">
                <div class="lot-opt">
                  <span class="mono">{{ option.lotNo }}</span>
                  <span class="lot-remain">คงเหลือขณะนี้ {{ formatQty(option.quantity) }}</span>
                  <span v-if="option.expiryDate" class="lot-exp">
                    หมดอายุ {{ formatThaiDate(option.expiryDate) }}
                  </span>
                </div>
              </template>
            </Dropdown>
            <span v-else class="muted small">ไม่ใช้ Lot</span>
          </template>
        </Column>

        <Column header="จำนวนที่คืน *" style="width: 165px">
          <template #body="{ data }">
            <InputNumber
              v-model="data.quantity"
              :min="0"
              :maxFractionDigits="3"
              :class="['w-full', { 'p-invalid': data.quantity != null && !(data.quantity > 0) }]"
              :suffix="' ' + unitOf(data)"
            />
          </template>
        </Column>

        <Column style="width: 48px">
          <template #body="{ index }">
            <Button
              icon="pi pi-trash"
              size="small"
              text
              rounded
              severity="danger"
              @click="form.items.splice(index, 1)"
            />
          </template>
        </Column>
      </DataTable>

      <div v-else-if="form.warehouseId" class="empty-items">
        <i class="pi pi-inbox" />
        <div>ยังไม่มีรายการ — เลือกสินค้าจากช่องด้านบนเพื่อเพิ่ม</div>
      </div>

      <div class="form-actions">
        <RouterLink :to="backTo"><Button label="ยกเลิก" outlined /></RouterLink>
        <Button label="บันทึกร่าง" icon="pi pi-save" outlined :loading="saving" @click="saveDraft" />
        <Button label="ส่งอนุมัติ" icon="pi pi-send" outlined :loading="saving" @click="submit" />
        <Button
          label="รับคืนเข้าสต๊อก"
          icon="pi pi-check-circle"
          class="btn-primary"
          :loading="saving"
          @click="confirmAndPost"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useMasterStore } from '@/stores/master'
import { useStockStore } from '@/stores/stock'
import { useStockDocumentStore, statusLabel } from '@/stores/stockDocuments'
import { useStockDocumentForm } from '@/composables/useStockDocumentForm'
import { toIsoDate, formatThaiDate } from '@/utils/date'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Calendar from 'primevue/calendar'
import Message from 'primevue/message'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const masterStore = useMasterStore()
const stockStore = useStockStore()
const docStore = useStockDocumentStore()

// With an id in the route the page edits that draft; without one it creates.
const documentId = computed(() => (route.params.id ? Number(route.params.id) : null))
const docNo = ref('')
const loadingDoc = ref(false)

const backTo = computed(() =>
  documentId.value ? `/documents/return/${documentId.value}` : '/documents/return',
)

const form = ref({ warehouseId: null, docDate: new Date(), remark: '', items: [] })
const productToAdd = ref(null)
const lotOptions = ref({})
const lotsLoading = ref({})

function productOf(item) {
  return masterStore.getProductById(item.productId) || { name: '(ไม่พบสินค้า)', sku: '-', hasLot: false }
}
function unitOf(item) {
  return masterStore.getUnitById(productOf(item).unitId)?.code || ''
}
function lotsFor(productId) {
  return lotOptions.value[productId] || []
}
function lotPlaceholder(productId) {
  if (lotsLoading.value[productId]) return 'กำลังโหลด...'
  return lotsFor(productId).length ? 'เลือก Lot เดิม' : 'ไม่พบ Lot ในคลังนี้'
}

/**
 * Batches of this product known to the warehouse, emptied ones included: goods
 * being returned were issued out of a batch that is usually at zero by now, and
 * a return never creates a new one.
 */
async function loadLots(productId) {
  if (!form.value.warehouseId || !productId) return
  if (!masterStore.getProductById(productId)?.hasLot) return
  lotsLoading.value = { ...lotsLoading.value, [productId]: true }
  try {
    const rows = await stockStore.fetchAvailableLots(productId, form.value.warehouseId, {
      inStockOnly: false,
    })
    lotOptions.value = {
      ...lotOptions.value,
      [productId]: rows.map((row) => ({ ...row, lotLabel: row.lotNo })),
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'โหลด Lot ไม่สำเร็จ',
      detail: error.response?.data?.message || error.message,
      life: 5000,
    })
  } finally {
    lotsLoading.value = { ...lotsLoading.value, [productId]: false }
  }
}

function addItem() {
  if (!productToAdd.value) return
  const productId = productToAdd.value
  form.value.items.push({ productId, quantity: null, lotId: null })
  productToAdd.value = null
  loadLots(productId)
}

/** Switching warehouse invalidates every lot choice — they are per warehouse. */
function onWarehouseChange() {
  lotOptions.value = {}
  form.value.items.forEach((item) => {
    item.lotId = null
  })
  form.value.items.forEach((item) => loadLots(item.productId))
}

function formatQty(value) {
  return Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 3 })
}

function validate() {
  if (!form.value.warehouseId) return 'กรุณาเลือกคลังที่รับคืน'
  if (!form.value.docDate) return 'กรุณาระบุวันที่เอกสาร'
  if (!form.value.items.length) return 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ'
  for (const [index, item] of form.value.items.entries()) {
    const label = `รายการที่ ${index + 1} (${productOf(item).name})`
    if (!(item.quantity > 0)) return `${label} ต้องระบุจำนวนมากกว่า 0`
    // A return puts goods back into the batch they came from; it never makes one.
    if (productOf(item).hasLot && !item.lotId) return `${label} ต้องเลือก Lot เดิมที่เบิกออกไป`
  }
  return null
}

function buildPayload() {
  return {
    warehouseId: form.value.warehouseId,
    docDate: toIsoDate(form.value.docDate),
    remark: form.value.remark || null,
    items: form.value.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      lotId: item.lotId ?? undefined,
    })),
  }
}

const { saving, isEditing, saveDraft, submit, confirmAndPost } = useStockDocumentForm(
  'return',
  { validate, buildPayload, documentId },
)

/**
 * Fills the form from the draft named in the route. Only a `DRAFT` accepts
 * edits — the backend rejects anything later — so a document that has moved on
 * is sent back to its read-only detail page rather than shown in a form whose
 * save would fail.
 */
async function loadDraft() {
  if (!documentId.value) return
  loadingDoc.value = true
  try {
    const doc = await docStore.fetchOne('return', documentId.value)
    if (doc.status !== 'DRAFT') {
      toast.add({
        severity: 'warn',
        summary: 'เอกสารนี้แก้ไขไม่ได้แล้ว',
        detail: `สถานะปัจจุบันคือ "${statusLabel(doc.status)}"`,
        life: 5000,
      })
      router.replace(`/documents/return/${documentId.value}`)
      return
    }
    docNo.value = doc.docNo
    form.value = {
      warehouseId: doc.warehouseId,
      docDate: new Date(doc.docDate),
      remark: doc.remark || '',
      items: (doc.items || []).map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        lotId: item.lotId ?? null,
      })),
    }
    // The lot pickers are populated per product, and the saved lines already
    // name one — load their options so the selection has something to match.
  form.value.items.forEach((item) => loadLots(item.productId))
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'โหลดเอกสารไม่สำเร็จ',
      detail: error.response?.data?.message || error.message,
      life: 5000,
    })
    router.replace('/documents/return')
  } finally {
    loadingDoc.value = false
  }
}

onMounted(() => {
  if (!masterStore.warehouses.length) masterStore.fetchWarehouses()
  if (!masterStore.products.length) masterStore.fetchProducts()
  if (!masterStore.units.length) masterStore.fetchUnits()
  loadDraft()
})
</script>

<style scoped>
.doc-no {
  font-size: 15px;
  color: var(--gl-text-muted);
  margin-left: 8px;
}
.divider {
  height: 1px;
  background: var(--gl-border);
  margin: 20px 0;
}
.items-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.items-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--gl-navy);
  display: flex;
  align-items: center;
  gap: 8px;
}
.count-pill {
  background: var(--gl-navy);
  color: #fff;
  border-radius: 999px;
  padding: 1px 9px;
  font-size: 11px;
  font-weight: 600;
}
.add-picker {
  width: 340px;
}
.opt {
  display: flex;
  align-items: center;
  gap: 8px;
}
.opt-name {
  flex: 1;
}
.opt-sku {
  font-family: var(--gl-font-mono);
  font-size: 11px;
  color: var(--gl-text-muted);
}
.opt-lot {
  font-size: 10px;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 4px;
  padding: 1px 5px;
}

.lot-opt {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 12px;
}
.lot-remain {
  color: var(--gl-text-muted);
}
.lot-exp {
  color: var(--gl-text-muted);
  font-size: 11px;
}

.prod-name {
  font-weight: 500;
}
.prod-sub {
  font-size: 11px;
  color: var(--gl-text-muted);
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

.empty-items {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: var(--gl-text-muted);
  border: 1px dashed var(--gl-border);
  border-radius: 8px;
}
.empty-items .pi-inbox {
  font-size: 28px;
  opacity: 0.5;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--gl-border);
  flex-wrap: wrap;
}
</style>
