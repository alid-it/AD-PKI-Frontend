<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import { getSetting, setSetting } from '@/api/settings'
import { getACMEAccounts, getACMEAccountDomains, deactivateACMEAccount, type ACMEAccount } from '@/api/acme'
import { getCA } from '@/api/ca'

import '@/assets/styles/production/infrastructure.css'

const { t } = useI18n()

// =========================================
// 🔥 STATE
// =========================================

const accountDomains = ref<Record<string, string[]>>({})
const accounts = ref<ACMEAccount[]>([])
const intermediates = ref<{ id: string; cn: string }[]>([])
const activeIntermediate = ref('')
const acmeValidityDays = ref('90')
const acmeDirectoryUrl = ref('')
const deactivating = ref<string | null>(null)
const loading = ref(false)
const saving = ref(false)
const saved = ref(false)
const copied = ref(false)
const error = ref<string | null>(null)

// =========================================
// 🔥 LOAD
// =========================================

const load = async () => {
  loading.value = true
  try {
    const [accs, intermediate, validity, domains, acmeUrl] = await Promise.all([
      getACMEAccounts(),
      getSetting('active_intermediate'),
      getSetting('acme_validity_days'),
      getACMEAccountDomains(),
      getSetting('acme_url'),
    ])

    accounts.value = accs ?? []
    activeIntermediate.value = intermediate ?? 'int-3'
    acmeValidityDays.value = validity ?? '90'
    accountDomains.value = domains ?? {}
    acmeDirectoryUrl.value = acmeUrl ?? 'http://localhost:8080/acme/directory'
  } catch (e) {
    console.error('ACME load error:', e)
  } finally {
    loading.value = false
  }
}

const loadIntermediates = async () => {
  try {
    const data = await getCA()
    intermediates.value = data.intermediates.map((ca: any) => ({
      id: ca.id,
      cn: ca.cn,
    }))
  } catch (e) {
    console.error('Intermediates error:', e)
  }
}

// =========================================
// 🔥 DEACTIVATE
// =========================================

const deactivate = async (id: string) => {
  if (!confirm(t('acme.confirmDeactivate'))) return
  deactivating.value = id
  try {
    await deactivateACMEAccount(id)
    await load()
  } catch (e) {
    console.error('Deactivation error:', e)
  } finally {
    deactivating.value = null
  }
}

// =========================================
// 🔥 SAVE
// =========================================

const save = async () => {
  saving.value = true
  error.value = null
  try {
    await Promise.all([
      setSetting('active_intermediate', activeIntermediate.value),
      setSetting('acme_validity_days', acmeValidityDays.value),
    ])
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } catch (e) {
    error.value = 'Fehler beim Speichern'
  } finally {
    saving.value = false
  }
}

// =========================================
// 🔥 COPY
// =========================================

