<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseTable from "@/components/common/BaseTable.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import "@/assets/styles/production/users.css";

import type { User } from "@/types/user";
import type { Role } from "@/types/role";
import type { Team } from "@/types/team";
import { refreshCurrentUser } from "@/utils/auth";
import { currentUser, permissions } from "@/stores/auth";
import { useI18n } from "vue-i18n";
import { applyLocale } from "@/i18n";

import {
  getUsers,
  createUser,
  updateUser,
  deleteUser as apiDeleteUser,
} from "@/api/users";
import { getRoles } from "@/api/roles";
import { getTeams } from "@/api/teams";

// =========================================
// 🌍 LANGUAGE OPTIONS
// =========================================

const languageOptions = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "it", label: "Italiano" },
  { value: "tr", label: "Türkçe" },
];

// =========================================
// 🔐 PERMISSIONS
// =========================================

const canCreateUser = computed(() => permissions.value.includes("user.create"));
const canUpdateUser = computed(() => permissions.value.includes("user.update"));
const canDeleteUser = computed(() => permissions.value.includes("user.delete"));
const canUseUserActions = computed(() => canUpdateUser.value || canDeleteUser.value);
const userTableColspan = computed(() => (canUseUserActions.value ? 8 : 7));
const { t } = useI18n();


// =========================================
// 🔥 STATE
// =========================================

const isEditMode = ref(false);
const editingUserId = ref<number | null>(null);
const users = ref<User[]>([]);
const roles = ref<Role[]>([]);
const teams = ref<Team[]>([]);
const loading = ref(false);
const showModal = ref(false);
const showPassword = ref(false);
const copied = ref(false);

const form = ref({
  username: "",
  firstname: "",
  lastname: "",
  email: "",
  password: "",
  password_confirmation: "",
  role_id: 0,
  team_id: null as number | null,
  locale: "de",
});

const errors = ref({
  username: false,
  firstname: false,
  lastname: false,
  email: false,
  password: false,
  password_confirmation: false,
});

// =========================================
// 🔥 HELPERS
// =========================================

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const generatePassword = (length = 16) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*_-";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
};

const teamName = (teamId: number | null) => {
  if (!teamId) return "—";
  return teams.value.find((t) => t.id === teamId)?.name ?? "—";
};

// =========================================
// 🔥 LOAD
// =========================================

const loadUsers = async () => {
  loading.value = true;

  try {
    users.value = await getUsers();
  } catch (error) {
    console.error("Fehler beim Laden der User:", error);
    users.value = [];
  } finally {
    loading.value = false;
  }
};

const loadRoles = async () => {
  try {
    roles.value = await getRoles();

    if (roles.value.length > 0 && form.value.role_id === 0) {
      form.value.role_id = roles.value[0].id;
    }
  } catch (error) {
    console.error("Fehler beim Laden der Rollen:", error);
    roles.value = [];
  }
};

const localeName = (locale: string | null | undefined) => {
  if (!locale) return "—";
  const found = languageOptions.find((l) => l.value === locale);
  return found ? found.label : locale.toUpperCase();
};

const loadTeams = async () => {
  try {
    teams.value = await getTeams();
  } catch (error) {
    console.error("Fehler beim Laden der Teams:", error);
    teams.value = [];
  }
};

// =========================================
// 🔥 VALIDATION
// =========================================

const validate = () => {
  const passwordFilled =
    form.value.password.length > 0 || form.value.password_confirmation.length > 0;

  errors.value = {
    username: form.value.username.length < 3,
    firstname: form.value.firstname.length < 3,
    lastname: form.value.lastname.length < 3,
    email: !isValidEmail(form.value.email),
    password: isEditMode.value
      ? passwordFilled
        ? form.value.password.length < 8
        : false
      : form.value.password.length < 8,
    password_confirmation: isEditMode.value
      ? passwordFilled
        ? form.value.password_confirmation.length < 8 ||
        form.value.password !== form.value.password_confirmation
        : false
      : form.value.password_confirmation.length < 8 ||
      form.value.password !== form.value.password_confirmation,
  };

  return !Object.values(errors.value).some(Boolean);
};

watch(
  () => form.value.username,
  (v) => {
    errors.value.username = v.length < 3;
  }
);

watch(
  () => form.value.firstname,
  (v) => {
    errors.value.firstname = v.length < 3;
  }
);

watch(
  () => form.value.lastname,
  (v) => {
    errors.value.lastname = v.length < 3;
  }
);

watch(
  () => form.value.email,
  (v) => {
    errors.value.email = !isValidEmail(v);
  }
);

