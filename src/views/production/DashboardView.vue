<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { getDashboard } from "@/api/dashboard";
import { useRouter } from "vue-router";
import { getSystemInfo } from "@/api/system";
import bus from "@/utils/eventBus";
import type { SystemInfoItem } from "@/types/system";
import type { AuditLog } from "@/types/auditlog";
import { useI18n } from "vue-i18n";

import BaseCard from "@/components/common/BaseCard.vue";
import BaseTable from "@/components/common/BaseTable.vue";
import BaseButton from "@/components/common/BaseButton.vue";

import "@/assets/styles/production/dashboard.css";

// 🔥 Types
interface ExpiringCert {
  cn: string;
  expires_in_days: number;
  status: string;
}

interface DashboardData {
  total_certificates: number;
  expiring_soon: number;
  revoked: number;
  acme_active: boolean;
  ca: {
    root: string;
    intermediates: string[];
  };
  system: {
    acme: boolean;
    crl: boolean;
    ocsp: boolean;
  };
  expiring: ExpiringCert[];
}

// State
const { t } = useI18n();
const dashboard = ref<DashboardData | null>(null);
const router = useRouter();
const loading = ref<boolean>(true);
const error = ref<string | null>(null);
let interval: ReturnType<typeof setInterval> | null = null;
const systemStatus = ref<SystemInfoItem[]>([]);
const crlUrl = ref<string | null>(null);

const downloadCrl = () => {
  if (!crlUrl.value) return;

  const link = document.createElement("a");
  link.href = crlUrl.value;
  link.download = "";
  link.target = "_blank";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// API Call
const fetchDashboard = async () => {
  try {
    const [dash, sys] = await Promise.all([getDashboard(), getSystemInfo()]);

    dashboard.value = dash;

    systemStatus.value = sys.filter(
      (item) =>
        item.component.includes("CRL") ||
        item.component === "OCSP" ||
        item.component === "ACME"
    );

    const crl = sys.find((item) => item.component.includes("CRL"));
    crlUrl.value = crl?.url || null;
  } catch (err) {
    console.error(err);
    error.value = "Fehler beim Laden";
  } finally {
    loading.value = false;
  }
};

// =========================================
// 🔥 REALTIME — mitt Event Bus (kein Echo mehr)
// =========================================

const onCertIssued = (_event: AuditLog) => {
  if (!dashboard.value) return;
  // 🔥 Total erhöhen
  dashboard.value.total_certificates++;
};

const onCertRevoked = (_event: AuditLog) => {
  if (!dashboard.value) return;
  // 🔥 Revoked erhöhen
  dashboard.value.revoked++;
};

const goToCreateCert = () => {
  router.push("/certificates/create");
};

const goToRevoke = () => {
  router.push("/certificates/revoke");
};

// Lifecycle
onMounted(() => {
  fetchDashboard();

  // 🔥 mitt statt Echo
  bus.on("certificate.issued", onCertIssued);
  bus.on("certificate.revoked", onCertRevoked);

  // 🔥 30s Polling als Fallback
  interval = setInterval(() => {
    fetchDashboard();
  }, 30000);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);

  // 🔥 Listener entfernen
  bus.off("certificate.issued", onCertIssued);
  bus.off("certificate.revoked", onCertRevoked);
});
</script>

<template>
  <div class="dashboard">
    <div v-if="loading">{{ t("dashboard.loading") }}</div>

    <div v-else-if="error">{{ error }}</div>

    <div v-else>
      <h1 class="page-title">{{ t("dashboard.title") }}</h1>

      <div class="dashboard-section">
        <div class="dashboard-cards">
          <BaseCard
            >{{ t("dashboard.totalCertificates") }}:
            {{ dashboard?.total_certificates }}</BaseCard
          >
          <BaseCard
            >{{ t("dashboard.expiringSoon") }}: {{ dashboard?.expiring_soon }}</BaseCard
          >
          <BaseCard>{{ t("dashboard.revoked") }}: {{ dashboard?.revoked }}</BaseCard>
          <BaseCard>
            ACME: {{ dashboard?.acme_active ? t("common.active") : t("common.inactive") }}
          </BaseCard>
        </div>
      </div>

      <div class="dashboard-section">
        <div class="dashboard-grid-3">
          <BaseCard>
            <h2>{{ t("dashboard.caStructure") }}</h2>

            <div class="ca-pyramid">
              <div class="ca-root">
                {{ dashboard?.ca?.root }}
              </div>

              <div class="ca-line"></div>

              <div class="ca-intermediates">
                <div
                  v-for="int in dashboard?.ca?.intermediates || []"
                  :key="int"
                  class="ca-intermediate"
                >
                  {{ int }}
                </div>
              </div>
            </div>
          </BaseCard>

          <BaseCard>
            <h2>{{ t("dashboard.systemStatus") }}</h2>

            <table class="system-table">
              <tbody>
                <tr v-for="item in systemStatus" :key="item.component">
                  <td>{{ item.component }}</td>
                  <td>
                    <span
                      class="version-badge"
                      :class="{
                        'status-ok': item.version === 'OK',
                        'status-error': item.version === 'ERROR',
                      }"
                    >
                      {{ item.version }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </BaseCard>

          <BaseCard>
            <h2>{{ t("dashboard.actions") }}</h2>

            <div class="quick-actions">
              <BaseButton @click="goToCreateCert">
                + {{ t("dashboard.createCertificate") }}
              </BaseButton>

              <BaseButton variant="secondary" @click="goToRevoke">
                {{ t("dashboard.revoke") }}
              </BaseButton>

              <BaseButton v-if="crlUrl" variant="secondary" @click="downloadCrl">
                {{ t("dashboard.crlDownload") }}
              </BaseButton>
            </div>
          </BaseCard>
        </div>
      </div>

      <div class="dashboard-section">
        <BaseCard>
          <h2>{{ t("dashboard.expiringCertificates") }}</h2>

          <BaseTable>
            <thead>
              <tr>
                <th>CN</th>
                <th>{{ t("dashboard.expiry") }}</th>
                <th>{{ t("common.status") }}</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="cert in dashboard?.expiring || []" :key="cert.cn">
                <td>{{ cert.cn }}</td>
                <td>{{ cert.expires_in_days }} {{ t("common.days") }}</td>
                <td>
                  <span :class="['status', cert.status]">
                    {{ cert.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </BaseTable>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
