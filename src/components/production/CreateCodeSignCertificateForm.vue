<script setup>
import { ref, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";

import { getCA } from "@/api/ca";
import { getTeams } from "@/api/teams";
import { getTemplates, saveTemplate, deleteTemplate } from "@/api/templates";
import {
  createCertificateFromData,
  createCertificateFromCSR,
} from "@/api/certificatescreate";

import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseInput from "@/components/common/BaseInput.vue";

const { t } = useI18n();

const props = defineProps({
  type: { type: String, required: true },
  defaultKeyType: { type: String, default: "rsa" },
  defaultKeySize: { type: Number, default: 3072 },
  defaultCurve: { type: String, default: "P256" },
});

const selectedMethod = ref(null);
const step = ref(1);

const intermediates = ref([]);
const templates = ref([]);
const teams = ref([]);
const csr = ref("");

const showTemplateModal = ref(false);
const templateName = ref("");

const form = ref({
  cn: "",
  ou: "",
  organization: "",
  locality: "",
  state: "",
  country: "DE",
  email: "",
  key_type: props.defaultKeyType,
  key_size: props.defaultKeySize,
  curve: props.defaultCurve,
  parent_id: null,
  team_id: null,
});

onMounted(async () => {
  const caData = await getCA();
  intermediates.value = caData.intermediates;

  if (intermediates.value.length === 1) {
    form.value.parent_id = intermediates.value[0].id;
  }

  templates.value = await getTemplates();

  try {
    teams.value = await getTeams();
  } catch (e) {
    console.error(e);
  }
});

watch(
  () => props.type,
  () => {
    selectedMethod.value = null;
    step.value = 1;
  }
);

const applyTemplate = (template) => {
  form.value.ou = template.ou ?? template.organizational_unit;
  form.value.organization = template.organization;
  form.value.locality = template.locality;
  form.value.state = template.state;
  form.value.country = template.country;
  form.value.email = template.email;
};

const saveCurrentTemplate = async () => {
  if (!templateName.value) return;

  await saveTemplate({
    name: templateName.value,
    ou: form.value.ou,
    organization: form.value.organization,
    locality: form.value.locality,
    state: form.value.state,
    country: form.value.country,
    email: form.value.email,
  });

  templates.value = await getTemplates();
  templateName.value = "";
  showTemplateModal.value = false;
};

const removeTemplate = async (id) => {
  await deleteTemplate(id);
  templates.value = await getTemplates();
};

const submitCertificate = async () => {
  try {
    const payload = {
      type: props.type,

      common_name: form.value.cn,

      organization: form.value.organization || null,
      ou: form.value.ou || null,
      locality: form.value.locality || null,
      state: form.value.state || null,
      country: form.value.country || "DE",
      email: form.value.email || null,

      parent_id: form.value.parent_id,
      key_type: form.value.key_type,
      team_id: form.value.team_id,

      san_dns: [],
      san_ips: [],
    };

    if (form.value.key_type === "rsa") {
      payload.key_size = form.value.key_size;
    } else {
      payload.curve = form.value.curve;
    }

    const res = await createCertificateFromData(payload);

    if (res.certificate?.status === "pending" || res.status === "pending") {
      alert(t("certificateForm.requestSubmitted"));
    } else {
      alert(t("certificateForm.codeSignCreated"));
    }

    selectedMethod.value = null;
    step.value = 1;
  } catch (e) {
    console.error(e);
    alert(t("certificateForm.createError"));
  }
};

const submitCSR = async () => {
  try {
    const res = await createCertificateFromCSR(
      csr.value,
      props.type,
      form.value.parent_id
    );

    console.log(res);
    alert(t("certificateForm.csrCertificateCreated"));

    csr.value = "";
    selectedMethod.value = null;
  } catch (e) {
    console.error(e);
    alert(t("certificateForm.csrError"));
  }
};
</script>

<template>
  <div class="certificate-create-form">
    <BaseCard :class="[
      'wizard-card',
      { 'wizard-card--wide': selectedMethod === 'key' && step === 2 },
    ]">
      <div v-if="!selectedMethod">
        <h2>{{ t("certificateForm.selectMethod") }}</h2>

        <div class="method-selector">
          <BaseButton @click="selectedMethod = 'csr'">
            {{ t("certificateForm.insertCsr") }}
          </BaseButton>

          <BaseButton @click="selectedMethod = 'key'">
            {{ t("certificateForm.createKey") }}
          </BaseButton>
        </div>
      </div>

      <div v-else-if="selectedMethod === 'csr'">
        <h2>{{ t("certificateForm.insertCsr") }}</h2>

        <textarea v-model="csr" class="csr-textarea"></textarea>

        <div class="form-actions">
          <BaseButton variant="secondary" @click="selectedMethod = null">
            ← {{ t("certificateForm.back") }}
          </BaseButton>

          <BaseButton @click="submitCSR">
            {{ t("certificateForm.createCertificate") }}
          </BaseButton>
        </div>
      </div>

      <div v-else-if="selectedMethod === 'key' && step === 1">
        <h2>{{ t("certificateForm.createKey") }}</h2>

        <div class="form-grid">
          <div>
            <label>{{ t("certificateForm.keyType") }}</label>

            <select v-model="form.key_type">
              <option value="rsa">RSA</option>
              <option value="ecdsa">ECDSA</option>
            </select>
          </div>

          <div v-if="form.key_type === 'rsa'">
            <label>{{ t("certificateForm.keySize") }}</label>

            <select v-model.number="form.key_size">
              <option value="2048">2048 ({{ t("certificateForm.compatible") }})</option>
              <option value="3072">3072 ({{ t("certificateForm.recommended") }})</option>
              <option value="4096">4096 ({{ t("certificateForm.highSecurity") }})</option>
            </select>
          </div>

          <div v-if="form.key_type === 'ecdsa'">
            <label>{{ t("certificateForm.curve") }}</label>

            <select v-model="form.curve">
              <option value="P256">P256 ({{ t("certificateForm.fastStandard") }})</option>
              <option value="P384">P384 ({{ t("certificateForm.moreSecurity") }})</option>
              <option value="P521">P521 ({{ t("certificateForm.highSecurity") }})</option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <BaseButton variant="secondary" @click="selectedMethod = null">
            ← {{ t("certificateForm.back") }}
          </BaseButton>

          <BaseButton @click="step = 2">
            {{ t("certificateForm.next") }}
          </BaseButton>
        </div>
      </div>

      <div v-else-if="selectedMethod === 'key' && step === 2" class="form-layout">
        <div class="form-left">
          <BaseCard>
            <h2>{{ t("certificateForm.codeSignCertificate") }}</h2>

            <BaseInput v-model="form.cn" :label="t('certificateForm.publisherName')" />
            <BaseInput v-model="form.ou" :label="t('certificateForm.organizationalUnit')" />
            <BaseInput v-model="form.organization" :label="t('certificateForm.organization')" />
            <BaseInput v-model="form.locality" :label="t('certificateForm.locality')" />
            <BaseInput v-model="form.state" :label="t('certificateForm.state')" />
            <BaseInput v-model="form.country" :label="t('certificateForm.country')" />
            <BaseInput v-model="form.email" :label="t('certificateForm.email')" />

            <div class="form-grid">
              <div>
                <label>{{ t("certificateForm.intermediateCa") }}</label>

                <select v-model="form.parent_id">
                  <option v-for="ca in intermediates" :key="ca.id" :value="ca.id">
                    {{ ca.cn }}
                  </option>
                </select>
              </div>

              <div>
                <label>{{ t("certificateForm.teamOptional") }}</label>

                <select v-model="form.team_id">
                  <option :value="null">{{ t("certificateForm.noTeam") }}</option>
                  <option v-for="team in teams" :key="team.id" :value="team.id">
                    {{ team.name }}
                  </option>
                </select>
              </div>
            </div>

            <div class="cert-actions">
              <BaseButton variant="secondary" @click="step = 1">
                ← {{ t("certificateForm.back") }}
              </BaseButton>

              <div class="cert-actions-group">
                <BaseButton variant="secondary" @click="showTemplateModal = true">
                  {{ t("certificateForm.saveTemplate") }}
                </BaseButton>

                <BaseButton @click="submitCertificate">
                  {{ t("certificateForm.createCertificate") }}
                </BaseButton>
              </div>
            </div>
          </BaseCard>
        </div>

        <div class="form-right">
          <BaseCard>
            <h3>{{ t("certificateForm.templates") }}</h3>

            <div class="template-list">
              <div class="template-item" v-for="template in templates" :key="template.id"
                @click="applyTemplate(template)">
                <div class="template-content">
                  <strong>{{ template.name }}</strong>
                  <p>{{ template.organization }}</p>
                </div>

                <button @click.stop="removeTemplate(template.id)">🗑️</button>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>
    </BaseCard>

    <div v-if="showTemplateModal" class="modal-overlay">
      <div class="modal-box">
        <h3>{{ t("certificateForm.saveTemplate") }}</h3>

        <BaseInput v-model="templateName" :label="t('certificateForm.templateName')" />

        <div class="modal-actions">
          <BaseButton @click="showTemplateModal = false">
            {{ t("common.cancel") }}
          </BaseButton>

          <BaseButton @click="saveCurrentTemplate">
            {{ t("common.save") }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
