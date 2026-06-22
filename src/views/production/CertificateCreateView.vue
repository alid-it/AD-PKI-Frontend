<script setup>
import { ref, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";

import { getSetting } from "@/api/settings";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import CreateTLSCertificateForm from "@/components/production/CreateTLSCertificateForm.vue";
import CreateCodeSignCertificateForm from "@/components/production/CreateCodeSignCertificateForm.vue";
import CreateClientCertificateForm from "@/components/production/CreateClientCertificateForm.vue";
import "@/assets/styles/production/certificatecreate.css";

const { t } = useI18n();

const selectedType = ref(null);

const types = computed(() => [
  { value: "tls", label: t("certificateCreate.types.tls") },
  { value: "client", label: t("certificateCreate.types.client") },
  { value: "codesign", label: t("certificateCreate.types.codesign") },
]);

const defaultKeyType = ref("rsa");
const defaultKeySize = ref(3072);
const defaultCurve = ref("P256");

onMounted(async () => {
  const [type, size, curve] = await Promise.all([
    getSetting("default_key_type"),
    getSetting("default_key_size"),
    getSetting("default_curve"),
  ]);

  if (type) defaultKeyType.value = type;
  if (size) defaultKeySize.value = parseInt(size);
  if (curve) defaultCurve.value = curve;
});
</script>

<template>
  <AppLayout>
    <div class="page">
      <h1 class="page-title">{{ t("certificateCreate.title") }}</h1>

      <BaseCard>
        <div class="type-selector">
          <BaseButton
            v-for="type in types"
            :key="type.value"
            :class="['type-button', { active: selectedType === type.value }]"
            @click="selectedType = type.value"
          >
            {{ type.label }}
          </BaseButton>
        </div>
      </BaseCard>

      <!-- 🔥 Props weitergeben -->
      <CreateTLSCertificateForm
        v-if="selectedType === 'tls'"
        :type="selectedType"
        :default-key-type="defaultKeyType"
        :default-key-size="defaultKeySize"
        :default-curve="defaultCurve"
      />
      <CreateClientCertificateForm v-if="selectedType === 'client'" type="client" />
      <CreateCodeSignCertificateForm
        v-if="selectedType === 'codesign'"
        type="codesign"
        :default-key-type="defaultKeyType"
        :default-key-size="defaultKeySize"
        :default-curve="defaultCurve"
      />
    </div>
  </AppLayout>
</template>
