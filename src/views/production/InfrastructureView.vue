<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import { getSetting, setSetting } from '@/api/settings'
import { getTSAStatus, generateTSACert, type TSAStatus } from '@/api/tsa'
import { getCA } from '@/api/ca'
import { useI18n } from 'vue-i18n'

import '@/assets/styles/production/infrastructure.css'

// =========================================
// 🔥 STATE
// =========================================
const baseUrl = ref('')

const crlBaseUrl = computed(() => baseUrl.value ? normalizeBase(baseUrl.value) + '/api/crl' : '')
const ocspUrl = computed(() => baseUrl.value ? normalizeBase(baseUrl.value) + '/api/ocsp' : '')
const tsaUrl = computed(() => baseUrl.value ? normalizeBase(baseUrl.value) + '/api/timestamp' : '')
const acmeUrl = computed(() => baseUrl.value ? normalizeBase(baseUrl.value) + ':8080/acme/directory' : '')
const ntpServer = ref('')
const dnsServers = ref<string[]>(['', '', '', '', ''])
// Basis-URL säubern: Protokoll erzwingen, genau zwei Slashes, kein Slash am Ende.
// Repariert z. B. "http:192.168.10.8" -> "http://192.168.10.8" und
// "192.168.10.8" -> "http://192.168.10.8".
const normalizeBase = (url: string) => {
  let u = url.trim().replace(/\/+$/, '')
  if (!u) return ''
  if (/^https?:/i.test(u)) {
    u = u.replace(/^(https?):\/*/i, '$1://')
  } else {
    u = 'http://' + u
  }
  return u
}
const { t, locale } = useI18n()


const saving = ref(false)
const saved = ref(false)
const error = ref<string | null>(null)

// 🔥 TSA
const tsaStatus = ref<TSAStatus>({ exists: false })
const tsaIntermediate = ref('')
const generating = ref(false)
const generateError = ref<string | null>(null)
const generateSuccess = ref(false)

const intermediates = ref<{ id: string; cn: string }[]>([])

// =========================================
// 🔥 COMPUTED
// =========================================

const tsaValidTo = computed(() => {
  if (!tsaStatus.value.valid_to) return null

  return new Date(tsaStatus.value.valid_to).toLocaleDateString(
    locale.value === 'en' ? 'en-US' : 'de-DE',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  )
})

const tsaDaysLeft = computed(() => {
  if (!tsaStatus.value.valid_to) return null
  const diff = new Date(tsaStatus.value.valid_to).getTime() - Date.now()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
})

// =========================================
// 🔥 LOAD
// =========================================

const load = async () => {
  try {
    const [base, ntp, dns] = await Promise.all([
      getSetting('base_url'),
      getSetting('ntp_server'),
      getSetting('dns_servers'),
    ])
    baseUrl.value = base ?? ''
    ntpServer.value = ntp ?? 'pool.ntp.org'
    const parsed = dns ? JSON.parse(dns) : []
    dnsServers.value = [...parsed, '', '', '', '', ''].slice(0, 5)
  } catch (e) {
    console.error('Fehler beim Laden:', e)
  }
}

const loadTSAStatus = async () => {
  try {
    tsaStatus.value = await getTSAStatus()
    if (tsaStatus.value.intermediate_id) {
      tsaIntermediate.value = tsaStatus.value.intermediate_id
    }
  } catch (e) {
    console.error('TSA Status Fehler:', e)
  }
}

const loadIntermediates = async () => {
  try {
    const data = await getCA()
    intermediates.value = data.intermediates.map((ca: any) => ({
      id: ca.id,
      cn: ca.cn,
    }))
    if (intermediates.value.length > 0 && !tsaIntermediate.value) {
      tsaIntermediate.value = intermediates.value[0].id
    }
  } catch (e) {
    console.error('Intermediates Fehler:', e)
  }
}

// =========================================
// 🔥 SAVE
// =========================================

const save = async () => {
  saving.value = true
  error.value = null
  try {
    // Eingegebene Basis-URL säubern, damit sie auch im Feld korrekt persistiert
    if (baseUrl.value) baseUrl.value = normalizeBase(baseUrl.value)
    const filteredDns = dnsServers.value.filter(s => s.trim() !== '')
    await Promise.all([
      setSetting('base_url', baseUrl.value),
      setSetting('crl_base_url', crlBaseUrl.value),
      setSetting('ocsp_base_url', ocspUrl.value),
      setSetting('tsa_url', tsaUrl.value),
      setSetting('acme_url', acmeUrl.value),
      setSetting('ntp_server', ntpServer.value),
      setSetting('dns_servers', JSON.stringify(filteredDns)),
    ])
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } catch (e) {
    error.value = t('infrastructure.saveError')
  }
  saving.value = false
}

// =========================================
// 🔥 TSA GENERIEREN
// =========================================

const generateTSA = async () => {
  if (!tsaIntermediate.value) return

  generating.value = true
  generateError.value = null
  generateSuccess.value = false

  try {
    await generateTSACert(tsaIntermediate.value)
    generateSuccess.value = true
    setTimeout(() => (generateSuccess.value = false), 3000)
    await loadTSAStatus()
  } catch (e: any) {
    generateError.value = e?.response?.data?.error ?? t('infrastructure.generateError')
  } finally {
    generating.value = false
  }
}

// =========================================
// 🔥 PREVIEWS
// =========================================

const crlPreview = () => `${crlBaseUrl.value}/api/crl/int-{id}.pem`
const ocspPreview = () => ocspUrl.value || '—'

// =========================================
// 🔥 LIFECYCLE
// =========================================

onMounted(async () => {
  await load()
  await loadIntermediates()
  await loadTSAStatus()
})
</script>

<template>
  <div class="settings">
    <h1 class="settings-title">{{ t("infrastructure.title") }}</h1>

    <!-- Info Card -->
    <BaseCard class="infra-card infra-info-card">
      <div class="notifications-card-header">
        <h2>{{ t("infrastructure.howItWorks") }}</h2>
      </div>

      <div class="infra-info-grid">
        <div class="infra-info-item">
          <span class="infra-info-icon">📋</span>
          <div>
            <strong>CRL (Certificate Revocation List)</strong>
            <p>{{ t("infrastructure.crlDesc") }}</p>
          </div>
        </div>

        <div class="infra-info-item">
          <span class="infra-info-icon">🔍</span>
          <div>
            <strong>OCSP (Online Certificate Status Protocol)</strong>
            <p>{{ t("infrastructure.ocspDesc") }}</p>
          </div>
        </div>

        <div class="infra-info-item">
          <span class="infra-info-icon">🕐</span>
          <div>
            <strong>NTP (Network Time Protocol)</strong>
            <p>{{ t("infrastructure.ntpDesc") }}</p>
          </div>
        </div>

        <div class="infra-info-item">
          <span class="infra-info-icon">🌐</span>
          <div>
            <strong>DNS Server</strong>
            <p>{{ t("infrastructure.dnsDesc") }}</p>
          </div>
        </div>

        <div class="infra-info-item">
          <span class="infra-info-icon">⏱️</span>
          <div>
            <strong>TSA (Timestamp Authority)</strong>
            <p>{{ t("infrastructure.tsaDesc") }}</p>
          </div>
        </div>

        <div class="infra-info-item">
          <span class="infra-info-icon">🤖</span>
          <div>
            <strong>ACME (Automatic Certificate Management Environment)</strong>
            <p>{{ t("infrastructure.acmeDesc") }}</p>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Config Card -->
    <BaseCard class="infra-card infra-config-card">
      <div class="notifications-card-header">
        <h2>{{ t("infrastructure.configTitle") }}</h2>
        <p>{{ t("infrastructure.configDesc") }}</p>
      </div>

      <!-- Base URL -->
      <div class="infra-field">
        <label class="infra-label">
          {{ t("infrastructure.baseUrl") }}
          <span class="infra-hint">{{ t("infrastructure.baseUrlHint") }}</span>
        </label>
        <BaseInput v-model="baseUrl" placeholder="http://localhost:8000" />
      </div>

      <!-- Automatisch generierte URLs -->
      <div v-if="baseUrl" class="infra-field">
        <label class="infra-label">{{ t("infrastructure.generatedUrls") }}</label>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px">
          <div style="display: flex; align-items: center; gap: 12px; font-size: 13px">
            <span style="color: var(--color-text-light); min-width: 60px; font-weight: 500">CRL:</span>
            <code style="background: var(--color-surface-2); color: var(--color-text); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--color-border)">
              {{ crlBaseUrl }}/int-{id}.pem
            </code>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 13px">
            <span style="color: var(--color-text-light); min-width: 60px; font-weight: 500">OCSP:</span>
            <code style="background: var(--color-surface-2); color: var(--color-text); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--color-border)">
              {{ ocspUrl }}
            </code>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 13px">
            <span style="color: var(--color-text-light); min-width: 60px; font-weight: 500">TSA:</span>
            <code style="background: var(--color-surface-2); color: var(--color-text); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--color-border)">
              {{ tsaUrl }}
            </code>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 13px">
            <span style="color: var(--color-text-light); min-width: 60px; font-weight: 500">ACME:</span>
            <code style="background: var(--color-surface-2); color: var(--color-text); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--color-border)">
              {{ acmeUrl }}
            </code>
          </div>
        </div>
      </div>

      <!-- NTP -->
      <div class="infra-field">
        <label class="infra-label">
          NTP Server
          <span class="infra-hint">{{ t("infrastructure.ntpHint") }}</span>
        </label>
        <BaseInput v-model="ntpServer" placeholder="pool.ntp.org" />
      </div>

      <!-- DNS -->
      <div class="infra-field">
        <label class="infra-label">
          DNS Server
          <span class="infra-hint">{{ t("infrastructure.dnsHint") }}</span>
        </label>

        <div class="infra-dns-grid">
          <div v-for="(_, index) in dnsServers" :key="index" class="infra-dns-row">
            <span class="infra-dns-label">DNS {{ index + 1 }}</span>
            <BaseInput v-model="dnsServers[index]" :placeholder="index === 0
              ? '192.168.1.1 (Primary)'
              : index === 1
                ? '8.8.8.8 (Secondary)'
                : `DNS ${index + 1}`
              " />
          </div>
        </div>
      </div>

      <div v-if="error" class="infra-error">
        {{ error }}
      </div>

      <div class="notifications-actions">
        <BaseButton :class="[saved ? 'success' : 'primary']" :disabled="saving" @click="save">
          {{ saving ? t("common.saving") : saved ? t("common.saved") : t("common.save") }}
        </BaseButton>
      </div>
    </BaseCard>

    <!-- TSA Zertifikat Card -->
    <BaseCard class="infra-card" style="margin-top: 20px">
      <div class="notifications-card-header">
        <h2>⏱️ {{ t("infrastructure.tsaCertificate") }}</h2>
        <p>{{ t("infrastructure.tsaCertificateDesc") }}</p>
      </div>

      <!-- Status -->
      <div v-if="tsaStatus.exists" class="tsa-status tsa-status--ok">
        <div class="tsa-status-row">
          <span class="tsa-status-icon">✅</span>
          <div>
            <strong>{{ tsaStatus.common_name }}</strong>
            <span class="tsa-status-detail">
              {{ t("infrastructure.validUntil") }} {{ tsaValidTo }}
              <span v-if="tsaDaysLeft !== null" :class="['tsa-days', tsaDaysLeft < 365 ? 'tsa-days--warn' : '']">
                ({{ tsaDaysLeft }} {{ t("common.days") }})
              </span>
            </span>
          </div>
        </div>
        <code class="tsa-serial">Serial: {{ tsaStatus.serial }}</code>
      </div>

      <div v-else class="tsa-status tsa-status--missing">
        <span class="tsa-status-icon">⚠️</span>
        <span>{{ t("infrastructure.noTsaCertificate") }}</span>
      </div>

      <!-- Generate -->
      <div class="infra-field" style="margin-top: 16px">
        <label class="infra-label">
          Intermediate CA
          <span class="infra-hint">{{ t("infrastructure.intermediateHint") }}</span>
        </label>
        <select v-model="tsaIntermediate" class="security-select">
          <option v-for="ca in intermediates" :key="ca.id" :value="ca.id">
            {{ ca.cn }} ({{ ca.id }})
          </option>
        </select>
      </div>

      <div v-if="generateError" class="infra-error">
        {{ generateError }}
      </div>

      <div class="notifications-actions">
        <BaseButton :class="generateSuccess ? 'success' : 'primary'" :disabled="generating || !tsaIntermediate"
          @click="generateTSA">
          {{
            generating
              ? t("infrastructure.generating")
              : generateSuccess
                ? t("infrastructure.generated")
                : tsaStatus.exists
                  ? t("infrastructure.regenerate")
                  : t("infrastructure.generateTsa")
          }}
        </BaseButton>
      </div>
    </BaseCard>
  </div>
</template>