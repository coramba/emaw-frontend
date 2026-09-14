<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Ticker } from '../types'
import { fmtNum, fmtTime } from '../format'
import StateBadge from './StateBadge.vue'
import ChangePct from './ChangePct.vue'
import OverflowMenu from './OverflowMenu.vue'

defineProps<{ ticker: Ticker }>()
const emit = defineEmits<{ enable: [Ticker]; disable: [Ticker]; remove: [Ticker]; reset: [Ticker] }>()
const { t } = useI18n()
</script>

<template>
  <div class="card stack">
    <div class="row between">
      <RouterLink :to="`/tickers/${ticker.id}`" class="grow" style="color: inherit">
        <div class="row" style="gap: 8px">
          <strong>{{ ticker.symbol }}</strong>
          <span class="muted truncate">{{ ticker.name }}</span>
        </div>
      </RouterLink>
      <OverflowMenu>
        <RouterLink :to="`/tickers/${ticker.id}/edit`"><button>{{ t('common.editThresholds') }}</button></RouterLink>
        <button v-if="ticker.enabled" @click="emit('disable', ticker)">{{ t('common.disable') }}</button>
        <button v-else @click="emit('enable', ticker)">{{ t('common.enable') }}</button>
        <button @click="emit('reset', ticker)">{{ t('common.resetState') }}</button>
        <button class="danger" @click="emit('remove', ticker)">{{ t('common.remove') }}</button>
      </OverflowMenu>
    </div>

    <div class="row between">
      <div class="big-number mono">
        {{ ticker.lastPrice !== null ? fmtNum(ticker.lastPrice) : '—' }}
        <span class="muted" style="font-size: 0.7rem">{{ ticker.currency }}</span>
      </div>
      <div class="col-right">
        <ChangePct :value="ticker.lastDayChangePct" label="1d" />
        <ChangePct
          v-if="ticker.lastFiveDayChangePct !== null"
          :value="ticker.lastFiveDayChangePct"
          label="5d"
        />
      </div>
    </div>

    <div class="row between">
      <StateBadge :state="ticker.state" />
      <span class="muted">{{ t('ticker.checked', { time: fmtTime(ticker.lastCheckedAt) }) }}</span>
    </div>

    <p v-if="ticker.lastError" class="alert error" style="margin: 0">{{ ticker.lastError }}</p>
  </div>
</template>
