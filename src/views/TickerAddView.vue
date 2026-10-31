<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '../api'
import { fmtPrice } from '../format'
import { PRESETS } from '../rules'
import { toast } from '../toast'
import type { Ticker, TickerQuote, TriggerConfig } from '../types'
import BackLink from '../components/BackLink.vue'
import ChangePct from '../components/ChangePct.vue'
import Icon from '../components/Icon.vue'
import ThresholdForm from '../components/ThresholdForm.vue'

const EXAMPLES = ['AAPL', 'MSFT', 'NVDA', 'SAP.DE']

const { t } = useI18n()
const router = useRouter()

const query = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
// idle: nothing typed · pending: waiting for / running a lookup
const status = ref<'idle' | 'pending' | 'found' | 'notfound' | 'error'>('idle')
const quote = ref<TickerQuote | null>(null)
const searched = ref('')
const config = ref<Partial<TriggerConfig>>({ ...PRESETS.balanced })
const errors = ref<Record<string, string>>({})
const submitting = ref(false)
const submitError = ref('')

let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0

const symbol = computed(() => query.value.trim().toUpperCase())
const canAdd = computed(() => status.value === 'found' && !!quote.value && !quote.value.existingTickerId)

async function lookup(sym = symbol.value) {
  clearTimeout(timer)
  if (!sym) return
  if (sym === searched.value && (status.value === 'pending' || status.value === 'found')) return
  const mine = ++seq
  status.value = 'pending'
  searched.value = sym
  try {
    const res = await api.get<{ quote: TickerQuote }>(`/api/tickers/lookup?symbol=${encodeURIComponent(sym)}`)
    if (mine !== seq) return
    quote.value = res.quote
    status.value = 'found'
  } catch (e) {
    if (mine !== seq) return
    quote.value = null
    status.value = e instanceof ApiError && e.code === 'symbol_not_found' ? 'notfound' : 'error'
  }
}

watch(symbol, (sym) => {
  clearTimeout(timer)
  submitError.value = ''
  errors.value = {}
  if (!sym) {
    seq++
    status.value = 'idle'
    quote.value = null
    searched.value = ''
    return
  }
  if (sym === searched.value) return
  seq++
  status.value = 'pending'
  searched.value = ''
  timer = setTimeout(() => lookup(sym), 600)
})

function pick(example: string) {
  query.value = example
  lookup(example)
}

function clear() {
  query.value = ''
  searchInput.value?.focus()
}

async function submit() {
  if (!canAdd.value || !quote.value || submitting.value) return
  submitting.value = true
  submitError.value = ''
  errors.value = {}
  const sym = quote.value.symbol
  try {
    const ticker = await api.post<Ticker>('/api/tickers', { symbol: sym, config: config.value })
    toast(t('add.added', { symbol: ticker.symbol }))
    router.replace(`/tickers/${ticker.id}`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      submitError.value = t('add.duplicate', { symbol: sym })
    } else if (e instanceof ApiError && e.violations.some((v) => v.field.startsWith('config.'))) {
      errors.value = Object.fromEntries(
        e.violations.filter((v) => v.field.startsWith('config.')).map((v) => [v.field.slice(7), v.message]),
      )
      submitError.value = t('add.fixRules')
    } else {
      submitError.value = t('add.failed')
    }
  } finally {
    submitting.value = false
  }
}

