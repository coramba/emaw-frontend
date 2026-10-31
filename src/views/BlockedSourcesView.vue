<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '../api'
import type { BlockedSource } from '../types'
import { fmtDay } from '../format'
import { toast } from '../toast'
import Icon from '../components/Icon.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import SettingsTabs from '../components/SettingsTabs.vue'

const { t } = useI18n()

const sources = ref<BlockedSource[]>([])
const loading = ref(true)
const loadError = ref(false)

const input = ref('')
const adding = ref(false)
const addError = ref('')

const toRemove = ref<BlockedSource | null>(null)
const removing = ref(false)
const removeError = ref('')

async function load() {
  loading.value = true
  loadError.value = false
  try {
    sources.value = (await api.get<{ sources: BlockedSource[] }>('/api/blocked-sources')).sources
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function add() {
  const source = input.value.trim()
  if (!source || adding.value) return
  adding.value = true
  addError.value = ''
  try {
    const res = await api.post<{ source: BlockedSource }>('/api/blocked-sources', { source })
    sources.value = [res.source, ...sources.value]
    input.value = ''
    toast(t('blocked.added', { domain: res.source.domain }))
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 0
    addError.value = t(status === 409 ? 'blocked.already' : status === 422 ? 'blocked.invalid' : 'blocked.addFailed')
  } finally {
    adding.value = false
  }
}

async function confirmRemove() {
  const s = toRemove.value
  if (!s) return
  removing.value = true
  removeError.value = ''
  try {
    await api.del(`/api/blocked-sources/${s.id}`)
    sources.value = sources.value.filter((x) => x.id !== s.id)
    toRemove.value = null
    toast(t('blocked.removed', { domain: s.domain }))
  } catch {
    removeError.value = t('common.genericError')
  } finally {
    removing.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="page narrow">
    <SettingsTabs />

    <p class="muted intro">{{ t('blocked.intro') }}</p>

    <form class="panel add" novalidate @submit.prevent="add">
      <label class="field-label" for="block-source">{{ t('blocked.inputLabel') }}</label>
      <div class="add-row">
        <input
          id="block-source"
          v-model="input"
          class="input"
          :class="{ invalid: addError }"
          type="text"
          inputmode="url"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :placeholder="t('blocked.placeholder')"
          :aria-invalid="!!addError"
          aria-describedby="block-help"
          @input="addError = ''"
        />
        <button type="submit" class="btn primary" :disabled="adding || !input.trim()">
          <Icon name="ban" :size="18" />{{ adding ? t('blocked.blocking') : t('blocked.block') }}
        </button>
      </div>
      <p v-if="addError" id="block-help" class="field-error" role="alert">{{ addError }}</p>
      <p v-else id="block-help" class="field-help">{{ t('blocked.inputHelp') }}</p>
    </form>

    <section class="section">
      <div class="section-head">
        <h2>{{ t('blocked.listTitle') }}</h2>
        <span v-if="!loading && !loadError && sources.length" class="hint">{{ t('blocked.count', sources.length) }}</span>
      </div>

      <div v-if="loading" class="panel tight" :aria-label="t('common.loading')">
        <div v-for="i in 3" :key="i" class="list-row">
          <div class="grow">
            <div class="skeleton" style="height: 18px; width: 55%"></div>
            <div class="skeleton" style="height: 12px; width: 35%; margin-top: 8px"></div>
          </div>
        </div>
      </div>

      <div v-else-if="loadError" class="notice error load-error">
        <Icon name="alert" />
        <span class="grow">{{ t('blocked.loadFailed') }}</span>
        <button type="button" class="btn sm" @click="load">{{ t('settings.retry') }}</button>
      </div>

      <div v-else-if="!sources.length" class="panel empty">
        <span class="empty-icon" aria-hidden="true"><Icon name="ban" :size="22" /></span>
        <div>
          <p class="empty-title">{{ t('blocked.emptyTitle') }}</p>
          <p class="muted small">{{ t('blocked.emptyText') }}</p>
        </div>
      </div>

      <ul v-else class="panel tight list">
        <li v-for="s in sources" :key="s.id" class="list-row">
          <div class="grow">
            <p class="domain truncate">{{ s.domain }}</p>
            <p class="tiny faint">{{ t('blocked.since', { date: fmtDay(s.createdAt) }) }}</p>
          </div>
          <button
            type="button"
            class="btn sm quiet"
            :aria-label="t('blocked.unblockAria', { domain: s.domain })"
            @click="toRemove = s; removeError = ''"
          >
            {{ t('blocked.unblock') }}
          </button>
        </li>
      </ul>
    </section>

    <ConfirmDialog
      v-if="toRemove"
      :title="t('blocked.confirmTitle', { domain: toRemove.domain })"
      :message="t('blocked.confirmMessage')"
      :confirm-label="t('blocked.unblock')"
      tone="primary"
      :busy="removing"
      :error="removeError"
      @cancel="toRemove = null"
      @confirm="confirmRemove"
    />
  </main>
</template>

<style scoped>
.intro { margin: 16px 0; max-width: 60ch; }
.add-row { display: flex; gap: 10px; }
.add-row .input { flex: 1; min-width: 0; }
.add-row .btn { min-height: 48px; }
@media (max-width: 479px) {
  .add-row { flex-direction: column; }
}
.list { margin: 0; list-style: none; }
.domain { font-family: var(--font-display); font-weight: 650; font-size: 1.05rem; line-height: 1.3; }
.list .btn { margin-right: -8px; }
.empty { display: flex; align-items: center; gap: 14px; }
.empty-title { font-weight: 600; }
.empty-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--ink-3);
}
.load-error { align-items: center; }
</style>
