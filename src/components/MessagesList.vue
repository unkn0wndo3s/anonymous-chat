<template>
  <div class="msgs" ref="localRef">
    <div v-for="m in messages" :key="m.ts + '_' + m.id" class="msg">
      <div class="meta">{{ m.name }} • {{ formatTime(m.ts) }}</div>

      <div v-if="m.text" class="text">{{ m.text }}</div>

      <template v-if="m.files && m.files.length">
        <div class="files">
          <div v-for="(f, i) in m.files" :key="i" class="file-item">
            <img
              v-if="isImage(f.mime)"
              class="msg-media image"
              :alt="f.name"
              :src="dataUrl(f.mime, f.data)"
            />
            <video
              v-else-if="isVideo(f.mime)"
              class="msg-media video"
              controls
              :src="dataUrl(f.mime, f.data)"
            ></video>
            <div v-else class="attachment">
              <a :href="dataUrl(f.mime, f.data)" :download="f.name">
                Télécharger {{ f.name }} ({{ prettySize(f.size) }})
              </a>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

type FileAttachment = { name: string; mime: string; size: number; data: string };
type ChatMessage = { id: string; name: string; ts: number; text?: string | null; files?: FileAttachment[] };

const props = defineProps<{ messages: ChatMessage[] }>();
const localRef = ref<HTMLElement | null>(null);

function formatTime(ts: number): string {
  try { return new Date(ts || Date.now()).toLocaleTimeString(); } catch { return ''; }
}
function isImage(mime: string): boolean { return !!mime && mime.startsWith('image/'); }
function isVideo(mime: string): boolean { return !!mime && mime.startsWith('video/'); }
function dataUrl(mime: string, base64: string): string { return `data:${mime || 'application/octet-stream'};base64,${base64}`; }
function prettySize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    const el = localRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  }
);
</script>

<style scoped>
.msgs { overflow-y: auto; max-height: 70vh; padding: 0.5rem; }
.msg { margin-bottom: 0.75rem; }
.meta { opacity: 0.7; font-size: 0.85rem; margin-bottom: 0.25rem; }
.files { display: grid; gap: 0.5rem; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
.file-item { min-width: 0; }
.msg-media.image { width: 100%; height: auto; display: block; border-radius: 8px; }
.msg-media.video { width: 100%; display: block; border-radius: 8px; }
.attachment a { text-decoration: underline; }
</style>
