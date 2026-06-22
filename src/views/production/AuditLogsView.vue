<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import BaseCard from "@/components/common/BaseCard.vue";
import { getAuditLogs, getAuditLogActions } from "@/api/auditlogs";
import type { AuditLog } from "@/types/auditlog";
import bus from "@/utils/eventBus";
import "@/assets/styles/production/auditlogs.css";
import { useI18n } from "vue-i18n";

// =========================================
// 🔥 STATE
// =========================================

const logs = ref<AuditLog[]>([]);
const actions = ref<string[]>([]);
const loading = ref(false);
const liveEnabled = ref(true);
const newLogCount = ref(0);
const { t, locale } = useI18n();

const currentPage = ref(1);
const lastPage = ref(1);
const total = ref(0);

// 🔥 Filter
const filterAction = ref("");
const filterDateFrom = ref("");
const filterDateTo = ref("");

// =========================================
// 🔥 LOAD
// =========================================

const load = async () => {
  loading.value = true;
  newLogCount.value = 0;

  try {
    const res = await getAuditLogs({
      action: filterAction.value || undefined,
      date_from: filterDateFrom.value || undefined,
      date_to: filterDateTo.value || undefined,
      page: currentPage.value,
      per_page: 50,
    });

    logs.value = res.data;
    currentPage.value = res.meta.current_page;
    lastPage.value = res.meta.last_page;
    total.value = res.meta.total;
  } catch (e) {
    console.error("Failed to load audit logs", e);
  } finally {
    loading.value = false;
  }
};

const loadActions = async () => {
  try {
    actions.value = await getAuditLogActions();
  } catch (e) {
    console.error("Failed to load actions", e);
  }
};

// =========================================
// 🔥 REALTIME — mitt Event Bus (kein Echo mehr)
// =========================================

const onAuditLog = (event: AuditLog) => {
  if (!liveEnabled.value) {
    newLogCount.value++;
    return;
  }

  if (
    currentPage.value === 1 &&
    !filterAction.value &&
    !filterDateFrom.value &&
    !filterDateTo.value
  ) {
    logs.value.unshift(event);
    total.value++;

    if (logs.value.length > 50) {
      logs.value.pop();
    }
  } else {
    newLogCount.value++;
  }
};

const toggleLive = () => {
  liveEnabled.value = !liveEnabled.value;

  if (liveEnabled.value && newLogCount.value > 0) {
    currentPage.value = 1;
    load();
  }
};

// =========================================
// 🔥 FILTER RESET
// =========================================

const resetFilters = () => {
  filterAction.value = "";
  filterDateFrom.value = "";
  filterDateTo.value = "";
  currentPage.value = 1;
  load();
};

// =========================================
// 🔥 ACTION BADGE
// =========================================

const actionBadgeClass = (action: string): string => {
  if (action.startsWith("auth")) return "action-badge auth";
  if (action.startsWith("certificate")) return "action-badge cert";
  if (action.startsWith("ca")) return "action-badge ca";
  if (action.startsWith("user")) return "action-badge user";
  if (action.startsWith("settings") || action.startsWith("notification"))
    return "action-badge settings";
  if (action.startsWith("template")) return "action-badge template";
  return "action-badge default";
};

// =========================================
// 🔥 ACTION ICON
// =========================================

const actionIcon = (action: string): string => {
  if (action.startsWith("auth.login")) return "🔑";
  if (action.startsWith("auth.logout")) return "🚪";
  if (action.startsWith("certificate.issued")) return "✅";
  if (action.startsWith("certificate.revoked")) return "🚫";
  if (action.startsWith("certificate.download")) return "⬇️";
  if (action.startsWith("certificate")) return "📄";
  if (action.startsWith("ca")) return "🏛️";
  if (action.startsWith("user")) return "👤";
  if (action.startsWith("settings")) return "⚙️";
  if (action.startsWith("notification")) return "🔔";
  if (action.startsWith("template")) return "📋";
  return "📝";
};

// =========================================
// 🔥 META PREVIEW
// =========================================

const metaPreview = (meta: Record<string, unknown> | null): string => {
  if (!meta) return "—";
  const { log_id, ...rest } = meta;
  return Object.entries(rest)
    .map(([k, v]) => `${k}: ${v}`)
    .join("  ·  ")
    .slice(0, 100);
};

// =========================================
// 🔥 DATE FORMAT
// =========================================

