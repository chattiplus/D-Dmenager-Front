<!-- src/views/DmItemsView.vue -->
<script setup lang="ts">
import DmItemsFormPanel from '../components/dm-items/DmItemsFormPanel.vue';
import DmItemsListPanel from '../components/dm-items/DmItemsListPanel.vue';
import { useDmItemsSlice } from '../composables/dmItems/useDmItemsSlice';

const {
  activeTab,
  cancelEdit,
  deleteLoading,
  editingItemId,
  fetchItems,
  formError,
  formLoading,
  formState,
  items,
  itemsError,
  itemsLoading,
  locationOptions,
  locationsError,
  removeItem,
  selectedWorldId,
  startEdit,
  upsertItem,
  worldName,
  worlds,
  worldsError,
} = useDmItemsSlice();
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">Oggetti del Dungeon Master</h1>
        <p class="section-subtitle">
          Registra e modifica il catalogo degli item, con rarità, descrizioni e collegamenti alle location.
        </p>
      </header>

      <nav class="dm-tabs" role="tablist">
        <button
          type="button"
          class="dm-tab"
          :class="{ active: activeTab === 'items' }"
          @click="activeTab = 'items'"
        >
          Oggetti
        </button>
        <button
          type="button"
          class="dm-tab"
          :class="{ active: activeTab === 'create' }"
          @click="activeTab = 'create'"
        >
          Crea oggetto
        </button>
      </nav>

      <DmItemsListPanel
        v-if="activeTab === 'items'"
        :worlds="worlds"
        :worlds-error="worldsError"
        :locations-error="locationsError"
        :items-error="itemsError"
        :items="items"
        :items-loading="itemsLoading"
        :selected-world-id="selectedWorldId"
        :delete-loading="deleteLoading"
        :editing-item-id="editingItemId"
        :world-name="worldName"
        @update:selected-world-id="selectedWorldId = $event"
        @refresh="fetchItems"
        @edit="startEdit"
        @delete="removeItem"
      />

      <DmItemsFormPanel
        v-else
        :worlds="worlds"
        :form-state="formState"
        :location-options="locationOptions"
        :editing-item-id="editingItemId"
        :form-error="formError"
        :form-loading="formLoading"
        @submit="upsertItem"
        @cancel-edit="cancelEdit"
      />
    </div>
  </section>
</template>
