<script setup lang="ts">
import { ref, onMounted } from "vue";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import "@/assets/styles/production/notifications.css";
import { useI18n } from "vue-i18n";

import type { NotificationEvent, NotificationSettings } from "@/types/notification";
import {
  getNotifications,
  saveNotificationEvents,
  saveNotificationSettings,
  testNotification,
  saveRecipients,
} from "@/api/notifications";
import { getSetting } from "@/api/settings";
import {
  toastEnabled,
  saveToastEnabled as _saveToastEnabled,
} from "@/stores/toastSettings";

/* -----------------------------
   State
----------------------------- */

const events = ref<NotificationEvent[]>([]);
const settings = ref<NotificationSettings | null>(null);
const showModal = ref(false);
const selectedEvent = ref<NotificationEvent | null>(null);
const loading = ref(false);
const { t } = useI18n();

// =========================================
// 🔥 TOAST EINSTELLUNGEN
// =========================================

const savingToast = ref(false);
const savedToast = ref(false);

const saveToastEnabled = async () => {
  savingToast.value = true;
  try {
    await _saveToastEnabled(toastEnabled.value);
    savedToast.value = true;
    setTimeout(() => (savedToast.value = false), 2000);
  } catch (e) {
    console.error(e);
  }
  savingToast.value = false;
};

/* Channels */

const mail = ref({
  enabled: false,
  host: "",
  port: "587",
  username: "",
  password: "",
  from_email: "",
  from_name: "",
  encryption: "tls",
});
const testEmail = ref("");

const webhook = ref({
  enabled: false,
  url: "",
  method: "POST",
  secret: "",
});

const telegram = ref({
  enabled: false,
  bot_token: "",
  chat_id: "",
});

const testMail = async () => {
  if (!testEmail.value) {
    alert(t("notifications.recipientRequired"));
    return;
  }

  await testNotification("mail", {
    to: testEmail.value,
  });
};

const variables = ref<any>({});

const savingMail = ref(false);
const savedMail = ref(false);

const savingWebhook = ref(false);
const savedWebhook = ref(false);

const savingTelegram = ref(false);
const savedTelegram = ref(false);

const savingEvents = ref(false);
const savedEvents = ref(false);

const testWebhook = async () => {
  await testNotification("webhook");
};
const testTelegram = async () => {
  await testNotification("telegram");
};

/* -----------------------------
   Load Data
----------------------------- */

const load = async () => {
  loading.value = true;

  try {
    const [res, toastSetting] = await Promise.all([
      getNotifications(),
      getSetting("toast_enabled"),
    ]);

    events.value = res.events.map((e) => ({
      ...e,
      roles: e.recipients?.map((r) => r.role) || [],
    }));
    settings.value = res.settings;
    variables.value = res.variables;

    // 🔥 Toast Setting laden
    toastEnabled.value = toastSetting !== "0";

    // 👉 Mail
    mail.value = {
      enabled: settings.value.mail_enabled,
      host: settings.value.mail_host,
      port: settings.value.mail_port,
      username: settings.value.mail_username,
      password: settings.value.mail_password,
      from_email: settings.value.mail_from_email,
      from_name: settings.value.mail_from_name,
      encryption: settings.value.mail_encryption,
    };

    // 👉 Webhook
    webhook.value = {
      enabled: settings.value.webhook_enabled,
      url: settings.value.webhook_url,
      method: settings.value.webhook_method,
      secret: settings.value.webhook_secret,
    };

    // 👉 Telegram
    telegram.value = {
      enabled: settings.value.telegram_enabled,
      bot_token: settings.value.telegram_bot_token,
      chat_id: settings.value.telegram_chat_id,
    };
  } catch (e) {
    console.error("Fehler beim Laden:", e);
  }

  loading.value = false;
};

/* -----------------------------
   Save
----------------------------- */

const saveEvents = async () => {
  savingEvents.value = true;

  try {
    await saveNotificationEvents(events.value);

    savedEvents.value = true;
    setTimeout(() => (savedEvents.value = false), 2000);
  } catch (e) {
    console.error(e);
  }

  savingEvents.value = false;
};

const saveMail = async () => {
  if (!settings.value) return;

  savingMail.value = true;

  try {
    await saveNotificationSettings({
      ...settings.value,
      mail_enabled: mail.value.enabled,
      mail_host: mail.value.host,
      mail_port: mail.value.port,
      mail_username: mail.value.username,
      mail_password: mail.value.password,
      mail_from_email: mail.value.from_email,
      mail_from_name: mail.value.from_name,
      mail_encryption: mail.value.encryption,
    });

    savedMail.value = true;

    setTimeout(() => {
      savedMail.value = false;
    }, 2000);
  } catch (e) {
    console.error(e);
  }

  savingMail.value = false;
};

const saveWebhook = async () => {
  if (!settings.value) return;

  savingWebhook.value = true;

  try {
    await saveNotificationSettings({
      ...settings.value,
      webhook_enabled: webhook.value.enabled,
      webhook_url: webhook.value.url,
      webhook_method: webhook.value.method,
      webhook_secret: webhook.value.secret,
    });

    savedWebhook.value = true;
    setTimeout(() => (savedWebhook.value = false), 2000);
  } catch (e) {
    console.error(e);
  }

  savingWebhook.value = false;
};

