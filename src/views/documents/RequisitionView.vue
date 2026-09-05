<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">สร้างใบเบิก-จ่าย (Requisition)</div>
        <div class="page-subtitle">
          เบิกสินค้าออกจากคลัง — เมื่อ "จ่ายของ" ระบบจะตัดสต๊อกทันที และเบิกเกินยอดคงเหลือไม่ได้
        </div>
      </div>
      <RouterLink to="/documents/requisition">
        <Button label="ย้อนกลับ" icon="pi pi-arrow-left" outlined />
      </RouterLink>
    </div>

    <div class="page-card">
      <div class="form-grid-3">
        <div>
          <label class="field-label">คลังที่เบิก <span class="req">*</span></label>
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
          <label class="field-label">หมายเหตุ / วัตถุประสงค์</label>
          <InputText
            v-model="form.remark"
            class="w-full"
            :maxlength="500"
            placeholder="เช่น เบิกสำหรับ Batch #001"
          />
        </div>
      </div>

      <div class="divider" />

      <div class="items-header">
        <h3 class="items-title">
          รายการที่ขอเบิก
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
        เลือกคลังก่อน เพื่อให้ระบบดึงยอดคงเหลือและ Lot ที่เบิกได้จริงมาแสดง
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

        <Column header="Lot (FIFO — ใช้ของเก่าก่อน)" style="width: 265px">
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
              emptyMessage="ไม่มี Lot คงเหลือในคลังนี้"
            >
              <template #option="{ option }">
                <div class="lot-opt">
                  <span class="mono">{{ option.lotNo }}</span>
                  <span class="lot-remain">คงเหลือ {{ formatQty(option.quantity) }}</span>
                  <span v-if="option.expiryDate" class="lot-exp">
                    หมดอายุ {{ formatThaiDate(option.expiryDate) }}
                  </span>
                </div>
              </template>
            </Dropdown>
            <span v-else class="muted small">ไม่ใช้ Lot</span>
          </template>
        </Column>

        <Column header="คงเหลือ" style="width: 120px">
          <template #body="{ data }">
            <span class="muted">{{ formatQty(availableFor(data)) }}</span>
            <span class="unit"> {{ unitOf(data) }}</span>
          </template>
        </Column>

        <Column header="จำนวนที่เบิก *" style="width: 170px">
          <template #body="{ data }">
            <InputNumber
              v-model="data.quantity"
              :min="0"
              :maxFractionDigits="3"
              :class="['w-full', { 'p-invalid': !!lineProblem(data) }]"
              :suffix="' ' + unitOf(data)"
            />
            <small v-if="lineProblem(data)" class="line-error">{{ lineProblem(data) }}</small>
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
        <RouterLink to="/documents/requisition"><Button label="ยกเลิก" outlined /></RouterLink>
        <Button label="บันทึกร่าง" icon="pi pi-save" outlined :loading="saving" @click="saveDraft" />
        <Button label="ส่งอนุมัติ" icon="pi pi-send" outlined :loading="saving" @click="submit" />
        <Button
          label="จ่ายของ (ตัดสต๊อก)"
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
import { ref, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useMasterStore } from '@/stores/master'
import { useStockStore } from '@/stores/stock'
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

const toast = useToast()
const masterStore = useMasterStore()
const stockStore = useStockStore()

const form = ref({ warehouseId: null, docDate: new Date(), remark: '', items: [] })
const productToAdd = ref(null)
// Batches on hand for each product in the chosen warehouse, keyed by product.
const lotOptions = ref({})
const lotsLoading = ref({})
// Products with no lots still have one balance row per warehouse; the lot picker
// cannot show it, so their on-hand figure is fetched separately.
const nonLotBalances = ref({})

function productOf(item) {
  return (
    masterStore.getProductById(item.productId) || { name: '(ไม่พบสินค้า)', sku: '-', hasLot: false }
  )
}
function unitOf(item) {
  return masterStore.getUnitById(productOf(item).unitId)?.code || ''
}
function lotsFor(productId) {
  return lotOptions.value[productId] || []
}
function lotPlaceholder(productId) {
  if (lotsLoading.value[productId]) return 'กำลังโหลด...'
  return lotsFor(productId).length ? 'เลือก Lot' : 'ไม่มี Lot คงเหลือ'
}

function formatQty(value) {
  return Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 3 })
}

/**
 * Loads the batches of one product actually on hand in the chosen warehouse.
 * Balances arrive FIFO-ordered, so the first option is the one to use next.
 */
