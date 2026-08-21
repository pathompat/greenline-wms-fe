// Builds a print-ready A4 HTML document for the two mixer report sheets used in
// the production process page:
//   • Homo Mixer  (ผสม Premix → ซอส)  — no temperature column, signature footer
//   • Ribbon Mixer (ผสมซอส + เนื้อแปรรูป) — temperature column + QC/retort footer
//
// The HTML is styled with `@page`/print CSS so the browser's "Save as PDF" (or
// the preview iframe) renders it as a real A4 form. Long tables paginate
// automatically: the table header repeats on every page and rows never split.

const esc = (v) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// A field that shows its value, or a blank underline to fill in by hand.
const field = (v, minWidth = 150) => {
  const s = v == null || v === "" ? "" : esc(v);
  return `<span class="fill" style="min-width:${minWidth}px">${s}</span>`;
};

// Minimum blank rows so an empty/near-empty form is still usable on paper.
const MIN_ROWS = { meat: 4, sauce: 5 };

/**
 * @param {object} report
 * @param {boolean} report.isMeat
 * @param {string}  report.title
 * @param {string}  report.docNo
 * @param {string}  report.formName
 * @param {string}  report.code
 * @param {string}  report.date
 * @param {number|string} report.mixSize
 * @param {string}  report.machineName
 * @param {Array<{label:string,target:number|null,unit:string}>} report.columns
 * @param {Array<{no:number,values:string[],end:string,temp:string|number|null}>} report.rows
 */
