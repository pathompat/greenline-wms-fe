<template>
  <aside class="sidebar" :class="{ collapsed }">
    <!-- Logo -->
    <div class="sidebar-logo">
      <transition name="fade" mode="out-in">
        <div v-if="!collapsed" key="full" class="logo-full">
          <img src="@/assets/img/logo.png" alt="Greenline WMS" class="logo-img" />
          <div class="logo-text">
            <span class="logo-main">Greenline</span>
            <span class="logo-sub">WMS</span>
          </div>
        </div>
        <div v-else key="icon" class="logo-icon">G</div>
      </transition>
    </div>

    <!-- Nav -->
    <nav class="sidebar-nav">
      <div v-for="group in visibleGroups" :key="group.label" class="nav-group">
        <div v-if="!collapsed" class="nav-group-label">{{ group.label }}</div>
        <RouterLink
          v-for="item in group.visibleItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item) }"
          v-tooltip.right="collapsed ? item.label : null"
        >
          <i :class="['nav-icon', item.icon]" />
          <transition name="fade">
            <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
          </transition>
          <span v-if="!collapsed && item.badge" class="nav-badge">{{ item.badge }}</span>
        </RouterLink>
      </div>
    </nav>

    <!-- Toggle -->
    <button class="sidebar-toggle" @click="$emit('toggle')">
      <i :class="collapsed ? 'pi pi-chevron-right' : 'pi pi-chevron-left'" />
    </button>
  </aside>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import { computed } from "vue";
import { useRoute } from "vue-router";

defineProps({ collapsed: Boolean });
defineEmits(["toggle"]);

const route = useRoute();
const notifStore = useNotificationStore();
const authStore = useAuthStore();

const navGroups = computed(() => [
  {
    label: "ภาพรวม",
    items: [{ display: false, to: "/dashboard", icon: "pi pi-home", label: "แดชบอร์ด" }],
  },
  {
    label: "Master Data",
    items: [
      { display: true, to: "/master/products", icon: "pi pi-box", label: "สินค้า / SKU" },
      { display: true, to: "/master/categories", icon: "pi pi-tags", label: "ประเภทสินค้า" },
      { display: true, to: "/master/units", icon: "pi pi-calculator", label: "หน่วยนับ" },
      { display: true, to: "/master/packaging-sizes", icon: "pi pi-inbox", label: "ขนาดบรรจุภัณฑ์" },
      { display: true, to: "/master/brands", icon: "pi pi-bookmark", label: "ชื่อแบรนด์" },
      { display: true, to: "/master/warehouses", icon: "pi pi-building", label: "คลังสินค้า" },
      { display: true, to: "/master/suppliers", icon: "pi pi-truck", label: "ซัพพลายเออร์" },
      { display: true, to: "/master/machines", icon: "pi pi-cog", label: "เครื่องจักร" },
    ],
  },
  {
    label: "เอกสาร",
    items: [
      { display: true, to: "/documents/receipt", icon: "pi pi-download", label: "รับเข้า (GR)" },
      { display: true, to: "/documents/requisition", icon: "pi pi-upload", label: "เบิก-จ่าย (RQ)" },
      { display: true, to: "/documents/return", icon: "pi pi-reply", label: "คืนสินค้า (RT)" },
    ],
  },
  {
    label: "สต๊อก",
    items: [
      { display: true, to: "/stock/by-warehouse", icon: "pi pi-warehouse", label: "สต๊อกแยกคลัง" },
      { display: true, to: "/stock/lots", icon: "pi pi-list", label: "Lot Tracking" },
    ],
  },
  {
    label: "Production",
    items: [
      { display: true, to: "/production/formulas", icon: "pi pi-book", label: "สูตร / BOM" },
      { display: true, to: "/production/orders", icon: "pi pi-list-check", label: "ใบสั่งผลิต" },
    ],
  },
  {
    label: "ระบบ",
    items: [
      { display: authStore.isSuperAdmin, to: "/admin/users", icon: "pi pi-users", label: "ผู้ใช้ & สิทธิ์" },
      {
        display: false,
        to: "/notifications",
        icon: "pi pi-bell",
        label: "การแจ้งเตือน",
        badge: notifStore.unreadCount || null,
      },
    ],
  },
]);

const visibleGroups = computed(() =>
  navGroups.value
    .map((g) => ({ ...g, visibleItems: g.items.filter((i) => i.display) }))
    .filter((g) => g.visibleItems.length > 0),
);

function isActive(item) {
  if (item.to === "/dashboard") return route.path === "/dashboard";
  return route.path.startsWith(item.to);
}
</script>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-w);
  background: var(--gl-sidebar-bg);
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.sidebar.collapsed {
  width: var(--sidebar-w-collapsed);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  min-height: var(--header-h);
}

.logo-icon {
  width: 38px;
  height: 38px;
  background: var(--gl-red);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);
}

.logo-full {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-img {
  height: 44px;
  width: auto;
  background: #fff;
  border-radius: 8px;
  padding: 5px 10px;
  object-fit: contain;
  flex-shrink: 0;
}

.logo-main {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}
.logo-sub {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-top: 3px;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-group {
  margin-bottom: 6px;
}

.nav-group-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  padding: 10px 10px 4px;
  white-space: nowrap;
  overflow: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  color: var(--gl-sidebar-text);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 400;
  margin-bottom: 1px;
  transition:
    background 0.15s,
    color 0.15s;
  white-space: nowrap;
  position: relative;
}

.nav-item:hover {
  background: var(--gl-sidebar-hover);
  color: #fff;
}
.nav-item.active {
  background: var(--gl-sidebar-active);
  color: #fff;
  font-weight: 500;
  border-left: 3px solid var(--gl-red);
  padding-left: 7px;
}

.nav-icon {
  font-size: 14px;
  flex-shrink: 0;
  width: 18px;
  text-align: center;
}
.nav-label {
  flex: 1;
}

.nav-badge {
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

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  background: none;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-size: 13px;
  transition: color 0.15s;
}
.sidebar-toggle:hover {
  color: #fff;
}

.fade-enter-active {
  transition:
    opacity 0.15s,
    width 0.15s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
