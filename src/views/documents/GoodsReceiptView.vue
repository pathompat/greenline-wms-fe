<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">สร้างใบรับเข้า (Goods Receipt)</div>
        <div class="page-subtitle">
          บันทึกการรับสินค้าเข้าคลัง — เมื่อ "รับเข้าและเพิ่มสต๊อก" ระบบจะเพิ่มยอดคงเหลือทันที
        </div>
      </div>
      <RouterLink to="/documents/receipt">
        <Button label="ย้อนกลับ" icon="pi pi-arrow-left" outlined />
      </RouterLink>
    </div>

    <div class="page-card">
      <!-- ── Header ─────────────────────────────────────────── -->
      <div class="form-grid-3">
        <div>
          <label class="field-label">คลังที่รับเข้า <span class="req">*</span></label>
          <Dropdown
            v-model="form.warehouseId"
            :options="masterStore.warehouses"
            optionLabel="name"
            optionValue="id"
            placeholder="เลือกคลัง"
            filter
            class="w-full"
            :loading="masterStore.warehousesLoading"
          />
        </div>
        <div>
          <label class="field-label">วันที่เอกสาร <span class="req">*</span></label>
          <Calendar v-model="form.docDate" dateFormat="dd/mm/yy" showIcon class="w-full" />
        </div>
        <div>
          <label class="field-label">Supplier</label>
          <Dropdown
            v-model="form.supplierId"
            :options="masterStore.suppliers"
            optionLabel="name"
            optionValue="id"
            placeholder="เลือก Supplier"
            filter
            showClear
            class="w-full"
            :loading="masterStore.suppliersLoading"
          />
          <small class="field-hint">จะถูกบันทึกลงทุก Lot ที่เกิดจากใบรับเข้านี้</small>
        </div>
        <div class="form-full">
          <label class="field-label">หมายเหตุ</label>
          <Textarea
            v-model="form.remark"
            class="w-full"
            rows="2"
            :maxlength="500"
            placeholder="เช่น รับตาม PO-2026-0043"
          />
        </div>
      </div>

      <div class="divider" />

      <!-- ── Add item ───────────────────────────────────────── -->
      <div class="items-header">
        <h3 class="items-title">
          รายการสินค้า
          <span v-if="form.items.length" class="count-pill">{{ form.items.length }}</span>
        </h3>
        <div class="add-row">
          <Dropdown
            v-model="productToAdd"
            :options="masterStore.products"
            optionLabel="name"
            optionValue="id"
            filter
            filterPlaceholder="พิมพ์ชื่อหรือรหัสสินค้า..."
            :filterFields="['name', 'sku']"
            placeholder="เลือกสินค้าเพื่อเพิ่ม"
            class="add-picker"
            :loading="masterStore.productsLoading"
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
      </div>

      <!-- ── Items ──────────────────────────────────────────── -->
      <DataTable v-if="form.items.length" :value="form.items" size="small" class="items-table">
        <Column header="#" style="width: 44px">
          <template #body="{ index }">{{ index + 1 }}</template>
        </Column>

        <Column header="สินค้า" style="min-width: 220px">
          <template #body="{ data }">
            <div class="prod-name">{{ productOf(data).name }}</div>
            <div class="prod-sub mono">{{ productOf(data).sku }}</div>
          </template>
        </Column>

        <Column header="จำนวน *" style="width: 150px">
          <template #body="{ data }">
            <InputNumber
              v-model="data.quantity"
              :min="0"
              :maxFractionDigits="3"
              :class="['w-full', { 'p-invalid': !(data.quantity > 0) }]"
              :suffix="' ' + unitOf(data)"
            />
          </template>
        </Column>

        <Column header="ต้นทุน/หน่วย" style="width: 140px">
          <template #body="{ data }">
            <InputNumber
              v-model="data.unitCost"
              :min="0"
              :maxFractionDigits="4"
              placeholder="—"
              class="w-full"
            />
          </template>
        </Column>

        <Column header="Lot No." style="width: 190px">
          <template #body="{ data }">
            <InputText
              v-if="productOf(data).hasLot"
              v-model="data.lotNo"
              :maxlength="100"
              placeholder="เว้นว่าง = ออกให้อัตโนมัติ"
              class="w-full"
            />
            <span v-else class="muted small">ไม่ใช้ Lot</span>
          </template>
        </Column>

        <Column header="วันหมดอายุ" style="width: 165px">
          <template #body="{ data }">
            <Calendar
              v-if="productOf(data).hasLot"
              v-model="data.expiryDate"
              dateFormat="dd/mm/yy"
              placeholder="—"
              showIcon
              class="w-full"
            />
            <span v-else class="muted small">—</span>
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

      <div v-else class="empty-items">
        <i class="pi pi-inbox" />
        <div>ยังไม่มีรายการ — เลือกสินค้าจากช่องด้านบนเพื่อเพิ่ม</div>
      </div>

      <div v-if="form.items.length" class="summary-bar">
        <span>รวม <strong>{{ form.items.length }}</strong> รายการ</span>
        <span v-if="totalCost > 0">
          มูลค่ารวมโดยประมาณ <strong>{{ formatNumber(totalCost) }}</strong>
        </span>
      </div>

      <!-- ── Actions ────────────────────────────────────────── -->
      <div class="form-actions">
        <RouterLink to="/documents/receipt"><Button label="ยกเลิก" outlined /></RouterLink>
        <Button
          label="บันทึกร่าง"
          icon="pi pi-save"
          outlined
          :loading="saving"
          @click="saveDraft"
        />
        <Button label="ส่งอนุมัติ" icon="pi pi-send" outlined :loading="saving" @click="submit" />
        <Button
          label="รับเข้าและเพิ่มสต๊อก"
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
import { useMasterStore } from '@/stores/master'
import { useStockDocumentForm } from '@/composables/useStockDocumentForm'
import { toIsoDate } from '@/utils/date'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Calendar from 'primevue/calendar'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const masterStore = useMasterStore()

