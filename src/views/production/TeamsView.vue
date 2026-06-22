<script setup lang="ts">
import { ref, onMounted } from "vue";
import BaseCard from "@/components/common/BaseCard.vue";
import BaseButton from "@/components/common/BaseButton.vue";
import BaseInput from "@/components/common/BaseInput.vue";
import BaseTable from "@/components/common/BaseTable.vue";
import { getTeams, createTeam, updateTeam, deleteTeam } from "@/api/teams";
import type { Team } from "@/types/team";
import { useI18n } from "vue-i18n";
// =========================================
// 🔥 STATE
// =========================================
const { t } = useI18n();
const teams = ref<Team[]>([]);
const loading = ref(false);
const showModal = ref(false);
const isEditMode = ref(false);
const editingId = ref<number | null>(null);

const form = ref({
  name: "",
  description: "",
});

const errors = ref({
  name: false,
});

// =========================================
// 🔥 LOAD
// =========================================

const load = async () => {
  loading.value = true;
  try {
    teams.value = await getTeams();
  } catch (e) {
    console.error("Fehler beim Laden der Teams:", e);
  } finally {
    loading.value = false;
  }
};

// =========================================
// 🔥 MODAL
// =========================================

const resetForm = () => {
  form.value = { name: "", description: "" };
  errors.value = { name: false };
};

const openCreate = () => {
  isEditMode.value = false;
  editingId.value = null;
  resetForm();
  showModal.value = true;
};

const openEdit = (team: Team) => {
  isEditMode.value = true;
  editingId.value = team.id;
  form.value = {
    name: team.name,
    description: team.description ?? "",
  };
  errors.value = { name: false };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  isEditMode.value = false;
  editingId.value = null;
  resetForm();
};

const validate = () => {
  errors.value.name = form.value.name.trim().length < 2;
  return !errors.value.name;
};

const save = async () => {
  if (!validate()) return;

  try {
    const payload = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
    };

    if (isEditMode.value && editingId.value) {
      await updateTeam(editingId.value, payload);
    } else {
      await createTeam(payload);
    }

    await load();
    closeModal();
  } catch (e) {
    console.error("Fehler beim Speichern:", e);
  }
};

const remove = async (team: Team) => {
  if (!confirm(t("teams.deleteConfirm", { name: team.name }))) return;

  try {
    await deleteTeam(team.id);
    await load();
  } catch (e) {
    console.error("Fehler beim Löschen:", e);
  }
};

// =========================================
// 🔥 LIFECYCLE
// =========================================

onMounted(() => {
  load();
});
</script>

<template>
  <div class="users">
    <h1 class="users-title">{{ t("teams.title") }}</h1>

    <!-- Info Card -->
    <BaseCard style="margin-bottom: 20px">
      <h2>{{ t("teams.infoTitle") }}</h2>
      <div
        style="
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 12px;
          font-size: 0.875rem;
          color: var(--color-text-light);
        "
      >
        <p>🔐 <strong>certificate.view.own</strong> — {{ t("teams.infoOwn") }}</p>
        <p>👥 <strong>certificate.view.team</strong> — {{ t("teams.infoTeam") }}</p>
        <p>🌐 <strong>certificate.view.all</strong> — {{ t("teams.infoAll") }}</p>
        <p style="margin-top: 4px">{{ t("teams.infoAssign") }}</p>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="card-header">
        <h2>{{ t("teams.manage") }}</h2>
        <BaseButton class="primary" @click="openCreate">
          + {{ t("teams.create") }}
        </BaseButton>
      </div>

      <!-- Loading -->
      <div v-if="loading" style="padding: 20px; color: var(--color-text-light)">
        {{ t("teams.loading") }}
      </div>

      <!-- Tabelle -->
      <BaseTable v-else>
        <thead>
          <tr>
            <th>{{ t("common.name") }}</th>
            <th>{{ t("common.description") }}</th>
            <th>{{ t("teams.users") }}</th>
            <th>{{ t("certificates.title") }}</th>
            <th>{{ t("common.actions") }}</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="teams.length === 0">
            <td colspan="5" style="color: var(--color-text-light)">{{ t("teams.empty") }}</td>
          </tr>

          <tr v-for="team in teams" :key="team.id">
            <td style="font-weight: 600">{{ team.name }}</td>
            <td style="color: var(--color-text-light); font-size: 0.875rem">
              {{ team.description ?? "—" }}
            </td>
            <td>
              <span class="team-badge">
                {{ team.users_count ?? 0 }} {{ t("teams.users") }}
              </span>
            </td>
            <td>
              <span class="team-badge">
                {{ team.certificates_count ?? 0 }} {{ t("certificates.title") }}
              </span>
            </td>
            <td class="actions">
              <BaseButton class="small" @click="openEdit(team)">
                {{ t("common.edit") }}
              </BaseButton>
              <BaseButton class="small secondary" @click="remove(team)">
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
      <h2>{{ isEditMode ? t("teams.edit") : t("teams.create") }}</h2>

      <div class="modal-form">
        <div>
          <BaseInput v-model="form.name" :placeholder="t('teams.namePlaceholder')" />
          <span v-if="errors.name" class="error-text">
            {{ t("teams.nameMinLength") }}
          </span>
        </div>

        <div>
          <BaseInput
            v-model="form.description"
            :placeholder="t('teams.descriptionPlaceholder')"
          />
        </div>
      </div>

      <div class="modal-actions">
        <BaseButton class="secondary" @click="closeModal">{{
          t("common.cancel")
        }}</BaseButton>
        <BaseButton class="primary" @click="save">{{ t("common.save") }}</BaseButton>
      </div>
    </div>
  </div>
</template>
