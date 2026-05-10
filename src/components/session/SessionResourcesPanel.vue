<script setup lang="ts">
import { ref } from 'vue';
import type { SessionResourceResponse } from '../../types/api';
import { formatFileSize, getFileIcon } from '../../utils/sessionUi';
import RefreshAction from '../ui/RefreshAction.vue';

const props = withDefaults(
  defineProps<{
    resources: SessionResourceResponse[];
    loading: boolean;
    error: string;
    canUpload: boolean;
    canManageVisibility?: boolean;
    uploadLoading: boolean;
    uploadError: string;
    visibilityUpdatingId?: number | null;
    accessToken?: string | null;
    layout?: 'list' | 'grid';
    title?: string;
    subtitle?: string;
    emptyMessage?: string;
  }>(),
  {
    accessToken: null,
    canManageVisibility: false,
    visibilityUpdatingId: null,
    layout: 'list',
    title: 'Risorse',
    subtitle: '',
    emptyMessage: 'Nessuna risorsa disponibile.',
  },
);

const emit = defineEmits<{
  (event: 'refresh'): void;
  (event: 'upload-file', file: File): void;
  (event: 'update-visibility', resourceId: number, visibleToPlayers: boolean): void;
}>();

const fileInputId = `session-resource-upload-${Math.random().toString(36).slice(2, 10)}`;
const selectedFileName = ref('');

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    selectedFileName.value = '';
    return;
  }

  selectedFileName.value = file.name;
  emit('upload-file', file);
  target.value = '';
};

const buildResourceUrl = (fileUrl: string) =>
  props.accessToken ? `${fileUrl}?token=${props.accessToken}` : fileUrl;
</script>

<template>
  <section class="resources-panel stack">
    <header class="panel-header">
      <div class="panel-heading">
        <h3>{{ title }}</h3>
        <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>
      </div>
      <RefreshAction
        class="panel-refresh"
        label="Aggiorna risorse"
        :loading="loading"
        @refresh="emit('refresh')"
      />
    </header>

    <div v-if="canUpload" class="card muted stack">
      <h4 class="card-title">Carica nuovo file</h4>
      <div class="upload-controls">
        <div class="resource-file-input">
          <span class="resource-file-label">File</span>
          <input
            :id="fileInputId"
            type="file"
            class="sr-only"
            :disabled="uploadLoading"
            @change="onFileChange"
          />
          <label
            :for="fileInputId"
            class="resource-file-picker"
            :class="{ 'is-disabled': uploadLoading }"
            :aria-disabled="uploadLoading ? 'true' : 'false'"
          >
            Seleziona file
          </label>
          <span
            class="resource-file-name"
            :title="selectedFileName || 'Nessun file selezionato'"
          >
            {{ selectedFileName || 'Nessun file selezionato' }}
          </span>
        </div>
        <span v-if="uploadLoading" class="spinner">Caricamento...</span>
      </div>
      <p v-if="uploadError" class="text-danger">{{ uploadError }}</p>
    </div>

    <div v-if="loading" class="muted">Caricamento risorse...</div>
    <div v-else-if="error" class="text-danger">{{ error }}</div>

    <ul v-else-if="layout === 'list' && resources.length" class="resource-list">
      <li v-for="resource in resources" :key="resource.id" class="resource-item">
        <span class="file-icon">{{ getFileIcon(resource.fileType) }}</span>
        <div class="file-info">
          <a
            :href="buildResourceUrl(resource.fileUrl)"
            target="_blank"
            class="file-name"
          >
            {{ resource.fileName }}
          </a>
          <span class="file-meta">
            {{ formatFileSize(resource.fileSize) }} -
            {{ new Date(resource.uploadedAt).toLocaleDateString() }}
          </span>
          <span v-if="canManageVisibility" class="resource-visibility-badge">
            {{ resource.visibleToPlayers ? 'Visibile ai giocatori' : 'Nascosta ai giocatori' }}
          </span>
        </div>
        <button
          v-if="canManageVisibility"
          type="button"
          class="btn btn-secondary btn-sm"
          :disabled="visibilityUpdatingId === resource.id"
          @click="emit('update-visibility', resource.id, !resource.visibleToPlayers)"
        >
          {{ resource.visibleToPlayers ? 'Nascondi' : 'Rendi visibile' }}
        </button>
      </li>
    </ul>

    <div v-else-if="layout === 'grid' && resources.length" class="resources-grid">
      <a
        v-for="resource in resources"
        :key="resource.id"
        :href="buildResourceUrl(resource.fileUrl)"
        target="_blank"
        class="resource-card"
      >
        <div class="resource-preview">
          <img
            v-if="resource.fileType === 'IMAGE'"
            :src="buildResourceUrl(resource.fileUrl)"
            alt="Preview"
            loading="lazy"
          />
          <span v-else class="resource-icon">{{ getFileIcon(resource.fileType) }}</span>
        </div>
        <div class="resource-info">
          <span class="resource-name" :title="resource.fileName">{{ resource.fileName }}</span>
          <span class="resource-meta">{{ formatFileSize(resource.fileSize) }}</span>
          <span v-if="canManageVisibility" class="resource-visibility-badge">
            {{ resource.visibleToPlayers ? 'Visibile ai giocatori' : 'Nascosta ai giocatori' }}
          </span>
          <button
            v-if="canManageVisibility"
            type="button"
            class="btn btn-secondary btn-sm"
            :disabled="visibilityUpdatingId === resource.id"
            @click.prevent="emit('update-visibility', resource.id, !resource.visibleToPlayers)"
          >
            {{ resource.visibleToPlayers ? 'Nascondi' : 'Rendi visibile' }}
          </button>
        </div>
      </a>
    </div>

    <p v-else class="muted">{{ emptyMessage }}</p>
  </section>
