<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">ศูนย์การแจ้งเตือน</div>
        <div class="page-subtitle">การแจ้งเตือน Min Stock, Hold และเหตุการณ์ในระบบ</div>
      </div>
      <div style="display:flex; gap:8px;">
        <Button label="อ่านทั้งหมด" icon="pi pi-check-circle" outlined @click="notifStore.markAllRead()" :disabled="notifStore.unreadCount === 0" />
        <Button label="ตรวจสอบสต๊อก" icon="pi pi-refresh" class="btn-primary" @click="checkStock" />
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="notif-tabs">
      <button v-for="t in tabs" :key="t.value" :class="['notif-tab', { active: activeTab === t.value }]" @click="activeTab = t.value">
        {{ t.label }} <span class="tab-count">{{ getTabCount(t.value) }}</span>
      </button>
    </div>

    <div class="notif-list">
      <div v-if="!filteredNotifs.length" class="empty-notif">
        <i class="pi pi-bell-slash" style="font-size: 32px;" />
        <div>ไม่มีการแจ้งเตือน</div>
      </div>

      <div
        v-for="n in filteredNotifs"
        :key="n.id"
        :class="['notif-item', { unread: !n.read }]"
        @click="notifStore.markRead(n.id)"
      >
        <div :class="['notif-icon', notifIconBg(n.type)]">
          <i :class="notifIcon(n.type)" />
        </div>
        <div class="notif-body">
          <div class="notif-msg">{{ n.message }}</div>
          <div class="notif-meta">
            <span :class="['notif-type-badge', notifTypeBadge(n.type)]">{{ notifTypeLabel(n.type) }}</span>
            <span class="notif-time">{{ formatTime(n.createdAt) }}</span>
          </div>
        </div>
        <div class="notif-actions">
          <div v-if="!n.read" class="unread-dot" />
          <Button icon="pi pi-times" size="small" text rounded @click.stop="notifStore.deleteNotification(n.id)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useNotificationStore } from '@/stores/notifications'
import Button from 'primevue/button'

const toast = useToast()
const notifStore = useNotificationStore()

const activeTab = ref('all')

const tabs = [
  { value: 'all',       label: 'ทั้งหมด' },
  { value: 'unread',    label: 'ยังไม่อ่าน' },
  { value: 'min_stock', label: 'Min Stock' },
  { value: 'hold',      label: 'Hold' },
]

const filteredNotifs = computed(() =>
  notifStore.notifications
    .filter(n => {
      if (activeTab.value === 'all') return true
      if (activeTab.value === 'unread') return !n.read
      return n.type === activeTab.value
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
)

function getTabCount(t) {
  if (t === 'all') return notifStore.notifications.length
  if (t === 'unread') return notifStore.unreadCount
  return notifStore.notifications.filter(n => n.type === t).length
}

function notifIcon(t) { return { min_stock: 'pi pi-exclamation-triangle', hold: 'pi pi-lock', system: 'pi pi-info-circle' }[t] || 'pi pi-bell' }
function notifIconBg(t) { return { min_stock: 'bg-orange', hold: 'bg-red', system: 'bg-blue' }[t] || 'bg-gray' }
function notifTypeLabel(t) { return { min_stock: 'Min Stock', hold: 'Hold', system: 'ระบบ' }[t] || t }
function notifTypeBadge(t) { return { min_stock: 'badge-orange', hold: 'badge-red', system: 'badge-blue' }[t] || '' }
function formatTime(dt) {
  return new Date(dt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function checkStock() {
  notifStore.checkMinStock()
  toast.add({ severity: 'info', summary: 'ตรวจสอบสต๊อกเสร็จ', life: 3000 })
}
</script>

<style scoped>
.notif-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.notif-tab {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: 8px; border: 1px solid var(--gl-border);
  background: var(--gl-surface); cursor: pointer; font-family: var(--gl-font);
  font-size: 13px; color: var(--gl-text-muted); transition: all 0.15s;
}
.notif-tab:hover { background: var(--gl-bg); }
.notif-tab.active { background: var(--gl-navy); color: #fff; border-color: var(--gl-navy); }
.tab-count { background: rgba(255,255,255,0.2); border-radius: 999px; padding: 1px 8px; font-size: 11px; font-weight: 600; }
.notif-tab:not(.active) .tab-count { background: var(--gl-bg); color: var(--gl-navy); }

.notif-list { display: flex; flex-direction: column; gap: 8px; }

.empty-notif {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px; color: var(--gl-text-muted); font-size: 15px; gap: 12px;
  background: var(--gl-surface); border-radius: 10px;
}

.notif-item {
  display: flex; align-items: center; gap: 14px;
  background: var(--gl-surface); border-radius: 10px;
  padding: 14px 16px; border: 1px solid var(--gl-border);
  cursor: pointer; transition: background 0.15s;
}
.notif-item:hover { background: #F8FAFF; }
.notif-item.unread { border-left: 3px solid var(--gl-navy); background: #F0F4FF; }

.notif-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.bg-orange { background: #FEF3C7; color: #D97706; }
.bg-red    { background: #FEE2E2; color: #DC2626; }
.bg-blue   { background: #DBEAFE; color: #3B82F6; }
.bg-gray   { background: var(--gl-bg); color: var(--gl-text-muted); }

.notif-body { flex: 1; }
.notif-msg { font-size: 14px; color: var(--gl-text); margin-bottom: 5px; }
.notif-meta { display: flex; align-items: center; gap: 10px; }

.notif-type-badge { padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
.badge-orange { background: #FEF3C7; color: #92400E; }
.badge-red    { background: #FEE2E2; color: #991B1B; }
.badge-blue   { background: #DBEAFE; color: #1D4ED8; }

.notif-time { font-size: 12px; color: var(--gl-text-muted); }

.notif-actions { display: flex; align-items: center; gap: 8px; }
.unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gl-red); flex-shrink: 0; }
</style>
