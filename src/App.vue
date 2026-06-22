<script setup lang="ts">
import { onMounted, onUnmounted, watch } from "vue";
import ToastContainer from "@/components/common/ToastContainer.vue";
import { useToast } from "@/stores/toast";
import { initEcho } from "@/echo";
import bus from "@/utils/eventBus";
import { currentUser, permissions } from "@/stores/auth";
import { toastActive, loadAllToastSettings } from "@/stores/toastSettings";
import type { AuditLog } from "@/types/auditlog";
import type { CaHealthEvent } from "@/utils/eventBus";
import { useI18n } from "vue-i18n";

const { success, danger, warning, info } = useToast();
const { t } = useI18n();

// =========================================
// 🔥 AUDIT LOG → TOAST MAPPING
// =========================================

const auditLogToToast = (log: AuditLog) => {
  // 🔥 Global oder User deaktiviert → keine Toasts
  if (!toastActive.value) return;

  const cn = (log.meta?.common_name as string) ?? null;
  const username = (log.meta?.username as string) ?? log.username;

  switch (true) {
    // 🔐 ZERTIFIKATE — certificate.view
    case log.action === "certificate.issued":
      if (permissions.value.includes("certificate.view")) {
        success(t("toast.certificateIssued"), cn ?? undefined);
      }
      break;

    case log.action === "certificate.revoked":
      if (permissions.value.includes("certificate.view")) {
        danger(t("toast.certificateRevoked"), cn ?? undefined);
      }
      break;

    case log.action === "certificate.requested":
      if (permissions.value.includes("certificate.approve")) {
        warning(
          t("toast.newCertificateRequest"),
          t("toast.userRequestedCertificate", {
            user: log.username,
            cn: cn ?? "",
          })
        );
        window.dispatchEvent(new Event("certificate-requested"));
      }
      break;

    case log.action === "certificate.approved":
      if (permissions.value.includes("certificate.view")) {
        success(t("toast.certificateRequestApproved"), cn ?? undefined);
      }
      break;

    case log.action === "certificate.rejected":
      if (permissions.value.includes("certificate.view")) {
        danger(t("toast.certificateRequestRejected"), cn ?? undefined);
      }
      break;

    case log.action === "auth.login":
      if (permissions.value.includes("user.view")) {
        info(t("toast.login"), t("toast.userLoggedIn", { user: username }));
      }
      break;

    case log.action === "auth.login.failed":
      if (permissions.value.includes("user.view")) {
        warning(t("toast.loginFailed"), t("toast.username", { user: username }));
      }
      break;

    case log.action === "auth.logout":
      if (permissions.value.includes("user.view")) {
        info(t("toast.logout"), t("toast.userLoggedOut", { user: log.username }));
      }
      break;

    case log.action === "user.created":
      if (permissions.value.includes("user.view")) {
        info(t("toast.userCreated"), (log.meta?.username as string) ?? undefined);
      }
      break;

    case log.action === "user.deleted":
      if (permissions.value.includes("user.view")) {
        warning(t("toast.userDeleted"), (log.meta?.username as string) ?? undefined);
      }
      break;

    case log.action === "ca.root.imported":
      if (permissions.value.includes("settings.manage")) {
        success(t("toast.rootCaImported"), cn ?? undefined);
      }
      break;

    case log.action === "ca.intermediate.imported":
      if (permissions.value.includes("settings.manage")) {
        success(t("toast.intermediateCaImported"), cn ?? undefined);
      }
      break;
    case log.action === "acme.certificate.issued":
      if (permissions.value.includes("certificate.view")) {
        success(
          t("toast.acmeCertIssued"),
          (log.meta?.common_name as string) ?? undefined
        );
      }
      break;

    case log.action === "acme.certificate.revoked":
      if (permissions.value.includes("certificate.view")) {
        danger(
          t("toast.acmeCertRevoked"),
          (log.meta?.common_name as string) ?? undefined
        );
      }
      break;

    case log.action === "acme.account.deactivated":
      if (permissions.value.includes("settings.manage")) {
        warning(
          t("toast.acmeAccountDeactivated"),
          (log.meta?.account_id as string) ?? undefined
        );
      }
      break;

    default:
      break;
  }
};

// =========================================
// 🔥 WEBSOCKET — Einziger globaler Listener
// =========================================

let echoInstance: Awaited<ReturnType<typeof initEcho>> | null = null;

const startGlobalListener = async () => {
  if (!currentUser.value) return;
  if (echoInstance) return;

  try {
    echoInstance = await initEcho();

    // 🔥 Audit Logs Channel
    echoInstance.channel("audit-logs").listen(".AuditLogCreated", (event: AuditLog) => {
      auditLogToToast(event);
      bus.emit("audit-log", event);
      if (event.action === "certificate.issued") bus.emit("certificate.issued", event);
      if (event.action === "certificate.revoked") bus.emit("certificate.revoked", event);
      if (event.action === "certificate.requested")
        bus.emit("certificate.requested", event);
      if (event.action === "certificate.approved")
        bus.emit("certificate.approved", event);
      if (event.action === "certificate.rejected")
        bus.emit("certificate.rejected", event);
    });

    // 🔥 System Health Channel
    echoInstance
      .channel("system-health")
      .listen(".CaHealthChanged", (event: CaHealthEvent) => {
        bus.emit("ca-health", event);
      });
  } catch (e) {
    console.error("WebSocket connection failed", e);
  }
};

const stopGlobalListener = () => {
  echoInstance?.leaveChannel("audit-logs");
  echoInstance?.leaveChannel("system-health");
  echoInstance = null;
};

// =========================================
// 🔥 WATCH — Login/Logout
// =========================================

watch(
  () => currentUser.value,
  (user) => {
    if (user) {
      startGlobalListener();
      loadAllToastSettings();
    } else {
      stopGlobalListener();
    }
  }
);

// =========================================
// 🔥 LIFECYCLE
// =========================================

onMounted(() => {
  startGlobalListener();
  if (currentUser.value) {
    loadAllToastSettings();
  }
});

onUnmounted(() => {
  stopGlobalListener();
});
</script>

<template>
  <router-view />
  <ToastContainer />
</template>
