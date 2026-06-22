<script setup>
import { ref, watch, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";

import { getCA } from "@/api/ca";
import { getTemplates, saveTemplate, deleteTemplate } from "@/api/templates";
import {
  createCertificateFromData,
  createCertificateFromCSR,
} from "@/api/certificatescreate";
import { lookupDns } from "@/api/dns";
import { getTeams } from "@/api/teams";
import { getSetting } from "@/api/settings";

import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import { backendMessage } from "@/utils/i18nResponse";
const { t } = useI18n();

const props = defineProps({
  type: { type: String, required: true },
  defaultKeyType: { type: String, default: "rsa" },
  defaultKeySize: { type: Number, default: 3072 },
  defaultCurve: { type: String, default: "P256" },
});

// DNS Lookup State
const dnsStatus = ref({});
const dnsIp = ref({});
const dnsTimers = {};
const dnsValidationEnabled = ref(true);

// Warn Dialog
const showDnsWarnDialog = ref(false);
const unresolvedDns = ref([]);

// Wizard State
const selectedMethod = ref(null);
const step = ref(1);

// Data
const intermediates = ref([]);
const csr = ref("");
const templates = ref([]);
const showTemplateModal = ref(false);
const templateName = ref("");
const step2Section = ref(null);
const teams = ref([]);

// Form
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
  is_acme: false,
  san_dns: [""],
  san_ips: [""],
});

const resetForm = () => {
  form.value.cn = "";
  form.value.ou = "";
  form.value.organization = "";
  form.value.locality = "";
  form.value.state = "";
  form.value.country = "DE";
  form.value.email = "";
  form.value.key_type = props.defaultKeyType;
  form.value.key_size = props.defaultKeySize;
  form.value.curve = props.defaultCurve;
  form.value.parent_id =
    intermediates.value.length === 1 ? intermediates.value[0].id : null;
  form.value.team_id = null;
  form.value.san_dns = [""];
  form.value.san_ips = [""];
  dnsStatus.value = {};
  dnsIp.value = {};
};

const addDNS = () => form.value.san_dns.push("");
const removeDNS = (i) => form.value.san_dns.splice(i, 1);

const addIP = () => form.value.san_ips.push("");
const removeIP = (i) => form.value.san_ips.splice(i, 1);