watch(
  () => form.value.password,
  (v) => {
    const passwordFilled = v.length > 0 || form.value.password_confirmation.length > 0;

    if (isEditMode.value) {
      errors.value.password = passwordFilled ? v.length < 8 : false;
      errors.value.password_confirmation = passwordFilled
        ? form.value.password_confirmation.length < 8 ||
        v !== form.value.password_confirmation
        : false;
    } else {
      errors.value.password = v.length < 8;
      errors.value.password_confirmation =
        form.value.password_confirmation.length < 8 ||
        v !== form.value.password_confirmation;
    }
  }
);

watch(
  () => form.value.password_confirmation,
  (v) => {
    const passwordFilled = v.length > 0 || form.value.password.length > 0;

    if (isEditMode.value) {
      errors.value.password_confirmation = passwordFilled
        ? v.length < 8 || v !== form.value.password
        : false;
    } else {
      errors.value.password_confirmation = v.length < 8 || v !== form.value.password;
    }
  }
);

// =========================================
// 🔥 MODAL
// =========================================

const resetForm = () => {
  form.value = {
    username: "",
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    password_confirmation: "",
    role_id: roles.value[0]?.id ?? 0,
    team_id: null,
    locale: "de",
  };

  showPassword.value = false;
  copied.value = false;
};

const resetErrors = () => {
  errors.value = {
    username: false,
    firstname: false,
    lastname: false,
    email: false,
    password: false,
    password_confirmation: false,
  };
};

const openCreate = () => {
  if (!canCreateUser.value) return;

  isEditMode.value = false;
  editingUserId.value = null;
  resetForm();
  resetErrors();
  showModal.value = true;
};

const openEdit = (user: User) => {
  if (!canUpdateUser.value) return;

  resetErrors();

  isEditMode.value = true;
  editingUserId.value = user.id;

  form.value = {
    username: user.username,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    password: "",
    password_confirmation: "",
    role_id: roles.value.find((role) => role.name === user.role)?.id ?? 0,
    team_id: user.team_id ?? null,
    locale: user.locale ?? "de",
  };

  showPassword.value = false;
  copied.value = false;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  isEditMode.value = false;
  editingUserId.value = null;
  showPassword.value = false;
  copied.value = false;
};

const fillGeneratedPassword = () => {
  const password = generatePassword(16);

  form.value.password = password;
  form.value.password_confirmation = password;

  errors.value.password = false;
  errors.value.password_confirmation = false;
};

