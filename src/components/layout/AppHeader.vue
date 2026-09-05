<template>
  <header class="app-header">
    <div class="header-left">
      <div class="breadcrumb-area">
        <span class="page-name">{{ pageTitle }}</span>
      </div>
    </div>
    <div class="header-right">
      <!-- Notification bell -->
      <RouterLink to="/notifications" class="header-btn notif-btn">
        <i class="pi pi-bell" />
        <span v-if="unreadCount" class="notif-dot">{{ unreadCount }}</span>
      </RouterLink>

      <!-- User menu -->
      <div class="user-menu-wrap" v-click-outside="closeMenu">
        <div class="user-menu" @click="toggleUserMenu" :class="{ open: menuOpen }">
          <div class="user-avatar">{{ userInitial }}</div>
          <div class="user-info">
            <span class="user-name">{{ user?.fullName }}</span>
            <span class="user-role">{{ roleLabel }}</span>
          </div>
          <i class="pi pi-chevron-down user-chevron" :class="{ rotated: menuOpen }" />
        </div>

        <transition name="dropdown">
          <div v-if="menuOpen" class="user-dropdown">
            <div class="dropdown-header">
              <div class="dh-avatar">{{ userInitial }}</div>
              <div>
                <div class="dh-name">{{ user?.fullName }}</div>
                <span class="dh-role-badge">{{ roleLabel }}</span>
              </div>
            </div>
            <div class="dropdown-divider" />
            <button
              class="dropdown-item"
              @click="
                $router.push('/admin/users');
                closeMenu();
              "
            >
              <i class="pi pi-users" /> จัดการผู้ใช้
            </button>
            <button
              class="dropdown-item"
              @click="
                $router.push('/notifications');
                closeMenu();
              "
            >
              <i class="pi pi-bell" /> การแจ้งเตือน
              <span v-if="unreadCount" class="item-badge">{{ unreadCount }}</span>
            </button>
            <div class="dropdown-divider" />
            <button class="dropdown-item danger" @click="handleLogout"><i class="pi pi-sign-out" /> ออกจากระบบ</button>
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const notifStore = useNotificationStore();

const user = computed(() => authStore.user);
const unreadCount = computed(() => notifStore.unreadCount);
const menuOpen = ref(false);

const userInitial = computed(() => user.value?.fullName?.[0] || "A");

const ROLE_LABEL = {
  SUPER_ADMIN: "Super Admin",
  WAREHOUSE_STAFF: "เจ้าหน้าที่คลัง",
  PRODUCTION_STAFF: "Production Staff",
  DOC_CONTROL: "Document Control",
}

const roleLabel = computed(() => {
  const roles = user.value?.roles
  if (!roles?.length) return ''
  if (roles.length === 1) return ROLE_LABEL[roles[0].code] || roles[0].name
  // มีหลาย role — ถ้ามี SUPER_ADMIN ขึ้นก่อน
  const superAdmin = roles.find(r => r.code === 'SUPER_ADMIN')
  if (superAdmin) return ROLE_LABEL.SUPER_ADMIN
  return roles.map(r => ROLE_LABEL[r.code] || r.name).join(', ')
})

const pageTitle = computed(() => {
  const map = {
    "/dashboard": "แดชบอร์ด",
    "/master/products": "จัดการสินค้า / SKU",
    "/master/categories": "ประเภทสินค้า",
    "/master/units": "หน่วยนับ",
    "/master/warehouses": "คลังสินค้า",
    "/master/suppliers": "ซัพพลายเออร์",
    "/master/machines": "เครื่องจักร",
    "/admin/users": "ผู้ใช้ & สิทธิ์",
    "/documents/receipt": "ใบรับเข้า (GR)",
    "/documents/requisition": "ใบเบิก-จ่าย (RQ)",
    "/documents/return": "ใบคืนสินค้า (RT)",
    "/documents/receipt/create": "สร้างใบรับเข้า (GR)",
    "/documents/requisition/create": "สร้างใบเบิก-จ่าย (RQ)",
    "/documents/return/create": "สร้างใบคืนสินค้า (RT)",
    "/stock/by-warehouse": "สต๊อกแยกคลัง",
    "/stock/lots": "Lot Tracking (FIFO)",
    "/stock/hold": "Hold Management",
    "/stock/reprocess": "Reprocess",
    "/stock/transfer": "ย้ายสต๊อก",
    "/stock/min-stock": "ตั้งค่า Min Stock",
    "/notifications": "ศูนย์การแจ้งเตือน",
  };
  return map[route.path] || "Greenline WMS";
});

function toggleUserMenu() {
  menuOpen.value = !menuOpen.value;
}
function closeMenu() {
  menuOpen.value = false;
}

async function handleLogout() {
  await authStore.logout();
  router.push("/login");
}

// Click outside directive
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (e) => {
      if (!el.contains(e.target)) binding.value();
    };
    document.addEventListener("click", el._clickOutside);
  },
  unmounted(el) {
    document.removeEventListener("click", el._clickOutside);
  },
};
</script>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  right: 0;
  left: var(--sidebar-w);
  height: var(--header-h);
  background: var(--gl-surface);
  border-bottom: 1px solid var(--gl-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 90;
  transition: left 0.25s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.page-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--gl-navy);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-btn {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--gl-border);
  cursor: pointer;
  color: var(--gl-text-muted);
  text-decoration: none;
  position: relative;
  transition:
    background 0.15s,
    color 0.15s;
}
.header-btn:hover {
  background: var(--gl-bg);
  color: var(--gl-navy);
}

.notif-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  background: var(--gl-red);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

.user-menu-wrap {
  position: relative;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid var(--gl-border);
  transition:
    background 0.15s,
    border-color 0.15s;
  user-select: none;
}
.user-menu:hover,
.user-menu.open {
  background: var(--gl-bg);
  border-color: var(--gl-navy);
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: var(--gl-navy);
  color: #fff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.user-name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--gl-text);
  line-height: 1.2;
}
.user-role {
  display: block;
  font-size: 11px;
  color: var(--gl-text-muted);
}
.user-chevron {
  font-size: 11px;
  color: var(--gl-text-muted);
  transition: transform 0.2s;
}
.user-chevron.rotated {
  transform: rotate(180deg);
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--gl-surface);
  border: 1px solid var(--gl-border);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.14);
  min-width: 240px;
  z-index: 200;
  overflow: hidden;
}

.dropdown-header {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, var(--gl-navy) 0%, var(--gl-navy-light) 100%);
}
.dh-avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}
.dh-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  line-height: 1.3;
}
.dh-email {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  margin-top: 1px;
}
.dh-role-badge {
  display: inline-block;
  margin-top: 5px;
  background: rgba(220, 38, 38, 0.8);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.3px;
}

.dropdown-divider {
  height: 1px;
  background: var(--gl-border);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 16px;
  background: none;
  border: none;
  font-family: "Kanit", sans-serif;
  font-size: 13px;
  cursor: pointer;
  color: var(--gl-text);
  transition: background 0.15s;
  text-align: left;
}
.dropdown-item:hover {
  background: var(--gl-bg);
}
.dropdown-item.danger {
  color: var(--gl-red);
}
.dropdown-item.danger:hover {
  background: var(--gl-red-light);
}

.item-badge {
  margin-left: auto;
  background: var(--gl-red);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

/* Dropdown transition */
.dropdown-enter-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.dropdown-leave-active {
  transition:
    opacity 0.1s ease,
    transform 0.1s ease;
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