export function buildMixReportHtml(report) {
  const isMeat = !!report.isMeat;
  const cols = report.columns || [];
  const ncols = Math.max(cols.length, 1);

  // Pad rows up to the paper minimum with blank rows.
  const rows = [...(report.rows || [])];
  const min = isMeat ? MIN_ROWS.meat : MIN_ROWS.sauce;
  for (let i = rows.length; i < min; i++) {
    rows.push({ no: i + 1, values: cols.map(() => ""), end: "", temp: null });
  }

  const dateStr = report.date ? formatThaiDate(report.date) : "";

  // ---- table header (grouped: "ส่วนประกอบ" spanning the ingredient columns) ----
  const colHeadCells = cols.length
    ? cols
        .map(
          (c) =>
            `<th>${esc(c.label)}${
              c.target != null ? `<div class="target">${fmtNum(c.target)} ${esc(c.unit || "")}</div>` : ""
            }</th>`,
        )
        .join("")
    : `<th></th>`;

  const thead = `
    <thead>
      <tr>
        <th rowspan="2" class="no-col">No.${isMeat ? " MIX" : " Mixed"}</th>
        <th colspan="${ncols}">ส่วนประกอบ</th>
        <th rowspan="2" class="end-col">End</th>
        ${isMeat ? '<th rowspan="2" class="end-col">อุณหภูมิ</th>' : ""}
      </tr>
      <tr>${colHeadCells}</tr>
    </thead>`;

  const bodyRows = rows
    .map((r) => {
      const valCells = (cols.length ? cols : [null])
        .map((_, i) => `<td>${esc(r.values?.[i] ?? "")}</td>`)
        .join("");
      return `<tr>
        <td class="no-col">${esc(r.no)}</td>
        ${valCells}
        <td>${esc(r.end)}</td>
        ${isMeat ? `<td>${esc(r.temp)}</td>` : ""}
      </tr>`;
    })
    .join("");

  // Ribbon sheet has a hand-filled "Total (kg)" row with hatched End/Temp cells.
  const totalRow = isMeat
    ? `<tr class="total-row">
        <td class="no-col">Total</td>
        ${cols.map(() => "<td></td>").join("")}
        <td class="hatch"></td>
        <td class="hatch"></td>
      </tr>`
    : "";

  const table = `
    <table class="grid">
      ${thead}
      <tbody>
        ${bodyRows}
        ${totalRow}
      </tbody>
    </table>`;

  // ---- header meta block ----
  const meta = isMeat
    ? `<div class="meta">
        <div class="meta-row">
          <span class="lbl">ชื่อสูตร (Name)</span>${field(report.formName, 200)}
          <span class="lbl">Date</span>${field(dateStr, 130)}
        </div>
        <div class="meta-row">
          <span class="lbl">รหัสสูตร (Code)</span>${field(report.code, 150)}
          <span class="lbl">Mix size (kg)</span>${field(report.mixSize, 100)}
        </div>
        <div class="meta-row">
          <span class="lbl">เครื่องจักร (Machine)</span>${field(report.machineName, 240)}
        </div>
      </div>`
    : `<div class="meta">
        <div class="meta-row">
          <span class="lbl">ชื่อสูตร (Name)</span>${field(report.formName, 240)}
        </div>
        <div class="meta-row">
          <span class="lbl">รหัสสูตร (Code)</span>${field(report.code, 150)}
          <span class="lbl">Date</span>${field(dateStr, 130)}
        </div>
        <div class="meta-row">
          <span class="lbl">เครื่องจักร (Machine)</span>${field(report.machineName, 240)}
          <span class="lbl">Mix size (kg)</span>${field(report.mixSize, 100)}
        </div>
      </div>`;

  // ---- footer block ----
  const footer = isMeat
    ? `<div class="footer">
        <div class="f-row"><span class="lbl">ปริมาณ Topping</span>${field("", 160)}</div>
        <div class="f-row">
          <span class="lbl">อุณหภูมิกึ่งกลางแรก</span>${field("", 90)}<span class="unit">°C</span>
          <span class="lbl">อุณหภูมิกึ่งกลางสุดท้าย</span>${field("", 90)}<span class="unit">°C</span>
        </div>
        <div class="f-row">
          <span class="lbl">บรรจุภัณฑ์ : รับเข้า</span>${field("", 90)}
          <span class="lbl">ยอดรวมของเสีย</span>${field("", 90)}
          <span class="lbl">ของเสีย</span>${field("", 90)}
        </div>
        <div class="f-row">
          <span class="lbl">รูปแบบตรา ink code</span><span class="ink-box"></span>
          <span class="lbl">เวลาเข้า Retort</span>${field("", 120)}
        </div>
      </div>`
    : `<div class="footer">
        <div class="sign-row">
          <div class="sign"><span class="lbl">บันทึกโดย</span>${field("", 160)}</div>
          <div class="sign"><span class="lbl">ตรวจสอบโดย</span>${field("", 160)}</div>
        </div>
        <div class="f-row"><span class="lbl">หมายเหตุ</span>${field("", 360)}</div>
        <div class="doc-code">DF-PO-001</div>
      </div>`;

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>${esc(report.title)}${report.docNo ? ` — ${esc(report.docNo)}` : ""}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Leelawadee UI', 'Tahoma', 'Sarabun', 'Kanit', sans-serif;
    color: #111827; font-size: 13px; line-height: 1.5;
    background: #f1f5f9;
  }
  .sheet {
    width: 186mm; min-height: 273mm; margin: 0 auto; background: #fff;
    padding: 12mm; box-shadow: 0 2px 10px rgba(0,0,0,.12);
  }
  h1.title {
    text-align: center; font-size: 17px; font-weight: 700; margin: 0 0 6px;
  }
  .docno { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 16px; }
  .meta { margin-bottom: 16px; }
  .meta-row { display: flex; align-items: baseline; gap: 8px 22px; flex-wrap: wrap; margin-bottom: 10px; }
  .lbl { font-weight: 600; color: #374151; white-space: nowrap; }
  .fill {
    display: inline-block; border-bottom: 1px solid #374151;
    padding: 0 6px 1px; min-height: 18px;
  }
  .unit { color: #374151; }

  table.grid { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  .grid th, .grid td {
    border: 1px solid #334155; padding: 6px 8px; text-align: center; vertical-align: middle;
  }
  .grid th { background: #1e2a3b; color: #fff; font-weight: 600; font-size: 12px; }
  .grid .target { font-size: 10.5px; font-weight: 500; color: #fcd34d; margin-top: 3px; }
  .grid .no-col { width: 66px; }
  .grid .end-col { width: 74px; }
  .grid tbody td { height: 30px; }
  .grid tbody .no-col { background: #f8fafc; font-weight: 700; }
  .grid .total-row td { font-weight: 700; background: #f8fafc; }
  .hatch {
    background: repeating-linear-gradient(45deg, #fff, #fff 4px, #cbd5e1 4px, #cbd5e1 5px);
  }

  .footer { margin-top: 22px; break-inside: avoid; page-break-inside: avoid; }
  .f-row { display: flex; align-items: baseline; gap: 8px 22px; flex-wrap: wrap; margin-bottom: 14px; }
  .sign-row { display: flex; gap: 60px; margin-bottom: 14px; }
  .ink-box { display: inline-block; width: 4cm; height: 2cm; border: 1px solid #374151; vertical-align: middle; }
  .doc-code { text-align: right; margin-top: 26px; font-weight: 700; letter-spacing: .5px; }

  @media print {
    body { background: #fff; }
    .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <h1 class="title">${esc(report.title)}</h1>
    ${report.docNo ? `<div class="docno">เลขที่ใบสั่งผลิต : ${esc(report.docNo)}</div>` : ""}
    ${meta}
    ${table}
    ${footer}
  </div>
</body>
</html>`;
}

function fmtNum(n) {
  const num = Number(n);
  return Number.isFinite(num) ? num.toLocaleString(undefined, { maximumFractionDigits: 3 }) : String(n ?? "");
}

function formatThaiDate(d) {
  // Accept an ISO date (yyyy-mm-dd) or a Date-parseable string.
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
}