const form = ref({
  warehouseId: null,
  supplierId: null,
  docDate: new Date(),
  remark: '',
  items: [],
})

// Bound to the picker only long enough to add a row, then cleared so the same
// product can be picked twice (two batches of one product is normal here).
const productToAdd = ref(null)

const totalCost = computed(() =>
  form.value.items.reduce((sum, i) => sum + (i.quantity || 0) * (i.unitCost || 0), 0),
)

function productOf(item) {
  return masterStore.getProductById(item.productId) || { name: '(ไม่พบสินค้า)', sku: '-', hasLot: false }
}

function unitOf(item) {
  return masterStore.getUnitById(productOf(item).unitId)?.code || ''
}

function addItem() {
  if (!productToAdd.value) return
  form.value.items.push({
    productId: productToAdd.value,
    quantity: null,
    unitCost: null,
    lotNo: '',
    expiryDate: null,
  })
  productToAdd.value = null
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })
}

function validate() {
  if (!form.value.warehouseId) return 'กรุณาเลือกคลังที่รับเข้า'
  if (!form.value.docDate) return 'กรุณาระบุวันที่เอกสาร'
  if (!form.value.items.length) return 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ'
  for (const [index, item] of form.value.items.entries()) {
    if (!(item.quantity > 0)) {
      return `รายการที่ ${index + 1} (${productOf(item).name}) ต้องระบุจำนวนมากกว่า 0`
    }
  }
  return null
}

function buildPayload() {
  return {
    warehouseId: form.value.warehouseId,
    supplierId: form.value.supplierId ?? undefined,
    docDate: toIsoDate(form.value.docDate),
    remark: form.value.remark || undefined,
    items: form.value.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost ?? undefined,
      // Batch details only mean something for a lot-tracked product; posting
      // ignores them otherwise, so do not send noise.
      lotNo: productOf(item).hasLot && item.lotNo ? item.lotNo : undefined,
      expiryDate:
        productOf(item).hasLot && item.expiryDate ? toIsoDate(item.expiryDate) : undefined,
    })),
  }
}

const { saving, saveDraft, submit, confirmAndPost } = useStockDocumentForm('receipt', {
  validate,
  buildPayload,
})

onMounted(() => {
  if (!masterStore.warehouses.length) masterStore.fetchWarehouses()
  if (!masterStore.products.length) masterStore.fetchProducts()
  if (!masterStore.units.length) masterStore.fetchUnits()
  if (!masterStore.suppliers.length) masterStore.fetchSuppliers()
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
.field-hint {
  display: block;
  font-size: 11px;
  color: var(--gl-text-muted);
  margin-top: 4px;
}

.empty-items {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: var(--gl-text-muted);
  font-size: 14px;
  border: 1px dashed var(--gl-border);
  border-radius: 8px;
}
.empty-items .pi-inbox {
  font-size: 28px;
  opacity: 0.5;
}

.summary-bar {
  display: flex;
  gap: 24px;
  justify-content: flex-end;
  padding: 12px 4px 0;
  font-size: 13px;
  color: var(--gl-text-muted);
}
.summary-bar strong {
  color: var(--gl-navy);
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