async function loadLots(productId) {
  if (!form.value.warehouseId || !productId) return
  if (!masterStore.getProductById(productId)?.hasLot) return
  lotsLoading.value = { ...lotsLoading.value, [productId]: true }
  try {
    const rows = await stockStore.fetchAvailableLots(productId, form.value.warehouseId)
    lotOptions.value = {
      ...lotOptions.value,
      [productId]: rows.map((row) => ({
        ...row,
        lotLabel: `${row.lotNo} (คงเหลือ ${formatQty(row.quantity)})`,
      })),
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

async function loadNonLotBalance(productId) {
  if (!form.value.warehouseId) return
  const onHand = await stockStore.fetchOnHand(productId, form.value.warehouseId)
  nonLotBalances.value = { ...nonLotBalances.value, [productId]: onHand }
}

function loadAvailability(productId) {
  if (masterStore.getProductById(productId)?.hasLot) loadLots(productId)
  else loadNonLotBalance(productId)
}

function addItem() {
  if (!productToAdd.value) return
  const productId = productToAdd.value
  form.value.items.push({ productId, quantity: null, lotId: null })
  productToAdd.value = null
  loadAvailability(productId)
}

/** Switching warehouse invalidates every lot choice — they are per warehouse. */
function onWarehouseChange() {
  lotOptions.value = {}
  nonLotBalances.value = {}
  form.value.items.forEach((item) => {
    item.lotId = null
  })
  form.value.items.forEach((item) => loadAvailability(item.productId))
}

/** What the line may draw on: the chosen batch, or the product's whole balance. */
function availableFor(item) {
  if (!productOf(item).hasLot) return nonLotBalances.value[item.productId] ?? 0
  const rows = lotsFor(item.productId)
  if (!item.lotId) return rows.reduce((sum, row) => sum + row.quantity, 0)
  return rows.find((row) => row.id === item.lotId)?.quantity || 0
}

/** Per-line validation, surfaced inline as the operator types. */
function lineProblem(item) {
  if (item.quantity == null) return null
  if (!(item.quantity > 0)) return 'ต้องมากกว่า 0'
  // Until a batch is chosen, the ceiling shown is the product's whole balance,
  // which is not the ceiling that will actually apply — do not flag it yet.
  if (productOf(item).hasLot && !item.lotId) return null
  const available = availableFor(item)
  if (item.quantity > available) return `เกินคงเหลือ (${formatQty(available)})`
  return null
}

// A product added while its warehouse balance was still loading needs a retry
// once the warehouse is known.
watch(
  () => form.value.warehouseId,
  (warehouseId) => {
    if (warehouseId) form.value.items.forEach((item) => loadAvailability(item.productId))
  },
)

function validate() {
  if (!form.value.warehouseId) return 'กรุณาเลือกคลังที่เบิก'
  if (!form.value.docDate) return 'กรุณาระบุวันที่เอกสาร'
  if (!form.value.items.length) return 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ'
  for (const [index, item] of form.value.items.entries()) {
    const label = `รายการที่ ${index + 1} (${productOf(item).name})`
    if (!(item.quantity > 0)) return `${label} ต้องระบุจำนวนมากกว่า 0`
    // An issue never creates a batch, so a lot-tracked line has to name one.
    if (productOf(item).hasLot && !item.lotId) return `${label} ต้องเลือก Lot ที่จะเบิก`
    const problem = lineProblem(item)
    if (problem) return `${label} ${problem}`
  }
  return null
}

function buildPayload() {
  return {
    warehouseId: form.value.warehouseId,
    docDate: toIsoDate(form.value.docDate),
    remark: form.value.remark || undefined,
    items: form.value.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      lotId: item.lotId ?? undefined,
    })),
  }
}

const { saving, saveDraft, submit, confirmAndPost } = useStockDocumentForm('requisition', {
  validate,
  buildPayload,
})

onMounted(() => {
  if (!masterStore.warehouses.length) masterStore.fetchWarehouses()
  if (!masterStore.products.length) masterStore.fetchProducts()
  if (!masterStore.units.length) masterStore.fetchUnits()
})
</script>

<style scoped>
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
  font-family: monospace;
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
  color: var(--gl-success);
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
  font-family: monospace;
}
.muted {
  color: var(--gl-text-muted);
}
.small {
  font-size: 12px;
}
.unit {
  font-size: 11px;
  color: var(--gl-text-muted);
}
.line-error {
  display: block;
  color: var(--gl-red);
  font-size: 11px;
  margin-top: 2px;
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
