// ===== Greenline WMS — Mock Data =====

export const MIXSIZES = [
  { id: 'MX01', size: 30, unitId: 'U01' },
  { id: 'MX02', size: 40, unitId: 'U01' },
  { id: 'MX03', size: 50, unitId: 'U01' },
]

export const LOTS = [
  { id: 'LOT001', lotNo: 'LOT-2024-0601-001', productId: 'P001', supplierId: 'SUP001', receiveDate: '2024-06-01', expiryDate: '2024-06-08', qty: 800,  remaining: 320, warehouseId: 'WH02', status: 'active' },
  { id: 'LOT002', lotNo: 'LOT-2024-0605-001', productId: 'P001', supplierId: 'SUP001', receiveDate: '2024-06-05', expiryDate: '2024-06-12', qty: 600,  remaining: 600, warehouseId: 'WH02', status: 'active' },
  { id: 'LOT003', lotNo: 'LOT-2024-0601-002', productId: 'P002', supplierId: 'SUP001', receiveDate: '2024-06-01', expiryDate: '2024-06-08', qty: 400,  remaining: 180, warehouseId: 'WH02', status: 'active' },
  { id: 'LOT004', lotNo: 'LOT-2024-0603-001', productId: 'P004', supplierId: 'SUP005', receiveDate: '2024-06-03', expiryDate: '2024-09-03', qty: 200,  remaining: 145, warehouseId: 'WH01', status: 'active' },
  { id: 'LOT005', lotNo: 'LOT-2024-0603-002', productId: 'P006', supplierId: 'SUP002', receiveDate: '2024-06-03', expiryDate: '2025-06-03', qty: 10000,remaining: 8200,warehouseId: 'WH01', status: 'active' },
  { id: 'LOT006', lotNo: 'LOT-2024-0602-001', productId: 'P003', supplierId: 'SUP001', receiveDate: '2024-06-02', expiryDate: '2024-06-09', qty: 300,  remaining: 90,  warehouseId: 'WH02', status: 'active' },
  { id: 'LOT007', lotNo: 'LOT-2024-0604-001', productId: 'P013', supplierId: 'SUP002', receiveDate: '2024-06-04', expiryDate: '2025-06-04', qty: 100,  remaining: 72,  warehouseId: 'WH01', status: 'active' },
  { id: 'LOT008', lotNo: 'LOT-2024-0601-003', productId: 'P016', supplierId: null,     receiveDate: '2024-06-01', expiryDate: '2024-06-15', qty: 500,  remaining: 320, warehouseId: 'WH02', status: 'hold'   },
]

export const STOCK = [
  { id: 'S001', productId: 'P001', warehouseId: 'WH02', qty: 920,  stockStatus: 'RM'   },
  { id: 'S002', productId: 'P002', warehouseId: 'WH02', qty: 180,  stockStatus: 'RM'   },
  { id: 'S003', productId: 'P003', warehouseId: 'WH02', qty: 90,   stockStatus: 'RM'   },
  { id: 'S004', productId: 'P004', warehouseId: 'WH01', qty: 145,  stockStatus: 'RM'   },
  { id: 'S005', productId: 'P005', warehouseId: 'WH01', qty: 30,   stockStatus: 'RM'   },
  { id: 'S006', productId: 'P006', warehouseId: 'WH01', qty: 8200, stockStatus: 'RM'   },
  { id: 'S007', productId: 'P007', warehouseId: 'WH01', qty: 3500, stockStatus: 'RM'   },
  { id: 'S008', productId: 'P008', warehouseId: 'WH01', qty: 12000,stockStatus: 'FG'   },
  { id: 'S009', productId: 'P009', warehouseId: 'WH01', qty: 800,  stockStatus: 'FG'   },
  { id: 'S010', productId: 'P010', warehouseId: 'WH01', qty: 600,  stockStatus: 'FG'   },
  { id: 'S011', productId: 'P011', warehouseId: 'WH01', qty: 4500, stockStatus: 'FG'   },
  { id: 'S012', productId: 'P012', warehouseId: 'WH01', qty: 8000, stockStatus: 'FG'   },
  { id: 'S013', productId: 'P013', warehouseId: 'WH01', qty: 72,   stockStatus: 'RM'   },
  { id: 'S014', productId: 'P014', warehouseId: 'WH01', qty: 15,   stockStatus: 'RM'   },
  { id: 'S015', productId: 'P015', warehouseId: 'WH01', qty: 25,   stockStatus: 'RM'   },
  { id: 'S016', productId: 'P016', warehouseId: 'WH02', qty: 320,  stockStatus: 'Hold' },
  { id: 'S017', productId: 'P017', warehouseId: 'WH02', qty: 1200, stockStatus: 'FG'   },
  { id: 'S018', productId: 'P018', warehouseId: 'WH01', qty: 55,   stockStatus: 'RM'   },
  { id: 'S019', productId: 'P019', warehouseId: 'WH01', qty: 40,   stockStatus: 'RM'   },
  { id: 'S020', productId: 'P020', warehouseId: 'WH01', qty: 3800, stockStatus: 'RM'   },
  { id: 'S021', productId: 'P021', warehouseId: 'WH02', qty: 1500, stockStatus: 'Semi' },
  { id: 'S022', productId: 'P022', warehouseId: 'WH02', qty: 800,  stockStatus: 'Semi' },
]