const saveTelegram = async () => {
  if (!settings.value) return;

  savingTelegram.value = true;

  try {
    await saveNotificationSettings({
      ...settings.value,
      telegram_enabled: telegram.value.enabled,
      telegram_bot_token: telegram.value.bot_token,
      telegram_chat_id: telegram.value.chat_id,
    });

    savedTelegram.value = true;
    setTimeout(() => (savedTelegram.value = false), 2000);
  } catch (e) {
    console.error(e);
  }

  savingTelegram.value = false;
};

const openModal = (event: NotificationEvent) => {
  selectedEvent.value = JSON.parse(JSON.stringify(event));
  showModal.value = true;
};
const templateVariables = [
  { key: "common_name", label: "Common Name" },
  { key: "serial", label: "Seriennummer" },
  { key: "valid_to", label: "Gültig bis" },
  { key: "user_email", label: "User E-Mail" },
  { key: "approver_email", label: "Approver E-Mail" },
  { key: "username", label: "Username" },
];

const closeModal = () => {
  showModal.value = false;
  selectedEvent.value = null;
};

const saveModal = async () => {
  if (!selectedEvent.value) return;

  const event = selectedEvent.value;

  await saveRecipients(event.id, event.roles || []);

  await saveNotificationEvents([
    {
      id: event.id,
      enabled: event.enabled,
      mail: event.mail,
      webhook: event.webhook,
      telegram: event.telegram,
      title_template: event.title_template,
      message_template: event.message_template,
    },
  ]);

  closeModal();
  await load();
};

const insertVariable = (field: "title" | "message", variable: string) => {
  if (!selectedEvent.value) return;

  const placeholder = `{{${variable}}}`;

  if (field === "title") {
    selectedEvent.value.title_template =
      (selectedEvent.value.title_template || "") + placeholder;
  } else {
    selectedEvent.value.message_template =
      (selectedEvent.value.message_template || "") + placeholder;
  }
};

/* -----------------------------
   Lifecycle
----------------------------- */

onMounted(() => {
  load();
});
</script>

