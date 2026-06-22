<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { currentUser } from "@/stores/auth";
import {
  userToastEnabled,
  saveUserToastPreference,
  loadUserToastPreference,
} from "@/stores/toastSettings";
import { useI18n } from "vue-i18n";

import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";

import "@/assets/styles/production/me.css";

const { t } = useI18n();
const user = computed(() => currentUser.value);

watch(
  currentUser,
  (newUser) => {
    console.log("[MeView] currentUser geändert:", newUser);
  },
  { immediate: true, deep: true }
);

const userPermissions = computed(() => {
  return user.value?.permissions ?? [];
});

// =========================================
// 🔥 TOAST PRÄFERENZ
// =========================================

const savingToast = ref(false);
const savedToast = ref(false);

const saveToast = async () => {
  savingToast.value = true;
  try {
    await saveUserToastPreference(userToastEnabled.value);
    savedToast.value = true;
    setTimeout(() => (savedToast.value = false), 2000);
  } catch (e) {
    console.error(e);
  }
  savingToast.value = false;
};

// =========================================
// 🔥 LIFECYCLE
// =========================================

onMounted(() => {
  loadUserToastPreference();
});
</script>

<template>
  <div class="me-page">
    <h1 class="page-title">{{ t("me.title") }}</h1>

    <BaseCard class="me-card">
      <div v-if="user" class="me-header">
        <div class="me-avatar">👤</div>

        <div>
          <h2>{{ user.username }}</h2>
          <p>{{ user.email }}</p>
          <span class="me-role">{{ user.role }}</span>
        </div>
      </div>

      <div v-else>{{ t("me.loadingUser") }}</div>
    </BaseCard>

    <BaseCard v-if="user" class="me-card">
      <h2>{{ t("me.userInformation") }}</h2>

      <div class="me-grid">
        <div class="me-item">
          <label>{{ t("me.firstname") }}</label>
          <span>{{ user.firstname }}</span>
        </div>

        <div class="me-item">
          <label>{{ t("me.lastname") }}</label>
          <span>{{ user.lastname }}</span>
        </div>

        <div class="me-item">
          <label>{{ t("me.email") }}</label>
          <span>{{ user.email }}</span>
        </div>

        <div class="me-item">
          <label>{{ t("me.role") }}</label>
          <span>{{ user.role }}</span>
        </div>
      </div>
    </BaseCard>

    <BaseCard v-if="user" class="me-card">
      <h2>{{ t("me.notifications") }}</h2>

      <div class="me-preference-row">
        <div class="me-preference-info">
          <span class="me-preference-label">
            {{ t("me.toastNotifications") }}
          </span>
          <span class="me-preference-desc">
            {{ t("me.toastNotificationsDesc") }}
          </span>
        </div>

        <label class="switch">
          <input type="checkbox" v-model="userToastEnabled" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="me-actions">
        <BaseButton
          :class="[savedToast ? 'success' : 'primary']"
          :disabled="savingToast"
          @click="saveToast"
        >
          {{
            savingToast
              ? t("common.saving")
              : savedToast
              ? t("common.saved")
              : t("common.save")
          }}
        </BaseButton>
      </div>
    </BaseCard>

    <BaseCard v-if="user" class="me-card">
      <h2>{{ t("me.permissions") }}</h2>

      <div v-if="userPermissions.length" class="permission-list">
        <div
          v-for="permission in userPermissions"
          :key="permission"
          class="permission-badge"
        >
          🔑 {{ permission }}
        </div>
      </div>

      <p v-else>{{ t("me.noPermissions") }}</p>
    </BaseCard>
  </div>
</template>
