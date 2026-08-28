<template>
  <div v-if="loading" class="page-card" style="text-align: center; padding: 40px; color: var(--gl-text-muted)">
    <i class="pi pi-spin pi-spinner" style="font-size: 24px" />
  </div>

  <div v-else-if="order">
    <div class="page-header">
      <div style="display: flex; align-items: center; gap: 12px">
        <Button icon="pi pi-arrow-left" text rounded @click="router.push('/production/orders')" />
        <div>
          <div class="page-title">{{ order.docNo }}</div>
          <div class="page-subtitle">{{ formulaName }} · {{ machineName }} · {{ formatDate(order.planDate) }}</div>
        </div>
      </div>
      <span :class="['po-badge', statusClass(order.status)]">{{ statusLabel(order.status) }}</span>
    </div>

    <!-- Stepper -->
    <div v-if="order.status !== 'CANCELED'" class="stepper-card">
      <div class="stepper-steps">
        <div v-for="(step, i) in steps" :key="i" class="step-item">
          <div :class="['step-circle', stepState(i)]">
            <i v-if="stepState(i) === 'done'" class="pi pi-check" />
            <span v-else>{{ i + 1 }}</span>
          </div>
          <div :class="['step-label', stepState(i)]">{{ step }}</div>
          <div v-if="i < steps.length - 1" :class="['step-line', stepState(i) === 'done' ? 'line-done' : '']" />
        </div>
      </div>
      <Button
        v-if="order.status === 'MIXING'"
        label="ผสมเสร็จ → เสร็จสิ้น"
        icon="pi pi-check"
        class="btn-primary complete-btn"
        :loading="busy"
        @click="doCompleteMixing"
      />
    </div>

    <!-- ===== ACCEPT: ingredient snapshot + start ===== -->
    <div v-if="order.status === 'ACCEPT'" class="page-card">
      <div class="section-title">ส่วนผสมตามสูตร (บันทึกไว้ ณ ตอนสร้างใบสั่งผลิต)</div>

      <div class="tbl-head"><span class="tbl-title"><i class="pi pi-bolt" /> Premix</span></div>
      <table class="edit-tbl">
        <thead><tr><th style="width: 40px">#</th><th>วัตถุดิบ</th><th style="width: 200px; text-align: right">ปริมาณ</th></tr></thead>
        <tbody>
          <tr v-for="(row, idx) in premixRows" :key="'pm' + row.id">
            <td>{{ idx + 1 }}</td>
            <td><div style="font-weight: 500">{{ row.materialName }}</div><div class="code-sub">{{ row.materialCode }}</div></td>
            <td style="text-align: right"><strong>{{ Number(row.quantity).toLocaleString() }} {{ row.unit }}</strong></td>
          </tr>
          <tr v-if="premixRows.length === 0"><td colspan="3" class="empty-row">ไม่มี Premix ในสูตรนี้</td></tr>
        </tbody>
      </table>

      <div class="tbl-head" style="margin-top: 22px"><span class="tbl-title"><i class="pi pi-box" /> วัตถุดิบ (Ingredient)</span></div>
      <table class="edit-tbl">
        <thead><tr><th style="width: 40px">#</th><th>วัตถุดิบ</th><th style="width: 200px; text-align: right">ปริมาณ</th></tr></thead>
        <tbody>
          <tr v-for="(row, idx) in ingredientRows" :key="'ing' + row.id">
            <td>{{ idx + 1 }}</td>
            <td><div style="font-weight: 500">{{ row.materialName }}</div><div class="code-sub">{{ row.materialCode }}</div></td>
            <td style="text-align: right"><strong>{{ Number(row.quantity).toLocaleString() }} {{ row.unit }}</strong></td>
          </tr>
          <tr v-if="ingredientRows.length === 0"><td colspan="3" class="empty-row">ไม่มีวัตถุดิบในสูตรนี้</td></tr>
        </tbody>
      </table>

      <div class="action-bar">
        <Button label="ยกเลิกใบสั่งผลิต" text severity="danger" :disabled="busy" @click="doCancel" />
        <Button label="เริ่มผสม" icon="pi pi-play" class="btn-primary" :loading="busy" @click="advance('MIXING')" />
      </div>
    </div>

    <!-- ===== MIXING: original mixer sheets (Homo + Ribbon) ===== -->
    <div v-else-if="order.status === 'MIXING'" class="page-card">
      <div class="section-title">ขั้นตอนผสม</div>
      <div class="substep-tabs">
        <button :class="['substep', mixSub === 'sauce' ? 'on' : '']" @click="mixSub = 'sauce'">
          <span class="substep-no">1</span> ผสม Premix → ซอส
        </button>
        <div class="substep-arrow"><i class="pi pi-angle-right" /></div>
        <button :class="['substep', mixSub === 'meat' ? 'on' : '']" @click="mixSub = 'meat'">
          <span class="substep-no">2</span> ผสมซอส + เนื้อแปรรูป
        </button>
      </div>

      <!-- Sub-step 1: Homo Mixer (สร้างซอส) -->
      <div v-show="mixSub === 'sauce'">
        <div class="sheet-title-bar">
          <div class="sheet-title">รายงานการผสมผลิตที่เครื่อง Homo Mixer</div>
          <Button label="ดาวน์โหลดเอกสาร" icon="pi pi-download" outlined size="small" class="dl-btn" @click="downloadMixReport('sauce')" />
        </div>
        <div class="sheet-head">
          <div class="form-field"><label>ชื่อสูตร (Name)</label><InputText v-model="sauce.name" disabled style="width: 220px" /></div>
          <div class="form-field"><label>รหัสสูตร (Code)</label><InputText v-model="sauce.code" disabled style="width: 150px" /></div>
          <div class="form-field"><label>Date</label><InputText v-model="sauce.date" type="date" disabled style="width: 160px" /></div>
          <div class="form-field"><label>Mix size (kg)</label><InputNumber v-model="sauce.mixSize" :min="0" disabled style="width: 120px" /></div>
          <div class="form-field">
            <label>เครื่องจักร (Machine)</label>
            <Dropdown v-model="sauce.machineId" :options="homoMixerOptions" optionLabel="label" optionValue="value" placeholder="เลือกเครื่องจักร" style="width: 220px" />
          </div>
        </div>

        <div class="mix-scroll">
          <table class="mix-sheet">
            <thead>
              <tr>
                <th class="no-col">ครั้งที่ Mix</th>
                <th v-for="c in sauce.columns" :key="c.key">
                  {{ c.label }}<div class="target" v-if="c.target != null">{{ c.target.toLocaleString() }} {{ c.unit }}</div>
                </th>
                <th class="end-col">End</th>
                <th class="act-col"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in sauce.rows" :key="idx">
                <td class="no-col">{{ idx + 1 }}</td>
                <td v-for="c in sauce.columns" :key="c.key">
                  <div :class="['cell-time-btn', { locked: !!row.starts[c.key] }]" @click.stop="togglePicker(`sauce-${idx}-${c.key}`, row, c.key, $event)">
                    <span>{{ row.starts[c.key] || '--:--' }}</span>
                    <i v-if="!row.starts[c.key]" class="pi pi-clock" />
                  </div>
                </td>
                <td>
                  <div :class="['cell-time-btn', { 'has-value': !!row.end }]" @click.stop="toggleEndPicker(`sauce-end-${idx}`, row, $event)">
                    <span>{{ row.end || '--:--' }}</span>
                    <i :class="row.end ? 'pi pi-pencil' : 'pi pi-clock'" />
                  </div>
                </td>
                <td class="act-col">
                  <button v-if="sauce.rows.length > 1" class="row-del" title="ลบรอบนี้" @click="sauce.rows.splice(idx, 1)"><i class="pi pi-trash" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button class="add-round" @click="addSauceRow"><i class="pi pi-plus" /> เพิ่มรอบ Mix</button>
        <div class="action-bar">
          <Button
            label="บันทึกข้อมูล"
            icon="pi pi-save"
            class="btn-primary"
            :loading="savingStage === 'sauce'"
            :disabled="!sauceHasInput"
            @click="saveStage('sauce')"
          />
        </div>
      </div>

      <!-- Sub-step 2: Ribbon Mixer (เนื้อ + ซอส) -->
      <div v-show="mixSub === 'meat'">
        <div class="sheet-title-bar">
          <div class="sheet-title">รายงานผสมผลิตภัณฑ์กันที่เครื่อง Ribbon Mixer</div>
          <Button label="ดาวน์โหลดเอกสาร" icon="pi pi-download" outlined size="small" class="dl-btn" @click="downloadMixReport('meat')" />
        </div>
        <div class="sheet-head">
          <div class="form-field"><label>ชื่อสูตร (Name)</label><InputText v-model="meat.name" disabled style="width: 220px" /></div>
          <div class="form-field"><label>Code</label><InputText v-model="meat.code" disabled style="width: 150px" /></div>
          <div class="form-field"><label>Date</label><InputText v-model="meat.date" type="date" disabled style="width: 160px" /></div>
          <div class="form-field"><label>Mix size (kg)</label><InputNumber v-model="meat.mixSize" :min="0" disabled style="width: 120px" /></div>
          <div class="form-field">
            <label>เครื่องจักร (Machine)</label>
            <Dropdown v-model="meat.machineId" :options="ribbonMixerOptions" optionLabel="label" optionValue="value" placeholder="เลือกเครื่องจักร" style="width: 220px" />
          </div>
        </div>

        <div class="mix-scroll">
          <table class="mix-sheet">
            <thead>
              <tr>
                <th class="no-col">ครั้งที่ Mix</th>
                <th v-for="c in meat.columns" :key="c.key">
                  {{ c.label }}<div class="target" v-if="c.target != null">{{ c.target.toLocaleString() }} {{ c.unit }}</div>
                </th>
                <th class="end-col">End</th>
                <th class="end-col">อุณหภูมิ</th>
                <th class="act-col"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in meat.rows" :key="idx">
                <td class="no-col">{{ idx + 1 }}</td>
                <td v-for="c in meat.columns" :key="c.key">
                  <div :class="['cell-time-btn', { locked: !!row.starts[c.key] }]" @click.stop="togglePicker(`meat-${idx}-${c.key}`, row, c.key, $event)">
                    <span>{{ row.starts[c.key] || '--:--' }}</span>
                    <i v-if="!row.starts[c.key]" class="pi pi-clock" />
                  </div>
                </td>
                <td>
                  <div :class="['cell-time-btn', { 'has-value': !!row.end }]" @click.stop="toggleEndPicker(`meat-end-${idx}`, row, $event)">
                    <span>{{ row.end || '--:--' }}</span>
                    <i :class="row.end ? 'pi pi-pencil' : 'pi pi-clock'" />
                  </div>
                </td>
                <td>
                  <div :class="['cell-temp-btn', { 'has-value': hasTemp(row) }]" @click.stop="toggleNumpad(`meat-temp-${idx}`, row, $event)">
                    <template v-if="hasTemp(row)"><span>{{ row.temp }}</span><small>°C</small></template>
                    <template v-else><span>--</span><i class="pi pi-th-large" /></template>
                  </div>
                </td>
                <td class="act-col">
                  <button v-if="meat.rows.length > 1" class="row-del" title="ลบรอบนี้" @click="meat.rows.splice(idx, 1)"><i class="pi pi-trash" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button class="add-round" @click="addMeatRow"><i class="pi pi-plus" /> เพิ่มรอบ Mix</button>

        <div class="action-bar">
          <Button
            label="บันทึกข้อมูล"
            icon="pi pi-save"
            class="btn-primary"
            :loading="savingStage === 'meat'"
            :disabled="!meatHasInput"
            @click="saveStage('meat')"
          />
        </div>
      </div>
    </div>

    <!-- ===== SUCCESS ===== -->
    <div v-else-if="order.status === 'SUCCESS'" class="page-card">
      <div class="done-banner">
        <i class="pi pi-check-circle" style="font-size: 40px; color: #10b981" />
        <div>
          <div style="font-size: 18px; font-weight: 700; color: #166534">เสร็จสิ้น</div>
          <div style="font-size: 13px; color: #4b7a5e">{{ formatDt(order.updatedAt) }}</div>
        </div>
      </div>

      <div class="dl-card">
        <div class="dl-card-title"><i class="pi pi-file-pdf" /> ดาวน์โหลดเอกสารการผสม</div>
        <div class="dl-card-btns">
          <Button label="ผสม Premix → ซอส" icon="pi pi-download" outlined size="small" @click="downloadMixReport('sauce')" />
          <Button label="ผสมซอส + เนื้อแปรรูป" icon="pi pi-download" outlined size="small" @click="downloadMixReport('meat')" />
        </div>
      </div>
      <div v-if="order.mixRecords.length">
        <div class="tbl-head"><span class="tbl-title"><i class="pi pi-list" /> บันทึกการผสม ({{ order.mixRecords.length }})</span></div>
        <table class="edit-tbl">
          <thead>
            <tr><th>วัตถุดิบ</th><th style="width:150px">ขั้นตอน</th><th style="width:70px">รอบ</th><th style="width:90px">อุณหภูมิ</th><th style="width:130px">เริ่ม–จบ</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in order.mixRecords" :key="r.id">
              <td>{{ ingredientName(r.productionIngredientId) }}</td>
              <td>{{ stageLabel(r.stage) }}</td>
              <td>{{ r.mixNo ?? '—' }}</td>
              <td>{{ r.sauceTemp ?? '—' }}</td>
              <td>{{ timeOnly(r.startedAt) }}–{{ timeOnly(r.endAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ===== CANCELED ===== -->
    <div v-else-if="order.status === 'CANCELED'" class="page-card cancelled-card">
      <i class="pi pi-times-circle" style="font-size: 36px; color: var(--gl-red)" />
      <div style="font-size: 16px; font-weight: 600; color: #7f1d1d">ใบสั่งผลิตถูกยกเลิก</div>
      <Button label="กลับไปรายการ" icon="pi pi-arrow-left" outlined @click="router.push('/production/orders')" />
    </div>
  </div>

  <div v-else class="page-card" style="text-align: center; padding: 40px; color: var(--gl-text-muted)">
    ไม่พบใบสั่งผลิต
  </div>

  <!-- Preview + download modal for the two mixer report sheets -->
  <MixReportPreviewDialog v-model:visible="previewVisible" :header="previewHeader" :html="previewHtml" />

  <!-- Time picker dropdown (teleported to body to escape table overflow) -->
  <Teleport to="body">
    <div v-if="openPickerId" ref="pickerEl" class="time-drop" :style="dropStyle(pickerPos)" @click.stop>
      <div class="td-label">เวลาปัจจุบัน</div>
      <div class="td-time">{{ liveTime }}</div>
      <button class="td-save-btn" @click="saveTime"><i class="pi pi-check" /> บันทึก</button>
      <template v-if="pickerMode === 'end'">
        <div class="td-divider">หรือเลือกเวลา</div>
        <div class="td-manual">
          <input v-model="manualEndTime" type="time" class="td-time-input" @click.stop />
          <button class="td-confirm-btn" @click="saveManualTime"><i class="pi pi-check" /> ยืนยัน</button>
        </div>
      </template>
    </div>
  </Teleport>

  <!-- Temperature numpad (teleported to body to escape table overflow) -->
  <Teleport to="body">
    <div v-if="openNumpadId" ref="numpadEl" class="np-drop" :style="dropStyle(numpadPos)" @click.stop>
      <div class="np-label">อุณหภูมิ (°C)</div>
      <div class="np-display">
        <span class="np-value">{{ numpadValue || '0' }}</span>
        <span class="np-unit">°C</span>
      </div>
      <div class="np-grid">
        <button v-for="k in ['1','2','3','4','5','6','7','8','9']" :key="k" class="np-key" @click="pressKey(k)">{{ k }}</button>
        <button class="np-key np-key-alt" @click="pressKey('.')">.</button>
        <button class="np-key" @click="pressKey('0')">0</button>
        <button class="np-key np-key-alt" title="ลบ" @click="backspaceKey"><i class="pi pi-delete-left" /></button>
      </div>
      <div class="np-actions">
        <button class="np-clear-btn" @click="clearNumpad">ล้าง</button>
        <button class="np-confirm-btn" @click="confirmNumpad"><i class="pi pi-check" /> ยืนยัน</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useMasterStore } from "@/stores/master";
import { useProductionStore } from "@/stores/production";
import { buildMixReportHtml } from "@/utils/mixReportTemplate";
import MixReportPreviewDialog from "./MixReportPreviewDialog.vue";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const productionStore = useProductionStore();
const masterStore = useMasterStore();

const loading = ref(true);
const busy = ref(false);

const order = computed(() => productionStore.getOrderById(route.params.id));
const formula = computed(() => (order.value ? productionStore.getFormulaById(order.value.formulaId) : null));
const formulaName = computed(() => formula.value?.name || "—");
const machineName = computed(() => {
  const m = masterStore.getMachineById(order.value?.machineId);
  return m ? `${m.name}${m.code ? ` (${m.code})` : ""}` : "—";
});

const premixRows = computed(() => (order.value?.ingredients || []).filter((i) => i.stepType === "PREMIX"));
const ingredientRows = computed(() => (order.value?.ingredients || []).filter((i) => i.stepType !== "PREMIX"));

const steps = ["ยืนยันแล้ว", "กำลังผสม", "เสร็จสิ้น"];
const stepIndex = computed(() => ({ ACCEPT: 0, MIXING: 1, SUCCESS: 2 })[order.value?.status] ?? 0);
function stepState(i) {
  const cur = stepIndex.value;
  if (order.value?.status === "SUCCESS") return i <= cur ? "done" : "pending";
  if (i < cur) return "done";
  if (i === cur) return "active";
  return "pending";
}

// ---- machine options by type ----
const machineOptionsByType = (type) =>
  masterStore.machines.filter((m) => m.isActive && m.type === type).map((m) => ({ label: `${m.code} — ${m.name}`, value: m.id }));
const homoMixerOptions = computed(() => machineOptionsByType("HOMO_MIXER"));
const ribbonMixerOptions = computed(() => machineOptionsByType("RIBBON_MIXER"));

// ---- labels ----
function stageLabel(s) {
  return { 1: "Homo Mixer (ซอส)", 2: "Ribbon Mixer (เนื้อ)" }[s] || (s != null ? `Stage ${s}` : "—");
}
function ingredientName(pid) {
  return (order.value?.ingredients || []).find((i) => i.id === pid)?.materialName || `#${pid}`;
}
function statusLabel(s) {
  return { ACCEPT: "ยืนยันแล้ว", MIXING: "กำลังผสม", SUCCESS: "เสร็จสิ้น", CANCELED: "ยกเลิก" }[s] || s;
}
function statusClass(s) {
  return { ACCEPT: "confirmed", MIXING: "mixing", SUCCESS: "done", CANCELED: "cancelled" }[s] || "";
}
function formatDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
function formatDt(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
}
function timeOnly(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ---- mix sheets (restored original design) ----
const mixSub = ref("sauce");
const sauce = reactive({ name: "", code: "", date: "", mixSize: 0, machineId: null, columns: [], rows: [] });
const meat = reactive({ name: "", code: "", date: "", mixSize: 0, machineId: null, columns: [], rows: [] });

function makeSauceRow() {
  return { starts: Object.fromEntries(sauce.columns.map((c) => [c.key, ""])), end: "" };
}
function makeMeatRow() {
  return { starts: Object.fromEntries(meat.columns.map((c) => [c.key, ""])), end: "", temp: null };
}
function addSauceRow() { sauce.rows.push(makeSauceRow()); }
function addMeatRow() { meat.rows.push(makeMeatRow()); }

// Whether the user has entered at least one start time — gates the save button.
const sauceHasInput = computed(() => sauce.rows.some((r) => Object.values(r.starts).some((v) => v)));
const meatHasInput = computed(() => meat.rows.some((r) => Object.values(r.starts).some((v) => v)));

// ISO datetime → local "HH:MM" (round-trips values written by the time picker).
function hhmmFromISO(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
// Local yyyy-mm-dd of the first record that has a start time.
function dateFromRecords(records) {
  const rec = (records || []).find((r) => r.startedAt);
  if (!rec) return "";
  const d = new Date(rec.startedAt);
  if (isNaN(d.getTime())) return "";
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}
// Rebuild a stage's editable rows from its saved mix records (grouped by mixNo);
// falls back to one blank row when the stage has none yet.
function rowsFromStage(columns, records, isMeat) {
  const blank = () => (isMeat ? makeMeatRow() : makeSauceRow());
  if (!records?.length) return [blank()];
  const byMix = new Map();
  records.forEach((r) => {
    const no = r.mixNo || 1;
    if (!byMix.has(no)) byMix.set(no, { starts: {}, end: "", temp: null });
    const row = byMix.get(no);
    const col = columns.find((c) => c.ingredientId === r.productionIngredientId);
    if (col) row.starts[col.key] = hhmmFromISO(r.startedAt);
    if (r.endAt) row.end = hhmmFromISO(r.endAt);
    if (isMeat && r.sauceTemp != null) row.temp = Number(r.sauceTemp);
  });
  return [...byMix.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => {
      const starts = Object.fromEntries(columns.map((c) => [c.key, v.starts[c.key] || ""]));
      return isMeat ? { starts, end: v.end, temp: v.temp } : { starts, end: v.end };
    });
}

// Build the mixer sheets from the order's ingredient snapshot. Each ingredient
// column carries its `ingredientId` (= productionIngredientId) so the grid can
// be mapped back to backend mix records on save.
function initMix() {
  if (!order.value) return;
  const ings = order.value.ingredients || [];
  const premixIngs = ings.filter((i) => i.stepType === "PREMIX");
  const meatIngs = ings.filter((i) => i.stepType !== "PREMIX");

  // Columns are derived purely from the PREMIX ingredients (one column each).
  const sCols = premixIngs.map((i, idx) => ({
    key: "p" + idx, label: i.materialName, target: Number(i.quantity), unit: i.unit, ingredientId: i.id,
  }));
  const mCols = meatIngs.map((i, idx) => ({
    key: "m" + idx, label: i.materialName, target: Number(i.quantity), unit: i.unit, ingredientId: i.id,
  }));

  // Prefill from any records already saved for this order (per stage).
  const stage1 = order.value.firstStageMixRecords || [];
  const stage2 = order.value.secondStageMixRecords || [];

  sauce.name = formula.value?.name ?? "";
  sauce.code = formula.value?.code ?? "";
  sauce.date = dateFromRecords(stage1) || todayStr();
  sauce.mixSize = premixIngs.reduce((sum, i) => sum + Number(i.quantity), 0);
  sauce.machineId = order.value.firstMachineId ?? homoMixerOptions.value[0]?.value ?? null;
  sauce.columns = sCols;
  sauce.rows = rowsFromStage(sCols, stage1, false);

  meat.name = formula.value?.name ?? "";
  meat.code = formula.value?.code ?? "";
  meat.date = dateFromRecords(stage2) || todayStr();
  meat.mixSize = 0;
  meat.machineId = order.value.secondMachineId ?? ribbonMixerOptions.value[0]?.value ?? null;
  meat.columns = mCols;
  meat.rows = rowsFromStage(mCols, stage2, true);
  mixSub.value = "sauce";
}

// Re-init the sheets only when the order actually changes (id) or newly enters
// MIXING — using a primitive key so this does NOT fire on every store refresh
// (e.g. after saving a stage). Otherwise the tab would jump back and unsaved
// edits in the other tab would be rebuilt from the server. The user stays put.
watch(
  () => `${order.value?.id ?? ""}:${order.value?.status ?? ""}`,
  () => { if (order.value?.status === "MIXING") initMix(); },
);

// ---- shared dropdown placement ----
// Both floating panels are position:fixed so the table's overflow cannot clip
// them — but they can still fall off the viewport. Measure the panel after it
// renders, flip it above the anchor when there is no room below, and clamp it
// horizontally. Kept hidden (not unmounted) for the one frame before placement
// so it never flashes at the wrong spot.
const VIEWPORT_MARGIN = 8;
const GAP = 6;
const pickerEl = ref(null);
const numpadEl = ref(null);
let _pickerAnchor = null;
let _numpadAnchor = null;

function dropStyle(pos) {
  return { top: pos.top + "px", left: pos.left + "px", visibility: pos.ready ? "visible" : "hidden" };
}
async function placeDrop(elRef, anchor, pos) {
  await nextTick();
  const el = elRef.value;
  if (!el || !anchor) return;
  const rect = anchor.getBoundingClientRect();
  const h = el.offsetHeight;
  const half = el.offsetWidth / 2;
  let top = rect.bottom + GAP;
  if (top + h + VIEWPORT_MARGIN > window.innerHeight) {
    const above = rect.top - h - GAP;
    if (above >= VIEWPORT_MARGIN) top = above;
  }
  // Final clamp: the anchor cell itself can sit outside the viewport, so the
  // flip alone is not enough to guarantee the panel is fully visible.
  pos.top = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - h - VIEWPORT_MARGIN));
  pos.left = Math.min(
    Math.max(rect.left + rect.width / 2, half + VIEWPORT_MARGIN),
    window.innerWidth - half - VIEWPORT_MARGIN,
  );
  pos.ready = true;
}
function repositionDrops() {
  if (openPickerId.value) placeDrop(pickerEl, _pickerAnchor, pickerPos);
  if (openNumpadId.value) placeDrop(numpadEl, _numpadAnchor, numpadPos);
}

// ---- time picker dropdown ----
const openPickerId = ref(null);
const liveTime = ref("");
const pickerPos = reactive({ top: 0, left: 0, ready: false });
const pickerMode = ref("start");
const manualEndTime = ref("");
let liveTimer = null;
let _activeRow = null;
let _activeKey = null;

function _openPicker(id, event) {
  closeNumpad();
  _pickerAnchor = event.currentTarget;
  pickerPos.ready = false;
  openPickerId.value = id;
  liveTime.value = nowHHMM();
  if (liveTimer) clearInterval(liveTimer);
  liveTimer = setInterval(() => { liveTime.value = nowHHMM(); }, 1000);
  placeDrop(pickerEl, _pickerAnchor, pickerPos);
}
function togglePicker(id, row, key, event) {
  if (row.starts[key]) return;
  if (openPickerId.value === id) { closePicker(); return; }
  _activeRow = row; _activeKey = key; pickerMode.value = "start";
  _openPicker(id, event);
}
function toggleEndPicker(id, row, event) {
  if (openPickerId.value === id) { closePicker(); return; }
  _activeRow = row; _activeKey = "end"; pickerMode.value = "end";
  manualEndTime.value = row.end || "";
  _openPicker(id, event);
}
function closePicker() {
  openPickerId.value = null; liveTime.value = ""; pickerMode.value = "start";
  manualEndTime.value = ""; _activeRow = null; _activeKey = null;
  pickerPos.ready = false; _pickerAnchor = null;
  if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
}
function saveTime() {
  if (_activeRow) {
    if (pickerMode.value === "end") _activeRow.end = nowHHMM();
    else if (_activeKey) _activeRow.starts[_activeKey] = nowHHMM();
  }
  closePicker();
}
function saveManualTime() {
  if (_activeRow && manualEndTime.value) _activeRow.end = manualEndTime.value;
  closePicker();
}

// ---- temperature numpad ----
const openNumpadId = ref(null);
const numpadPos = reactive({ top: 0, left: 0, ready: false });
const numpadValue = ref("");
let _tempRow = null;

function hasTemp(row) {
  return row.temp !== null && row.temp !== undefined && row.temp !== "";
}
function toggleNumpad(id, row, event) {
  if (openNumpadId.value === id) { closeNumpad(); return; }
  closePicker();
  _numpadAnchor = event.currentTarget;
  _tempRow = row;
  numpadValue.value = hasTemp(row) ? String(row.temp) : "";
  numpadPos.ready = false;
  openNumpadId.value = id;
  placeDrop(numpadEl, _numpadAnchor, numpadPos);
}
function closeNumpad() {
  openNumpadId.value = null; numpadValue.value = ""; _tempRow = null;
  numpadPos.ready = false; _numpadAnchor = null;
}
function pressKey(k) {
  if (k === "." && numpadValue.value.includes(".")) return;
  if (k === "." && !numpadValue.value) { numpadValue.value = "0."; return; }
  if (numpadValue.value.replace(".", "").length >= 5) return;
  numpadValue.value += k;
}
function backspaceKey() {
  numpadValue.value = numpadValue.value.slice(0, -1);
}
function clearNumpad() {
  numpadValue.value = "";
}
function confirmNumpad() {
  if (_tempRow) {
    const v = numpadValue.value;
    _tempRow.temp = v === "" || v === "." ? null : Number(v);
  }
  closeNumpad();
}
function onNumpadKeydown(e) {
  if (!openNumpadId.value) return;
  if (/^[0-9.]$/.test(e.key)) { e.preventDefault(); pressKey(e.key); }
  else if (e.key === "Backspace") { e.preventDefault(); backspaceKey(); }
  else if (e.key === "Enter") { e.preventDefault(); confirmNumpad(); }
  else if (e.key === "Escape") { e.preventDefault(); closeNumpad(); }
}

function onDocumentClick() { closePicker(); closeNumpad(); }
onMounted(() => {
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onNumpadKeydown);
  window.addEventListener("resize", repositionDrops);
  // capture phase so scrolling the mix table (not just the window) repositions too
  window.addEventListener("scroll", repositionDrops, true);
});
onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick);
  document.removeEventListener("keydown", onNumpadKeydown);
  window.removeEventListener("resize", repositionDrops);
  window.removeEventListener("scroll", repositionDrops, true);
  closePicker();
  closeNumpad();
});

