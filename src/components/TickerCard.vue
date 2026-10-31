<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Ticker } from '../types'
import { fmtDay, fmtPrice, stateLabel } from '../format'
import StateBadge from './StateBadge.vue'
import ChangePct from './ChangePct.vue'
import OverflowMenu from './OverflowMenu.vue'
import Icon from './Icon.vue'

// 'attention' = roomy card for stocks that need a look; 'row' = compact list row.
withDefaults(defineProps<{ ticker: Ticker; variant?: 'attention' | 'row' }>(), { variant: 'row' })
const emit = defineEmits<{ enable: [Ticker]; disable: [Ticker]; remove: [Ticker]; favorite: [Ticker] }>()
const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <article v-if="variant === 'attention'" class="panel card" :class="`is-${ticker.state}`" :data-ticker-id="ticker.id">
    <div class="card-top">
      <div class="grow">
        <RouterLink :to="`/tickers/${ticker.id}`" class="stretched symbol">
          {{ ticker.symbol }}<Icon v-if="ticker.favorite" name="star" filled :size="15" class="fav-mark" /><span
            v-if="ticker.favorite"
            class="sr-only"
          >, {{ t('favorites.label') }}</span
          ><Icon v-if="!ticker.telegramAlerts" name="bell-off" :size="15" class="muted-mark" /><span v-if="!ticker.telegramAlerts" class="sr-only"
            >, {{ t('tickerAlerts.offPill') }}</span
          >
        </RouterLink>
        <p v-if="ticker.name" class="muted small truncate">{{ ticker.name }}</p>
      </div>
      <OverflowMenu class="over">
        <button type="button" @click="emit('favorite', ticker)">
          <Icon name="star" :filled="ticker.favorite" />{{ t(ticker.favorite ? 'favorites.remove' : 'favorites.add') }}
        </button>
        <button type="button" @click="router.push(`/tickers/${ticker.id}/edit`)">
          <Icon name="sliders" />{{ t('dashboard.editRules') }}
        </button>
        <button v-if="ticker.enabled" type="button" @click="emit('disable', ticker)">
          <Icon name="pause" />{{ t('dashboard.pause') }}
        </button>
        <button v-else type="button" @click="emit('enable', ticker)"><Icon name="play" />{{ t('dashboard.resume') }}</button>
        <button type="button" class="danger" @click="emit('remove', ticker)"><Icon name="trash" />{{ t('common.remove') }}</button>
      </OverflowMenu>
    </div>

    <div class="price-line">
      <span v-if="ticker.lastPrice !== null" class="price num">{{ fmtPrice(ticker.lastPrice, ticker.currency) }}</span>
      <span class="changes small">
        <ChangePct :value="ticker.lastDayChangePct" :label="t('dashboard.today')" />
        <ChangePct v-if="ticker.lastFiveDayChangePct !== null" :value="ticker.lastFiveDayChangePct" :label="t('dashboard.fiveDays')" />
      </span>
    </div>

    <div class="status">
      <StateBadge :state="ticker.state" />
      <span class="muted small">{{ t(`stateHint.${ticker.state}`) }}</span>
    </div>

    <RouterLink v-if="ticker.activeEvent" :to="`/events/${ticker.activeEvent.id}`" class="inset event-link small">
      <Icon name="down" :size="16" class="drop-icon" />
      <span class="grow">{{ t('dashboard.fellOn', { pct: ticker.activeEvent.severityPct.toFixed(1), date: fmtDay(ticker.activeEvent.createdAt) }) }}</span>
      <Icon name="chevron" :size="16" />
    </RouterLink>
  </article>

  <div v-else class="list-row ticker-row" :class="{ paused: !ticker.enabled }" :data-ticker-id="ticker.id">
    <span class="dot" :class="`is-${ticker.state}`" aria-hidden="true"></span>
    <div class="grow ident">
      <RouterLink :to="`/tickers/${ticker.id}`" class="stretched symbol">
        {{ ticker.symbol }}<Icon v-if="ticker.favorite" name="star" filled :size="13" class="fav-mark" /><Icon
          v-if="!ticker.telegramAlerts"
          name="bell-off"
          :size="13"
          class="muted-mark"
        /><span class="sr-only"
          >, {{ stateLabel(ticker.state) }}<template v-if="ticker.favorite">, {{ t('favorites.label') }}</template
          ><template v-if="!ticker.telegramAlerts">, {{ t('tickerAlerts.offPill') }}</template></span
        >
      </RouterLink>
      <span v-if="ticker.name" class="muted small truncate">{{ ticker.name }}</span>
    </div>
    <div class="quote">
      <span class="num">{{ fmtPrice(ticker.lastPrice, ticker.currency) }}</span>
      <ChangePct class="small" :value="ticker.lastDayChangePct" />
    </div>
    <OverflowMenu class="over">
      <button type="button" @click="emit('favorite', ticker)">
        <Icon name="star" :filled="ticker.favorite" />{{ t(ticker.favorite ? 'favorites.remove' : 'favorites.add') }}
      </button>
      <button type="button" @click="router.push(`/tickers/${ticker.id}/edit`)">
        <Icon name="sliders" />{{ t('dashboard.editRules') }}
      </button>
      <button v-if="ticker.enabled" type="button" @click="emit('disable', ticker)"><Icon name="pause" />{{ t('dashboard.pause') }}</button>
      <button v-else type="button" @click="emit('enable', ticker)"><Icon name="play" />{{ t('dashboard.resume') }}</button>
      <button type="button" class="danger" @click="emit('remove', ticker)"><Icon name="trash" />{{ t('common.remove') }}</button>
    </OverflowMenu>
  </div>