</template>

<style scoped>
.resources-panel {
  gap: 1rem;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.panel-heading {
  flex: 1 1 auto;
  min-width: 0;
}

.panel-refresh {
  flex: 0 0 auto;
  margin-left: auto;
}

.resource-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.resource-item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.file-icon {
  font-size: 1.5rem;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  flex: 1;
}

.file-name {
  color: inherit;
  text-decoration: none;
  font-weight: 500;
}

.file-meta {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.upload-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.resource-file-input {
  display: grid;
  gap: 0.5rem;
}

.resource-file-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--app-text);
}

.resource-file-picker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: start;
  min-height: 2.75rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--app-accent) 42%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-surface-elevated) 92%, var(--app-surface));
  color: var(--app-text);
  font-weight: 700;
  padding: 0.65rem 1rem;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--app-shadow) 38%, transparent);
}

.resource-file-picker:hover {
  border-color: color-mix(in srgb, var(--app-accent-strong) 58%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent) 10%, var(--app-surface-elevated));
  box-shadow: 0 0 0.75rem color-mix(in srgb, var(--app-accent-strong) 24%, transparent);
}

.sr-only:focus-visible + .resource-file-picker,
.resource-file-picker:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 2px;
  border-color: var(--app-accent-strong);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--app-accent) 26%, transparent),
    0 10px 22px color-mix(in srgb, var(--app-shadow) 42%, transparent);
}

.resource-file-picker.is-disabled {
  cursor: wait;
  opacity: 0.72;
  transform: none;
}

.resource-file-name {
  min-width: 0;
  max-width: min(100%, 24rem);
  color: var(--app-text-muted);
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.resource-card {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, background 0.2s;
}

.resource-card:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.1);
}

.resource-preview {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.resource-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.resource-icon {
  font-size: 3rem;
  opacity: 0.7;
}

.resource-info {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.resource-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9rem;
}

.resource-meta {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.resource-visibility-badge {
  color: var(--app-text-muted);
  font-size: 0.75rem;
}

@media (max-width: 640px) {
  .resource-file-picker {
    width: 100%;
  }

  .resource-file-name {
    max-width: 100%;
  }
}
</style>
