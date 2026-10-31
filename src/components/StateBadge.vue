<script setup lang="ts">
import { computed } from 'vue'
import type { MonitoringState } from '../types'
import { stateLabel } from '../format'
import Icon, { type IconName } from './Icon.vue'

const props = defineProps<{ state: MonitoringState }>()

const LOOK: Record<MonitoringState, { tone: string; icon: IconName }> = {
  armed: { tone: 'tide', icon: 'check' },
  triggered: { tone: 'drop', icon: 'down' },
  investigating: { tone: 'ai', icon: 'sparkle' },
  cooldown: { tone: 'amber', icon: 'bell' },
  disabled: { tone: '', icon: 'pause' },
  error: { tone: 'drop', icon: 'alert' },
}
const look = computed(() => LOOK[props.state])
</script>

<template>
  <span class="pill" :class="look.tone"><Icon :name="look.icon" :size="14" />{{ stateLabel(state) }}</span>
</template>