export const HOLD_ITEMS = [
  {
    id: 'HLD001', productId: 'P016', lotId: 'LOT008', warehouseId: 'WH02',
    qty: 320, reason: 'ไม่ผ่าน Retort — หม้ออัดไอน้ำขัดข้อง',
    heldBy: 'USR001', heldAt: '2024-06-01T12:00:00', status: 'hold',
    resolvedAt: null, resolvedBy: null, resolution: null,
  },
]

export const STOCK_TRANSFERS = [
  {
    id: 'TRF001', transferNo: 'TRF-240604-001',
    fromWarehouseId: 'WH02', toWarehouseId: 'WH03',
    productId: 'P017', lotId: null, qty: 500,
    reason: 'ห้องเย็น WH02 เต็ม ฝากแช่ WH03',
    transferredBy: 'USR001', transferredAt: '2024-06-04T08:00:00', status: 'completed',
  },
]

export const NOTIFICATIONS = [
  { id: 'N001', type: 'min_stock', productId: 'P002', warehouseId: 'WH02', message: 'สต๊อก เนื้อหมูสับ ต่ำกว่าขั้นต่ำ (180 < 300 kg)', createdAt: '2024-06-03T06:00:00', read: false },
  { id: 'N002', type: 'min_stock', productId: 'P003', warehouseId: 'WH02', message: 'สต๊อก แครอทหั่น ต่ำกว่าขั้นต่ำ (90 < 200 kg)', createdAt: '2024-06-03T06:00:00', read: false },
  { id: 'N003', type: 'min_stock', productId: 'P014', warehouseId: 'WH01', message: 'สต๊อก ถุงมือยาง (ผลิต) ต่ำกว่าขั้นต่ำ (15 < 20 box)', createdAt: '2024-06-03T06:00:00', read: true  },
  { id: 'N004', type: 'min_stock', productId: 'P005', warehouseId: 'WH01', message: 'สต๊อก Premix B ต่ำกว่าขั้นต่ำ (30 < 50 kg)', createdAt: '2024-06-04T06:00:00', read: false },
  { id: 'N005', type: 'hold',      productId: 'P016', warehouseId: 'WH02', message: 'สินค้าถูก Hold: ซอสมะเขือเทศ (Semi) LOT-2024-0601-003', createdAt: '2024-06-01T12:05:00', read: true  },
]

// ===== Phase 2: Production & Formula =====

// ===== Packing (แพ็ค): Semi → FG + Rejected =====
let _pkCounter = 2
export const generatePackNo = () => {
  const today = new Date()
  const yy = String(today.getFullYear()).slice(2)
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  _pkCounter++
  return `PK-${yy}${mm}${dd}-${String(_pkCounter).padStart(3, '0')}`
}

export const PACKINGS = [
  {
    id: 'PK001', docNo: 'PK-240610-001',
    semiProductId: 'P016', inputQty: 500, fgQty: 480, rejectedQty: 20,
    warehouseId: 'WH02', note: '', status: 'done',
    createdAt: '2024-06-10T09:00:00', createdBy: 'USR001',
  },
  {
    id: 'PK002', docNo: 'PK-240612-001',
    semiProductId: 'P021', inputQty: 300, fgQty: 295, rejectedQty: 5,
    warehouseId: 'WH02', note: 'ล็อตทดสอบ', status: 'done',
    createdAt: '2024-06-12T10:30:00', createdBy: 'USR002',
  },
]