const formatDate = (date: string): string => {
  return new Date(date).toLocaleString(locale.value === "en" ? "en-US" : "de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// =========================================
// 🔥 PAGINATION
// =========================================

const goToPage = (page: number) => {
  if (page < 1 || page > lastPage.value) return;
  currentPage.value = page;
  load();
};

const visiblePages = (): number[] => {
  const pages: number[] = [];
  const start = Math.max(1, currentPage.value - 2);
  const end = Math.min(lastPage.value, currentPage.value + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
};

// =========================================
// 🔥 WATCH FILTER
// =========================================

watch([filterAction, filterDateFrom, filterDateTo], () => {
  currentPage.value = 1;
  load();
});

// =========================================
// 🔥 LIFECYCLE
// =========================================

onMounted(() => {
  load();
  loadActions();
  // 🔥 mitt statt Echo
  bus.on("audit-log", onAuditLog);
});

onUnmounted(() => {
  // 🔥 Listener entfernen
  bus.off("audit-log", onAuditLog);
});
</script>

<template>
  <div class="auditlogs">
    <!-- 🔥 HEADER -->
    <div class="auditlogs-header">
      <h1 class="auditlogs-title">{{ t("auditLogs.title") }}</h1>

      <div style="display: flex; align-items: center; gap: 10px">
        <!-- 🔥 Neue Logs Badge -->
        <span
          v-if="newLogCount > 0"
          class="auditlogs-new-badge"
          @click="
            () => {
              currentPage = 1;
              load();
            }
          "
        >
          ↑ {{ newLogCount }} {{ t("auditLogs.newEntries") }}
        </span>

        <!-- 🔥 Live Toggle -->
        <button
          class="auditlogs-live-btn"
          :class="{ active: liveEnabled }"
          @click="toggleLive"
        >
          <span class="live-dot" :class="{ active: liveEnabled }" />
          {{ liveEnabled ? t("auditLogs.live") : t("auditLogs.paused") }}
        </button>

        <span v-if="total > 0" class="auditlogs-total">
          {{ total }} {{ t("auditLogs.entries") }}
        </span>
      </div>
    </div>

    <BaseCard>
      <!-- 🔥 FILTER BAR -->
      <div class="auditlogs-filterbar">
        <select v-model="filterAction">
          <option value="">{{ t("auditLogs.allActions") }}</option>
          <option v-for="action in actions" :key="action" :value="action">
            {{ action }}
          </option>
        </select>

        <input v-model="filterDateFrom" type="date" :title="t('auditLogs.from')" />
        <input v-model="filterDateTo" type="date" :title="t('auditLogs.to')" />

        <button class="auditlogs-filter-reset" @click="resetFilters">
          ↺ {{ t("common.reset") }}
        </button>
      </div>

      <!-- 🔥 LOADING -->
      <div v-if="loading" class="auditlogs-loading">
        <div class="auditlogs-spinner" />
        {{ t("auditLogs.loading") }}
      </div>

      <!-- 🔥 TABLE -->
      <div v-else-if="logs.length > 0" class="auditlogs-table-wrap">
        <table class="auditlogs-table">
          <thead>
            <tr>
              <th>{{ t("auditLogs.logId") }}</th>
              <th>{{ t("auditLogs.time") }}</th>
              <th>{{ t("auditLogs.user") }}</th>
              <th>{{ t("auditLogs.action") }}</th>
              <th>{{ t("auditLogs.object") }}</th>
              <th>{{ t("auditLogs.ipAddress") }}</th>
              <th>{{ t("auditLogs.details") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in logs"
              :key="log.id"
              :class="{ 'log-row-new': log.id === logs[0]?.id && liveEnabled }"
            >
              <td>
                <span class="log-id-cell">
                  {{ log.log_id?.slice(0, 8) ?? "—" }}
                </span>
              </td>

              <td
                style="
                  white-space: nowrap;
                  color: var(--color-text-light);
                  font-size: 0.82rem;
                "
              >
                {{ formatDate(log.created_at) }}
              </td>

              <td style="font-weight: 500">
                {{ log.username }}
              </td>

              <td>
                <span :class="actionBadgeClass(log.action)">
                  {{ actionIcon(log.action) }}&nbsp;{{ log.action }}
                </span>
              </td>

              <td style="font-size: 0.82rem; color: var(--color-text-light)">
                <span v-if="log.subject_type">
                  {{ log.subject_type }} #{{ log.subject_id }}
                </span>
                <span v-else>—</span>
              </td>

              <td
                style="
                  font-family: monospace;
                  font-size: 0.8rem;
                  color: var(--color-text-light);
                "
              >
                {{ log.ip_address ?? "—" }}
              </td>

              <td class="meta-cell" :title="JSON.stringify(log.meta, null, 2)">
                {{ metaPreview(log.meta) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 🔥 EMPTY -->
      <div v-else class="auditlogs-empty">{{ t('auditLogs.empty') }}</div>

      <!-- 🔥 PAGINATION -->
      <div v-if="lastPage > 1" class="auditlogs-pagination">
        <button :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">←</button>

        <button v-if="currentPage > 3" @click="goToPage(1)">1</button>

        <span v-if="currentPage > 4" class="auditlogs-pagination-info">…</span>

        <button
          v-for="page in visiblePages()"
          :key="page"
          :class="{ active: page === currentPage }"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>

        <span v-if="currentPage < lastPage - 3" class="auditlogs-pagination-info">…</span>

        <button v-if="currentPage < lastPage - 2" @click="goToPage(lastPage)">
          {{ lastPage }}
        </button>

        <button :disabled="currentPage >= lastPage" @click="goToPage(currentPage + 1)">
          →
        </button>
      </div>
    </BaseCard>
  </div>
</template>
