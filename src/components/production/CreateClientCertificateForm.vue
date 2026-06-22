<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";

import { getCA } from "@/api/ca";
import { getTeams } from "@/api/teams";
import { createCertificateFromCSR } from "@/api/certificatescreate";

import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import { backendMessage } from '@/utils/i18nResponse'
const { t } = useI18n();

const intermediates = ref([]);
const teams = ref([]);
const csr = ref("");
const parent_id = ref(null);
const team_id = ref(null);

const loading = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

onMounted(async () => {
  const data = await getCA();
  intermediates.value = data.intermediates;

  if (intermediates.value.length === 1) {
    parent_id.value = intermediates.value[0].id;
  }

  try {
    teams.value = await getTeams();
  } catch (e) {
    console.error(e);
  }
});

const submitCSR = async () => {
  successMessage.value = "";
  errorMessage.value = "";

  if (!csr.value) {
    errorMessage.value = t("certificateForm.csrRequired");
    return;
  }

  loading.value = true;

  try {
    const res = await createCertificateFromCSR(
      csr.value,
      "client",
      parent_id.value,
      team_id.value
    );

    const cert = res.certificate ?? res;

    if (cert.status === "pending") {
      successMessage.value = t("certificateForm.clientRequestSubmitted");
    } else {
      successMessage.value = t("certificateForm.clientCreated");
    }

    csr.value = "";
    team_id.value = null;
  } catch (e) {
    console.error(e);

    if (e.response?.status === 403) {
      errorMessage.value = t("certificateForm.clientNoPermission");
      return;
    }

    if (e.response?.data?.error) {
      errorMessage.value = backendMessage(t, e.response?.data, 'certificateForm.csrProcessError')
      return;
    }

    if (e.response?.data?.message) {
      errorMessage.value = backendMessage(t, e.response?.data, 'certificateForm.csrProcessError')
      return;
    }

    errorMessage.value = t("certificateForm.csrProcessError");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="certificate-create-form">
    <BaseCard class="wizard-card">
      <h2>{{ t("certificateForm.clientCertificate") }}</h2>

      <div v-if="successMessage" class="cert-message cert-message-success">
        {{ successMessage }}
      </div>

      <div v-if="errorMessage" class="cert-message cert-message-error">
        {{ errorMessage }}
      </div>

      <textarea
        v-model="csr"
        class="csr-textarea"
        placeholder="-----BEGIN CERTIFICATE REQUEST-----"
      />

      <div class="form-grid">
        <div>
          <label>{{ t("certificateForm.intermediateCa") }}</label>

          <select v-model="parent_id">
            <option v-for="ca in intermediates" :key="ca.id" :value="ca.id">
              {{ ca.cn }}
            </option>
          </select>
        </div>

        <div>
          <label>{{ t("certificateForm.teamOptional") }}</label>

          <select v-model="team_id">
            <option :value="null">{{ t("certificateForm.noTeam") }}</option>
            <option v-for="team in teams" :key="team.id" :value="team.id">
              {{ team.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="cert-actions">
        <div></div>

        <div class="cert-actions-group">
          <BaseButton
            class="cert-create-btn"
            :disabled="!csr || loading"
            @click="submitCSR"
          >
            {{
              loading
                ? t("certificateForm.processing")
                : t("certificateForm.createCertificate")
            }}
          </BaseButton>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
