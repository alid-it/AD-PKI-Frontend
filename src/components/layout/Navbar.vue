<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { getSetting } from "@/api/settings";
import { logout } from "@/api/auth";
import { getCertificateRequests } from "@/api/certificateRequests";

import { currentUser, permissions, clearUser } from "@/stores/auth";
import { applyBranding } from "@/utils/branding";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const companyName = ref("AD-PKI");

// =========================================
// 📱 MOBILE MENU
// =========================================

const mobileOpen = ref(false);

const toggleMobile = () => {
  mobileOpen.value = !mobileOpen.value;
};

const closeMobile = () => {
  mobileOpen.value = false;
};

// =========================================
// 🌗 THEME (DARK / LIGHT MODE)
// =========================================

const theme = ref<"light" | "dark">("light");

// Theme anwenden: data-Attribut am <html> setzen + passendes Branding-Set
// (Light/Dark haben eigene konfigurierte Farben) anwenden.
const applyTheme = (t: "light" | "dark") => {
  theme.value = t;
  document.documentElement.setAttribute("data-theme", t);
  applyBranding(t);
};

// Per Klick / Tastatur umschalten und in localStorage speichern
const toggleTheme = () => {
  const next = theme.value === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next);
  applyTheme(next);
};

// Menü bei Seitenwechsel schließen
watch(() => route.fullPath, closeMobile);

// =========================================
// 🔥 PENDING REQUESTS BADGE
// =========================================

const pendingCount = ref(0);

const loadPendingCount = async () => {
  if (!canApproveCertificates.value) return;

  try {
    const res = await getCertificateRequests();
    pendingCount.value = Array.isArray(res) ? res.length : 0;
  } catch (e) {
    console.error("Failed to load pending requests", e);
  }
};

// 🔥 Erhöhe Badge wenn neuer Request via WebSocket kommt
const incrementPending = () => {
  if (canApproveCertificates.value) {
    pendingCount.value++;
  }
};

// 🔥 Reset Badge wenn man auf Anfragen-Seite geht
const resetPending = () => {
  pendingCount.value = 0;
};

// 🔥 Globales Event von App.vue
window.addEventListener("certificate-requested", incrementPending);

// =========================================
// 🔥 LOGOUT
// =========================================

const handleLogout = async () => {
  try {
    await logout();
  } catch (e) {
    console.error(e);
  }

  clearUser();

  router.push("/login");
};

// =========================================
// 🔥 SETTINGS
// =========================================

const loadFromStorage = () => {
  const saved = localStorage.getItem("company_name");

  if (saved) {
    companyName.value = saved;
  }
};

// =========================================
// 🔥 PERMISSIONS
// =========================================

const canViewCertificates = computed(() => {
  return permissions.value.includes("certificate.view");
});

const canCreateCertificates = computed(() => {
  return (
    permissions.value.includes("certificate.create") ||
    permissions.value.includes("certificate.request")
  );
});

const canApproveCertificates = computed(() => {
  return permissions.value.includes("certificate.approve");
});

const canRevokeCertificates = computed(() => {
  return permissions.value.includes("certificate.revoke");
});

const canViewCa = computed(() => {
  return permissions.value.includes("certificate.view");
});



const canManageSettings = computed(() => {
  return permissions.value.includes("settings.manage");
});

const canViewUsers = computed(() => {
  return permissions.value.includes("user.view");
});

const canOpenCertificatesMenu = computed(() => {
  return (
    canViewCertificates.value ||
    canCreateCertificates.value ||
    canApproveCertificates.value ||
    canRevokeCertificates.value ||
    canViewCa.value
  );
});

// =========================================
// 🔥 API
// =========================================

const loadFromAPI = async () => {
  const res = await getSetting("company_name");

  if (res) {
    companyName.value = res;
    localStorage.setItem("company_name", res);
  }
};

// =========================================
// 🔥 EVENTS
// =========================================

const handleUpdate = () => {
  loadFromStorage();
};

onMounted(() => {
  loadFromStorage();
  loadFromAPI();
  loadPendingCount();

  // 🌗 Theme initialisieren:
  // 1. gespeicherter Wert -> 2. Systemeinstellung -> 3. "light"
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    applyTheme(saved);
  } else {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    applyTheme(prefersDark ? "dark" : "light");
  }

  window.addEventListener("companyNameUpdated", handleUpdate);
});

onUnmounted(() => {
  window.removeEventListener("companyNameUpdated", handleUpdate);
  window.removeEventListener("certificate-requested", incrementPending);
});
</script>

<template>
  <nav class="navbar" :class="{ 'navbar--open': mobileOpen }">
    <div class="navbar-left">
      <span class="navbar-logo">{{ companyName }}</span>

      <button
        class="navbar-toggle"
        type="button"
        :aria-expanded="mobileOpen"
        aria-label="Menü"
        @click="toggleMobile"
      >
        <span class="navbar-toggle-bar"></span>
        <span class="navbar-toggle-bar"></span>
        <span class="navbar-toggle-bar"></span>
      </button>
    </div>

    <div class="navbar-collapse">
    <div class="navbar-center">
      <router-link to="/dashboard" class="nav-item">
        {{ t("navbar.dashboard") }}
      </router-link>

      <!-- Zertifikate -->
      <div v-if="canOpenCertificatesMenu" class="nav-item dropdown">
        {{ t("navbar.certificates") }}

        <!-- 🔥 Badge -->
        <span v-if="pendingCount > 0 && canApproveCertificates" class="navbar-badge">
          {{ pendingCount > 9 ? "9+" : pendingCount }}
        </span>

        <div class="dropdown-menu">
          <router-link v-if="canViewCertificates" to="/certificates">
            {{ t("navbar.certificates_overview") }}
          </router-link>

          <router-link
            v-if="canApproveCertificates"
            to="/certificates/requests"
            @click="resetPending"
          >
            {{ t('navbar.certificate_requests') }}
            <span v-if="pendingCount > 0" class="navbar-badge-inline">
              {{ pendingCount > 9 ? "9+" : pendingCount }}
            </span>
          </router-link>

          <router-link v-if="canCreateCertificates" to="/certificates/create">
            {{ t('navbar.certificate_create') }}
          </router-link>

          <router-link v-if="canRevokeCertificates" to="/certificates/revoke">
            {{ t('navbar.certificate_revoke') }}
          </router-link>

          <router-link v-if="canViewCa" to="/ca"> {{ t('navbar.ca') }} </router-link>
        </div>
      </div>


      <!-- System -->
      <router-link to="/system" class="nav-item"> {{ t('navbar.system') }} </router-link>

      <!-- Einstellungen -->
      <router-link to="/settings" class="nav-item"> {{ t('navbar.settings') }} </router-link>
    </div>

    <div class="navbar-right">
      <!-- 🌗 Dark-/Light-Mode-Toggle -->
      <button
        class="theme-toggle"
        type="button"
        role="switch"
        :aria-checked="theme === 'dark'"
        :aria-label="
          theme === 'dark' ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'
        "
        @click="toggleTheme"
      >
        <span class="theme-toggle-icon" aria-hidden="true">
          {{ theme === "dark" ? "☀️" : "🌙" }}
        </span>
      </button>

      <div class="nav-item dropdown user-dropdown">
        👤 {{ currentUser?.username || "User" }}

        <div class="dropdown-menu dropdown-menu-right">
          <router-link to="/me"> {{ t('navbar.profile') }} </router-link>

          <a href="#" @click.prevent="handleLogout"> {{ t('navbar.logout') }} </a>
        </div>
      </div>
    </div>
    </div>
  </nav>
</template>
