<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

import BaseCard from "@/components/common/BaseCard.vue";

import { permissions } from "@/stores/auth";

import "@/assets/styles/production/settings.css";

const router = useRouter();
const { t } = useI18n();
const go = (path: string) => {
  router.push(path);
};

// =========================================
// 🔐 PERMISSIONS
// =========================================

const canManageSettings = computed(() => {
  return permissions.value.includes("settings.manage");
});

const canViewUsers = computed(() => {
  return permissions.value.includes("user.view");
});

const hasVisibleSettings = computed(() => {
  return canManageSettings.value || canViewUsers.value;
});

const canManageAcme = computed(() => {
  return permissions.value.includes("acme.manage");
});
</script>

<template>
  <div class="settings">
    <h1 class="settings-title">{{ t("settings.title") }}</h1>

    <div v-if="hasVisibleSettings" class="settings-grid">
      <BaseCard v-if="canManageSettings" class="settings-card" @click="go('/settings/infrastructure')">
        <h2>{{ t("settings.infrastructure.title") }}</h2>
        <p>{{ t("settings.infrastructure.desc") }}</p>
      </BaseCard>

      <BaseCard v-if="canManageSettings" class="settings-card" @click="go('/settings/branding')">
        <h2>{{ t("settings.branding.title") }}</h2>
        <p>{{ t("settings.branding.desc") }}</p>
      </BaseCard>

      <BaseCard v-if="canViewUsers" class="settings-card" @click="go('/settings/users')">
        <h2>{{ t("settings.users.title") }}</h2>
        <p>{{ t("settings.users.desc") }}</p>
      </BaseCard>

      <BaseCard v-if="canManageSettings" class="settings-card" @click="go('/settings/teams')">
        <h2>{{ t("settings.teams.title") }}</h2>
        <p>{{ t("settings.teams.desc") }}</p>
      </BaseCard>

      <BaseCard v-if="canManageSettings" class="settings-card" @click="go('/settings/acls')">
        <h2>{{ t("settings.acls.title") }}</h2>
        <p>{{ t("settings.acls.desc") }}</p>
      </BaseCard>

      <BaseCard v-if="canManageSettings" class="settings-card" @click="go('/settings/acme')">
        <h2>{{ t("settings.acme.title") }}</h2>
        <p>{{ t("settings.acme.desc") }}</p>
      </BaseCard>

      <BaseCard v-if="canManageSettings" class="settings-card" @click="go('/settings/security')">
        <h2>{{ t("settings.security.title") }}</h2>
        <p>{{ t("settings.security.desc") }}</p>
      </BaseCard>

      <BaseCard v-if="canManageSettings" class="settings-card" @click="go('/settings/notifications')">
        <h2>{{ t("settings.notifications.title") }}</h2>
        <p>{{ t("settings.notifications.desc") }}</p>
      </BaseCard>

      <BaseCard v-if="canManageSettings" class="settings-card" @click="go('/settings/audit-logs')">
        <h2>{{ t("settings.auditLogs.title") }}</h2>
        <p>{{ t("settings.auditLogs.desc") }}</p>
      </BaseCard>
    </div>

    <BaseCard v-else class="settings-empty">
      <h2>{{ t("settings.empty.title") }}</h2>
      <p>{{ t("settings.empty.desc") }}</p>
    </BaseCard>
  </div>
</template>
