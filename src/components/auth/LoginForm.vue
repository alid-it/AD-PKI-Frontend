<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

import { login } from "@/api/auth";
import { getUserSettings } from "@/api/userSettings";
import { setUser } from "@/stores/auth";
import { applyLocale } from "@/i18n";

import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import brandIcon from "@/assets/images/AD-PKI_ohne_Schrift.svg";

const router = useRouter();
const { t } = useI18n();

const username = ref("");
const password = ref("");

const loading = ref(false);
const error = ref("");

// =========================================
// LOGIN
// =========================================

const handleLogin = async () => {
  error.value = "";
  loading.value = true;

  try {
    const res = await login({
      username: username.value,
      password: password.value,
    });

    // 🔥 TOKEN
    localStorage.setItem("token", res.token);

    setUser(res.user);

    // 🌍 Sprache aus DB laden
    try {
      const settings = await getUserSettings();
      applyLocale(settings.locale);
    } catch (settingsError) {
      console.warn("User settings konnten nicht geladen werden", settingsError);
    }

    router.push("/dashboard");
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Login fehlgeschlagen";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-wrapper">
    <BaseCard class="login-card">
      <section class="login-brand" aria-hidden="true">
        <span class="login-glow login-glow--top"></span>
        <span class="login-glow login-glow--bottom"></span>
        <span class="login-grid"></span>

        <div class="login-brand-content">
          <div class="login-brand-head">
            <div class="login-logo-shell">
              <img :src="brandIcon" alt="" class="login-logo" />
            </div>
            <div>
              <p class="login-eyebrow">{{ t("login.subtitle") }}</p>
              <h1>{{ t("app.name") }}</h1>
            </div>
          </div>

          <p class="login-tagline">{{ t("login.tagline") }}</p>

          <ul class="login-features">
            <li>
              <span class="login-check">✓</span>{{ t("login.feature1") }}
            </li>
            <li>
              <span class="login-check">✓</span>{{ t("login.feature2") }}
            </li>
            <li>
              <span class="login-check">✓</span>{{ t("login.feature3") }}
            </li>
          </ul>
        </div>
      </section>

      <section class="login-panel">
        <div class="login-mobile-brand">
          <img :src="brandIcon" alt="" />
          <span>{{ t("app.name") }}</span>
        </div>

        <div class="login-header">
          <p class="login-kicker">{{ t("login.subtitle") }}</p>
          <h2>{{ t("login.submit") }}</h2>
        </div>

        <form class="login-form" @submit.prevent="handleLogin">
          <BaseInput
            v-model="username"
            :label="t('login.username')"
            :placeholder="t('login.username')"
            name="username"
            autocomplete="username"
            :disabled="loading"
            required
            autofocus
          />

          <BaseInput
            v-model="password"
            :label="t('login.password')"
            type="password"
            :placeholder="t('login.password')"
            name="password"
            autocomplete="current-password"
            :disabled="loading"
            required
          />

          <div v-if="error" class="login-error" role="alert">
            <span class="login-error-icon" aria-hidden="true">!</span>
            {{ error }}
          </div>

          <BaseButton class="login-button" type="submit" :disabled="loading">
            <span v-if="loading" class="login-spinner" aria-hidden="true"></span>
            {{ loading ? t("login.loading") : t("login.submit") }}
            <span v-if="!loading" class="login-arrow" aria-hidden="true">→</span>
          </BaseButton>
        </form>

        <p class="login-security-note">
          <span class="login-lock" aria-hidden="true">🔒</span>
          {{ t("login.secure") }}
        </p>
      </section>
    </BaseCard>
  </div>
</template>
