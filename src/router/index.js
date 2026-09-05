import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/master/products' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/DashboardView.vue') },

      // Master Data
      { path: 'master/products', name: 'ProductList', component: () => import('@/views/master/ProductListView.vue') },
      { path: 'master/products/create', name: 'ProductCreate', component: () => import('@/views/master/ProductFormView.vue') },
      { path: 'master/products/:id/edit', name: 'ProductEdit', component: () => import('@/views/master/ProductFormView.vue') },
      { path: 'master/categories', name: 'Categories', component: () => import('@/views/master/CategoryView.vue') },
      { path: 'master/units', name: 'Units', component: () => import('@/views/master/UnitView.vue') },
      { path: 'master/mixsizes', name: 'Mixsizes', component: () => import('@/views/master/MixsizeView.vue') },
      { path: 'master/packaging-sizes', name: 'PackagingSizes', component: () => import('@/views/master/PackagingSizeView.vue') },
      { path: 'master/brands', name: 'Brands', component: () => import('@/views/master/BrandView.vue') },
      { path: 'master/warehouses', name: 'Warehouses', component: () => import('@/views/master/WarehouseView.vue') },
      { path: 'master/suppliers', name: 'Suppliers', component: () => import('@/views/master/SupplierView.vue') },
      { path: 'master/machines', name: 'Machines', component: () => import('@/views/master/MachineView.vue') },

      // Admin
      { path: 'admin/users', name: 'Users', component: () => import('@/views/admin/UserRoleView.vue'), meta: { adminOnly: true } },

      // Documents — each kind has its own list, create and detail page. All
      // three lists share one component; `docKind` tells it which resource to
      // read, as it does for the detail page.
      { path: 'documents', redirect: '/documents/receipt' },
      { path: 'documents/receipt', name: 'ReceiptList', component: () => import('@/views/documents/StockDocumentListView.vue'), meta: { docKind: 'receipt' } },
      { path: 'documents/requisition', name: 'RequisitionList', component: () => import('@/views/documents/StockDocumentListView.vue'), meta: { docKind: 'requisition' } },
      { path: 'documents/return', name: 'ReturnList', component: () => import('@/views/documents/StockDocumentListView.vue'), meta: { docKind: 'return' } },

      { path: 'documents/receipt/create', name: 'ReceiptCreate', component: () => import('@/views/documents/GoodsReceiptView.vue') },
      { path: 'documents/requisition/create', name: 'RequisitionCreate', component: () => import('@/views/documents/RequisitionView.vue') },
      { path: 'documents/return/create', name: 'ReturnCreate', component: () => import('@/views/documents/ReturnView.vue') },

      // Detail pages, likewise sharing one component.
      { path: 'documents/receipt/:id', name: 'ReceiptDetail', component: () => import('@/views/documents/StockDocumentDetailView.vue'), meta: { docKind: 'receipt' } },
      { path: 'documents/requisition/:id', name: 'RequisitionDetail', component: () => import('@/views/documents/StockDocumentDetailView.vue'), meta: { docKind: 'requisition' } },
      { path: 'documents/return/:id', name: 'ReturnDetail', component: () => import('@/views/documents/StockDocumentDetailView.vue'), meta: { docKind: 'return' } },

      // Stock
      { path: 'stock/by-warehouse', name: 'StockByWarehouse', component: () => import('@/views/stock/StockByWarehouseView.vue') },
      { path: 'stock/lots', name: 'LotTracking', component: () => import('@/views/stock/LotTrackingView.vue') },
      { path: 'stock/hold', name: 'HoldManagement', component: () => import('@/views/stock/HoldView.vue') },
      { path: 'stock/reprocess', name: 'Reprocess', component: () => import('@/views/stock/ReprocessView.vue') },
      { path: 'stock/transfer', name: 'StockTransfer', component: () => import('@/views/stock/StockTransferView.vue') },
      { path: 'stock/min-stock', name: 'MinStock', component: () => import('@/views/stock/MinStockView.vue') },

      // Production
      { path: 'production/formulas', name: 'FormulaList', component: () => import('@/views/production/FormulaListView.vue') },
      { path: 'production/formulas/create', name: 'FormulaCreate', component: () => import('@/views/production/FormulaFormView.vue') },
      { path: 'production/formulas/:id/edit', name: 'FormulaEdit', component: () => import('@/views/production/FormulaFormView.vue') },
      { path: 'production/orders', name: 'ProductionOrders', component: () => import('@/views/production/ProductionOrderView.vue') },
      { path: 'production/process/:id', name: 'ProductionProcess', component: () => import('@/views/production/ProductionProcessView.vue') },
      { path: 'production/packing', name: 'PackingList', component: () => import('@/views/production/PackingListView.vue') },
      { path: 'production/packing/create', name: 'PackingCreate', component: () => import('@/views/production/PackingFormView.vue') },
      { path: 'production/report', name: 'ProductionReport', component: () => import('@/views/production/ProductionReportView.vue') },

      // Alerts
      { path: 'notifications', name: 'Notifications', component: () => import('@/views/NotificationCenterView.vue') },
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) return { name: 'Login' }
  if (to.meta.adminOnly && !auth.isSuperAdmin) return { name: 'ProductList' }
  if (to.path === '/login' && auth.isAuthenticated) return { name: 'ProductList' }
})

export default router
