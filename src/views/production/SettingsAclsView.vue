<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import "@/assets/styles/production/acls.css";

import type { Permission } from "@/types/permission";
import type { User } from "@/types/user";
import type { Role } from "@/types/role";
import { refreshCurrentUser } from "@/utils/auth";
import { useI18n } from "vue-i18n";

import {
  createRole,
  deleteRole,
  getPermissions,
  getUserPermissions,
  saveUserPermissions,
  saveRolePermissions,
} from "@/api/permissions";

import { getUsers } from "@/api/users";
import { getRoles } from "@/api/roles";
import api from "@/api/client";

/* -----------------------------
   State
----------------------------- */

// 🔹 Grunddaten
const users = ref<User[]>([]);
const roles = ref<Role[]>([]);
const permissions = ref<Permission[]>([]);
const newRoleName = ref("");
const creatingRole = ref(false);
const deletingRole = ref(false);
const { t } = useI18n();

// 🔹 Auswahl
const selectedUser = ref<number | null>(null);
const selectedRole = ref<number | null>(null);

// 🔥 WICHTIG: GETRENNT!
const selectedRolePermissions = ref<number[]>([]); // 🔹 linke Card
const userRolePermissions = ref<number[]>([]); // 🔹 Role vom User
const userPermissions = ref<number[]>([]); // 🔹 Overrides

// 🔹 Status
const loading = ref(false);

const savingUser = ref(false);
const savedUser = ref(false);

const savingRole = ref(false);
const savedRole = ref(false);

/* -----------------------------
   Grouping
----------------------------- */

const groupedPermissions = computed(() => {
  const groups: Record<string, Permission[]> = {};

  permissions.value.forEach((p) => {
    const group = p.group || p.key.split(".")[0];

    if (!groups[group]) {
      groups[group] = [];
    }

    groups[group].push(p);
  });

  return groups;
});

/* -----------------------------
   Helper (Role Card)
----------------------------- */

const isRoleChecked = (id: number) => selectedRolePermissions.value.includes(id);

/* -----------------------------
   Helper (User Card)
----------------------------- */

const isFromRole = (id: number) => userRolePermissions.value.includes(id);

const isUserChecked = (id: number) => userPermissions.value.includes(id);

const isChecked = (id: number) =>
  userRolePermissions.value.includes(id) || userPermissions.value.includes(id);

/* -----------------------------
   Toggle
----------------------------- */

// 🔹 Role Toggle
const toggleRolePermission = (id: number) => {
  if (selectedRolePermissions.value.includes(id)) {
    selectedRolePermissions.value = selectedRolePermissions.value.filter((p) => p !== id);
  } else {
    selectedRolePermissions.value.push(id);
  }
};

// 🔹 User Toggle (kein Role überschreiben)
const toggleUserPermission = (id: number) => {
  if (isFromRole(id)) return;

  if (userPermissions.value.includes(id)) {
    userPermissions.value = userPermissions.value.filter((p) => p !== id);
  } else {
    userPermissions.value.push(id);
  }
};

/* -----------------------------
   CreateRole
----------------------------- */
const createNewRole = async () => {
  if (!newRoleName.value.trim()) return;

  creatingRole.value = true;

  try {
    await createRole(newRoleName.value);

    newRoleName.value = "";

    roles.value = await getRoles();
  } catch (e) {
    console.error(e);
  }

  creatingRole.value = false;
};

/* -----------------------------
   DeleteRole
----------------------------- */
const deleteSelectedRole = async () => {
  if (!selectedRole.value) return;

  const role = roles.value.find((r) => r.id === selectedRole.value);
  const roleName = role?.name ?? t("acls.thisRole");

  if (!confirm(t("acls.deleteRoleConfirm", { role: roleName }))) {
    return;
  }

  deletingRole.value = true;

  try {
    await deleteRole(selectedRole.value);

    selectedRole.value = null;
    selectedRolePermissions.value = [];

    roles.value = await getRoles();

    await refreshCurrentUser();
  } catch (e) {
    console.error(e);
  } finally {
    deletingRole.value = false;
  }
};

/* -----------------------------
   Load
----------------------------- */

const load = async () => {
  loading.value = true;

  try {
    users.value = await getUsers();
    roles.value = await getRoles();
    permissions.value = await getPermissions();
  } catch (e) {
    console.error(e);
  }

  loading.value = false;
};

/* -----------------------------
   Load Role Permissions
----------------------------- */

const loadRolePermissions = async () => {
  if (!selectedRole.value) return;

  try {
    const res = await api.get(`/roles/${selectedRole.value}/permissions`);
    selectedRolePermissions.value = res.data || [];
  } catch (e) {
    console.error(e);
  }
};

/* -----------------------------
   Load User Permissions
----------------------------- */

const loadUserPermissions = async () => {
  if (!selectedUser.value) return;

  try {
    const res = await getUserPermissions(selectedUser.value);

    userRolePermissions.value = res.role_permissions || [];
    userPermissions.value = res.user_permissions || [];
  } catch (e) {
    console.error(e);
  }
};

/* -----------------------------
   Save
----------------------------- */