</template>

<style scoped>
/* Whole card / row is clickable via a stretched link; the menu and event link sit above it. */
.card, .ticker-row { position: relative; }
.stretched { color: inherit; }
.stretched::after { content: ''; position: absolute; inset: 0; border-radius: inherit; }
.stretched:hover { text-decoration: none; }
.over, .event-link { position: relative; z-index: 1; }
.over { z-index: 2; } /* open menu must cover the event link and later cards */
.symbol { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.01em; }

.card { display: flex; flex-direction: column; gap: 12px; transition: border-color 0.15s; }
.card:hover { border-color: var(--ink-3); }
.card.is-triggered, .card.is-error { border-color: color-mix(in srgb, var(--drop) 40%, var(--line)); }
.card-top { display: flex; align-items: flex-start; gap: 10px; }
.card-top .symbol { font-size: 1.35rem; line-height: 1.2; }
.status { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.status :deep(.pill) { max-width: 100%; }
.card-top .over { margin-top: -4px; }
.card-top .over:last-child { margin-right: -6px; }
.price-line { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 14px; }
.price { font-family: var(--font-display); font-size: 1.6rem; font-weight: 650; line-height: 1.1; }
.changes { display: inline-flex; flex-wrap: wrap; gap: 4px 12px; }
.event-link { display: flex; align-items: center; gap: 8px; color: var(--ink); font-weight: 600; }
.event-link:hover { text-decoration: none; background: var(--line); }
.drop-icon { color: var(--drop); }

.ticker-row { padding-top: 12px; padding-bottom: 12px; gap: 12px; }
a.list-row:hover, .ticker-row:hover { background: var(--surface-2); }
.ident { display: flex; flex-direction: column; }
.ident .symbol { font-size: 1.05rem; line-height: 1.3; }
.quote { display: flex; flex-direction: column; align-items: flex-end; text-align: right; font-weight: 600; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--tide); }
.dot.is-disabled { background: var(--ink-3); }
.dot.is-triggered, .dot.is-error { background: var(--drop); }
.dot.is-investigating { background: var(--ai); }
.dot.is-cooldown { background: var(--amber); }
.paused .ident, .paused .quote { opacity: 0.65; }
.fav-mark { color: var(--amber); margin-left: 5px; vertical-align: -1px; }
.muted-mark { color: var(--ink-3); margin-left: 5px; vertical-align: -1px; }
.ticker-row .over :deep(.icon-btn) { border-color: transparent; background: transparent; margin-right: -8px; }
@media (min-width: 700px) {
  .ident { flex-direction: row; align-items: baseline; gap: 12px; }
  .ident .symbol { min-width: 5.5em; }
  .quote { flex-direction: row; align-items: baseline; gap: 16px; }
  .quote .chg { min-width: 6.5em; text-align: right; }
}
</style>
