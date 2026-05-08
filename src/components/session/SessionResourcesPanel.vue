<script setup lang="ts">
import type { SessionResourceResponse } from '../../types/api';
import { formatFileSize, getFileIcon } from '../../utils/sessionUi';
import RefreshAction from '../ui/RefreshAction.vue';

const props = withDefaults(
  defineProps<{
    resources: SessionResourceResponse[];
    loading: boolean;
    error: string;
    canUpload: boolean;
    uploadLoading: boolean;
    uploadError: string;
    accessToken?: string | null;
    layout?: 'list' | 'grid';
    title?: string;
    subtitle?: string;
    emptyMessage?: string;
  }>(),
  {
    accessToken: null,
    layout: 'list',
    title: 'Risorse Condivise',
    subtitle: '',
    emptyMessage: 'Nessuna risorsa disponibile.',
  },
);

const emit = defineEmits<{
  (event: 'refresh'): void;
  (event: 'upload-file', file: File): void;
}>();

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    return;
  }

  emit('upload-file', file);
  target.value = '';
};

const buildResourceUrl = (fileUrl: string) =>
  props.accessToken ? `${fileUrl}?token=${props.accessToken}` : fileUrl;
</script>

<template>
  <section class="resources-panel stack">
    <header class="section-header">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>
      </div>
      <RefreshAction
        label="Aggiorna risorse"
        :loading="loading"
        @refresh="emit('refresh')"
      />
    </header>

    <div v-if="canUpload" class="card muted stack">
      <h4 class="card-title">Carica nuovo file</h4>
      <div class="upload-controls">
        <input
          type="file"
          class="file-input"
          :disabled="uploadLoading"
          @change="onFileChange"
        />
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
        </div>
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

.resource-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.resource-item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
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

.file-input {
  padding: 0.5rem;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  width: 100%;
  cursor: pointer;
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
</style>