// 🔹 Role speichern
const saveRole = async () => {
  if (!selectedRole.value) return;

  savingRole.value = true;

  try {
    await saveRolePermissions(selectedRole.value, selectedRolePermissions.value);

    // 🔥 aktuellen eingeloggten User neu synchronisieren
    await refreshCurrentUser();

    // 🔥 Role Card sauber vom Backend neu laden
    await loadRolePermissions();

    // 🔥 User Card ebenfalls neu laden, falls ein User ausgewählt ist
    if (selectedUser.value) {
      await loadUserPermissions();
    }

    savedRole.value = true;
    setTimeout(() => (savedRole.value = false), 2000);
  } catch (e) {
    console.error(e);
  }

  savingRole.value = false;
};

// 🔹 User speichern (nur Overrides!)
const saveUser = async () => {
  if (!selectedUser.value) return;

  savingUser.value = true;

  try {
    const overrides = userPermissions.value.filter(
      (id) => !userRolePermissions.value.includes(id)
    );

    await saveUserPermissions(selectedUser.value, overrides);

    // 🔥 User Card sauber vom Backend neu laden
    await loadUserPermissions();

    // 🔥 aktuellen eingeloggten User neu synchronisieren
    await refreshCurrentUser();

    savedUser.value = true;
    setTimeout(() => (savedUser.value = false), 2000);
  } catch (e) {
    console.error(e);
  }

  savingUser.value = false;
};

/* -----------------------------
   Lifecycle
----------------------------- */

onMounted(load);
</script>

<template>
  <div class="acls">
    <h1 class="acls-title">{{ t("acls.title") }}</h1>

    <BaseCard>
      <div class="acls-role-create-card">
        <div>
          <h2>{{ t("acls.createRoleTitle") }}</h2>
          <p>{{ t("acls.createRoleDesc") }}</p>
        </div>

        <div class="acls-role-create-actions">
          <input
            v-model="newRoleName"
            type="text"
            :placeholder="t('acls.rolePlaceholder')"
            class="acls-role-input"
            @keyup.enter="createNewRole"
          />

          <BaseButton
            class="primary"
            :disabled="creatingRole || !newRoleName.trim()"
            @click="createNewRole"
          >
            {{ creatingRole ? t("acls.creating") : t("acls.createRole") }}
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <div class="acls-role-actions">
      <BaseButton
        :class="[savedRole ? 'success' : 'primary']"
        :disabled="savingRole"
        @click="saveRole"
      >
        {{
          savingRole
            ? t("common.saving")
            : savedRole
              ? t("common.saved")
              : t("acls.saveRole")
        }}
      </BaseButton>

      <BaseButton
        class="danger"
        :disabled="deletingRole"
        @click="deleteSelectedRole"
      >
        {{ deletingRole ? t("acls.deleting") : t("acls.deleteRole") }}
      </BaseButton>
    </div>

    <div class="acls-grid">
      <BaseCard>
        <h2>{{ t("acls.rolePermissions") }}</h2>

        <select
          v-model="selectedRole"
          class="acls-select"
          @change="loadRolePermissions"
        >
          <option disabled value="">{{ t("acls.selectRole") }}</option>
          <option v-for="r in roles" :key="r.id" :value="r.id">
            {{ r.name }}
          </option>
        </select>

        <div v-if="selectedRole">
          <div
            v-for="(group, name) in groupedPermissions"
            :key="name"
            class="acls-group"
          >
            <div class="acls-group-title">
              {{ name }}
            </div>

            <div class="acls-permissions">
              <label
                v-for="perm in group"
                :key="perm.id"
                class="acls-item"
              >
                <input
                  type="checkbox"
                  :value="perm.id"
                  v-model="selectedRolePermissions"
                />

                {{ perm.label }}
              </label>
            </div>
          </div>

          <BaseButton
            :class="[savedRole ? 'success' : 'primary']"
            :disabled="savingRole"
            @click="saveRole"
          >
            {{
              savingRole
                ? t("common.saving")
                : savedRole
                  ? t("common.saved")
                  : t("acls.saveRole")
            }}
          </BaseButton>
        </div>
      </BaseCard>

      <BaseCard>
        <h2>{{ t("acls.userPermissions") }}</h2>

        <select
          v-model="selectedUser"
          class="acls-select"
          @change="loadUserPermissions"
        >
          <option disabled value="">{{ t("acls.selectUser") }}</option>
          <option v-for="u in users" :key="u.id" :value="u.id">
            {{ u.username }}
          </option>
        </select>

        <div v-if="selectedUser">
          <div
            v-for="(group, name) in groupedPermissions"
            :key="name"
            class="acls-group"
          >
            <div class="acls-group-title">
              {{ name }}
            </div>

            <div class="acls-permissions">
              <label
                v-for="perm in group"
                :key="perm.id"
                class="acls-item"
                :class="{ 'from-role': isFromRole(perm.id) }"
              >
                <input
                  type="checkbox"
                  :checked="isChecked(perm.id)"
                  :disabled="isFromRole(perm.id)"
                  @change="toggleUserPermission(perm.id)"
                />

                {{ perm.label }}

                <span v-if="isFromRole(perm.id)" class="acl-badge">
                  {{ t("acls.roleBadge") }}
                </span>

                <span v-else-if="isUserChecked(perm.id)" class="acl-badge user">
                  {{ t("acls.userBadge") }}
                </span>
              </label>
            </div>
          </div>

          <BaseButton
            :class="[savedUser ? 'success' : 'primary']"
            :disabled="savingUser"
            @click="saveUser"
          >
            {{
              savingUser
                ? t("common.saving")
                : savedUser
                  ? t("common.saved")
                  : t("common.save")
            }}
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  </div>
</template>