const copyPassword = async () => {
  if (!form.value.password) return;

  try {
    await navigator.clipboard.writeText(form.value.password);

    copied.value = true;

    setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch (error) {
    console.error("Copy failed:", error);
  }
};

const saveUser = async () => {
  if (isEditMode.value && !canUpdateUser.value) return;
  if (!isEditMode.value && !canCreateUser.value) return;
  if (!validate()) return;

  try {
    const payload: Record<string, unknown> = {
      username: form.value.username,
      firstname: form.value.firstname,
      lastname: form.value.lastname,
      email: form.value.email,
      role_id: form.value.role_id,
      team_id: form.value.team_id,
      locale: form.value.locale,
    };

    if (form.value.password) {
      payload.password = form.value.password;
      payload.password_confirmation = form.value.password_confirmation;
    }

    if (isEditMode.value && editingUserId.value) {
      await updateUser(editingUserId.value, payload as any);
    } else {
      await createUser(payload as any);
    }

    await loadUsers();

    if (currentUser.value && editingUserId.value === currentUser.value.id) {
      await refreshCurrentUser();
      applyLocale(form.value.locale);
    }

    closeModal();
    resetForm();
    resetErrors();
  } catch (error) {
    console.error("Fehler beim Speichern des Users:", error);
  }
};

const deleteUser = async (id: number) => {
  if (!canDeleteUser.value) return;
  if (id === 1) return;
  if (!confirm(t("users.deleteConfirm"))) return;

  try {
    await apiDeleteUser(id);
    await loadUsers();
  } catch (error) {
    console.error("Fehler beim Löschen:", error);
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && showModal.value) {
    closeModal();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  loadUsers();
  loadRoles();
  loadTeams();
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div class="users">
    <h1 class="users-title">{{ t("users.title") }}</h1>

    <BaseCard>
      <div class="card-header">
        <h2>{{ t("users.heading") }}</h2>

        <BaseButton v-if="canCreateUser" class="primary" @click="openCreate">
          + {{ t("users.create") }}
        </BaseButton>
      </div>

      <BaseTable>
        <thead>
          <tr>
            <th>{{ t("users.username") }}</th>
            <th>{{ t("users.firstname") }}</th>
            <th>{{ t("users.lastname") }}</th>
            <th>{{ t("users.email") }}</th>
            <th>{{ t("users.role") }}</th>
            <th>{{ t("users.team") }}</th>
            <th>{{ t("users.language") }}</th>
            <th v-if="canUseUserActions">{{ t("common.actions") }}</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="loading">
            <td :colspan="userTableColspan">{{ t("users.loading") }}</td>
          </tr>

          <tr v-else-if="users.length === 0">
            <td :colspan="userTableColspan">{{ t("users.empty") }}</td>
          </tr>

          <tr v-else v-for="user in users" :key="user.id">
            <td>{{ user.username }}</td>
            <td>{{ user.firstname }}</td>
            <td>{{ user.lastname }}</td>
            <td>{{ user.email }}</td>

            <td>
              <span v-if="user.role" :class="['role-badge', user.role.toLowerCase()]">
                {{ user.role }}
              </span>
              <span v-else>-</span>
            </td>

            <td>
              <span v-if="user.team_id" class="team-badge">
                {{ teamName(user.team_id) }}
              </span>
              <span v-else class="text-muted">—</span>
            </td>

            <td>
              <span class="locale-badge">
                {{ localeName(user.locale ?? null) }}
              </span>
            </td>

            <td v-if="canUseUserActions" class="actions">
              <BaseButton v-if="canUpdateUser" class="small" @click="openEdit(user)">
                {{ t("common.edit") }}
              </BaseButton>

              <BaseButton v-if="canDeleteUser" class="small secondary" :disabled="user.id === 1"
                @click="deleteUser(user.id)">
                {{ t("common.delete") }}
              </BaseButton>
            </td>
          </tr>
        </tbody>
      </BaseTable>
    </BaseCard>
  </div>

  <!-- MODAL -->
  <div v-if="showModal" class="modal-overlay">
    <div class="modal">
      <h2>{{ isEditMode ? t("users.edit") : t("users.create") }}</h2>

      <div class="modal-form">
        <div>
          <BaseInput v-model="form.username" :placeholder="t('users.username')" />
          <span v-if="errors.username" class="error-text">
            {{ t("users.min3") }}
          </span>
        </div>

        <div>
          <BaseInput v-model="form.firstname" :placeholder="t('users.firstname')" />
          <span v-if="errors.firstname" class="error-text">
            {{ t("users.min3") }}
          </span>
        </div>

        <div>
          <BaseInput v-model="form.lastname" :placeholder="t('users.lastname')" />
          <span v-if="errors.lastname" class="error-text">
            {{ t("users.min3") }}
          </span>
        </div>

        <div>
          <BaseInput v-model="form.email" :placeholder="t('users.email')" />
          <span v-if="errors.email" class="error-text">
            {{ t("users.invalidEmail") }}
          </span>
        </div>

        <div>
          <div class="password-row">
            <BaseInput v-model="form.password" :type="showPassword ? 'text' : 'password'"
              :placeholder="t('login.password')" />

            <button type="button" class="icon-btn" @click="showPassword = !showPassword">
              {{ showPassword ? "🙈" : "👁️" }}
            </button>

            <button type="button" class="icon-btn" @click="fillGeneratedPassword">
              🎲
            </button>

            <button type="button" class="icon-btn" :class="{ 'icon-btn--success': copied }" @click="copyPassword">
              📋
            </button>
          </div>

          <span v-if="errors.password" class="error-text">
            {{ isEditMode ? t("users.min8OnPasswordChange") : t("users.min8") }}
          </span>
        </div>

        <div>
          <BaseInput v-model="form.password_confirmation" type="password" :placeholder="t('users.repeatPassword')" />

          <span v-if="errors.password_confirmation" class="error-text">
            {{ t("users.passwordMismatch") }}
          </span>
        </div>

        <!-- Rolle -->
        <select v-model="form.role_id" class="modal-select">
          <option v-for="role in roles" :key="role.id" :value="role.id">
            {{ role.name }}
          </option>
        </select>

        <!-- Sprache -->
        <select v-model="form.locale" class="modal-select">
          <option v-for="language in languageOptions" :key="language.value" :value="language.value">
            {{ language.label }}
          </option>
        </select>

        <!-- Team -->
        <select v-model="form.team_id" class="modal-select">
          <option :value="null">{{ t("certificates.noTeam") }}</option>

          <option v-for="team in teams" :key="team.id" :value="team.id">
            {{ team.name }}
          </option>
        </select>
      </div>

      <div class="modal-actions">
        <BaseButton class="secondary" @click="closeModal">
          {{ t("common.cancel") }}
        </BaseButton>

        <BaseButton class="primary" @click="saveUser">
          {{ t("common.save") }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>