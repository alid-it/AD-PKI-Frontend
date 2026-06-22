<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { getSystemInfo } from '@/api/system'
import bus from '@/utils/eventBus'
import type { SystemInfoItem } from '@/types/system'
import type { CaHealthEvent } from '@/utils/eventBus'

import BaseCard from '@/components/common/BaseCard.vue'
import BaseButton from '@/components/common/BaseButton.vue'

import '@/assets/styles/production/system.css'
import { useI18n } from 'vue-i18n'

/* -----------------------------
   STATE
----------------------------- */

const systemData  = ref<SystemInfoItem[]>([])
const caData      = ref<SystemInfoItem[]>([])
const jobData     = ref<SystemInfoItem[]>([])
const healthData  = ref<SystemInfoItem[]>([])
const copiedMap   = ref<Record<string, boolean>>({})
const { t } = useI18n()


let interval: ReturnType<typeof setInterval> | null = null

/* -----------------------------
   LOAD DATA
----------------------------- */

const fetchData = async () => {
  const res = await getSystemInfo()

  // 🔵 SYSTEM — Versionen
  systemData.value = res.filter(item =>
    !item.component.includes('CRL') &&
    item.component !== 'OCSP' &&
    !item.component.startsWith('Job:') &&
    !item.component.startsWith('Health:')
  )

  // 🟢 CA STATUS — CRL + OCSP
  caData.value = res.filter(item =>
    item.component.includes('CRL') ||
    item.component === 'OCSP'
  )

  // 🟣 SCHEDULER JOBS
  jobData.value = res.filter(item =>
    item.component.startsWith('Job:')
  )

  // 🔴 HEALTH CHECKS
  healthData.value = res.filter(item =>
    item.component.startsWith('Health:')
  )
}

/* -----------------------------
   🔥 REALTIME — mitt Event Bus
----------------------------- */

const onCaHealth = (event: CaHealthEvent) => {
  const item = caData.value.find(i => i.component === event.component)
  if (item) {
    item.version = event.status
  } else {
    caData.value.push({
      component: event.component,
      version: event.status,
      url: event.url,
    })
  }
}

/* -----------------------------
   HELPERS
----------------------------- */

const copyToClipboard = async (text: string, key: string) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '-9999px'

      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()

      const successful = document.execCommand('copy')
      document.body.removeChild(textarea)

      if (!successful) {
        throw new Error('Fallback copy failed')
      }
    }

    copiedMap.value[key] = true
    setTimeout(() => {
      copiedMap.value[key] = false
    }, 2000)
  } catch (e) {
    console.error('Copy failed', e)
  }
}

const normalizeStatus = (status: string) => status?.trim().toUpperCase()

const formatVersion = (version: string): string => {
  if (!version) return '-'
  if (normalizeStatus(version) === 'OK' || normalizeStatus(version) === 'ERROR' || normalizeStatus(version) === 'WARN') {
    return version
  }
  return version.replace('go', '').replace('v', '').split(' ')[0]
}

const healthLabel = (component: string): string => {
  return component.replace('Health: ', '')
}

/* -----------------------------
   LIFECYCLE
----------------------------- */

onMounted(() => {
  fetchData()
  bus.on('ca-health', onCaHealth)
  interval = setInterval(fetchData, 30000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
  bus.off('ca-health', onCaHealth)
})
</script>

<template>
  <div class="system-info">
    <h1>{{ t('systemInfo.title') }}</h1>

    <div class="system-grid">

      <BaseCard>
        <h2>{{ t('systemInfo.system') }}</h2>

        <table class="system-table">
          <thead>
            <tr>
              <th>{{ t('systemInfo.component') }}</th>
              <th>{{ t('systemInfo.version') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in systemData" :key="item.component">
              <td>{{ item.component }}</td>
              <td>
                <span class="version-badge" :class="{
                  'status-ok': normalizeStatus(item.version) === 'OK',
                  'status-error': normalizeStatus(item.version) === 'ERROR'
                }">
                  {{ formatVersion(item.version) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </BaseCard>

      <BaseCard>
        <h2>{{ t('systemInfo.healthChecks') }}</h2>

        <table class="system-table">
          <thead>
            <tr>
              <th>{{ t('systemInfo.service') }}</th>
              <th>{{ t('common.status') }}</th>
              <th>{{ t('systemInfo.detail') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in healthData" :key="item.component">
              <td>{{ healthLabel(item.component) }}</td>
              <td>
                <span class="version-badge" :class="{
                  'status-ok': normalizeStatus(item.version) === 'OK',
                  'status-warn': normalizeStatus(item.version) === 'WARN',
                  'status-error': normalizeStatus(item.version) === 'ERROR'
                }">
                  {{ item.version }}
                </span>
              </td>
              <td style="font-size: 0.82rem; color: var(--color-text-light)">
                {{ item.detail ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </BaseCard>

      <BaseCard>
        <h2>{{ t('systemInfo.caStatus') }}</h2>

        <table class="system-table">
          <thead>
            <tr>
              <th>{{ t('systemInfo.service') }}</th>
              <th>{{ t('common.status') }}</th>
              <th>{{ t('systemInfo.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in caData" :key="item.component">
              <td>{{ item.component }}</td>
              <td>
                <span class="version-badge" :class="{
                  'status-ok': normalizeStatus(item.version) === 'OK',
                  'status-error': normalizeStatus(item.version) === 'ERROR'
                }">
                  {{ item.version }}
                </span>
              </td>
              <td>
                <div v-if="item.component.includes('CRL') && item.url" class="system-actions">
                  <a :href="item.url" download>
                    <BaseButton size="small">{{ t('common.download') }}</BaseButton>
                  </a>

                  <BaseButton
                    size="small"
                    :variant="copiedMap[item.component] ? 'success' : 'secondary'"
                    @click="copyToClipboard(item.url!, item.component)"
                  >
                    {{ copiedMap[item.component] ? t('common.copied') : t('common.copy') }}
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </BaseCard>

      <BaseCard>
        <h2>{{ t('systemInfo.schedulerJobs') }}</h2>

        <table class="system-table">
          <thead>
            <tr>
              <th>{{ t('systemInfo.job') }}</th>
              <th>{{ t('common.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in jobData" :key="item.component">
              <td>{{ item.component.replace('Job: ', '') }}</td>
              <td>
                <span class="version-badge" :class="{
                  'status-ok': normalizeStatus(item.version) === 'OK',
                  'status-error': normalizeStatus(item.version) === 'ERROR'
                }">
                  {{ item.version || 'UNKNOWN' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </BaseCard>

    </div>
  </div>
</template>