onMounted(async () => {
  if (!masterStore.machines.length) masterStore.fetchMachines().catch(() => {});
  loading.value = true;
  try {
    // Formula name/code come from the (shallow) list; the ingredient data used by
    // this page is the order's own snapshot, so we never need a formula GET-by-id.
    if (!productionStore.formulas.length) await productionStore.fetchFormulas().catch(() => {});
    await productionStore.fetchOrder(route.params.id);
    if (order.value?.status === "MIXING") initMix();
  } catch (e) {
    const msg = e.response?.data?.message || "โหลดใบสั่งผลิตล้มเหลว";
    toast.add({ severity: "error", summary: Array.isArray(msg) ? msg.join(", ") : msg, life: 4000 });
  } finally {
    loading.value = false;
  }
});

// ---- status transitions ----
async function advance(toStatus) {
  busy.value = true;
  try {
    await productionStore.updateOrder(order.value.id, { status: toStatus });
    toast.add({ severity: "success", summary: toStatus === "MIXING" ? "เริ่มผสมแล้ว" : "ผลิตเสร็จสิ้น", life: 3000 });
  } catch (e) {
    const msg = e.response?.data?.message || "อัปเดตสถานะไม่สำเร็จ";
    toast.add({ severity: "error", summary: Array.isArray(msg) ? msg.join(", ") : msg, life: 4000 });
  } finally {
    busy.value = false;
  }
}

