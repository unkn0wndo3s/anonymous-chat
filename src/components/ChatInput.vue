<template>
  <form class="form" @submit.prevent="submit">
    <div class="input-row">
      <!-- fichiers -->
      <div class="files" v-if="files.length">
        <span v-for="(f, i) in files" :key="i" class="file-chip">
          <span class="filename">{{ f.name }}</span>
          <span class="filesize">({{ prettySize(f.size) }})</span>
          <button type="button" @click="removeAt(i)" :disabled="disabled" aria-label="Retirer">
            ✕
          </button>
        </span>
      </div>

      <!-- bouton + -->
      <div
        style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 1rem"
      >
        <button type="button" @click="triggerPick" :disabled="disabled">+</button>
        <input
          ref="fileInput"
          type="file"
          class="sr-only"
          multiple
          @change="onPick"
          :disabled="disabled"
        />

        <!-- champ texte -->
        <textarea
          ref="ta"
          :disabled="disabled"
          v-model="text"
          placeholder="Écrire un message…"
          @input="onTyping"
        ></textarea>

        <!-- bouton envoyer -->
        <button type="submit" :disabled="disabled || !canSend">Envoyer</button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })
const emit = defineEmits<{
  (e: 'typing', text: string): void
  (e: 'submit', payload: { text: string; files?: File[] }): void
}>()

const ta = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const text = ref<string>('')
const files = ref<File[]>([])

const canSend = computed(() => !!text.value.trim() || files.value.length > 0)

function onTyping(): void {
  if (props.disabled) return
  emit('typing', text.value)
}

function triggerPick(): void {
  if (props.disabled) return
  fileInput.value?.click()
}

function onPick(e: Event): void {
  const input = e.target as HTMLInputElement
  const list = Array.from(input.files ?? [])
  if (!list.length) return
  files.value = files.value.concat(list)
}

function removeAt(i: number): void {
  files.value.splice(i, 1)
}

function clearFiles(): void {
  files.value = []
  if (fileInput.value) fileInput.value.value = ''
}

function prettySize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function submit(): void {
  if (props.disabled) return
  if (!canSend.value) return
  emit('submit', { text: text.value.trim(), files: files.value.slice() })
  text.value = ''
  clearFiles()
}

// --- DnD global (multi) ---
function onWindowDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = props.disabled ? 'none' : 'copy'
}
function onWindowDrop(e: DragEvent) {
  e.preventDefault()
  if (props.disabled) return
  const list = Array.from(e.dataTransfer?.files ?? [])
  if (list.length) files.value = files.value.concat(list)
}

onMounted(() => {
  window.addEventListener('dragover', onWindowDragOver, { passive: false })
  window.addEventListener('drop', onWindowDrop, { passive: false })
})
onBeforeUnmount(() => {
  window.removeEventListener('dragover', onWindowDragOver as any)
  window.removeEventListener('drop', onWindowDrop as any)
})
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.file-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
  overflow: hidden;
}
.files {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5rem;
  margin: 0.5rem 0; /* espace entre les fichiers et le textarea */
}

.file-chip {
  flex: 1 1 auto; /* prend la place dispo mais garde marge */
  min-width: 120px; /* largeur mini pour rester lisible */
  max-width: 250px; /* évite qu’un fichier prenne toute la ligne */
  background: #222;
  color: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.5em;
  overflow: hidden;
}

.file-chip .filename {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-chip .filesize {
  flex-shrink: 0;
  opacity: 0.8;
  font-size: 0.85em;
}

.file-chip button {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  font-weight: bold;
}

.file-hint {
  opacity: 0.7;
}
.files {
  width: 80%;
}
.input-row {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
}
</style>