const copyDirectoryUrl = async () => {
  await navigator.clipboard.writeText(acmeDirectoryUrl.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

// =========================================
// 🔥 HELPERS
// =========================================

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

const formatEmail = (contact: string[]) =>
  contact.map(c => c.replace('mailto:', '')).join(', ')

// =========================================
// 🔥 LIFECYCLE
// =========================================

onMounted(async () => {
  await Promise.all([load(), loadIntermediates()])
})
</script>

<template>
  <div class="settings">
    <h1 class="settings-title">{{ t('acme.title') }}</h1>

    <!-- Info Card -->
    <BaseCard class="infra-card infra-info-card">
      <div class="notifications-card-header">
        <h2>{{ t('acme.howItWorks') }}</h2>
      </div>

      <div class="infra-info-grid">
        <div class="infra-info-item">
          <span class="infra-info-icon">🤖</span>
          <div>
            <strong>{{ t('acme.acmeName') }}</strong>
            <p>{{ t('acme.infoDesc') }}</p>
          </div>
        </div>

        <div class="infra-info-item">
          <span class="infra-info-icon">✅</span>
          <div>
            <strong>{{ t('acme.http01') }}</strong>
            <p>{{ t('acme.http01Desc') }}</p>
          </div>
        </div>

        <div class="infra-info-item">
          <span class="infra-info-icon">🚧</span>
          <div>
            <strong>DNS-01 Challenge</strong>
            <p>{{ t('acme.dns01Desc') }}</p>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- ACME Directory URL -->
    <BaseCard class="infra-card" style="margin-top: 20px">
      <div class="notifications-card-header">
        <h2>🌐 {{ t('acme.directoryUrl') }}</h2>
        <p>{{ t('acme.directoryUrlDesc') }}</p>
      </div>

      <div class="infra-field">
        <div class="infra-preview" style="display: flex; align-items: center; gap: 12px">
          <code style="flex: 1">{{ acmeDirectoryUrl }}</code>
          <BaseButton :class="copied ? 'success' : 'primary'" @click="copyDirectoryUrl">
            {{ copied ? `✓ ${t('acme.copied')}` : t('acme.copy') }}
          </BaseButton>
        </div>
      </div>

      <div class="infra-field" style="margin-top: 12px">
        <label class="infra-label">{{ t('acme.certbotExample') }}</label>
        <code
          style="display: block; padding: 12px; background: var(--color-surface-2); color: var(--color-text); border-radius: 6px; font-size: 12px; white-space: pre">certbot certonly \
  --server {{ acmeDirectoryUrl }} \
  --standalone \
  --domain ihre-domain.de</code>
      </div>
    </BaseCard>

    <!-- Accounts -->
    <BaseCard class="infra-card" style="margin-top: 20px">
      <div class="notifications-card-header">
        <h2>👤 {{ t('acme.accounts') }}</h2>
        <p>{{ t('acme.accountsDesc') }}</p>
      </div>

      <div v-if="loading" class="tsa-status tsa-status--missing">
        <span>{{ t('common.loading') }}...</span>
      </div>

      <div v-else-if="accounts.length === 0" class="tsa-status tsa-status--missing">
        <span class="tsa-status-icon">⚠️</span>
        <span>{{ t('acme.noAccounts') }}</span>
      </div>

      <div v-else class="infra-field" style="overflow-x: auto">
        <table style="width: 100%; min-width: 720px; border-collapse: collapse; font-size: 13px; table-layout: fixed">
          <colgroup>
            <col style="width: 16%" />
            <col style="width: 22%" />
            <col style="width: 10%" />
            <col style="width: 24%" />
            <col style="width: 14%" />
            <col style="width: 14%" />
          </colgroup>
          <thead>
            <tr style="border-bottom: 1px solid var(--color-border); text-align: left">
              <th style="padding: 8px 12px; color: var(--color-text-light)">{{ t('acme.accountId') }}</th>
              <th style="padding: 8px 12px; color: var(--color-text-light)">{{ t('acme.email') }}</th>
              <th style="padding: 8px 12px; color: var(--color-text-light)">{{ t('acme.status') }}</th>
              <th style="padding: 8px 12px; color: var(--color-text-light)">{{ t('acme.domains') }}</th>
              <th style="padding: 8px 12px; color: var(--color-text-light)">{{ t('acme.createdAt') }}</th>
              <th style="padding: 8px 12px; color: var(--color-text-light)">{{ t('common.actions') }}</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="acc in accounts" :key="acc.id" style="border-bottom: 1px solid var(--color-border)">
              <td style="padding: 8px 12px; font-family: monospace; font-size: 12px; word-break: break-all">
                {{ acc.id }}
              </td>

              <td style="padding: 8px 12px; word-break: break-word">
                {{ formatEmail(acc.contact) }}
              </td>

              <td style="padding: 8px 12px">
                <span :style="{
                  color: acc.status === 'valid' ? '#22c55e' : '#ef4444',
                  fontWeight: 600,
                }">
                  {{ acc.status }}
                </span>
              </td>

              <td style="padding: 8px 12px">
                <div v-if="accountDomains[acc.id]?.length" style="display: flex; flex-wrap: wrap; gap: 4px">
                  <span v-for="domain in accountDomains[acc.id]" :key="domain"
                    style="background: var(--color-surface-2); border-radius: 4px; padding: 2px 8px; font-size: 11px; color: var(--color-text); border: 1px solid var(--color-border)">
                    {{ domain }}
                  </span>
                </div>
                <span v-else style="color: var(--color-text-light)">—</span>
              </td>

              <td style="padding: 8px 12px">
                {{ formatDate(acc.created_at) }}
              </td>

              <td style="padding: 8px 12px">
                <BaseButton v-if="acc.status === 'valid'" class="danger" :disabled="deactivating === acc.id"
                  @click="deactivate(acc.id)" style="font-size: 12px; padding: 4px 10px">
                  {{ deactivating === acc.id ? '...' : t('acme.deactivate') }}
                </BaseButton>
                <span v-else style="color: var(--color-text-light); font-size: 12px">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- Einstellungen -->
    <BaseCard class="infra-card" style="margin-top: 20px">
      <div class="notifications-card-header">
        <h2>⚙️ {{ t('acme.settings') }}</h2>
        <p>{{ t('acme.settingsDesc') }}</p>
      </div>

      <!-- Active Intermediate -->
      <div class="infra-field">
        <label class="infra-label">
          {{ t('acme.activeIntermediate') }}
          <span class="infra-hint">{{ t('acme.activeIntermediateHint') }}</span>
        </label>
        <select v-model="activeIntermediate" class="security-select">
          <option v-for="ca in intermediates" :key="ca.id" :value="ca.id">
            {{ ca.cn }} ({{ ca.id }})
          </option>
        </select>
      </div>

      <!-- Validity Days -->
      <div class="infra-field">
        <label class="infra-label">
          {{ t('acme.validityDays') }}
          <span class="infra-hint">{{ t('acme.validityDaysHint') }}</span>
        </label>
        <input v-model="acmeValidityDays" type="number" min="1" max="365" class="security-select"
          style="width: 120px" />
      </div>

      <div v-if="error" class="infra-error">{{ error }}</div>

      <div class="notifications-actions">
        <BaseButton :class="saved ? 'success' : 'primary'" :disabled="saving" @click="save">
          {{ saving ? t('common.saving') : saved ? t('common.saved') : t('common.save') }}
        </BaseButton>
      </div>
    </BaseCard>
  </div>
</template>