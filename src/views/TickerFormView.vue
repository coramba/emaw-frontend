<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '../api'
import type { Ticker, TriggerConfig } from '../types'
import ThresholdForm from '../components/ThresholdForm.vue'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const { t } = useI18n()

const isEdit = !!props.id
const symbol = ref('')
const name = ref<string | null>(null)
const config = reactive<Partial<TriggerConfig>>({})
const loaded = ref(!isEdit)
const busy = ref(false)
const error = ref('')
const violations = ref<{ field: string; message: string }[]>([])

onMounted(async () => {
  if (!isEdit) return
  const { ticker } = await api.get<{ ticker: Ticker }>(`/api/tickers/${props.id}`)
  symbol.value = ticker.symbol
  name.value = ticker.name
  Object.assign(config, ticker.config)
  loaded.value = true
})

async function submit() {
  busy.value = true
  error.value = ''
  violations.value = []
  try {
    if (isEdit) {
      await api.patch(`/api/tickers/${props.id}`, { name: name.value, config })
      router.push(`/tickers/${props.id}`)
    } else {
      const created = await api.post<Ticker>('/api/tickers', { symbol: symbol.value.trim().toUpperCase() })
      router.push(`/tickers/${created.id}/edit`)
    }
  } catch (e) {
    if (e instanceof ApiError) {
      error.value = e.message
      violations.value = e.violations
    } else {
      error.value = t('common.genericError')
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <h1>{{ isEdit ? t('form.configTitle', { symbol }) : t('form.addTitle') }}</h1>

  <p v-if="error" class="alert error">{{ error }}</p>
  <ul v-if="violations.length" class="alert error">
    <li v-for="v in violations" :key="v.field">{{ v.field }}: {{ v.message }}</li>
  </ul>

  <form class="card stack" @submit.prevent="submit" v-if="loaded">
    <template v-if="!isEdit">
      <div class="field">
        <label for="symbol">{{ t('form.symbol') }}</label>
        <input id="symbol" v-model="symbol" :placeholder="t('form.symbolPlaceholder')" required autocapitalize="characters" />
        <p class="muted">{{ t('form.symbolHint') }}</p>
      </div>
    </template>

    <template v-else>
      <div class="field">
        <label for="name">{{ t('form.displayName') }}</label>
        <input id="name" v-model="name" />
      </div>
      <ThresholdForm :model-value="config as TriggerConfig" @update:model-value="Object.assign(config, $event)" />
    </template>

    <div class="row between action-bar">
      <button type="button" class="ghost" @click="router.back()">{{ t('common.cancel') }}</button>
      <button class="primary" type="submit" :disabled="busy">
        {{ isEdit ? t('common.save') : t('form.validateAdd') }}
      </button>
    </div>
  </form>
</template>