onMounted(() => searchInput.value?.focus())
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <main class="page narrow has-action-bar">
    <header class="page-head">
      <BackLink to="/" :label="t('nav.back')" />
      <h1 class="grow">{{ t('add.title') }}</h1>
    </header>

    <section class="step">
      <h2 class="step-title"><span class="step-no num" aria-hidden="true">1</span>{{ t('add.findTitle') }}</h2>

      <form class="search" role="search" @submit.prevent="lookup()">
        <label for="symbol-search" class="sr-only">{{ t('add.searchLabel') }}</label>
        <Icon name="search" :size="22" class="search-icon" />
        <input
          id="symbol-search"
          ref="searchInput"
          v-model="query"
          class="input search-input"
          type="text"
          :placeholder="t('add.searchPlaceholder')"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="characters"
          spellcheck="false"
          enterkeyhint="search"
          maxlength="20"
        />
        <button v-if="query" type="button" class="icon-btn clear" :aria-label="t('add.clear')" @click="clear">
          <Icon name="close" :size="18" />
        </button>
      </form>

      <div v-if="status === 'idle'" class="examples">
        <span class="faint small">{{ t('add.examples') }}</span>
        <button v-for="ex in EXAMPLES" :key="ex" type="button" class="chip" @click="pick(ex)">{{ ex }}</button>
      </div>

      <div aria-live="polite" class="result">
        <div v-if="status === 'pending'" class="panel preview" :aria-label="t('common.loading')">
          <div class="grow">
            <div class="skeleton" style="width: 90px; height: 28px" />
            <div class="skeleton" style="width: 180px; height: 16px; margin-top: 10px" />
          </div>
          <div class="skeleton" style="width: 84px; height: 40px" />
        </div>

        <template v-else-if="status === 'found' && quote">
          <div class="panel preview">
            <div class="grow">
              <p class="symbol">{{ quote.symbol }}</p>
              <p class="company truncate">{{ quote.name ?? quote.symbol }}</p>
              <p v-if="quote.exchange" class="faint small">{{ quote.exchange }}</p>
            </div>
            <div class="quote">
              <p class="price num">{{ fmtPrice(quote.price, quote.currency) }}</p>
              <p class="small"><ChangePct :value="quote.dayChangePct" /> <span class="faint">{{ t('add.today') }}</span></p>
            </div>
          </div>
          <div v-if="quote.existingTickerId" class="notice existing">
            <Icon name="check" :size="18" />
            <div class="grow">
              <p>{{ t('add.alreadyWatching', { symbol: quote.symbol }) }}</p>
              <RouterLink :to="`/tickers/${quote.existingTickerId}`" class="open-link">
                {{ t('add.openExisting', { symbol: quote.symbol }) }}
              </RouterLink>
            </div>
          </div>
        </template>

        <div v-else-if="status === 'notfound'" class="notice warn">
          <Icon name="info" :size="18" />
          <div>
            <p class="strong">{{ t('add.notFound', { symbol: searched }) }}</p>
            <p>{{ t('add.notFoundHint') }}</p>
            <ul class="suffixes">
              <li><b class="num">SAP.DE</b> {{ t('add.suffix.frankfurt') }}</li>
              <li><b class="num">VOD.L</b> {{ t('add.suffix.london') }}</li>
              <li><b class="num">7203.T</b> {{ t('add.suffix.tokyo') }}</li>
            </ul>
          </div>
        </div>

        <div v-else-if="status === 'error'" class="notice error">
          <Icon name="alert" :size="18" />
          <div class="grow">
            <p>{{ t('add.lookupFailed') }}</p>
            <button type="button" class="btn sm retry" @click="lookup()">{{ t('add.retry') }}</button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="canAdd" class="step">
      <h2 class="step-title"><span class="step-no num" aria-hidden="true">2</span>{{ t('add.rulesTitle') }}</h2>
      <p class="muted step-hint">{{ t('add.rulesHint') }}</p>
      <ThresholdForm v-model="config" :errors="errors" />
    </section>

    <p v-if="submitError" class="notice error submit-error"><Icon name="alert" :size="18" />{{ submitError }}</p>

    <div class="action-bar">
      <button type="button" class="btn primary" :disabled="!canAdd || submitting" @click="submit">
        <Icon name="plus" :size="18" />
        {{ canAdd && quote ? t('add.start', { symbol: quote.symbol }) : t('add.startEmpty') }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.step + .step { margin-top: 32px; }
.step-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.step-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--tide-soft);
  color: var(--tide-strong);
  font-family: var(--font-ui);
  font-size: 0.8rem;
  font-weight: 700;
}
.step-hint { margin: -6px 0 14px; font-size: 0.92rem; }

.search { position: relative; }
.search-icon {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ink-3);
  pointer-events: none;
}
.search-input {
  min-height: 60px;
  padding: 12px 52px;
  border-radius: var(--r-lg);
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.search-input::placeholder {
  font-family: var(--font-ui);
  font-size: 1.05rem;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: var(--ink-3);
}
.clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); }

.examples {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
.chip {
  min-height: 36px;
  padding: 6px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
}
.chip:hover { border-color: var(--tide); color: var(--tide); }

.result:not(:empty) { margin-top: 14px; }
.result > * + * { margin-top: 10px; }

.preview {
  display: flex;
  align-items: center;
  gap: 16px;
}
.symbol {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.01em;
}
.company { margin-top: 4px; color: var(--ink-2); }
.quote { text-align: right; flex-shrink: 0; }
.price {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 650;
  line-height: 1.2;
}

.existing { background: var(--tide-soft); color: var(--tide-strong); }
.open-link { display: inline-block; margin-top: 4px; font-weight: 600; color: var(--tide-strong); }
.strong { font-weight: 600; }
.notice p + p { margin-top: 4px; }
.suffixes { margin: 8px 0 0; padding: 0; list-style: none; }
.suffixes li + li { margin-top: 2px; }
.suffixes b { color: var(--ink); font-weight: 650; margin-right: 4px; }
.retry { margin-top: 8px; }

.submit-error { margin-top: 20px; }
</style>
