<script setup lang="ts">
import { ref, onMounted } from "vue";
import apiClient from "@/api/client";
import { useI18n } from "vue-i18n";

import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseTable from "@/components/common/BaseTable.vue";

interface CertificateRequest {
  id: number;
  common_name: string;
  type: string;
  san?: string;
  status: string;

  key_type?: string;
  key_size?: number;
  curve?: string;

  created_at: string;
}

const { t } = useI18n();
const requests = ref<CertificateRequest[]>([]);
const loading = ref(false);

const fetchRequests = async () => {
  loading.value = true;

  try {
    const res = await apiClient.get("/certificate-requests");

    requests.value = res.data;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const approveRequest = async (id: number) => {
  try {
    await apiClient.post(`/certificate-requests/${id}/approve`);

    await fetchRequests();
  } catch (e) {
    console.error(e);
  }
};

const rejectRequest = async (id: number) => {
  const reason = prompt(t("certificateRequests.rejectReason"));

  try {
    await apiClient.post(`/certificate-requests/${id}/reject`, {
      reason,
    });

    await fetchRequests();
  } catch (e) {
    console.error(e);
  }
};

onMounted(() => {
  fetchRequests();
});
</script>

<template>
  <div>
    <h1 class="page-title">{{ t("certificateRequests.title") }}</h1>

    <BaseCard>
      <BaseTable>
        <thead>
          <tr>
            <th>ID</th>
            <th>CN</th>
            <th>{{ t("certificates.type") }}</th>
            <th>Key</th>
            <th>{{ t("common.status") }}</th>
            <th>{{ t("certificateRequests.created") }}</th>
            <th>{{ t("common.actions") }}</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="request in requests" :key="request.id">
            <td>{{ request.id }}</td>
            <td>{{ request.common_name }}</td>
            <td>{{ request.type }}</td>

            <td>
              <span v-if="request.key_type === 'rsa'">
                🔐 RSA {{ request.key_size }}
              </span>

              <span v-else-if="request.key_type === 'ecdsa'">
                ⚡ ECDSA {{ request.curve }}
              </span>
            </td>

            <td>
              <span class="status-badge status-badge--pending">
                🟡 {{ t("status.pendingUpper") }}
              </span>
            </td>

            <td>{{ request.created_at }}</td>

            <td class="request-actions">
              <BaseButton variant="success" @click="approveRequest(request.id)">
                {{ t("certificateRequests.approve") }}
              </BaseButton>

              <BaseButton variant="danger" @click="rejectRequest(request.id)">
                {{ t("certificateRequests.reject") }}
              </BaseButton>
            </td>
          </tr>
        </tbody>
      </BaseTable>
    </BaseCard>
  </div>
</template>
