<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import bus from "@/utils/eventBus";
import {
  getCertificates,
  downloadCert,
  downloadKey,
  downloadP12,
  assignCertificateTeam,
} from "@/api/certificates";
import { getTeams } from "@/api/teams";
import { permissions } from "@/stores/auth";

import type { Certificate } from "@/types/certificate";
import type { PaginationMeta } from "@/types/api";
import type { Team } from "@/types/team";

import BaseButton from "@/components/common/BaseButton.vue";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseTable from "@/components/common/BaseTable.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import "@/assets/styles/production/certificates.css";

// =========================================
// 🔥 STATE
// =========================================
const { t } = useI18n();
const certificates = ref<Certificate[]>([]);
const originalCertificates = ref<Certificate[]>([]);
const meta = ref<PaginationMeta | null>(null);
const loading = ref<boolean>(true);

const sortKey = ref<string | null>(null);
const sortDirection = ref<"asc" | "desc">("desc");

const search = ref<string>("");
const statusFilter = ref<string>("");

let timeout: ReturnType<typeof setTimeout> | null = null;
let isResetting = false;

// =========================================
// 🔥 TEAMS
// =========================================

const teams = ref<Team[]>([]);
const showTeamModal = ref(false);
const selectedCert = ref<Certificate | null>(null);
const selectedTeamId = ref<number | null>(null);
const savingTeam = ref(false);

const canManageSettings = computed(() => permissions.value.includes("settings.manage"));

// =========================================
// 🔥 COLUMNS
// =========================================

const allColumns = computed((): { key: string; label: string }[] => [
  { key: 'team_id', label: t('certificates.team') },
  { key: 'status_badge', label: t('common.status') },
  { key: 'id', label: 'ID' },
  { key: 'type', label: t('certificates.type') },
  { key: 'cn', label: 'CN' },
  { key: 'san', label: 'SAN' },
  { key: 'serial_number', label: t('certificates.serial') },
  { key: 'is_acme', label: 'ACME' },
  { key: 'revoked', label: t('certificates.revoked') },
  { key: 'revoked_at', label: t('certificates.revokedAt') },
  { key: 'valid_to', label: t('certificates.validTo') },
  { key: 'expires_in_days', label: t('certificates.expiresInDays') },
  { key: 'key_type', label: t('certificates.keyType') },
  { key: 'key_size', label: t('certificates.keySize') },
  { key: 'curve', label: t('certificates.curve') },
])

const selectedColumns = ref<string[]>([
  "status_badge",
  "team_id",
  "id",
  "type",
  "serial_number",
  "cn",
  "key_type",
  "expires_in_days",
]);

const toggleColumn = (key: string) => {
  if (selectedColumns.value.includes(key)) {
    selectedColumns.value = selectedColumns.value.filter((c) => c !== key);
  } else {
    selectedColumns.value.push(key);
  }
};

// =========================================
// 🔥 FETCH
// =========================================

const fetchCertificates = async (page = 1) => {
  try {
    loading.value = true;

    const data = await getCertificates(page, search.value, statusFilter.value);

    certificates.value = data.data;
    originalCertificates.value = [...data.data];
    meta.value = data.meta;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

// Teams nur laden wenn Berechtigung vorhanden
const loadTeams = async () => {
  if (!canManageSettings.value) return; // 🔥
  try {
    teams.value = await getTeams();
  } catch (e) {
    console.error(e);
  }
};

// =========================================
// 🔥 SORT
// =========================================

const sortBy = (key: string) => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDirection.value = "asc";
  }
};

const resetSorting = async () => {
  isResetting = true;

  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }

  sortKey.value = null;
  sortDirection.value = "desc";
  search.value = "";
  statusFilter.value = "";

  await fetchCertificates(1);

  isResetting = false;
};

