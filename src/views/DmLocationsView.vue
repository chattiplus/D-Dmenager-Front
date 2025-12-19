<!-- src/views/DmLocationsView.vue -->
<script setup lang="ts">
import DmLocationsFormPanel from '../components/dm-locations/DmLocationsFormPanel.vue';
import DmLocationsListPanel from '../components/dm-locations/DmLocationsListPanel.vue';
import { useDmLocationsSlice } from '../composables/dmLocations/useDmLocationsSlice';

const {
  activeTab,
  cancelEdit,
  deleteLoading,
  editingLocationId,
  fetchLocations,
  formError,
  formLoading,
  formState,
  locations,
  locationsError,
  locationsLoading,
  parentOptions,
  removeLocation,
  selectedWorldId,
  startEdit,
  upsertLocation,
  worldName,
  worlds,
  worldsError,
} = useDmLocationsSlice();
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">Location del Dungeon Master</h1>
        <p class="section-subtitle">
          Crea e aggiorna i luoghi chiave dei tuoi mondi, inclusi riferimenti gerarchici e note private.
        </p>
      </header>

      <nav class="dm-tabs" role="tablist">
        <button
          type="button"
          class="dm-tab"
          :class="{ active: activeTab === 'locations' }"
          @click="activeTab = 'locations'"
        >
          Location
        </button>
        <button
          type="button"
          class="dm-tab"
          :class="{ active: activeTab === 'create' }"
          @click="activeTab = 'create'"
        >
          Crea location
        </button>
      </nav>

      <DmLocationsListPanel
        v-if="activeTab === 'locations'"
        :worlds="worlds"
        :worlds-error="worldsError"
        :locations-error="locationsError"
        :locations="locations"
        :locations-loading="locationsLoading"
        :selected-world-id="selectedWorldId"
        :delete-loading="deleteLoading"
        :editing-location-id="editingLocationId"
        :world-name="worldName"
        @update:selected-world-id="selectedWorldId = $event"
        @refresh="fetchLocations"
        @edit="startEdit"
        @delete="removeLocation"
      />

      <DmLocationsFormPanel
        v-else
        :worlds="worlds"
        :form-state="formState"
        :parent-options="parentOptions"
        :editing-location-id="editingLocationId"
        :form-error="formError"
        :form-loading="formLoading"
        @submit="upsertLocation"
        @cancel-edit="cancelEdit"
      />
    </div>
  </section>
</template>
