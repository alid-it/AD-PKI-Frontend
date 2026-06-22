<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseTable from "@/components/common/BaseTable.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import "@/assets/styles/production/branding.css";

import type { ColorKey } from "@/types/theme";
import { getSetting, setSetting } from "@/api/settings";
import {
  colorKeys,
  defaultBranding,
  loadBrandingCache,
  saveBrandingCache,
  applyBranding,
  applyColorsToDom,
  getActiveMode,
  type ThemeMode,
  type BrandingSets,
} from "@/utils/branding";

const { t } = useI18n();

// 🔹 Firmenname
const companyName = ref("AD-PKI");

// 🔹 Welcher Theme-Farbsatz wird gerade bearbeitet? Standard = aktiver Modus,
//    damit Aenderungen direkt live sichtbar sind.
const editingMode = ref<ThemeMode>(getActiveMode());

// 🔹 Beide Farbsaetze (Light + Dark), vorbelegt aus dem Cache.
const sets = ref<BrandingSets>(loadBrandingCache());

const colorLabels = computed<Record<ColorKey, string>>(() => ({
  primary: t("branding.colors.primary"),
  secondary: t("branding.colors.secondary"),
  success: t("branding.colors.success"),
  danger: t("branding.colors.danger"),
  bg: t("branding.colors.bg"),
  card: t("branding.colors.card"),
  navbar: t("branding.colors.navbar"),
  navbar_text: t("branding.colors.navbarText"),
}));

// Aktueller real angezeigter Modus der App (aus <html data-theme>).
const activeMode = (): ThemeMode =>
  (document.documentElement.getAttribute("data-theme") as ThemeMode) || getActiveMode();

// Live-Vorschau: nur anwenden, wenn der bearbeitete Satz auch dem aktuell
// angezeigten Modus entspricht (sonst wuerde man Dark-Farben im Light-Mode
// "blind" reinmalen).
const previewIfActive = () => {
  if (editingMode.value === activeMode()) {
    applyColorsToDom(sets.value[editingMode.value]);
  }
};

watch(sets, previewIfActive, { deep: true });
watch(editingMode, previewIfActive);

// 🔹 Laden (beide Theme-Saetze aus dem Backend, Default als Fallback)
const load = async () => {
  const name = await getSetting("company_name");
  if (name) companyName.value = name;

  const modes: ThemeMode[] = ["light", "dark"];
  await Promise.all(
    modes.flatMap((mode) =>
      colorKeys.map(async (key) => {
        const val = await getSetting(`color_${key}_${mode}`);
        if (val) sets.value[mode][key] = val;
      })
    )
  );

  saveBrandingCache(sets.value);
  applyBranding(activeMode());
};

const reset = async () => {
  if (!confirm(t("branding.resetConfirm"))) return;

  companyName.value = "AD-PKI";
  await setSetting("company_name", companyName.value);
  localStorage.setItem("company_name", companyName.value);

  const modes: ThemeMode[] = ["light", "dark"];
  for (const mode of modes) {
    for (const key of colorKeys) {
      sets.value[mode][key] = defaultBranding[mode][key];
      await setSetting(`color_${key}_${mode}`, defaultBranding[mode][key]);
    }
  }

  saveBrandingCache(sets.value);
  applyBranding(activeMode());
};

// 🔹 Speichern (beide Theme-Saetze persistieren)
const save = async () => {
  await setSetting("company_name", companyName.value);

  const modes: ThemeMode[] = ["light", "dark"];
  await Promise.all(
    modes.flatMap((mode) =>
      colorKeys.map((key) => setSetting(`color_${key}_${mode}`, sets.value[mode][key]))
    )
  );

  saveBrandingCache(sets.value);
  localStorage.setItem("company_name", companyName.value);
  applyBranding(activeMode());

  // 🔥 TRIGGER für Navbar
  window.dispatchEvent(new Event("companyNameUpdated"));
};

onMounted(load);
</script>

<template>
  <div class="branding">
    <h1 class="branding-title">{{ t("branding.title") }}</h1>

    <BaseCard>
      <!-- 🌗 Welche Theme-Farben werden bearbeitet? -->
      <div class="branding-theme-switch">
        <span class="branding-theme-switch-label">{{ t("branding.editingTheme") }}</span>
        <div class="branding-theme-tabs">
          <button
            type="button"
            class="branding-theme-tab"
            :class="{ active: editingMode === 'light' }"
            @click="editingMode = 'light'"
          >
            ☀️ Light
          </button>
          <button
            type="button"
            class="branding-theme-tab"
            :class="{ active: editingMode === 'dark' }"
            @click="editingMode = 'dark'"
          >
            🌙 Dark
          </button>
        </div>
      </div>

      <p v-if="editingMode !== activeMode()" class="branding-preview-hint">
        {{ t("branding.previewHint") }}
      </p>

      <BaseTable>
        <thead>
          <tr>
            <th>{{ t("common.setting") }}</th>
            <th>{{ t("common.value") }}</th>
          </tr>
        </thead>

        <tbody>
          <!-- Firmenname (Theme-unabhaengig) -->
          <tr>
            <td>{{ t("branding.companyName") }}</td>
            <td>
              <BaseInput v-model="companyName" />
            </td>
          </tr>

          <!-- 🔥 Farben des aktuell bearbeiteten Themes -->
          <tr v-for="key in colorKeys" :key="key">
            <td>{{ colorLabels[key] }}</td>
            <td class="color-input">
              <input type="color" v-model="sets[editingMode][key]" />
              <BaseInput v-model="sets[editingMode][key]" />
            </td>
          </tr>
        </tbody>
      </BaseTable>

      <div class="branding-actions">
        <BaseButton @click="save">{{ t("common.save") }}</BaseButton>
        <BaseButton class="secondary" @click="reset">
          {{ t("common.reset") }}
        </BaseButton>
      </div>
    </BaseCard>
  </div>
</template>
