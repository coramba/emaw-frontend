<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '../api'
import { toast } from '../toast'
import type { AppSettings, Ticker, TriggerConfig } from '../types'
import BackLink from '../components/BackLink.vue'
import Icon from '../components/Icon.vue'
import ThresholdForm from '../components/ThresholdForm.vue'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const router = useRouter()
const detailPath = `/tickers/${props.id}`

const ticker = ref<Ticker | null>(null)
const loading = ref(true)
const loadError = ref(false)
const name = ref('')
const config = ref<Partial<TriggerConfig>>({})
const errors = ref<Record<string, string>>({})
const nameError = ref('')
const saveError = ref('')
const saving = ref(false)
const telegramAlerts = ref(true)
// Account-wide Telegram switch — only used to explain why per-stock alerts won't arrive.
const telegramEnabled = ref(true)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const res = await api.get<{ ticker: Ticker }>(`/api/tickers/${props.id}`)
    ticker.value = res.ticker
    name.value = res.ticker.name ?? ''
    config.value = { ...res.ticker.config }
    telegramAlerts.value = res.ticker.telegramAlerts ?? true
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function loadTelegramEnabled() {
  try {
    telegramEnabled.value = (await api.get<{ settings: AppSettings }>('/api/settings')).settings.telegramEnabled
  } catch {
    // Hint only; keep the plain help text.
  }
}

async function save() {
  if (saving.value) return
  saving.value = true
  errors.value = {}
  nameError.value = ''
  saveError.value = ''
  try {
    await api.patch(`/api/tickers/${props.id}`, {
      name: name.value.trim() || null,
      config: config.value,
      telegramAlerts: telegramAlerts.value,
    })
    toast(t('form.saved'))
    router.push(detailPath)
  } catch (e) {
    const violations = e instanceof ApiError ? e.violations : []
    for (const v of violations) {
      if (v.field === 'name') nameError.value = v.message
      else if (v.field.startsWith('config.')) errors.value[v.field.slice(7)] = v.message
    }
    saveError.value = violations.length ? t('form.fixErrors') : t('form.saveFailed')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  load()
  loadTelegramEnabled()
})
</script>

<template>
  <main class="page narrow has-action-bar">
    <header class="page-head">
      <BackLink :to="detailPath" :label="t('nav.back')" />
      <div class="grow">
        <h1>{{ t('form.title') }}</h1>
        <p v-if="ticker" class="subtitle truncate">
          <span class="sym">{{ ticker.symbol }}</span>
          <span v-if="ticker.name" class="muted">{{ ticker.name }}</span>
        </p>
      </div>
    </header>

    <div v-if="loading" class="stack" :aria-label="t('common.loading')">
      <div class="skeleton" style="height: 88px" />
      <div class="skeleton" style="height: 220px" />
      <div class="skeleton" style="height: 160px" />
    </div>

    <div v-else-if="loadError" class="notice error">
      <Icon name="alert" :size="18" />
      <div class="grow">
        <p>{{ t('form.loadFailed') }}</p>
        <button type="button" class="btn sm retry" @click="load">{{ t('form.retry') }}</button>
      </div>
    </div>

    <form v-else id="edit-form" @submit.prevent="save">
      <section>
        <div class="section-head"><h2>{{ t('form.displayName') }}</h2></div>
        <div class="panel">
          <label for="display-name" class="field-label">{{ t('form.displayNameLabel') }}</label>
          <input
            id="display-name"
            v-model="name"
            class="input"
            :class="{ invalid: nameError }"
            type="text"
            maxlength="255"
            autocomplete="off"
            :placeholder="ticker?.symbol"
          />
          <p v-if="nameError" class="field-error">{{ nameError }}</p>
          <p v-else class="field-help">{{ t('form.displayNameHelp') }}</p>
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>{{ t('form.sensitivity') }}</h2></div>
        <p class="muted small intro">{{ t('form.sensitivityHint') }}</p>
        <ThresholdForm v-model="config" advanced :errors="errors" />
      </section>

      <section class="section">
        <div class="section-head"><h2>{{ t('tickerAlerts.title') }}</h2></div>
        <div class="panel">
          <label class="toggle-row">
            <span class="grow">{{ t('tickerAlerts.switch') }}</span>
            <span class="switch">
              <input v-model="telegramAlerts" type="checkbox" aria-describedby="tg-help" /><span></span>
            </span>
          </label>
          <i18n-t v-if="!telegramEnabled" id="tg-help" keypath="tickerAlerts.globalOff" tag="p" class="field-help" scope="global">
            <template #settings><RouterLink to="/settings">{{ t('tickerAlerts.settingsLink') }}</RouterLink></template>
          </i18n-t>
          <p v-else id="tg-help" class="field-help">{{ t('tickerAlerts.help') }}</p>
        </div>
      </section>

      <p v-if="saveError" class="notice error save-error"><Icon name="alert" :size="18" />{{ saveError }}</p>
    </form>

    <div v-if="!loading && !loadError" class="action-bar">
      <RouterLink :to="detailPath" class="btn quiet">{{ t('common.cancel') }}</RouterLink>
      <button type="submit" form="edit-form" class="btn primary" :disabled="saving">
        {{ saving ? t('form.saving') : t('form.save') }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.subtitle { display: flex; gap: 8px; align-items: baseline; margin-top: 2px; }
.sym { font-family: var(--font-display); font-weight: 650; color: var(--ink); }
.intro { margin: -4px 0 14px; }
.retry { margin-top: 8px; }
.save-error { margin-top: 20px; }
.toggle-row { display: flex; align-items: center; gap: 16px; min-height: 44px; cursor: pointer; font-weight: 600; }
</style>
