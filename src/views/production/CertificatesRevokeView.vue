<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  getCertificates,
  revokeCertificate
} from '@/api/revoke'
import type { Certificate, PaginationMeta } from '@/api/certificates'
import { useI18n } from 'vue-i18n'

import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseTable from '@/components/common/BaseTable.vue'
import '@/assets/styles/production/revoke.css'

// 🔥 State
const { t } = useI18n()
const certificates = ref<Certificate[]>([])
const meta = ref<PaginationMeta | null>(null)
const loading = ref<boolean>(true)
const sortKey = ref<keyof Certificate | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')
const selectedReason = ref<string>('unspecified')
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

// 🔥 Reasons
const reasons = computed(() => [
  { value: 'unspecified', label: t('revoke.reasons.unspecified') },
  { value: 'key_compromise', label: t('revoke.reasons.keyCompromise') },
  { value: 'cessation_of_operation', label: t('revoke.reasons.cessationOfOperation') },
  { value: 'superseded', label: t('revoke.reasons.superseded') },
])

// 🔥 Columns
const allColumns = computed((): { key: keyof Certificate; label: string }[] => [
  { key: 'id', label: 'ID' },
  { key: 'cn', label: 'CN' },
  { key: 'san', label: 'SAN' },
  { key: 'serial_number', label: t('certificates.serial') },
  { key: 'is_acme', label: 'ACME' },
  { key: 'revoked', label: t('certificates.revoked') },
  { key: 'revoked_at', label: t('certificates.revokedAt') },
  { key: 'valid_to', label: t('certificates.validTo') },
  { key: 'expires_in_days', label: t('common.days') },
  { key: 'status', label: t('common.status') },
])

const selectedColumns = ref<string[]>([
  'cn',
  'type',
  'valid_to',
  'expires_in_days',
  'status'
])

// 🔥 Toggle
const toggleColumn = (key: string) => {
  if (selectedColumns.value.includes(key)) {
    selectedColumns.value = selectedColumns.value.filter(c => c !== key)
  } else {
    selectedColumns.value.push(key)
  }
}

// 🔥 Sort
const sortBy = (key: keyof Certificate) => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDirection.value = 'asc'
  }
}

// 🔥 Sorted
const sortedCertificates = computed(() => {
  if (!sortKey.value) return certificates.value

  return [...certificates.value].sort((a, b) => {
    const valA = a[sortKey.value!]
    const valB = b[sortKey.value!]

    if (valA === null || valA === undefined) return 1
    if (valB === null || valB === undefined) return -1

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDirection.value === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA)
    }

    return sortDirection.value === 'asc'
      ? Number(valA) - Number(valB)
      : Number(valB) - Number(valA)
  })
})

// 🔥 Fetch
const fetchCertificates = async () => {
  try {
    const data = await getCertificates()
    certificates.value = data.data
    meta.value = data.meta
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 🔥 Revoke
const revokeCert = async (cert: Certificate) => {
  errorMessage.value = null
  successMessage.value = null

  if (cert.revoked) return
  if (['root', 'intermediate'].includes(cert.type || '')) return

  if (!confirm(t('revoke.confirm', { cn: cert.cn }))) return

  try {
    await revokeCertificate(cert.id, selectedReason.value)

    successMessage.value = t('revoke.success')

    cert.revoked = true
    cert.status = 'revoked'
    cert.revoked_at = new Date().toISOString()

  } catch (e: any) {
    console.error(e)
    errorMessage.value = e?.response?.data?.error || t('revoke.error')
  }
}

onMounted(() => {
  fetchCertificates()
})
</script>

<template>
  <div>
    <h1 class="page-title">{{ t('revoke.title') }}</h1>

    <div class="revoke-bar">
      <label class="revoke-label">{{ t('revoke.reason') }}</label>

      <select v-model="selectedReason" class="revoke-select">
        <option v-for="r in reasons" :key="r.value" :value="r.value">
          {{ r.label }}
        </option>
      </select>
    </div>

    <div v-if="errorMessage" class="alert error">
      {{ errorMessage }}
    </div>

    <div v-if="successMessage" class="alert success">
      {{ successMessage }}
    </div>

    <div class="column-selector">
      <div
        v-for="col in allColumns"
        :key="col.key"
        class="column-toggle"
        :class="{ active: selectedColumns.includes(col.key) }"
        @click="toggleColumn(col.key)"
      >
        {{ col.label }}
      </div>
    </div>

    <BaseCard>
      <BaseTable>
        <thead>
          <tr>
            <th
              v-for="col in allColumns.filter(c => selectedColumns.includes(c.key))"
              :key="col.key"
              @click="sortBy(col.key)"
              style="cursor:pointer"
            >
              {{ col.label }}

              <span v-if="sortKey === col.key">
                {{ sortDirection === 'asc' ? '▲' : '▼' }}
              </span>
            </th>

            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="cert in sortedCertificates" :key="cert.id">
            <td
              v-for="col in allColumns.filter(c => selectedColumns.includes(c.key))"
              :key="col.key"
            >
              <span v-if="col.key === 'expires_in_days'">
                {{ Math.round(cert[col.key]) }}
              </span>

              <span v-else-if="col.key === 'is_acme'">
                {{ cert[col.key] ? t('common.yes') : t('common.no') }}
              </span>

              <span v-else-if="col.key === 'revoked'">
                {{ cert[col.key] ? t('common.yes') : t('common.no') }}
              </span>

              <span v-else>
                {{ cert[col.key] }}
              </span>
            </td>

            <td>
              <BaseButton
                variant="danger"
                :disabled="cert.revoked || ['root', 'intermediate'].includes(cert.type || '')"
                @click="revokeCert(cert)"
              >
                {{ t('revoke.button') }}
              </BaseButton>
            </td>
          </tr>
        </tbody>
      </BaseTable>
    </BaseCard>
  </div>
</template>