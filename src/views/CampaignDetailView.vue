<!-- src/views/CampaignDetailView.vue -->
<script setup lang="ts">
import CampaignInfoCard from '../components/campaign-detail/CampaignInfoCard.vue';
import CampaignJoinRequestStatus from '../components/campaign-detail/CampaignJoinRequestStatus.vue';
import CampaignSessionForm from '../components/campaign-detail/CampaignSessionForm.vue';
import CampaignSessionsPanel from '../components/campaign-detail/CampaignSessionsPanel.vue';
import { useCampaignDetailSlice } from '../composables/campaignDetail/useCampaignDetailSlice';

const {
  canMutate,
  campaign,
  campaignError,
  creatingSession,
  goToSession,
  handleCreateSession,
  joinRequestError,
  loadingCampaign,
  loadingJoinRequest,
  loadingSessions,
  loadSessions,
  myJoinRequest,
  routeCampaignParam,
  sessionForm,
  sessionFormError,
  sessions,
  sessionsError,
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
        <CampaignInfoCard :campaign="campaign" />

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
            @refresh="loadSessions"
            @open-session="goToSession"
          />

          <CampaignSessionForm
            v-if="canMutate"
            :session-form="sessionForm"
            :creating-session="creatingSession"
            :session-form-error="sessionFormError"
            @submit="handleCreateSession"
          />
        </section>
      </div>
    </div>
  </section>
</template>
