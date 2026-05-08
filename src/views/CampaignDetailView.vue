<!-- src/views/CampaignDetailView.vue -->
<script setup lang="ts">
import CampaignInfoCard from '../components/campaign-detail/CampaignInfoCard.vue';
import CampaignJoinRequestStatus from '../components/campaign-detail/CampaignJoinRequestStatus.vue';
import CampaignSessionForm from '../components/campaign-detail/CampaignSessionForm.vue';
import CampaignSessionsPanel from '../components/campaign-detail/CampaignSessionsPanel.vue';
import { useCampaignDetailSlice } from '../composables/campaignDetail/useCampaignDetailSlice';

const {
  campaignEditError,
  campaignEditForm,
  campaignEditLoading,
  canMutate,
  canManageCampaign,
  cancelCampaignEdit,
  campaign,
  campaignError,
  closeSessionForm,
  creatingSession,
  deletingCampaign,
  deletingSessionId,
  goToSession,
  handleCreateSession,
  handleDeleteCampaign,
  handleDeleteSession,
  isEditingCampaign,
  joinRequestError,
  loadingCampaign,
  loadingJoinRequest,
  loadingSessions,
  loadSessions,
  myJoinRequest,
  openSessionForm,
  routeCampaignParam,
  saveCampaignEdit,
  sessionForm,
  sessionFormError,
  sessions,
  sessionsError,
  showSessionForm,
  startCampaignEdit,
} = useCampaignDetailSlice();
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">Dettaglio Campagna</h1>
        <p class="section-subtitle">Campaign ID: {{ campaign?.id ?? routeCampaignParam }}</p>
      </header>

      <div v-if="campaignError" class="status-message text-danger">{{ campaignError }}</div>
      <div v-else-if="loadingCampaign">Caricamento campagna...</div>
      <div v-else-if="campaign" class="stack">
        <CampaignInfoCard
          :campaign="campaign"
          :can-edit="canManageCampaign"
          :can-delete="canManageCampaign"
          :is-editing="isEditingCampaign"
          :edit-form="campaignEditForm"
          :saving="campaignEditLoading"
          :delete-loading="deletingCampaign"
          :error-message="campaignEditError"
          @start-edit="startCampaignEdit"
          @cancel-edit="cancelCampaignEdit"
          @save-edit="saveCampaignEdit"
          @delete="handleDeleteCampaign"
        />

        <CampaignJoinRequestStatus
          v-if="!canMutate"
          :loading-join-request="loadingJoinRequest"
          :join-request-error="joinRequestError"
          :my-join-request="myJoinRequest"
        />

        <section class="stack">
          <CampaignSessionsPanel
            :sessions="sessions"
            :sessions-error="sessionsError"
            :loading-sessions="loadingSessions"
            :can-manage="canMutate"
            :deleting-session-id="deletingSessionId"
            @refresh="loadSessions"
            @open-session="goToSession"
            @delete-session="handleDeleteSession"
          />

          <template v-if="canMutate">
            <button
              v-if="!showSessionForm"
              type="button"
              class="mobile-section-create-button"
              @click="openSessionForm"
            >
              + Crea sessione
            </button>
            <CampaignSessionForm
              v-else
              :session-form="sessionForm"
              :creating-session="creatingSession"
              :session-form-error="sessionFormError"
              @submit="handleCreateSession"
              @cancel="closeSessionForm"
            />
          </template>
        </section>
      </div>
    </div>
  </section>
</template>
