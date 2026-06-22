<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getCA, type CACertificate } from '@/api/ca'
import { getSetting } from '@/api/settings'
import apiClient from '@/api/client'

import BaseCard from '@/components/common/BaseCard.vue'
import BaseButton from '@/components/common/BaseButton.vue'

import '@/assets/styles/production/ca.css'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const root = ref<CACertificate | null>(null)
const intermediates = ref<CACertificate[]>([])
const baseUrl = ref('')

const copiedKey = ref<string | null>(null)

const rtrim = (url: string) => url.replace(/\/+$/, '')

const normalizedBaseUrl = computed(() => {
  return baseUrl.value ? rtrim(baseUrl.value) : window.location.origin
})

const rootCrtUrl = computed(() => {
  return `${normalizedBaseUrl.value}/api/ca/root/download`
})

const intermediateCrtUrl = (id: number | string) => {
  return `${normalizedBaseUrl.value}/api/ca/intermediate/${id}/download`
}

const loadData = async () => {
  const [data, savedBaseUrl] = await Promise.all([
    getCA(),
    getSetting('base_url'),
  ])

  root.value = data.root
  intermediates.value = data.intermediates
  baseUrl.value = savedBaseUrl || window.location.origin
}

const copyToClipboard = async (value: string, key: string) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '-9999px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }

    copiedKey.value = key

    setTimeout(() => {
      if (copiedKey.value === key) {
        copiedKey.value = null
      }
    }, 1800)
  } catch (e) {
    console.error('Copy failed:', e)
  }
}

const downloadRootCRT = () => {
  const link = document.createElement('a')
  link.href = rootCrtUrl.value
  link.setAttribute('download', 'root-ca.crt')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const downloadIntermediateCRT = (id: number | string) => {
  const link = document.createElement('a')
  link.href = intermediateCrtUrl(id)
  link.setAttribute('download', `intermediate-${id}.crt`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const downloadKey = async (id: number) => {
  const res = await apiClient.get(`/certificates/${id}/download?type=key`, {
    responseType: 'blob',
  })

  const url = window.URL.createObjectURL(new Blob([res.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `private_${id}.key`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  window.URL.revokeObjectURL(url)
}

onMounted(loadData)
</script>

<template>
  <div class="ca-page">
    <h1 class="page-title">{{ t('ca.title') }}</h1>

    <div class="ca-cards">
      <BaseCard>
        <h2>{{ t('ca.rootCa') }}</h2>

        <div v-if="root" class="ca-info ca-item">
          <p><strong>CN:</strong> {{ root.cn }}</p>
          <p><strong>{{ t('ca.expiry') }}:</strong> {{ root.valid_to }}</p>
          <p><strong>{{ t('ca.serial') }}:</strong> {{ root.serial_number }}</p>
          <p><strong>{{ t('common.status') }}:</strong> {{ root.status }}</p>

          <div class="ca-actions">
            <BaseButton @click="downloadRootCRT">
              CRT
            </BaseButton>

            <BaseButton
              variant="secondary"
              :title="rootCrtUrl"
              @click="copyToClipboard(rootCrtUrl, 'root-crt')"
            >
              {{ copiedKey === 'root-crt' ? '✅' : '📋' }}
            </BaseButton>
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <h2>{{ t('ca.intermediateCa') }}</h2>

        <div
          v-for="ca in intermediates"
          :key="ca.id"
          class="ca-info ca-item"
        >
          <p><strong>ID:</strong> {{ ca.id }}</p>
          <p><strong>CN:</strong> {{ ca.cn }}</p>
          <p><strong>{{ t('ca.expiry') }}:</strong> {{ ca.valid_to }}</p>
          <p><strong>{{ t('ca.serial') }}:</strong> {{ ca.serial_number }}</p>
          <p><strong>{{ t('common.status') }}:</strong> {{ ca.status }}</p>

          <div class="ca-actions">
            <BaseButton @click="downloadIntermediateCRT(ca.id)">
              CRT
            </BaseButton>

            <BaseButton
              variant="secondary"
              @click="downloadKey(ca.id)"
            >
              KEY
            </BaseButton>

            <BaseButton
              variant="secondary"
              :title="intermediateCrtUrl(ca.id)"
              @click="copyToClipboard(intermediateCrtUrl(ca.id), `intermediate-crt-${ca.id}`)"
            >
              {{ copiedKey === `intermediate-crt-${ca.id}` ? '✅' : '📋' }}
            </BaseButton>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>