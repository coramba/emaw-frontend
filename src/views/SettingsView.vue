<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '../api'
import type { AppSettings, HistoryRange, IntegrationTestResult } from '../types'
import { HISTORY_RANGES, setDefaultRange } from '../chartRange'
import { LOCALES, setLocale } from '../i18n'
import { theme, setTheme, THEMES, type Theme } from '../theme'
import { toast } from '../toast'
import Icon, { type IconName } from '../components/Icon.vue'
import SettingsTabs from '../components/SettingsTabs.vue'

const { t, locale } = useI18n()

const THEME_ICONS: Record<Theme, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' }
const LOCALE_NAMES: Record<string, string> = { en: 'English', sk: 'Slovenčina', ru: 'Русский' }

const settings = reactive<AppSettings>({ telegramEnabled: false, telegramChatId: '', defaultChartRange: '1mo' })
const investigationPrompt = ref('')
const loading = ref(true)
const loadError = ref(false)
const busy = ref(false)
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

function apply(s: AppSettings) {
  Object.assign(settings, { ...s, telegramChatId: s.telegramChatId ?? '' })
  setDefaultRange(s.defaultChartRange)
}

async function saveChartRange(range: HistoryRange) {
  const previous = settings.defaultChartRange
  settings.defaultChartRange = range
  try {
    apply((await api.patch<{ settings: AppSettings }>('/api/settings', { defaultChartRange: range })).settings)
    toast(t('settings.saved'))
  } catch {
    settings.defaultChartRange = previous
    toast(t('settings.saveFailed'), 'error')
  }
}

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const data = await api.get<{ settings: AppSettings; investigationPrompt: string }>('/api/settings')
    investigationPrompt.value = data.investigationPrompt
    apply(data.settings)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function save() {
  busy.value = true
  error.value = ''
  try {
    const { settings: s } = await api.patch<{ settings: AppSettings }>('/api/settings', {
      telegramEnabled: settings.telegramEnabled,
      telegramChatId: settings.telegramChatId || null,
    })
    apply(s)
    toast(t('settings.saved'))
  } catch (e) {
    error.value = e instanceof ApiError && e.violations.length ? e.violations[0].message : t('settings.saveFailed')
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
  } catch {
    testError.value = t('settings.testFailed')
  } finally {
    testing.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="page narrow">
    <SettingsTabs />

    <section class="panel group">
      <h2>{{ t('settings.languageTitle') }}</h2>
      <p class="muted small">{{ t('settings.languageHint') }}</p>
      <div class="seg lang" role="group" :aria-label="t('settings.languageTitle')">
        <button v-for="l in LOCALES" :key="l" type="button" :lang="l" :aria-pressed="locale === l" @click="setLocale(l)">
          {{ LOCALE_NAMES[l] }}
        </button>
      </div>
    </section>

    <section class="panel group">
      <h2>{{ t('settings.appearanceTitle') }}</h2>
      <p class="muted small">{{ t('settings.appearanceHint') }}</p>
      <div class="seg lang" role="group" :aria-label="t('settings.appearanceTitle')">
        <button v-for="th in THEMES" :key="th" type="button" :aria-pressed="theme === th" @click="setTheme(th)">
          <Icon :name="THEME_ICONS[th]" :size="16" />{{ t(`settings.appearance.${th}`) }}
        </button>
      </div>
    </section>

    <div v-if="loading" class="skeleton" style="height: 260px; margin-top: 16px; border-radius: var(--r-lg)"></div>

    <div v-else-if="loadError" class="notice error load-error">
      <Icon name="alert" />
      <span class="grow">{{ t('settings.loadFailed') }}</span>
      <button type="button" class="btn sm" @click="load">{{ t('settings.retry') }}</button>
    </div>

    <template v-else>
      <section class="panel group">
        <h2>{{ t('settings.chartTitle') }}</h2>
        <p class="muted small">{{ t('settings.chartHint') }}</p>
        <div class="seg lang" role="group" :aria-label="t('settings.chartTitle')">
          <button
            v-for="r in HISTORY_RANGES"
            :key="r"
            type="button"
            :aria-pressed="settings.defaultChartRange === r"
            @click="saveChartRange(r)"
          >
            {{ t(`chart.range.${r}`) }}
          </button>
        </div>
      </section>

      <form class="panel group" @submit.prevent="save">
        <h2>{{ t('settings.telegramTitle') }}</h2>
        <p class="muted small">{{ t('settings.telegramHint') }}</p>

        <label class="toggle-row">
          <span class="grow">{{ t('settings.telegramEnable') }}</span>
          <span class="switch"><input v-model="settings.telegramEnabled" type="checkbox" /><span></span></span>
        </label>

        <div>
          <label class="field-label" for="chat">{{ t('settings.chatId') }}</label>
          <input
            id="chat"
            v-model.trim="settings.telegramChatId"
            class="input num"
            inputmode="numeric"
            autocomplete="off"
            :placeholder="t('settings.chatIdPlaceholder')"
            aria-describedby="chat-help"
          />
          <p id="chat-help" class="field-help">{{ t('settings.chatIdHelp') }}</p>
        </div>

        <p v-if="error" class="notice error" role="alert"><Icon name="alert" :size="18" />{{ error }}</p>

        <div>
          <button class="btn primary" type="submit" :disabled="busy">
            {{ busy ? t('settings.saving') : t('common.save') }}
          </button>
        </div>
      </form>

      <section class="panel group">
        <h2>{{ t('settings.testTitle') }}</h2>
        <p class="muted small">{{ t('settings.testHint') }}</p>
        <div>
          <button type="button" class="btn" :disabled="testing" @click="runTest">
            <Icon name="refresh" :size="18" :class="{ spin: testing }" />
            {{ testing ? t('settings.testing') : t('settings.testRun') }}
          </button>
        </div>

        <p v-if="testError" class="notice error"><Icon name="alert" :size="18" />{{ testError }}</p>

        <div v-if="testResult" class="checks">
          <div v-for="key in (['openai', 'telegram'] as const)" :key="key" class="check">
            <div class="row between">
              <strong>{{ t(`settings.${key}`) }}</strong>
              <span class="pill" :class="testResult[key].ok ? 'rise' : 'drop'">
                <Icon :name="testResult[key].ok ? 'check' : 'close'" :size="14" />
                {{ testResult[key].ok ? t('settings.checkOk') : t('settings.checkFail') }}
              </span>
            </div>
            <p class="muted small detail">{{ testResult[key].detail }}</p>
          </div>
        </div>
      </section>

      <section class="panel group">
        <h2>{{ t('settings.promptTitle') }}</h2>
        <p class="muted small">{{ t('settings.promptHint') }}</p>
        <details>
          <summary>{{ t('settings.promptShow') }}</summary>
          <pre class="prompt-view inset">{{ investigationPrompt }}</pre>
        </details>
      </section>
    </template>

    <section class="panel group">
      <h2>{{ t('settings.troubleTitle') }}</h2>
      <p class="muted small">{{ t('settings.cacheHint') }}</p>
      <div>
        <button type="button" class="btn" :disabled="clearingCache" @click="clearAppCache">
          <Icon name="rearm" :size="18" />{{ clearingCache ? t('settings.cacheClearing') : t('settings.cacheClear') }}
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.group { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; }
.group > h2 + p { margin-top: -8px; }
.lang { align-self: flex-start; max-width: 100%; }
.lang button { display: inline-flex; align-items: center; gap: 6px; }
.toggle-row { display: flex; align-items: center; gap: 16px; min-height: 44px; cursor: pointer; font-weight: 600; }
.load-error { align-items: center; margin-top: 16px; }
.checks { display: flex; flex-direction: column; }
.check { padding: 12px 0; border-top: 1px solid var(--line); }
.detail { margin-top: 4px; overflow-wrap: anywhere; }
summary { cursor: pointer; color: var(--tide); font-weight: 600; font-size: 0.92rem; min-height: 32px; }
.prompt-view {
  margin: 10px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--ink-2);
  max-height: 50vh;
  overflow-y: auto;
}
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
