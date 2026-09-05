import { defineStore } from 'pinia'
import { ref } from 'vue'
import { MIXSIZES } from '@/data/mockData'
import { apiGetMachines, apiCreateMachine, apiUpdateMachine, apiDeleteMachine } from '@/api/machines'
import { apiGetWarehouses, apiCreateWarehouse, apiUpdateWarehouse, apiDeleteWarehouse } from '@/api/warehouses'
import { apiGetCategories, apiCreateCategory, apiUpdateCategory, apiDeleteCategory } from '@/api/categories'
import { apiGetUnits, apiCreateUnit, apiUpdateUnit, apiDeleteUnit } from '@/api/units'
import { apiGetSuppliers, apiCreateSupplier, apiUpdateSupplier, apiDeleteSupplier } from '@/api/suppliers'
import { apiGetProducts, apiCreateProduct, apiUpdateProduct, apiDeleteProduct } from '@/api/products'
import { apiGetPackageSizes, apiCreatePackageSize, apiUpdatePackageSize, apiDeletePackageSize } from '@/api/packagingSizes'
import { apiGetBrands, apiCreateBrand, apiUpdateBrand, apiDeleteBrand } from '@/api/brands'

function makeId(prefix) {
  return `${prefix}${Date.now()}`
}

/**
 * Walks every page of a paginated list endpoint.
 *
 * The master lists are paginated on the server so their own screens can page
 * through them, but the same data also feeds dropdowns all over the app, which
 * need the whole set. Those callers use this; the list screens ask for a single
 * page instead.
 */
async function fetchAllPages(apiGet, params = {}) {
  const limit = 100
  const first = (await apiGet({ ...params, page: 1, limit })).data
  let all = first.data || []
  for (let page = 2; page <= (first.totalPages || 1); page++) {
    const { data } = await apiGet({ ...params, page, limit })
    all = all.concat(data.data || [])
  }
  return all
}

/** Fresh paginator state for a list screen. */
function emptyListMeta(limit = 20) {
  return { page: 1, limit, total: 0, totalPages: 0 }
}

// The backend unit model has no separate abbreviation field — `code` (e.g. 'KG')
// doubles as the short label many other views display as `.abbr`.
function normalizeUnit(u) {
  return { ...u, abbr: u.code }
}

// The backend product model has no warehouseId/stockStatus/hasExpiry/active fields.
// Alias `sku`→`code` and `hasLot`→`requireLot` so the many other (still mock-based)
// views that read those names keep working unchanged.
function normalizeProduct(p) {
  return { ...p, code: p.sku, requireLot: p.hasLot, active: true }
}