function toISO(date, time) {
  if (!time) return undefined;
  const base = date || order.value?.planDate || todayStr();
  const d = new Date(`${base}T${time}`);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

// Build ONE stage's mix records from its sheet: one record per (round × ingredient
// column) that has a start time. Sauce → stage 1, meat → stage 2 (+ sauceTemp).
function buildStageRecords(type) {
  const sheet = type === "meat" ? meat : sauce;
  const stage = type === "meat" ? 2 : 1;
  const recs = [];
  sheet.rows.forEach((row, ri) => {
    sheet.columns.forEach((c) => {
      if (!c.ingredientId || !row.starts[c.key]) return;
      const rec = {
        productionIngredientId: c.ingredientId,
        stage,
        mixNo: ri + 1,
        startedAt: toISO(sheet.date, row.starts[c.key]),
        endAt: toISO(sheet.date, row.end),
      };
      if (stage === 2 && row.temp != null && row.temp !== "") rec.sauceTemp = Number(row.temp);
      recs.push(rec);
    });
  });
  return recs;
}

const savingStage = ref(null);

// Save one stage via the replace endpoint — sends the whole stage list, which the
// backend removes-and-reinserts (idempotent). Sauce = stage 1, meat = stage 2.
async function saveStage(type) {
  const records = buildStageRecords(type);
  if (!records.length) {
    toast.add({ severity: "warn", summary: "กรุณากรอกเวลาอย่างน้อย 1 รายการ", life: 3000 });
    return;
  }
  savingStage.value = type;
  try {
    await productionStore.saveMixRecords(order.value.id, records);
    toast.add({ severity: "success", summary: "บันทึกข้อมูลแล้ว", life: 2500 });
  } catch (e) {
    const msg = e.response?.data?.message || "บันทึกไม่สำเร็จ";
    toast.add({ severity: "error", summary: Array.isArray(msg) ? msg.join(", ") : msg, life: 4000 });
  } finally {
    savingStage.value = null;
  }
}

// Complete = move status to SUCCESS via the existing update endpoint. Mix records
// are persisted separately per stage via saveStage.
async function doCompleteMixing() {
  busy.value = true;
  try {
    await productionStore.updateOrder(order.value.id, { status: "SUCCESS" });
    toast.add({ severity: "success", summary: "ผลิตเสร็จสิ้น", life: 3000 });
    router.push("/production/orders");
  } catch (e) {
    const msg = e.response?.data?.message || "อัปเดตสถานะไม่สำเร็จ";
    toast.add({ severity: "error", summary: Array.isArray(msg) ? msg.join(", ") : msg, life: 4000 });
  } finally {
    busy.value = false;
  }
}

function doCancel() {
  confirm.require({
    message: "ต้องการยกเลิกใบสั่งผลิตนี้ใช่หรือไม่?",
    header: "ยืนยันการยกเลิก",
    icon: "pi pi-exclamation-triangle",
    acceptClass: "p-button-danger",
    accept: async () => {
      busy.value = true;
      try {
        await productionStore.cancelOrder(order.value.id);
        toast.add({ severity: "info", summary: "ยกเลิกแล้ว", life: 3000 });
        router.push("/production/orders");
      } catch (e) {
        const msg = e.response?.data?.message || "ยกเลิกไม่สำเร็จ";
        toast.add({ severity: "error", summary: Array.isArray(msg) ? msg.join(", ") : msg, life: 4000 });
      } finally {
        busy.value = false;
      }
    },
  });
}

function machineLabel(id) {
  const m = masterStore.getMachineById(id);
  return m ? `${m.code} — ${m.name}` : "—";
}

const MIX_TITLE = {
  sauce: "รายงานการผสมผลิตที่เครื่อง Homo Mixer",
  meat: "รายงานผสมผลิตภัณฑ์กันที่เครื่อง Ribbon Mixer",
};

// Default machine name for the report — during MIXING the live sheet holds a
// chosen machine; in SUCCESS we fall back to the first machine of that type.
function reportMachineName(type, machineId) {
  if (machineId) return machineLabel(machineId);
  const opts = type === "meat" ? ribbonMixerOptions.value : homoMixerOptions.value;
  return opts[0]?.label || machineLabel(order.value?.machineId);
}

// Normalize the live editing sheet (MIXING step) into the report shape.
function reportFromLiveSheet(type) {
  const sheet = type === "meat" ? meat : sauce;
  const cols = sheet.columns || [];
  return {
    isMeat: type === "meat",
    title: MIX_TITLE[type],
    docNo: order.value?.docNo || "",
    formName: sheet.name,
    code: sheet.code,
    date: sheet.date,
    mixSize: sheet.mixSize,
    machineName: reportMachineName(type, sheet.machineId),
    columns: cols.map((c) => ({ label: c.label, target: c.target, unit: c.unit })),
    rows: (sheet.rows || []).map((r, i) => ({
      no: i + 1,
      values: cols.map((c) => r.starts?.[c.key] || ""),
      end: r.end || "",
      temp: r.temp,
    })),
  };
}

// Reconstruct the report from saved mixRecords (SUCCESS step) so the document
// can be re-downloaded after coming back to a completed order.
function reportFromRecords(type) {
  const ings = (order.value?.ingredients || []).filter((i) =>
    type === "meat" ? i.stepType !== "PREMIX" : i.stepType === "PREMIX",
  );
  const stage = type === "meat" ? 2 : 1;
  const recs = (order.value?.mixRecords || []).filter((r) => r.stage === stage);
  const mixNos = [...new Set(recs.map((r) => r.mixNo))].sort((a, b) => a - b);
  const rows = mixNos.map((no) => {
    const rowRecs = recs.filter((r) => r.mixNo === no);
    const endRec = rowRecs.find((r) => r.endAt);
    const tempRec = rowRecs.find((r) => r.sauceTemp != null);
    return {
      no,
      values: ings.map((ing) => {
        const rec = rowRecs.find((r) => r.productionIngredientId === ing.id);
        return rec?.startedAt ? timeOnly(rec.startedAt) : "";
      }),
      end: endRec ? timeOnly(endRec.endAt) : "",
      temp: tempRec ? tempRec.sauceTemp : null,
    };
  });
  const firstRec = recs.find((r) => r.startedAt);
  return {
    isMeat: type === "meat",
    title: MIX_TITLE[type],
    docNo: order.value?.docNo || "",
    formName: formula.value?.name || "",
    code: formula.value?.code || "",
    date: firstRec?.startedAt ? String(firstRec.startedAt).slice(0, 10) : order.value?.planDate || "",
    mixSize: type === "meat" ? "" : ings.reduce((s, i) => s + Number(i.quantity || 0), 0),
    machineName: reportMachineName(type, null),
    columns: ings.map((i) => ({ label: i.materialName, target: Number(i.quantity), unit: i.unit })),
    rows,
  };
}

// ---- preview + download modal ----
const previewVisible = ref(false);
const previewHtml = ref("");
const previewHeader = ref("");

function downloadMixReport(type) {
  const report = order.value?.status === "SUCCESS" ? reportFromRecords(type) : reportFromLiveSheet(type);
  previewHtml.value = buildMixReportHtml(report);
  previewHeader.value = `ตัวอย่างเอกสาร — ${MIX_TITLE[type]}`;
  previewVisible.value = true;
}
</script>

<style scoped>
.stepper-card {
  display: flex; align-items: center; background: #fff; border-radius: 12px;
  padding: 20px 28px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); margin-bottom: 16px;
}
.stepper-steps { display: flex; align-items: center; flex: 1; }
.complete-btn { flex-shrink: 0; margin-left: 20px; }
.step-item { display: flex; align-items: center; }
.step-circle {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
  border: 2px solid #e2e8f0; background: #f8fafc; color: #94a3b8; flex-shrink: 0;
}
.step-circle.done { background: #10b981; border-color: #10b981; color: #fff; }
.step-circle.active { background: #1e2a3b; border-color: #1e2a3b; color: #fff; }
.step-label { font-size: 12px; font-weight: 500; margin-left: 8px; white-space: nowrap; color: #94a3b8; }
.step-label.done { color: #10b981; }
.step-label.active { color: #1e2a3b; font-weight: 700; }
.step-line { flex: 1; height: 2px; background: #e2e8f0; margin: 0 16px; min-width: 24px; }
.step-line.line-done { background: #10b981; }
.section-title { font-size: 14px; font-weight: 700; color: #1e2a3b; margin-bottom: 14px; }
.action-bar {
  display: flex; justify-content: flex-end; gap: 10px;
  margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9;
}
.tbl-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.tbl-title { font-size: 13px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 6px; }
.tbl-title i { color: #84cc16; }
.edit-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.edit-tbl th { background: #1e2a3b; color: #fff; font-size: 12px; font-weight: 600; padding: 8px 10px; text-align: left; }
.edit-tbl td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.edit-tbl tbody tr:nth-child(even) { background: #fafbfc; }
.empty-row { text-align: center; color: var(--gl-text-muted); padding: 16px; font-style: italic; }
.code-sub { font-size: 11px; color: var(--gl-text-muted); font-family: monospace; }

/* sub-step tabs */
.substep-tabs { display: flex; align-items: center; gap: 4px; margin-bottom: 18px; }
.substep {
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  background: #f1f5f9; border: 1px solid #e2e8f0; color: #64748b;
  padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
}
.substep.on { background: #1e2a3b; border-color: #1e2a3b; color: #fff; }
.substep-no {
  width: 22px; height: 22px; border-radius: 50%; background: rgba(255, 255, 255, 0.2);
  display: flex; align-items: center; justify-content: center; font-size: 12px;
}
.substep:not(.on) .substep-no { background: #cbd5e1; color: #fff; }
.substep-arrow { color: #cbd5e1; }

/* mixer sheet */
.sheet-title { font-size: 14px; font-weight: 700; text-align: center; color: #1e2a3b; margin: 4px 0 14px; padding-bottom: 8px; border-bottom: 2px solid #1e2a3b; }
.sheet-title-bar { position: relative; }
.sheet-title-bar .dl-btn { position: absolute; right: 0; top: -2px; }
.sheet-head { display: flex; gap: 18px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 18px; }
.sheet-head :deep(.p-inputtext), .sheet-head :deep(.p-inputnumber), .sheet-head :deep(.p-inputnumber-input), .sheet-head :deep(.p-dropdown) { height: 42px; }
.sheet-head :deep(.p-inputnumber-input) { width: 100%; }
.sheet-head :deep(.p-dropdown) { display: inline-flex; align-items: center; }
.mix-scroll { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06); }
.mix-sheet { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
.mix-sheet thead th { background: #1e2a3b; color: #fff; font-weight: 600; font-size: 12px; padding: 13px 10px; text-align: center; min-width: 112px; white-space: nowrap; }
.mix-sheet thead th:not(:last-child) { border-right: 1px solid rgba(255, 255, 255, 0.08); }
.mix-sheet .target { display: inline-block; margin-top: 5px; font-size: 10.5px; font-weight: 600; color: #fcd34d; background: rgba(251, 191, 36, 0.14); padding: 1px 9px; border-radius: 999px; }
.mix-sheet tbody td { padding: 0; text-align: center; border-bottom: 1px solid #eef2f6; }
.mix-sheet tbody td:not(:last-child) { border-right: 1px solid #f3f6f9; }
.mix-sheet tbody tr:hover td { background: #fafdf5; }
.mix-sheet .no-col { width: 100px; min-width: 100px; }
.mix-sheet .end-col { width: 110px; }
.mix-sheet .act-col { width: 52px; min-width: 52px; }
.mix-sheet tbody .no-col { background: #f8fafc; font-weight: 700; color: #475569; border-right: 1px solid #e2e8f0; }
.cell-time-btn {
  display: flex; align-items: center; justify-content: center; gap: 5px;
  width: 100%; padding: 13px 8px; cursor: pointer; font-size: 13px; color: #94a3b8; user-select: none; transition: background 0.12s;
}
.cell-time-btn:hover { background: #f8fafc; }
.cell-time-btn .pi-clock { font-size: 11px; }
.cell-time-btn.locked { color: #166534; font-weight: 700; background: #f0fdf4; cursor: default; }
.cell-time-btn.locked:hover { background: #f0fdf4; }
.cell-time-btn.has-value { color: #166534; font-weight: 700; background: #f0fdf4; }
.cell-time-btn.has-value:hover { background: #dcfce7; }
.cell-time-btn.has-value .pi-pencil { font-size: 10px; opacity: 0.55; }
.cell-temp-btn {
  display: flex; align-items: baseline; justify-content: center; gap: 3px;
  width: 100%; padding: 13px 8px; cursor: pointer; font-size: 13px; color: #94a3b8; user-select: none; transition: background 0.12s;
}
.cell-temp-btn:hover { background: #f8fafc; }
.cell-temp-btn .pi { font-size: 10px; align-self: center; }
.cell-temp-btn small { font-size: 10px; font-weight: 600; }
.cell-temp-btn.has-value { color: #166534; font-weight: 700; background: #f0fdf4; }
.cell-temp-btn.has-value:hover { background: #dcfce7; }
.mix-sheet tbody .act-col { background: #fff; }
.row-del {
  width: 30px; height: 30px; border: none; border-radius: 8px; cursor: pointer;
  background: transparent; color: #d1d9e2; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; transition: background 0.12s, color 0.12s;
}
.mix-sheet tbody tr:hover .row-del { color: #f87171; }
.row-del:hover { background: #fef2f2; color: #dc2626; }
.add-round {
  display: inline-flex; align-items: center; gap: 7px; margin-top: 12px;
  padding: 9px 16px; border: 1.5px dashed #cbd5e1; border-radius: 10px; background: #fff;
  color: #475569; font-size: 13px; font-weight: 600; cursor: pointer;
  transition: border-color 0.14s, color 0.14s, background 0.14s;
}
.add-round:hover { border-color: #84cc16; color: #4d7c0f; background: #f7fee7; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 13px; font-weight: 500; }
.done-banner { display: flex; align-items: center; gap: 16px; padding: 20px; background: #f0fdf4; border-radius: 10px; margin-bottom: 20px; }
.dl-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; margin-bottom: 22px; background: #fbfdff; }
.dl-card-title { font-size: 13px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 7px; margin-bottom: 12px; }
.dl-card-title i { color: #dc2626; }
.dl-card-btns { display: flex; gap: 10px; flex-wrap: wrap; }
.cancelled-card { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; text-align: center; }
.po-badge { display: inline-block; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; }
.po-badge.confirmed { background: #dbeafe; color: #1d4ed8; }
.po-badge.mixing { background: #fef3c7; color: #b45309; }
.po-badge.done { background: #dcfce7; color: #166534; }
.po-badge.cancelled { background: #fee2e2; color: #991b1b; }
</style>

<style>
/* Teleported time-picker dropdown — global so it escapes scoped */
.time-drop {
  position: fixed; transform: translateX(-50%); background: #fff;
  border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 10px 32px rgba(0, 0, 0, 0.14);
  padding: 18px 22px; z-index: 9999; min-width: 180px; text-align: center;
}
.td-label { font-size: 11px; color: #64748b; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; margin-bottom: 8px; }
.td-time { font-size: 34px; font-weight: 800; color: #1e2a3b; letter-spacing: 4px; margin-bottom: 16px; font-family: 'Courier New', monospace; }
.td-save-btn {
  width: 100%; padding: 10px 14px; background: #1e2a3b; color: #fff; border: none; border-radius: 9px; cursor: pointer;
  font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 7px; transition: background 0.12s;
}
.td-save-btn:hover { background: #0f172a; }
.td-divider { font-size: 11px; color: #94a3b8; margin: 14px 0 10px; display: flex; align-items: center; gap: 8px; }
.td-divider::before, .td-divider::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
.td-manual { display: flex; gap: 8px; align-items: center; }
.td-time-input {
  flex: 1; height: 36px; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 0 8px; font-size: 14px; color: #1e2a3b; outline: none; font-family: inherit; min-width: 0;
}
.td-time-input:focus { border-color: #84cc16; box-shadow: 0 0 0 2px rgba(132,204,22,0.15); }
.td-confirm-btn {
  height: 36px; padding: 0 12px; background: #64748b; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600;
  display: flex; align-items: center; gap: 5px; white-space: nowrap; transition: background 0.12s; flex-shrink: 0;
}
.td-confirm-btn:hover { background: #475569; }

/* Teleported temperature numpad */
.np-drop {
  position: fixed; transform: translateX(-50%); background: #fff;
  border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 10px 32px rgba(0, 0, 0, 0.14);
  padding: 16px; z-index: 9999; width: 236px; box-sizing: border-box;
  max-height: calc(100vh - 16px); overflow-y: auto;
}
.np-label { font-size: 11px; color: #64748b; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; margin-bottom: 8px; text-align: center; }
.np-display {
  display: flex; align-items: baseline; justify-content: flex-end; gap: 4px;
  background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; min-height: 46px; box-sizing: border-box;
}
.np-value { font-size: 26px; font-weight: 800; color: #1e2a3b; font-family: 'Courier New', monospace; line-height: 1.1; }
.np-unit { font-size: 13px; font-weight: 700; color: #94a3b8; }
.np-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
.np-key {
  height: 44px; border: 1.5px solid #e2e8f0; border-radius: 10px; background: #fff; cursor: pointer;
  font-size: 17px; font-weight: 700; color: #1e2a3b; font-family: inherit;
  display: flex; align-items: center; justify-content: center; transition: background 0.1s, border-color 0.1s, transform 0.06s;
}
.np-key:hover { background: #f7fee7; border-color: #84cc16; }
.np-key:active { transform: scale(0.95); background: #ecfccb; }
.np-key-alt { background: #f8fafc; color: #475569; font-size: 15px; }
.np-actions { display: flex; gap: 7px; margin-top: 12px; }
.np-clear-btn {
  flex: 0 0 34%; height: 40px; border: 1.5px solid #e2e8f0; border-radius: 9px; background: #fff;
  color: #64748b; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.np-clear-btn:hover { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
.np-confirm-btn {
  flex: 1; height: 40px; background: #1e2a3b; color: #fff; border: none; border-radius: 9px; cursor: pointer;
  font-size: 13px; font-weight: 700; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.12s;
}
.np-confirm-btn:hover { background: #0f172a; }
</style>
