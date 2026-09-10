<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TriggerConfig } from '../types'
import InfoHint from './InfoHint.vue'

const props = defineProps<{ modelValue: TriggerConfig }>()
const emit = defineEmits<{ 'update:modelValue': [TriggerConfig] }>()
const { t } = useI18n()

const local = reactive<TriggerConfig>({ ...props.modelValue })

watch(
  () => props.modelValue,
  (v) => Object.assign(local, v),
)
watch(local, () => emit('update:modelValue', { ...local }), { deep: true })

// null-able numeric fields are edited as text so "empty" means "condition off"
function numOrNull(v: string): number | null {
  return v === '' ? null : Number(v)
}
</script>

<template>
  <div class="stack">
    <h3>{{ t('thresholds.dropTitle') }} <InfoHint :text="t('thresholds.dropModeHint')" /></h3>
    <p class="muted">{{ t('thresholds.dropHint') }}</p>
    <div class="field-grid">
      <div>
        <label>{{ t('thresholds.daily') }}</label>
        <input
          type="number" step="0.1" inputmode="decimal"
          :value="local.dailyChangePct ?? ''"
          @input="local.dailyChangePct = numOrNull(($event.target as HTMLInputElement).value)"
        />
      </div>
      <div>
        <label>{{ t('thresholds.fiveDay') }}</label>
        <input
          type="number" step="0.1" inputmode="decimal"
          :value="local.fiveDayChangePct ?? ''"
          @input="local.fiveDayChangePct = numOrNull(($event.target as HTMLInputElement).value)"
        />
      </div>
      <div>
        <label>{{ t('thresholds.intraday') }}</label>
        <input
          type="number" step="0.1" inputmode="decimal"
          :value="local.intradayChangePct ?? ''"
          @input="local.intradayChangePct = numOrNull(($event.target as HTMLInputElement).value)"
        />
      </div>
      <div>
        <label>{{ t('thresholds.intradayWindow') }}</label>
        <input type="number" step="1" v-model.number="local.intradayWindowMinutes" />
      </div>
      <div>
        <label>{{ t('thresholds.volume') }} <InfoHint :text="t('thresholds.volumeHint')" /></label>
        <div class="suffixed">
          <input
            type="number" step="0.1" inputmode="decimal"
            :value="local.volumeMultiplier ?? ''"
            @input="local.volumeMultiplier = numOrNull(($event.target as HTMLInputElement).value)"
          />
          <span class="suffix">{{ t('thresholds.timesSuffix') }}</span>
        </div>
      </div>
    </div>

    <h3>{{ t('thresholds.combinedTitle') }} <InfoHint :text="t('thresholds.combinedHint')" /></h3>
    <div class="field-grid">
      <div>
        <label>{{ t('thresholds.moderateDaily') }}</label>
        <input
          type="number" step="0.1" inputmode="decimal"
          :value="local.moderateDailyChangePct ?? ''"
          @input="local.moderateDailyChangePct = numOrNull(($event.target as HTMLInputElement).value)"
        />
      </div>
      <div>
        <label>{{ t('thresholds.moderateVolume') }}</label>
        <div class="suffixed">
          <input
            type="number" step="0.1" inputmode="decimal"
            :value="local.moderateVolumeMultiplier ?? ''"
            @input="local.moderateVolumeMultiplier = numOrNull(($event.target as HTMLInputElement).value)"
          />
          <span class="suffix">{{ t('thresholds.timesSuffix') }}</span>
        </div>
      </div>
    </div>

    <h3>{{ t('thresholds.behaviourTitle') }} <InfoHint :text="t('thresholds.behaviourHint')" /></h3>
    <div class="field-grid">
      <div>
        <label>{{ t('thresholds.escalationStep') }}</label>
        <input type="number" step="0.5" v-model.number="local.escalationStepPct" />
      </div>
      <div>
        <label>{{ t('thresholds.rearm') }}</label>
        <input type="number" step="0.5" v-model.number="local.rearmRecoveryPct" />
      </div>
      <div>
        <label>{{ t('thresholds.cooldown') }}</label>
        <input type="number" step="5" v-model.number="local.cooldownMinutes" />
      </div>
      <div>
        <label>{{ t('thresholds.refresh') }}</label>
        <input type="number" step="15" v-model.number="local.investigationRefreshMinutes" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.suffixed {
  display: flex;
  align-items: center;
  gap: 8px;
}
.suffixed input {
  flex: 1;
  min-width: 0;
}
.suffix {
  color: var(--text-dim);
  font-size: 0.9rem;
  white-space: nowrap;
}
</style>
