<script setup lang="ts">
import { ref, onMounted } from "vue";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import { getSetting, setSetting } from "@/api/settings";
import "@/assets/styles/production/security.css";
import { useI18n } from "vue-i18n";

// =========================================
// 🔥 STATE
// =========================================

const saving = ref(false);
const saved = ref(false);
const { t } = useI18n();

const settings = ref({
  // Key Defaults
  default_key_type: "rsa",
  default_key_size: "3072",
  default_curve: "P256",

  // Zertifikatsrichtlinien
  max_validity_days: "365",
  allow_wildcards: "true",
  require_san: "false",
  require_email: "false",
  dns_validation: 'true',

  // CA Policy
  auto_revoke_expired: "false",
  ocsp_must_staple: "false",
});

// =========================================
// 🔥 LOAD
// =========================================

const load = async () => {
  try {
    const keys = Object.keys(settings.value);
    const results = await Promise.all(keys.map((k) => getSetting(k)));
    keys.forEach((key, i) => {
      if (results[i] !== null && results[i] !== undefined) {
        settings.value[key as keyof typeof settings.value] = results[i] as string;
      }
    });
  } catch (e) {
    console.error("Fehler beim Laden:", e);
  }
};

// =========================================
// 🔥 SAVE
// =========================================

const save = async () => {
  saving.value = true;
  try {
    await Promise.all(
      Object.entries(settings.value).map(([key, value]) => setSetting(key, value))
    );
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
  } catch (e) {
    console.error("Fehler beim Speichern:", e);
  } finally {
    saving.value = false;
  }
};

onMounted(() => load());
</script>

<template>
  <div class="settings">
    <h1 class="settings-title">{{ t("security.title") }}</h1>

    <!-- Key Defaults -->
    <BaseCard>
      <div class="notifications-card-header">
        <h2>🔑 {{ t("security.keyDefaultsTitle") }}</h2>
        <p>{{ t("security.keyDefaultsDesc") }}</p>
      </div>

      <div class="security-grid">
        <div class="security-field">
          <label class="security-label">{{ t("security.defaultKeyType") }}</label>
          <select v-model="settings.default_key_type" class="security-select">
            <option value="rsa">RSA</option>
            <option value="ecdsa">ECDSA</option>
          </select>
        </div>

        <div class="security-field" v-if="settings.default_key_type === 'rsa'">
          <label class="security-label">{{ t("security.defaultKeySize") }}</label>
          <select v-model="settings.default_key_size" class="security-select">
            <option value="2048">2048 ({{ t("security.compatible") }})</option>
            <option value="3072">3072 ({{ t("security.recommended") }})</option>
            <option value="4096">4096 (High Security)</option>
          </select>
        </div>

        <div class="security-field" v-if="settings.default_key_type === 'ecdsa'">
          <label class="security-label">{{ t("security.defaultCurve") }}</label>
          <select v-model="settings.default_curve" class="security-select">
            <option value="P256">P256 (Fast, Standard)</option>
            <option value="P384">P384 ({{ t("security.moreSecurity") }})</option>
            <option value="P521">P521 (High Security)</option>
          </select>
        </div>
      </div>
    </BaseCard>

    <!-- Zertifikatsrichtlinien -->
    <BaseCard style="margin-top: 20px">
      <div class="notifications-card-header">
        <h2>📋 {{ t("security.certificatePoliciesTitle") }}</h2>
        <p>{{ t("security.certificatePoliciesDesc") }}</p>
      </div>

      <div class="security-grid">
        <div class="security-field">
          <label class="security-label">
            {{ t("security.maxValidityDays") }}
            <span class="security-hint">{{ t("security.default365") }}</span>
          </label>
          <input
            v-model="settings.max_validity_days"
            type="number"
            min="1"
            max="3650"
            class="security-input"
          />
        </div>
      </div>

      <div class="security-toggles">
        <div class="security-toggle-row">
          <div class="security-toggle-info">
            <strong>{{ t("security.allowWildcards") }}</strong>
            <span>{{ t("security.allowWildcardsDesc") }}</span>
          </div>
          <label class="security-switch">
            <input
              type="checkbox"
              :checked="settings.allow_wildcards === 'true'"
              @change="settings.allow_wildcards = ($event.target as HTMLInputElement).checked ? 'true' : 'false'"
            />
            <span class="security-slider"></span>
          </label>
        </div>

        <div class="security-toggle-row">
          <div class="security-toggle-info">
            <strong>{{ t("security.requireSan") }}</strong>
            <span>{{ t("security.requireSanDesc") }}</span>
          </div>
          <label class="security-switch">
            <input
              type="checkbox"
              :checked="settings.require_san === 'true'"
              @change="settings.require_san = ($event.target as HTMLInputElement).checked ? 'true' : 'false'"
            />
            <span class="security-slider"></span>
          </label>
        </div>

        <div class="security-toggle-row">
          <div class="security-toggle-info">
            <strong>{{ t("security.requireEmail") }}</strong>
            <span>{{ t("security.requireEmailDesc") }}</span>
          </div>
          <label class="security-switch">
            <input
              type="checkbox"
              :checked="settings.require_email === 'true'"
              @change="settings.require_email = ($event.target as HTMLInputElement).checked ? 'true' : 'false'"
            />
            <span class="security-slider"></span>
          </label>
        </div>

        <div class="security-toggle-row">
          <div class="security-toggle-info">
            <strong>{{ t("security.dnsValidation") }}</strong>
            <span>{{ t("security.dnsValidationDesc") }}</span>
          </div>
          <label class="security-switch">
            <input
              type="checkbox"
              :checked="settings.dns_validation === 'true'"
              @change="settings.dns_validation = ($event.target as HTMLInputElement).checked ? 'true' : 'false'"
            />
            <span class="security-slider"></span>
          </label>
        </div>
      </div>
    </BaseCard>

    <!-- CA Policy -->
    <BaseCard style="margin-top: 20px">
      <div class="notifications-card-header">
        <h2>🏛️ {{ t("security.caPolicyTitle") }}</h2>
        <p>{{ t("security.caPolicyDesc") }}</p>
      </div>

      <div class="security-toggles">
        <div class="security-toggle-row security-toggle-row--disabled">
          <div class="security-toggle-info">
            <strong>{{ t("security.autoRevokeExpired") }}</strong>
            <span>
              {{ t("security.autoRevokeExpiredDesc") }}
              (<code>certs:auto-revoke</code>) — {{ t("security.alwaysActive") }}
            </span>
          </div>
          <label class="security-switch security-switch--disabled">
            <input type="checkbox" checked disabled />
            <span class="security-slider"></span>
          </label>
        </div>

        <div class="security-toggle-row security-toggle-row--disabled">
          <div class="security-toggle-info">
            <strong>OCSP Must-Staple</strong>
            <span>
              {{ t("security.ocspMustStapleDesc") }} —
              <em>{{ t("security.notAvailableYet") }}</em>
            </span>
          </div>
          <label class="security-switch security-switch--disabled">
            <input type="checkbox" disabled />
            <span class="security-slider"></span>
          </label>
        </div>
      </div>
    </BaseCard>

    <div style="margin-top: 20px; display: flex; justify-content: flex-end">
      <BaseButton :class="saved ? 'success' : 'primary'" :disabled="saving" @click="save">
        {{
          saving
            ? t("common.saving")
            : saved
              ? t("common.saved")
              : t("common.save")
        }}
      </BaseButton>
    </div>
  </div>
</template>