const sortedCertificates = computed(() => {
  if (!sortKey.value) return certificates.value;

  return [...certificates.value].sort((a, b) => {
    if (sortKey.value === "status_badge") {
      const getStatusWeight = (cert: Certificate) => {
        if (cert.revoked) return 4;
        if (cert.status === "pending") return 1;
        if (cert.status === "rejected") return 2;
        return 3;
      };

      const valA = getStatusWeight(a);
      const valB = getStatusWeight(b);

      return sortDirection.value === "asc" ? valA - valB : valB - valA;
    }

    const valA = a[sortKey.value as keyof Certificate];
    const valB = b[sortKey.value as keyof Certificate];

    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    if (typeof valA === "string" && typeof valB === "string") {
      return sortDirection.value === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    return sortDirection.value === "asc"
      ? Number(valA) - Number(valB)
      : Number(valB) - Number(valA);
  });
});

// =========================================
// 🔥 WATCHER
// =========================================

watch(search, () => {
  if (isResetting) return;

  if (timeout) {
    clearTimeout(timeout);
  }

  timeout = setTimeout(() => {
    fetchCertificates(1);
  }, 300);
});

watch(statusFilter, () => {
  if (isResetting) return;

  fetchCertificates(1);
});

// =========================================
// 🔥 TEAM ZUWEISEN
// =========================================

const openTeamModal = (cert: Certificate) => {
  selectedCert.value = cert;
  selectedTeamId.value = cert.team_id ?? null;
  showTeamModal.value = true;
};

const closeTeamModal = () => {
  showTeamModal.value = false;
  selectedCert.value = null;
  selectedTeamId.value = null;
};

const saveTeam = async () => {
  if (!selectedCert.value) return;

  savingTeam.value = true;

  try {
    await assignCertificateTeam(selectedCert.value.id, selectedTeamId.value);

    const cert = certificates.value.find((c) => c.id === selectedCert.value!.id);

    if (cert) {
      cert.team_id = selectedTeamId.value;
    }

    closeTeamModal();
  } catch (e) {
    console.error("Fehler beim Zuweisen:", e);
  } finally {
    savingTeam.value = false;
  }
};

const teamName = (teamId: number | null) => {
  if (!teamId) return "—";

  return teams.value.find((t) => t.id === teamId)?.name ?? "—";
};

// =========================================
// 🔥 PAGINATION
// =========================================

const visiblePages = computed(() => {
  if (!meta.value) return [];

  const current = meta.value.current_page;
  const last = meta.value.last_page;
  const pages: (number | string)[] = [];

  for (let i = 1; i <= last; i++) {
    if (i === 1 || i === last || (i >= current - 1 && i <= current + 1)) {
      pages.push(i);
    } else if (i === current - 2 || i === current + 2) {
      if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
  }

  return pages;
});

// 🔥 Handler
const onCertIssued = () => {
  fetchCertificates(1); // neu laden — neues Zertifikat erscheint oben
};

const onCertRevoked = (event: any) => {
  // Lokal aktualisieren ohne Reload
  const cert = certificates.value.find((c) => c.serial_number === event?.serial_number);
  if (cert) {
    cert.revoked = true;
    cert.status = "revoked";
  } else {
    fetchCertificates(1); // Fallback
  }
};

const onCertRequested = () => {
  fetchCertificates(1); // neue Anfrage erscheint
};

// =========================================
// 🔥 LIFECYCLE
// =========================================

// 🔥 Nach loadTeams() in onMounted:
onMounted(() => {
  fetchCertificates();
  loadTeams();

  bus.on("certificate.issued", onCertIssued);
  bus.on("certificate.revoked", onCertRevoked);
  bus.on("certificate.requested", onCertRequested);
});

onUnmounted(() => {
  bus.off("certificate.issued", onCertIssued);
  bus.off("certificate.revoked", onCertRevoked);
  bus.off("certificate.requested", onCertRequested);
});
</script>

<template>
  <div>
    <h1 class="page-title">{{ t("certificates.title") }}</h1>

    <div class="column-bar">
      <!-- LEFT -->
      <div class="column-left">
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
        <div class="column-actions">
          <BaseButton variant="secondary" class="reset-sort-btn" @click="resetSorting">
            {{ t("certificates.resetSorting") }}
          </BaseButton>
        </div>
      </div>

      <!-- RIGHT: Search -->
      <div class="column-search">
        <BaseInput v-model="search" :placeholder="t('common.searchPlaceholder')" />
        <div class="status-filter">
          <select v-model="statusFilter">
            <option value="">{{ t("common.all") }}</option>
            <option value="pending">{{ t("status.pending") }}</option>
            <option value="issued">{{ t("status.issued") }}</option>
            <option value="rejected">{{ t("status.rejected") }}</option>
            <option value="revoked">{{ t("status.revoked") }}</option>
          </select>
        </div>
      </div>
    </div>

    <BaseCard>
      <BaseTable>
        <thead>
          <tr>
            <th
              v-for="col in allColumns.filter((c) => selectedColumns.includes(c.key))"
              :key="col.key"
              @click="sortBy(col.key)"
              style="cursor: pointer"
            >
              {{ col.label }}
              <span v-if="sortKey === col.key">
                {{ sortDirection === "asc" ? "▲" : "▼" }}
              </span>
            </th>
            <th>{{ t("common.actions") }}</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="cert in sortedCertificates" :key="cert.id">
            <td
              v-for="col in allColumns.filter((c) => selectedColumns.includes(c.key))"
              :key="col.key"
            >
              <!-- STATUS BADGE -->
              <span v-if="col.key === 'status_badge'">
                <span v-if="cert.revoked" class="status-badge status-badge--revoked">
                  ⚫ {{ t("status.revokedUpper") }}
                </span>

                <span
                  v-else-if="cert.status === 'pending'"
                  class="status-badge status-badge--pending"
                >
                  🟡 {{ t("status.pendingUpper") }}
                </span>

                <span
                  v-else-if="cert.status === 'rejected'"
                  class="status-badge status-badge--rejected"
                >
                  🔴 {{ t("status.rejectedUpper") }}
                </span>

                <span v-else class="status-badge status-badge--issued">
                  🟢 {{ t("status.issuedUpper") }}
                </span>
              </span>

              <!-- TEAM -->
              <span v-else-if="col.key === 'team_id'">
                <span v-if="cert.team_name" class="team-badge">
                  👥 {{ cert.team_name }}
                </span>
                <span v-else style="color: var(--color-text-light); font-size: 0.8rem">—</span>
              </span>

              <!-- Ablauf Tage -->
              <span v-else-if="col.key === 'expires_in_days'">
                {{ Math.round(cert[col.key as keyof typeof cert] as number) }}
              </span>

              <!-- ACME -->
              <span v-else-if="col.key === 'is_acme'">
                {{ (cert[col.key as keyof typeof cert] as boolean) ? t('common.yes') : t('common.no') }}
              </span>

              <!-- Revoked -->
              <span v-else-if="col.key === 'revoked'">
                {{ cert[col.key as keyof typeof cert] ? t('common.yes') : t('common.no') }}
              </span>

              <!-- KEY INFO -->
              <span v-else-if="col.key === 'key_info'">
                <span v-if="cert.key_type === 'rsa'"
                  >🔐 RSA {{ cert.key_size || "-" }}</span
                >
                <span v-else-if="cert.key_type === 'ecdsa'"
                  >⚡ ECDSA {{ cert.curve || "-" }}</span
                >
                <span v-else>-</span>
              </span>

              <!-- DEFAULT -->
              <span v-else>{{ cert[col.key as keyof typeof cert] }}</span>
            </td>

            <!-- 🔥 AKTIONEN -->
            <td>
              <div class="cert-actions">
                <button
                  class="cert-btn cert-btn--crt"
                  @click="downloadCert(cert)"
                  :title="t('certificates.downloadCrt')"
                >
                  ⬇ CRT
                </button>

                <button
                  v-if="cert.has_key"
                  class="cert-btn cert-btn--p12"
                  @click="downloadP12(cert)"
                  :title="t('certificates.downloadP12')"
                >
                  📦 P12
                </button>

                <button
                  v-if="cert.has_key"
                  class="cert-btn cert-btn--key"
                  @click="downloadKey(cert)"
                  :title="t('certificates.downloadKey')"
                >
                  🔑 KEY
                </button>

                <button
                  v-if="canManageSettings"
                  class="cert-btn cert-btn--team"
                  :class="{ 'has-team': cert.team_id }"
                  @click="openTeamModal(cert)"
                  :title="
                    cert.team_id
                      ? `Team: ${teamName(cert.team_id)}`
                      : t('certificates.assignTeam')
                  "
                >
                  👥
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </BaseTable>

      <!-- PAGINATION -->
      <div class="pagination-modern">
        <button
          class="page-btn"
          @click="fetchCertificates(Math.max(1, (meta?.current_page || 1) - 1))"
        >
          ‹
        </button>
        <button
          v-for="(p, i) in visiblePages"
          :key="i"
          class="page-number"
          :class="{ active: p === (meta?.current_page || 1) }"
          :disabled="p === '...'"
          @click="typeof p === 'number' && fetchCertificates(p)"
        >
          {{ p }}
        </button>
        <button
          class="page-btn"
          :disabled="(meta?.current_page || 1) >= (meta?.last_page || 1)"
          @click="fetchCertificates((meta?.current_page || 1) + 1)"
        >
          ›
        </button>
      </div>
    </BaseCard>

    <!-- 🔥 TEAM MODAL -->
    <div v-if="showTeamModal" class="modal-overlay">
      <div class="modal-box">
        <h3>{{ t("certificates.assignTeam") }}</h3>
        <p style="font-size: 0.875rem; color: var(--color-text-light); margin-bottom: 16px">
          {{ t("certificates.certificate") }}: <strong>{{ selectedCert?.cn }}</strong>
        </p>

        <select
          v-model="selectedTeamId"
          class="modal-select"
          style="width: 100%; margin-bottom: 16px"
        >
          <option :value="null">{{ t("certificates.noTeam") }}</option>
          <option v-for="team in teams" :key="team.id" :value="team.id">
            {{ team.name }}
          </option>
        </select>

        <div class="modal-actions">
          <BaseButton class="secondary" @click="closeTeamModal">
            {{ t("common.cancel") }}
          </BaseButton>

          <BaseButton class="primary" :disabled="savingTeam" @click="saveTeam">
            {{ savingTeam ? t("common.saving") : t("common.save") }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