export const useMasterStore = defineStore('master', () => {
  const warehouses = ref([])
  const warehousesLoading = ref(false)
  const categories = ref([])
  const categoriesLoading = ref(false)
  const units = ref([])
  const unitsLoading = ref(false)
  const mixsizes = ref([...MIXSIZES])
  const suppliers = ref([])
  const suppliersLoading = ref(false)
  const products = ref([])
  const productsLoading = ref(false)
  // Server-paginated list state for the SKU page (distinct from `products`, which
  // stays the full reference cache used by dropdowns/lookups across the app).
  const productList = ref([])
  const productListLoading = ref(false)
  const productListMeta = ref({ page: 1, limit: 15, total: 0, totalPages: 0 })
  const machines = ref([])
  const machinesLoading = ref(false)
  const packagingSizes = ref([])
  const packagingSizesLoading = ref(false)
  const brands = ref([])
  const brandsLoading = ref(false)

  // Server-paginated list state for the master screens. Each is distinct from
  // the reference cache above, which stays the full set the dropdowns read.
  const categoryList = ref([])
  const categoryListLoading = ref(false)
  const categoryListMeta = ref(emptyListMeta())
  const unitList = ref([])
  const unitListLoading = ref(false)
  const unitListMeta = ref(emptyListMeta())
  const supplierList = ref([])
  const supplierListLoading = ref(false)
  const supplierListMeta = ref(emptyListMeta())
  const machineList = ref([])
  const machineListLoading = ref(false)
  const machineListMeta = ref(emptyListMeta())
  const packagingSizeList = ref([])
  const packagingSizeListLoading = ref(false)
  const packagingSizeListMeta = ref(emptyListMeta())
  const brandList = ref([])
  const brandListLoading = ref(false)
  const brandListMeta = ref(emptyListMeta())

  // ---- Warehouses ----
  async function fetchWarehouses() {
    warehousesLoading.value = true
    try {
      const { data } = await apiGetWarehouses()
      warehouses.value = data
    } finally {
      warehousesLoading.value = false
    }
  }
  async function addWarehouse(data) {
    const { data: created } = await apiCreateWarehouse(data)
    warehouses.value.push(created)
    return created
  }
  async function updateWarehouse(id, data) {
    const { data: updated } = await apiUpdateWarehouse(id, data)
    const i = warehouses.value.findIndex(w => w.id === id)
    if (i !== -1) warehouses.value[i] = updated
    return updated
  }
  async function deleteWarehouse(id) {
    await apiDeleteWarehouse(id)
    warehouses.value = warehouses.value.filter(w => w.id !== id)
  }

  // ---- Categories ----
  async function fetchCategories() {
    categoriesLoading.value = true
    try {
      categories.value = await fetchAllPages(apiGetCategories)
    } finally {
      categoriesLoading.value = false
    }
  }

  /** One server page for the category screen's table. */
  async function fetchCategoryList({ page = 1, limit = categoryListMeta.value.limit, search } = {}) {
    categoryListLoading.value = true
    try {
      const params = { page, limit }
      if (search?.trim()) params.search = search.trim()
      const { data } = await apiGetCategories(params)
      categoryList.value = data.data || []
      categoryListMeta.value = {
        page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages,
      }
    } finally {
      categoryListLoading.value = false
    }
  }
  async function addCategory(data) {
    const { data: created } = await apiCreateCategory(data)
    categories.value.push(created)
    return created
  }
  async function updateCategory(id, data) {
    const { data: updated } = await apiUpdateCategory(id, data)
    const i = categories.value.findIndex(c => c.id === id)
    if (i !== -1) categories.value[i] = updated
    return updated
  }
  async function deleteCategory(id) {
    await apiDeleteCategory(id)
    categories.value = categories.value.filter(c => c.id !== id)
  }

  // ---- Units ----
  async function fetchUnits() {
    unitsLoading.value = true
    try {
      units.value = (await fetchAllPages(apiGetUnits)).map(normalizeUnit)
    } finally {
      unitsLoading.value = false
    }
  }

  /** One server page for the unit screen's table. */
  async function fetchUnitList({ page = 1, limit = unitListMeta.value.limit, search } = {}) {
    unitListLoading.value = true
    try {
      const params = { page, limit }
      if (search?.trim()) params.search = search.trim()
      const { data } = await apiGetUnits(params)
      unitList.value = (data.data || []).map(normalizeUnit)
      unitListMeta.value = {
        page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages,
      }
    } finally {
      unitListLoading.value = false
    }
  }
  async function addUnit(data) {
    const { data: created } = await apiCreateUnit(data)
    const normalized = normalizeUnit(created)
    units.value.push(normalized)
    return normalized
  }
  async function updateUnit(id, data) {
    const { data: updated } = await apiUpdateUnit(id, data)
    const normalized = normalizeUnit(updated)
    const i = units.value.findIndex(u => u.id === id)
    if (i !== -1) units.value[i] = normalized
    return normalized
  }
  async function deleteUnit(id) {
    await apiDeleteUnit(id)
    units.value = units.value.filter(u => u.id !== id)
  }

  // ---- Mixsizes (still mock — not backed by an API yet) ----
  function addMixsize(data) {
    mixsizes.value.push({ ...data, id: makeId('MX') })
  }
  function updateMixsize(id, data) {
    const i = mixsizes.value.findIndex(m => m.id === id)
    if (i !== -1) mixsizes.value[i] = { ...mixsizes.value[i], ...data }
  }
  function deleteMixsize(id) {
    mixsizes.value = mixsizes.value.filter(m => m.id !== id)
  }
  function getMixsizeById(id) { return mixsizes.value.find(m => m.id === id) }

  // ---- Suppliers ----
  async function fetchSuppliers() {
    suppliersLoading.value = true
    try {
      suppliers.value = await fetchAllPages(apiGetSuppliers)
    } finally {
      suppliersLoading.value = false
    }
  }

  /** One server page for the supplier screen's table. */
  async function fetchSupplierList({ page = 1, limit = supplierListMeta.value.limit, search } = {}) {
    supplierListLoading.value = true
    try {
      const params = { page, limit }
      if (search?.trim()) params.search = search.trim()
      const { data } = await apiGetSuppliers(params)
      supplierList.value = data.data || []
      supplierListMeta.value = {
        page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages,
      }
    } finally {
      supplierListLoading.value = false
    }
  }
  async function addSupplier(data) {
    const { data: created } = await apiCreateSupplier(data)
    suppliers.value.push(created)
    return created
  }
  async function updateSupplier(id, data) {
    const { data: updated } = await apiUpdateSupplier(id, data)
    const i = suppliers.value.findIndex(s => s.id === id)
    if (i !== -1) suppliers.value[i] = updated
    return updated
  }
  async function deleteSupplier(id) {
    await apiDeleteSupplier(id)
    suppliers.value = suppliers.value.filter(s => s.id !== id)
  }

  // ---- Products ----
  // GET /products is paginated (max limit 100). Reference consumers (formula BOM,
  // stock, documents, packing, dashboard…) need the FULL live list, so walk every
  // page and flatten into `products`.
  async function fetchProducts() {
    productsLoading.value = true
    try {
      const limit = 100
      const first = (await apiGetProducts({ page: 1, limit })).data
      let all = first.data || []
      const totalPages = first.totalPages || 1
      for (let page = 2; page <= totalPages; page++) {
        const { data } = await apiGetProducts({ page, limit })
        all = all.concat(data.data || [])
      }
      products.value = all.map(normalizeProduct)
    } finally {
      productsLoading.value = false
    }
  }

  // One server page for the SKU list view. Sends only the filters the backend
  // supports: title (name contains), sku (contains), categoryIds (CSV), page, limit.
  async function fetchProductList({ page = 1, limit = 15, title, sku, categoryIds } = {}) {
    productListLoading.value = true
    try {
      const params = { page, limit }
      if (title?.trim()) params.title = title.trim()
      if (sku?.trim()) params.sku = sku.trim()
      if (categoryIds?.length) params.categoryIds = categoryIds.join(',')
      const { data } = await apiGetProducts(params)
      productList.value = (data.data || []).map(normalizeProduct)
      productListMeta.value = {
        page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages,
      }
    } finally {
      productListLoading.value = false
    }
  }
  async function addProduct(data) {
    const { data: created } = await apiCreateProduct(data)
    const normalized = normalizeProduct(created)
    products.value.push(normalized)
    return normalized
  }
  async function updateProduct(id, data) {
    const { data: updated } = await apiUpdateProduct(id, data)
    const normalized = normalizeProduct(updated)
    const i = products.value.findIndex(p => p.id === id)
    if (i !== -1) products.value[i] = normalized
    return normalized
  }
  async function deleteProduct(id) {
    await apiDeleteProduct(id)
    products.value = products.value.filter(p => p.id !== id)
  }

  // ---- Machines ----
  async function fetchMachines() {
    machinesLoading.value = true
    try {
      machines.value = await fetchAllPages(apiGetMachines)
    } finally {
      machinesLoading.value = false
    }
  }

  /** One server page for the machine screen's table. */
  async function fetchMachineList({ page = 1, limit = machineListMeta.value.limit, search } = {}) {
    machineListLoading.value = true
    try {
      const params = { page, limit }
      if (search?.trim()) params.search = search.trim()
      const { data } = await apiGetMachines(params)
      machineList.value = data.data || []
      machineListMeta.value = {
        page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages,
      }
    } finally {
      machineListLoading.value = false
    }
  }
  async function addMachine(data) {
    const { data: created } = await apiCreateMachine(data)
    machines.value.push(created)
    return created
  }
  async function updateMachine(id, data) {
    const { data: updated } = await apiUpdateMachine(id, data)
    const i = machines.value.findIndex(m => m.id === id)
    if (i !== -1) machines.value[i] = updated
    return updated
  }
  async function deleteMachine(id) {
    await apiDeleteMachine(id)
    machines.value = machines.value.filter(m => m.id !== id)
  }

  // ---- Packaging Sizes ----
  async function fetchPackagingSizes() {
    packagingSizesLoading.value = true
    try {
      packagingSizes.value = await fetchAllPages(apiGetPackageSizes)
    } finally {
      packagingSizesLoading.value = false
    }
  }

  /** One server page for the packagingSize screen's table. */
  async function fetchPackagingSizeList({ page = 1, limit = packagingSizeListMeta.value.limit, search } = {}) {
    packagingSizeListLoading.value = true
    try {
      const params = { page, limit }
      if (search?.trim()) params.search = search.trim()
      const { data } = await apiGetPackageSizes(params)
      packagingSizeList.value = data.data || []
      packagingSizeListMeta.value = {
        page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages,
      }
    } finally {
      packagingSizeListLoading.value = false
    }
  }
  async function addPackagingSize(data) {
    const { data: created } = await apiCreatePackageSize(data)
    packagingSizes.value.push(created)
    return created
  }
  async function updatePackagingSize(id, data) {
    const { data: updated } = await apiUpdatePackageSize(id, data)
    const i = packagingSizes.value.findIndex(p => p.id === id)
    if (i !== -1) packagingSizes.value[i] = updated
    return updated
  }
  async function deletePackagingSize(id) {
    await apiDeletePackageSize(id)
    packagingSizes.value = packagingSizes.value.filter(p => p.id !== id)
  }
  function getPackagingSizeById(id) { return packagingSizes.value.find(p => p.id === id) }

  // ---- Brands ----
  async function fetchBrands() {
    brandsLoading.value = true
    try {
      brands.value = await fetchAllPages(apiGetBrands)
    } finally {
      brandsLoading.value = false
    }
  }

  /** One server page for the brand screen's table. */
  async function fetchBrandList({ page = 1, limit = brandListMeta.value.limit, search } = {}) {
    brandListLoading.value = true
    try {
      const params = { page, limit }
      if (search?.trim()) params.search = search.trim()
      const { data } = await apiGetBrands(params)
      brandList.value = data.data || []
      brandListMeta.value = {
        page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages,
      }
    } finally {
      brandListLoading.value = false
    }
  }
  async function addBrand(data) {
    const { data: created } = await apiCreateBrand(data)
    brands.value.push(created)
    return created
  }
  async function updateBrand(id, data) {
    const { data: updated } = await apiUpdateBrand(id, data)
    const i = brands.value.findIndex(b => b.id === id)
    if (i !== -1) brands.value[i] = updated
    return updated
  }
  async function deleteBrand(id) {
    await apiDeleteBrand(id)
    brands.value = brands.value.filter(b => b.id !== id)
  }
  function getBrandById(id) { return brands.value.find(b => b.id === id) }

  // ---- Helpers ----
  function getCategoryById(id) { return categories.value.find(c => c.id === id) }
  function getUnitById(id) { return units.value.find(u => u.id === id) }
  function getWarehouseById(id) { return warehouses.value.find(w => w.id === id) }
  function getSupplierById(id) { return suppliers.value.find(s => s.id === id) }
  function getProductById(id) { return products.value.find(p => p.id === id) }
  function getMachineById(id) { return machines.value.find(m => m.id === id) }

  return {
    warehouses, warehousesLoading, categories, categoriesLoading, units, unitsLoading,
    suppliers, suppliersLoading, products, productsLoading, machines, machinesLoading, mixsizes,
    productList, productListLoading, productListMeta,
    categoryList, categoryListLoading, categoryListMeta,
    unitList, unitListLoading, unitListMeta,
    supplierList, supplierListLoading, supplierListMeta,
    machineList, machineListLoading, machineListMeta,
    packagingSizeList, packagingSizeListLoading, packagingSizeListMeta,
    brandList, brandListLoading, brandListMeta,
    packagingSizes, packagingSizesLoading, brands, brandsLoading,

    fetchWarehouses, addWarehouse, updateWarehouse, deleteWarehouse,
    fetchCategories, fetchCategoryList, addCategory, updateCategory, deleteCategory,
    fetchUnits, fetchUnitList, addUnit, updateUnit, deleteUnit,
    addMixsize, updateMixsize, deleteMixsize, getMixsizeById,
    fetchSuppliers, fetchSupplierList, addSupplier, updateSupplier, deleteSupplier,
    fetchProducts, fetchProductList, addProduct, updateProduct, deleteProduct,

    fetchMachines, fetchMachineList, addMachine, updateMachine, deleteMachine,
    fetchPackagingSizes, fetchPackagingSizeList, addPackagingSize, updatePackagingSize, deletePackagingSize, getPackagingSizeById,
    fetchBrands, fetchBrandList, addBrand, updateBrand, deleteBrand, getBrandById,
    getCategoryById, getUnitById, getWarehouseById, getSupplierById, getProductById, getMachineById,
  }
})