const applyTemplate = (template) => {
  form.value.ou = template.ou;
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

watch(
  () => props.type,
  () => {
    resetForm();
    selectedMethod.value = null;
    step.value = 1;
  }
);

watch(step, async (newStep) => {
  if (newStep === 2) {
    await nextTick();

    step2Section.value?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
});

const removeTemplate = async (id) => {
  await deleteTemplate(id);
  templates.value = await getTemplates();
};

const isValidDNS = (value) => {
  const regex = /^(\*\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  return regex.test(value);
};

const isValidIP = (value) => {
  const regex = /^(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|\d\d|\d)$/;
  return regex.test(value);
};

const showDNSError = (value) => {
  if (!value || value.trim() === "") return false;
  return !isValidDNS(value);
};

const showIPError = (value) => {
  if (!value || value.trim() === "") return false;
  return !isValidIP(value);
};

const hasInvalidSAN = () => {
  return form.value.san_dns.some(showDNSError) || form.value.san_ips.some(showIPError);
};

const triggerDnsLookup = (index, value) => {
  if (!dnsValidationEnabled.value) return;

  if (!value || value.trim() === "" || !isValidDNS(value)) {
    dnsStatus.value[index] = "idle";
    dnsIp.value[index] = null;
    return;
  }

  dnsStatus.value[index] = "loading";

  clearTimeout(dnsTimers[index]);

  dnsTimers[index] = setTimeout(async () => {
    try {
      const result = await lookupDns(value.trim());
      dnsStatus.value[index] = result.resolved ? "ok" : "error";
      dnsIp.value[index] = result.ip;
    } catch {
      dnsStatus.value[index] = "error";
      dnsIp.value[index] = null;
    }
  }, 500);
};

const submitWithDnsCheck = () => {
  if (!dnsValidationEnabled.value) {
    submitCertificate();
    return;
  }

  const unresolved = form.value.san_dns.filter(
    (dns, i) =>
      dns && dns.trim() !== "" && isValidDNS(dns) && dnsStatus.value[i] === "error"
  );

  if (unresolved.length > 0) {
    unresolvedDns.value = unresolved;
    showDnsWarnDialog.value = true;
    return;
  }

  submitCertificate();
};

const submitCertificate = async () => {
  try {
    const payload = {
      type: props.type,
      cn: form.value.cn,
      organization: form.value.organization,
      ou: form.value.ou,
      locality: form.value.locality,
      state: form.value.state,
      country: form.value.country,
      email: form.value.email,
      san_dns: form.value.san_dns.filter((v) => v && v.trim() !== ""),
      san_ips: form.value.san_ips.filter((v) => v && v.trim() !== ""),
      parent_id: form.value.parent_id,
      key_type: form.value.key_type,
      team_id: form.value.team_id,
    };

    if (form.value.key_type === "rsa") {
      payload.key_size = form.value.key_size;
    } else {
      payload.curve = form.value.curve;
    }

    console.log("SENDING:", payload);

    const res = await createCertificateFromData(payload);
    console.log("SUCCESS:", res);

    const cert = res.certificate ?? res;

    if (cert.status === "pending") {
      alert(t("certificateForm.requestSubmitted"));
    } else if (cert.status === "issued") {
      alert(t("certificateForm.created"));
    } else {
      alert(t("certificateForm.processed"));
    }

    resetForm();
    step.value = 1;
    selectedMethod.value = null;
  } catch (e) {
    console.error(e);

    if (e.response?.status === 403) {
      alert(t("certificateForm.noPermission"));
      return;
    }

    if (e.response?.data?.error) {
      alert(backendMessage(t, e.response?.data, "certificateForm.createError"));
      return;
    }

    if (e.response?.data?.message) {
      alert(backendMessage(t, e.response?.data, "certificateForm.createError"));
      return;
    }

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

    console.log("CSR SUCCESS:", res);

    const cert = res.certificate ?? res;

    if (cert.status === "pending") {
      alert(t("certificateForm.requestSubmitted"));
    } else if (cert.status === "issued") {
      alert(t("certificateForm.created"));
    } else {
      alert(t("certificateForm.csrProcessed"));
    }

    csr.value = "";
    selectedMethod.value = null;
    step.value = 1;
    resetForm();
  } catch (e) {
    console.error(e);

    if (e.response?.status === 403) {
      alert(t("certificateForm.noPermission"));
      return;
    }

    if (e.response?.status === 501) {
      alert(t("certificateForm.csrNotEnabled"));
      return;
    }

    if (e.response?.data?.error) {
      alert(backendMessage(t, e.response?.data, "certificateForm.csrError"));
      return;
    }

    if (e.response?.data?.message) {
      alert(backendMessage(t, e.response?.data, "certificateForm.csrError"));
      return;
    }

    alert(t("certificateForm.csrError"));
  }
};

onMounted(async () => {
  try {
    const [templateData, dnsValidation, caData, teamData] = await Promise.all([
      getTemplates(),
      getSetting("dns_validation"),
      getCA(),
      getTeams(),
    ]);

    templates.value = templateData;
    dnsValidationEnabled.value = dnsValidation !== "false";

    intermediates.value = caData.intermediates;
    if (intermediates.value.length === 1) {
      form.value.parent_id = intermediates.value[0].id;
    }

    teams.value = teamData;
  } catch (e) {
    console.error(e);
  }
});
</script>

<template>
  <div class="certificate-create-form">
    <BaseCard
      :class="[
        'wizard-card',
        { 'wizard-card--wide': selectedMethod === 'key' && step === 2 },
      ]"
    >
      <!-- STEP 1: METHOD -->
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

      <!-- CSR MODE -->
      <div v-else-if="selectedMethod === 'csr'">
        <h2>{{ t("certificateForm.insertCsr") }}</h2>

        <textarea
          v-model="csr"
          class="csr-textarea"
          placeholder="-----BEGIN CERTIFICATE REQUEST-----"
        ></textarea>

        <div class="form-actions">
          <BaseButton variant="secondary" @click="selectedMethod = null">
            ← {{ t("certificateForm.back") }}
          </BaseButton>

          <BaseButton @click="submitCSR">
            {{ t("certificateForm.createCertificate") }}
          </BaseButton>
        </div>
      </div>

      <!-- KEY STEP 1: KEY SIZE -->
      <div v-else-if="selectedMethod === 'key' && step === 1">
        <h2>{{ t("certificateForm.createKey") }}</h2>

        <div class="form-grid">
          <!-- KEY TYPE -->
          <div>
            <label>{{ t("certificateForm.keyType") }}</label>

            <select v-model="form.key_type">
              <option value="rsa">RSA</option>
              <option value="ecdsa">ECDSA</option>
            </select>
          </div>

          <!-- RSA -->
          <div v-if="form.key_type === 'rsa'">
            <label>{{ t("certificateForm.keySize") }}</label>

            <select v-model.number="form.key_size">
              <option value="2048">2048 ({{ t("certificateForm.compatible") }})</option>
              <option value="3072">3072 ({{ t("certificateForm.recommended") }})</option>
              <option value="4096">4096 ({{ t("certificateForm.highSecurity") }})</option>
            </select>
          </div>

          <!-- ECDSA -->
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

      <!-- KEY STEP 2: CERT FORM -->
      <div
        v-else-if="selectedMethod === 'key' && step === 2"
        ref="step2Section"
        class="form-layout"
      >
        <!-- LEFT: FORM -->
        <div class="form-left">
          <BaseCard>
            <h2>{{ t("certificateForm.createCertificate") }}</h2>

            <BaseInput
              v-model="form.cn"
              :label="t('certificateForm.commonName')"
              placeholder="example.com"
            />

            <BaseInput
              v-model="form.ou"
              :label="t('certificateForm.organizationalUnit')"
            />

            <BaseInput
              v-model="form.organization"
              :label="t('certificateForm.organization')"
            />

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
            </div>

            <!-- TEAM -->
            <div>
              <label>{{ t("certificateForm.teamOptional") }}</label>

              <select v-model="form.team_id">
                <option :value="null">
                  {{ t("certificateForm.noTeam") }}
                </option>

                <option v-for="team in teams" :key="team.id" :value="team.id">
                  {{ team.name }}
                </option>
              </select>
            </div>

            <div class="cert-actions">
              <!-- LEFT -->
              <BaseButton class="cert-back-btn" variant="secondary" @click="step = 1">
                ← {{ t("certificateForm.back") }}
              </BaseButton>

              <!-- RIGHT -->
              <div class="cert-actions-group">
                <BaseButton
                  class="cert-save-btn"
                  variant="secondary"
                  @click="showTemplateModal = true"
                >
                  {{ t("certificateForm.saveAsTemplate") }}
                </BaseButton>

                <BaseButton @click="step = 3">
                  {{ t("certificateForm.next") }}
                </BaseButton>
              </div>
            </div>
          </BaseCard>
        </div>

        <!-- 🔥 RIGHT: TEMPLATES -->
        <div class="form-right">
          <BaseCard>
            <h3>Vorlagen</h3>

            <div class="template-list">
              <div class="template-item" v-for="template in templates" :key="template.id">
                <!-- LEFT -->
                <div class="template-content" @click="applyTemplate(template)">
                  <strong>{{ template.name }}</strong>
                  <p>{{ template.organization }}</p>
                </div>

                <!-- RIGHT DELETE -->
                <button class="template-delete" @click.stop="removeTemplate(template.id)">
                  🗑️
                </button>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- KEY STEP 3: SAN + DNS LOOKUP -->
      <div v-else-if="selectedMethod === 'key' && step === 3">
        <BaseCard class="wizard-card wizard-card--wide">
          <h2>SAN (Subject Alternative Names)</h2>

          <!-- DNS -->
          <div class="san-header">
            <h3>SAN - DNS</h3>
            <BaseButton variant="secondary" @click="addDNS">
              + {{ t("certificateForm.addDns") }}
            </BaseButton>
          </div>

          <div v-for="(dns, index) in form.san_dns" :key="index" class="san-row">
            <div class="san-input">
              <BaseInput
                v-model="form.san_dns[index]"
                placeholder="example.com"
                :error="showDNSError(form.san_dns[index])"
                @input="triggerDnsLookup(index, form.san_dns[index])"
              />
            </div>

            <div
              v-if="form.san_dns[index] && isValidDNS(form.san_dns[index])"
              class="dns-status-indicator"
            >
              <span class="dns-status-badge" :class="dnsStatus[index] ?? 'idle'">
                <template v-if="dnsStatus[index] === 'loading'">
                  <span class="dns-spinner"></span>
                  {{ t("certificateForm.dnsChecking") }}
                </template>

                <template v-else-if="dnsStatus[index] === 'ok'">
                  <span class="dns-status-icon">✓</span>
                  {{ t("certificateForm.dnsResolved") }}: {{ dnsIp[index] }}
                </template>

                <template v-else-if="dnsStatus[index] === 'error'">
                  <span class="dns-status-icon">!</span>
                  {{ t("certificateForm.dnsNotResolvable") }}
                </template>
              </span>
            </div>

            <button
              v-if="form.san_dns.length > 1"
              class="san-remove"
              @click="removeDNS(index)"
            >
              ✖
            </button>
          </div>

          <!-- IP -->
          <div class="san-header">
            <h3>SAN - IP</h3>
            <BaseButton variant="secondary" @click="addIP">
              + {{ t("certificateForm.addIp") }}
            </BaseButton>
          </div>

          <div v-for="(ip, index) in form.san_ips" :key="index" class="san-row">
            <div class="san-input">
              <BaseInput
                v-model="form.san_ips[index]"
                placeholder="192.168.1.1"
                :error="showIPError(form.san_ips[index])"
              />
            </div>

            <button
              v-if="form.san_ips.length > 1"
              class="san-remove"
              @click="removeIP(index)"
            >
              ✖
            </button>
          </div>

          <!-- ACTIONS -->
          <div class="cert-actions">
            <BaseButton variant="secondary" @click="step = 2">
              ← {{ t("certificateForm.back") }}
            </BaseButton>

            <div class="cert-actions-group">
              <BaseButton
                :disabled="hasInvalidSAN()"
                class="cert-create-btn"
                @click="submitWithDnsCheck"
              >
                {{ t("certificateForm.createCertificate") }}
              </BaseButton>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- DNS WARN DIALOG -->
      <div v-if="showDnsWarnDialog" class="modal-overlay">
        <div class="modal-box">
          <h3>⚠️ {{ t("certificateForm.dnsWarningTitle") }}</h3>
          <p>{{ t("certificateForm.dnsWarningText") }}</p>

          <ul class="dns-warn-list">
            <li v-for="dns in unresolvedDns" :key="dns" class="dns-warn-item">
              🔴 {{ dns }}
            </li>
          </ul>

          <p class="dns-warn-hint">
            {{ t("certificateForm.dnsWarningHint") }}
          </p>

          <div class="modal-actions">
            <BaseButton variant="secondary" @click="showDnsWarnDialog = false">
              {{ t("common.cancel") }}
            </BaseButton>

            <BaseButton
              @click="
                () => {
                  showDnsWarnDialog = false;
                  submitCertificate();
                }
              "
            >
              {{ t("certificateForm.createAnyway") }}
            </BaseButton>
          </div>
        </div>
      </div>
    </BaseCard>

    <div v-if="showTemplateModal" class="modal-overlay">
      <div class="modal-box">
        <h3>{{ t("certificateForm.saveTemplate") }}</h3>

        <BaseInput
          v-model="templateName"
          :label="t('certificateForm.templateName')"
          placeholder="z.B. Standard Firma"
        />

        <div class="modal-actions">
          <BaseButton variant="secondary" @click="showTemplateModal = false">
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