<template>
  <div class="notifications">
    <h1 class="notifications-title">{{ t("notifications.title") }}</h1>

    <!-- TOAST EINSTELLUNGEN -->
    <BaseCard>
      <div class="notifications-card-header">
        <h2>{{ t("notifications.toastTitle") }}</h2>
        <p>{{ t("notifications.toastDesc") }}</p>
      </div>

      <div class="notifications-toast-row">
        <div class="notifications-toast-info">
          <span class="notifications-toast-label">
            {{ t("notifications.toastTitle") }}
          </span>

          <span class="notifications-toast-desc">
            {{ t("notifications.toastBrowserDesc") }}
          </span>
        </div>

        <label class="switch">
          <input type="checkbox" v-model="toastEnabled" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="notifications-actions">
        <BaseButton
          :class="[savedToast ? 'success' : 'primary']"
          :disabled="savingToast"
          @click="saveToastEnabled"
        >
          {{
            savingToast
              ? t("common.saving")
              : savedToast
              ? t("common.saved")
              : t("common.save")
          }}
        </BaseButton>
      </div>
    </BaseCard>

    <!-- EVENTS -->
    <BaseCard style="margin-top: 24px">
      <div class="notifications-card-header">
        <h2>{{ t("notifications.events") }}</h2>
        <p>{{ t("notifications.eventsDesc") }}</p>
      </div>

      <div class="notifications-events-grid">
        <div v-for="event in events" :key="event.id" class="notifications-event-row">
          <div class="event-name">
            {{ event.event }}
          </div>

          <label class="switch">
            <input type="checkbox" v-model="event.enabled" />
            <span class="slider"></span>
          </label>

          <div class="event-channels">
            <button
              class="channel-btn"
              :class="{ active: event.mail }"
              @click="event.mail = !event.mail"
            >
              📧 Mail
            </button>

            <button
              class="channel-btn"
              :class="{ active: event.webhook }"
              @click="event.webhook = !event.webhook"
            >
              🌐 Webhook
            </button>

            <button
              class="channel-btn"
              :class="{ active: event.telegram }"
              @click="event.telegram = !event.telegram"
            >
              🤖 Telegram
            </button>

            <button class="edit-btn" @click="openModal(event)">✏️</button>
          </div>
        </div>
      </div>

      <div class="notifications-actions">
        <BaseButton
          :class="[savedEvents ? 'success' : 'primary']"
          :disabled="savingEvents"
          @click="saveEvents"
        >
          {{
            savingEvents
              ? t("common.saving")
              : savedEvents
              ? t("common.saved")
              : t("common.save")
          }}
        </BaseButton>
      </div>
    </BaseCard>

    <!-- CHANNELS -->
    <div class="notifications-grid">
      <!-- MAIL -->
      <BaseCard>
        <div class="notifications-card-header">
          <h2>E-Mail</h2>
        </div>

        <div class="notifications-form">
          <BaseInput v-model="mail.host" placeholder="SMTP Host" />
          <BaseInput v-model="mail.port" placeholder="Port" />
          <BaseInput v-model="mail.username" :placeholder="t('login.username')" />
          <BaseInput
            v-model="mail.password"
            type="password"
            :placeholder="t('login.password')"
          />
          <BaseInput v-model="mail.from_email" placeholder="From Email" />
          <BaseInput v-model="mail.from_name" placeholder="From Name" />

          <select v-model="mail.encryption" class="notifications-select">
            <option value="tls">TLS</option>
            <option value="ssl">SSL</option>
            <option value="none">{{ t("notifications.none") }}</option>
          </select>

          <BaseInput
            v-model="testEmail"
            :placeholder="t('notifications.testRecipientEmail')"
          />
        </div>

        <div class="notifications-actions">
          <BaseButton class="secondary" @click="testMail">Test</BaseButton>

          <BaseButton
            :class="[savedMail ? 'success' : 'primary']"
            :disabled="savingMail"
            @click="saveMail"
          >
            {{
              savingMail
                ? t("common.saving")
                : savedMail
                ? t("common.saved")
                : t("common.save")
            }}
          </BaseButton>
        </div>
      </BaseCard>

      <!-- WEBHOOK -->
      <BaseCard>
        <div class="notifications-card-header">
          <h2>Webhook</h2>
        </div>

        <div class="notifications-form">
          <BaseInput v-model="webhook.url" placeholder="Webhook URL" />

          <select v-model="webhook.method" class="notifications-select">
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
          </select>

          <BaseInput v-model="webhook.secret" placeholder="Secret" />
        </div>

        <div class="notifications-actions">
          <BaseButton class="secondary" @click="testWebhook">Test</BaseButton>

          <BaseButton
            :class="[savedWebhook ? 'success' : 'primary']"
            :disabled="savingWebhook"
            @click="saveWebhook"
          >
            {{
              savingWebhook
                ? t("common.saving")
                : savedWebhook
                ? t("common.saved")
                : t("common.save")
            }}
          </BaseButton>
        </div>
      </BaseCard>

      <!-- TELEGRAM -->
      <BaseCard>
        <div class="notifications-card-header">
          <h2>Telegram</h2>
        </div>

        <div class="notifications-form">
          <BaseInput v-model="telegram.bot_token" placeholder="Bot Token" />
          <BaseInput v-model="telegram.chat_id" placeholder="Chat ID" />
        </div>

        <div class="notifications-actions">
          <BaseButton class="secondary" @click="testTelegram">Test</BaseButton>

          <BaseButton
            :class="[savedTelegram ? 'success' : 'primary']"
            :disabled="savingTelegram"
            @click="saveTelegram"
          >
            {{
              savingTelegram
                ? t("common.saving")
                : savedTelegram
                ? t("common.saved")
                : t("common.save")
            }}
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  </div>

  <!-- MODAL -->
  <div v-if="showModal && selectedEvent" class="modal-overlay">
    <div class="modal">
      <h2 class="modal-title">
        {{ selectedEvent.event }}
      </h2>

      <div class="modal-top-grid">
        <div class="modal-section">
          <h3>{{ t("notifications.recipients") }}</h3>

          <label>
            <input type="checkbox" value="superadmin" v-model="selectedEvent.roles" />
            SuperAdmin
          </label>

          <label>
            <input type="checkbox" value="pki_admin" v-model="selectedEvent.roles" />
            PKI Admin
          </label>

          <label>
            <input type="checkbox" value="operator" v-model="selectedEvent.roles" />
            Operator
          </label>

          <label>
            <input type="checkbox" value="user" v-model="selectedEvent.roles" />
            User
          </label>
        </div>

        <div class="modal-section">
          <h3>{{ t("notifications.variables") }}</h3>

          <div v-if="variables[selectedEvent.event]">
            <div
              v-for="(group, name) in variables[selectedEvent.event]"
              :key="name"
              class="variable-group"
            >
              <h4>{{ name }}</h4>

              <div v-for="(label, key) in group" :key="key" class="variable-item">
                <span class="variable-key">
                  <span class="variable-key" v-text="'{{' + key + '}}'"></span>
                </span>

                <span class="variable-label">{{ label }}</span>

                <div class="variable-actions">
                  <button @click="insertVariable('title', String(key))">
                    {{ t("notifications.modalTitle") }}
                  </button>

                  <button @click="insertVariable('message', String(key))">
                    {{ t("notifications.modalText") }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <h3>{{ t("notifications.modalTitle") }}</h3>
        <BaseInput v-model="selectedEvent.title_template" />
      </div>

      <div class="modal-section">
        <h3>{{ t("notifications.message") }}</h3>
        <textarea
          v-model="selectedEvent.message_template"
          class="modal-textarea"
        ></textarea>
      </div>

      <div class="modal-actions">
        <BaseButton class="secondary" @click="closeModal">
          {{ t("common.cancel") }}
        </BaseButton>

        <BaseButton class="primary" @click="saveModal">
          {{ t("common.save") }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
