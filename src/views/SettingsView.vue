<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '../api'
import type { AppSettings, IntegrationTestResult } from '../types'

const { t } = useI18n()
const settings = reactive<AppSettings>({ telegramEnabled: false, telegramChatId: '' })
const investigationPrompt = ref('')
const loading = ref(true)
const busy = ref(false)
const saved = ref(false)
const error = ref('')

const testing = ref(false)
const testResult = ref<IntegrationTestResult | null>(null)
const testError = ref('')

const clearingCache = ref(false)

/** Unregisters the PWA service worker and wipes its caches, then reloads —
 * the escape hatch when autoUpdate leaves a stale app shell/bundle behind. */
async function clearAppCache() {
  clearingCache.value = true
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } finally {
    window.location.reload()
  }
}

onMounted(async () => {
  const data = await api.get<{ settings: AppSettings; investigationPrompt: string }>('/api/settings')
  investigationPrompt.value = data.investigationPrompt
  Object.assign(settings, { ...data.settings, telegramChatId: data.settings.telegramChatId ?? '' })
  loading.value = false
})

async function save() {
  busy.value = true
  saved.value = false
  error.value = ''
  try {
    const data = (
      await api.patch<{ settings: AppSettings }>('/api/settings', {
        telegramEnabled: settings.telegramEnabled,
        telegramChatId: settings.telegramChatId || null,
      })
    ).settings
    Object.assign(settings, { ...data, telegramChatId: data.telegramChatId ?? '' })
    saved.value = true
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : t('settings.saveFailed')
  } finally {
    busy.value = false
  }
}

async function runTest() {
  testing.value = true
  testError.value = ''
  testResult.value = null
  try {
    testResult.value = (await api.post<{ result: IntegrationTestResult }>('/api/settings/test')).result
  } catch (e) {
    testError.value = e instanceof ApiError ? e.message : t('settings.testFailed')
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <h1>{{ t('settings.title') }}</h1>
  <p v-if="loading" class="empty">{{ t('common.loading') }}</p>

  <template v-else>
    <form class="card stack" @submit.prevent="save">
      <h3>{{ t('settings.telegramTitle') }}</h3>
      <p class="muted">{{ t('settings.telegramHint') }}</p>

      <label class="row" style="gap: 8px; align-items: center">
        <input type="checkbox" style="width: auto; min-height: 0" v-model="settings.telegramEnabled" />
        {{ t('settings.telegramEnable') }}
      </label>

      <div class="field">
        <label for="chat">{{ t('settings.chatId') }}</label>
        <input id="chat" v-model="settings.telegramChatId" :placeholder="t('settings.chatIdPlaceholder')" />
      </div>

      <p v-if="error" class="alert error">{{ error }}</p>
      <p v-if="saved" class="alert info">{{ t('common.saved') }}</p>

      <div class="row action-bar">
        <button class="primary" type="submit" :disabled="busy">{{ t('common.save') }}</button>
      </div>
    </form>

    <div class="card stack">
      <h3 style="margin: 0">{{ t('settings.promptTitle') }}</h3>
      <p class="muted">{{ t('settings.promptHint') }}</p>
      <details>
        <summary>{{ t('settings.promptShow') }}</summary>
        <pre class="prompt-view">{{ investigationPrompt }}</pre>
      </details>
    </div>

    <div class="card stack">
      <h3>{{ t('settings.testTitle') }}</h3>
      <p class="muted">{{ t('settings.testHint') }}</p>
      <button class="small" :disabled="testing" @click="runTest">
        {{ testing ? t('settings.testing') : t('settings.testRun') }}
      </button>

      <p v-if="testError" class="alert error" style="margin: 0">{{ testError }}</p>

      <div v-if="testResult" class="stack">
        <div v-for="key in (['openai', 'telegram'] as const)" :key="key" class="stack" style="gap: 4px">
          <div class="row between">
            <strong>{{ t(`settings.${key}`) }}</strong>
            <span class="badge" :class="testResult[key].ok ? 'completed' : 'failed'">
              {{ testResult[key].ok ? t('common.ok') : t('common.fail') }}
            </span>
          </div>
          <p class="muted" style="margin: 0">{{ testResult[key].detail }}</p>
        </div>
      </div>
    </div>

    <div class="card stack">
      <h3 style="margin: 0">{{ t('settings.cacheTitle') }}</h3>
      <p class="muted">{{ t('settings.cacheHint') }}</p>
      <button class="small" :disabled="clearingCache" @click="clearAppCache">
        {{ clearingCache ? t('settings.cacheClearing') : t('settings.cacheClear') }}
      </button>
    </div>
  </template>
</template>

<style scoped>
summary {
  cursor: pointer;
  color: var(--accent);
  font-size: 0.9rem;
}
.prompt-view {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--surface-2);
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.82rem;
  line-height: 1.5;
  max-height: 50vh;
  overflow-y: auto;
}
</style>
