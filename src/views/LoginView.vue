<template>
  <div class="login-page">
    <div class="login-left">
      <div class="login-brand">
        <img src="@/assets/img/logo.png" alt="Greenline WMS" class="brand-logo-img" />
        <p class="brand-desc">ระบบจัดการคลังสินค้า</p>
      </div>
      <div class="login-deco">
        <div class="deco-card dc1"><i class="pi pi-box" /> สต๊อกสินค้า Real-time</div>
        <div class="deco-card dc2"><i class="pi pi-file" /> เบิก-จ่าย-คืน-รับเข้า</div>
        <div class="deco-card dc3"><i class="pi pi-list" /> Lot Tracking FIFO</div>
      </div>
    </div>

    <div class="login-right">
      <div class="login-box">
        <div class="login-header">
          <h2>เข้าสู่ระบบ</h2>
          <p>กรุณาใส่ชื่อผู้ใช้และรหัสผ่าน</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="field">
            <label class="field-label">ชื่อผู้ใช้ <span class="req">*</span></label>
            <InputText
              v-model="form.username"
              placeholder="username"
              class="w-full"
              :disabled="loading"
              autocomplete="username"
            />
          </div>

          <div class="field">
            <label class="field-label">รหัสผ่าน <span class="req">*</span></label>
            <div class="pw-wrap">
              <InputText
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="password"
                class="w-full"
                :disabled="loading"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="pw-toggle"
                @click="showPassword = !showPassword"
                :disabled="loading"
                tabindex="-1"
              >
                <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'" />
              </button>
            </div>
          </div>

          <transition name="slide-up">
            <div v-if="error" class="error-msg"><i class="pi pi-exclamation-circle" /> {{ error }}</div>
          </transition>

          <Button
            type="submit"
            label="เข้าสู่ระบบ"
            icon="pi pi-sign-in"
            class="w-full btn-primary login-btn"
            :loading="loading"
          />
        </form>

        <!-- <div class="login-hint">
          <i class="pi pi-info-circle" />
          Demo: username <strong>admin</strong> / password <strong>Test#1234</strong>
        </div> -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const authStore = useAuthStore();

const form = ref({ username: "", password: "" });
const showPassword = ref(false);
const loading = ref(false);
const error = ref("");

async function handleLogin() {
  error.value = "";
  if (!form.value.username || !form.value.password) {
    error.value = "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน";
    return;
  }
  loading.value = true;
  try {
    await authStore.login(form.value.username, form.value.password);
    router.push("/master/products");
  } catch (e) {
    error.value = e.response?.data?.message || e.message || "เกิดข้อผิดพลาด กรุณาลองใหม่";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
}

.login-left {
  flex: 1;
  background: linear-gradient(135deg, var(--gl-navy-dark) 0%, var(--gl-navy) 60%, var(--gl-navy-light) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  position: relative;
  overflow: hidden;
}

.login-left::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 80%, rgba(220, 38, 38, 0.12) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.04) 0%, transparent 40%);
}

.login-brand {
  text-align: center;
  position: relative;
  z-index: 1;
}

.brand-logo-img {
  width: 200px;
  height: auto;
  display: block;
  background: #fff;
  border-radius: 16px;
  padding: 16px 24px;
  margin: 0 auto 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}
.brand-desc {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.6);
}

.login-deco {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 48px;
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 280px;
}

.deco-card {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px 16px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  backdrop-filter: blur(4px);
}
.deco-card i {
  color: var(--gl-red);
  font-size: 16px;
}

.login-right {
  width: 460px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: var(--gl-bg);
}

.login-box {
  width: 100%;
  max-width: 360px;
}

.login-header {
  margin-bottom: 28px;
}
.login-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--gl-navy);
  margin-bottom: 4px;
}
.login-header p {
  font-size: 14px;
  color: var(--gl-text-muted);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
}

.req {
  color: var(--gl-red);
}

.error-msg {
  background: var(--gl-red-light);
  color: var(--gl-red);
  border: 1px solid #fca5a5;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-btn {
  margin-top: 4px;
  height: 44px;
  font-size: 15px !important;
  font-weight: 600 !important;
}

.login-hint {
  margin-top: 20px;
  padding: 10px 14px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  font-size: 12px;
  color: #1e40af;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pw-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.pw-wrap .p-inputtext {
  padding-right: 2.5rem;
  width: 100%;
}

.pw-toggle {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--gl-text-muted);
  display: flex;
  align-items: center;
  padding: 0;
  font-size: 15px;
  transition: color 0.15s;
}

.pw-toggle:hover {
  color: var(--gl-navy);
}
.pw-toggle:disabled {
  opacity: 0.4;
  cursor: default;
}

@media (max-width: 768px) {
  .login-left {
    display: none;
  }
  .login-right {
    width: 100%;
  }
}
</style>
