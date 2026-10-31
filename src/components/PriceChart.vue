<script setup lang="ts">
import { HISTORY_RANGES } from '../chartRange'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { HistoryPoint, HistoryRange, TriggerEvent } from '../types'
import { fmtDate, fmtDay, fmtPrice } from '../format'

// Hand-built SVG price chart. The SVG stretches (preserveAspectRatio=none) in a
// 0–100 coordinate box; every text/marker is HTML positioned in % so it never distorts.

const props = defineProps<{
  points: HistoryPoint[]
  events: TriggerEvent[]
  currency: string | null
  loading?: boolean
  error?: boolean
}>()
const range = defineModel<HistoryRange>('range', { default: '3mo' })
const emit = defineEmits<{ retry: [] }>()
const { t, locale } = useI18n()

const PAD_TOP = 14
const PAD_BOTTOM = 12

const pts = computed(() =>
  props.points.map((p) => ({ ms: new Date(p.t).getTime(), close: p.close })).filter((p) => Number.isFinite(p.ms)),
)
const enough = computed(() => pts.value.length >= 2)

// Points are spaced by index (not time) so overnight/weekend gaps don't leave holes.
const x = (i: number) => (i / (pts.value.length - 1)) * 100

/** Fractional index for a timestamp; null when outside the plotted period. */
function timeToIndex(ms: number): number | null {
  const p = pts.value
  const last = p.length - 1
  if (ms < p[0].ms) return null
  // Events may land after the last close (same trading day); allow ~1 day of slack.
  if (ms >= p[last].ms) return ms - p[last].ms <= 86_400_000 ? last : null
  let i = 0
  while (p[i + 1].ms <= ms) i++
  return i + (ms - p[i].ms) / (p[i + 1].ms - p[i].ms)
}

const markers = computed(() => {
  if (!enough.value) return []
  return props.events.flatMap((e) => {
    const idx = timeToIndex(new Date(e.createdAt).getTime())
    if (idx === null) return []
    const pct = Math.abs(e.dayChangePct ?? e.severityPct).toFixed(1) + '%'
    return [{ id: e.id, idx, price: e.price, pct, label: t('chart.markerLabel', { pct, date: fmtDay(e.createdAt) }) }]
  })
})

const extent = computed(() => {
  const values = [...pts.value.map((p) => p.close), ...markers.value.map((m) => m.price)]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min || max * 0.01 || 1) * 0.04
  return { min, max, lo: min - pad, hi: max + pad }
})
const y = (v: number) => {
  const { lo, hi } = extent.value
  return PAD_TOP + (1 - (v - lo) / (hi - lo)) * (100 - PAD_TOP - PAD_BOTTOM)
}

// Move a min/max label to the left edge when a drop marker (and its flag) sits on top of it.
const edgeClash = (v: number) => markers.value.some((m) => x(m.idx) > 70 && Math.abs(y(m.price) - y(v)) < 14)

const linePts = computed(() => pts.value.map((p, i) => `${x(i).toFixed(3)},${y(p.close).toFixed(3)}`).join(' '))
const areaPts = computed(() => `0,100 ${linePts.value} 100,100`)

const change = computed(() => {
  if (!enough.value) return null
  const first = pts.value[0].close
  const last = pts.value[pts.value.length - 1].close
  return first ? ((last - first) / first) * 100 : null
})
const changeText = computed(() => {
  const c = change.value
  if (c === null) return ''
  const period = t(`chart.over.${range.value}`)
  if (Math.abs(c) < 0.05) return t('chart.unchanged', { period })
  return `${c > 0 ? '▲' : '▼'} ${Math.abs(c).toFixed(1)}% ${period}`
})
const changeClass = computed(() => (change.value === null || Math.abs(change.value) < 0.05 ? 'flat' : change.value > 0 ? 'up' : 'down'))

function axisLabel(ms: number): string {
  const opts: Intl.DateTimeFormatOptions =
    range.value === '5d' ? { weekday: 'short', day: 'numeric', month: 'short' }
    : range.value === '1y' ? { month: 'short', year: 'numeric' }
    : { day: 'numeric', month: 'short' }
  return new Date(ms).toLocaleDateString(locale.value, opts)
}

// ---- scrubbing ----
const plot = ref<HTMLElement | null>(null)
const hover = ref<number | null>(null)

function onMove(e: PointerEvent) {
  if (!enough.value || !plot.value) return
  const r = plot.value.getBoundingClientRect()
  const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  hover.value = Math.round(f * (pts.value.length - 1))
}
const tip = computed(() => {
  if (hover.value === null || !pts.value[hover.value]) return null
  const p = pts.value[hover.value]
  const iso = new Date(p.ms).toISOString()
  return {
    x: x(hover.value),
    y: y(p.close),
    date: range.value === '5d' ? fmtDate(iso) : fmtDay(iso),
    price: fmtPrice(p.close, props.currency),
  }
})
</script>

<template>
  <div class="chart">
    <div class="chart-top">
      <p class="chg change" :class="changeClass">
        <template v-if="enough">{{ changeText }}</template>
        <span v-else class="faint">&nbsp;</span>
      </p>
      <div class="seg" role="group" :aria-label="t('chart.rangeLabel')">
        <button
          v-for="r in HISTORY_RANGES"
          :key="r"
          type="button"
          :aria-pressed="range === r"
          @click="range = r"
        >{{ t(`chart.range.${r}`) }}</button>
      </div>
    </div>

    <div class="frame">
      <div v-if="loading && !enough" class="skeleton fill" aria-hidden="true"></div>

      <div v-else-if="error && !enough" class="state">
        <p class="small muted">{{ t('chart.failed') }}</p>
        <button type="button" class="btn quiet sm" @click="emit('retry')">{{ t('chart.retry') }}</button>
      </div>

      <div v-else-if="!enough" class="state">
        <p class="small muted">{{ t('chart.empty') }}</p>
      </div>

      <div
        v-else
        ref="plot"
        class="plot"
        :class="{ busy: loading }"
        @pointermove="onMove"
        @pointerdown="onMove"
        @pointerleave="hover = null"
        @pointercancel="hover = null"
      >
        <svg
          class="svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          :aria-label="changeText"
        >
          <defs>
            <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" class="stop-a" />
              <stop offset="100%" class="stop-b" />
            </linearGradient>
          </defs>
          <line class="guide-line" x1="0" x2="100" :y1="y(extent.max)" :y2="y(extent.max)" vector-effect="non-scaling-stroke" />
          <line class="guide-line" x1="0" x2="100" :y1="y(extent.min)" :y2="y(extent.min)" vector-effect="non-scaling-stroke" />
          <line
            v-for="m in markers"
            :key="'s' + m.id"
            class="stem"
            :x1="x(m.idx)"
            :x2="x(m.idx)"
            :y1="y(m.price)"
            y2="100"
            vector-effect="non-scaling-stroke"
          />
          <polygon class="area" :points="areaPts" />
          <polyline class="line" :points="linePts" vector-effect="non-scaling-stroke" />
          <line
            v-if="tip"
            class="scrub"
            :x1="tip.x"
            :x2="tip.x"
            y1="0"
            y2="100"
            vector-effect="non-scaling-stroke"
          />
        </svg>

        <span class="edge max num" :class="{ left: edgeClash(extent.max) }" :style="{ top: y(extent.max) + '%' }">{{ fmtPrice(extent.max, currency) }}</span>
        <span class="edge min num" :class="{ left: edgeClash(extent.min) }" :style="{ top: y(extent.min) + '%' }">{{ fmtPrice(extent.min, currency) }}</span>

        <template v-if="tip">
          <span class="dot" :style="{ left: tip.x + '%', top: tip.y + '%' }" aria-hidden="true"></span>
          <div
            class="tip"
            :style="{ left: tip.x + '%', transform: `translateX(${-tip.x}%)` }"
            aria-hidden="true"
          >
            <span class="num strong">{{ tip.price }}</span>
            <span class="faint">{{ tip.date }}</span>
          </div>
        </template>

        <RouterLink
          v-for="m in markers"
          :key="m.id"
          :to="`/events/${m.id}`"
          class="marker"
          :style="{ left: x(m.idx) + '%', top: y(m.price) + '%' }"
          :aria-label="m.label"
          :title="m.label"
          @pointermove.stop
        >
          <span class="pin" aria-hidden="true"></span>
          <span class="flag num" aria-hidden="true">−{{ m.pct }}</span>
        </RouterLink>
      </div>
    </div>

    <div v-if="enough" class="axis faint tiny num" aria-hidden="true">
      <span>{{ axisLabel(pts[0].ms) }}</span>
      <span>{{ axisLabel(pts[pts.length - 1].ms) }}</span>
    </div>
  </div>
</template>

<style scoped>
.chart-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 14px;
}
.change { font-size: 0.95rem; }

.frame {
  position: relative;
  height: 220px;
}
@media (min-width: 900px) {
  .frame { height: 300px; }
}
.fill { position: absolute; inset: 0; }
.state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  border-radius: var(--r-md);
  background: var(--surface-2);
}

.plot {
  position: absolute;
  inset: 0;
  touch-action: pan-y;
  cursor: crosshair;
  transition: opacity 0.2s;
  --trend: var(--tide);
}
.plot.busy { opacity: 0.45; }

.svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  animation: reveal 0.9s cubic-bezier(0.3, 0.7, 0.2, 1) both;
}
@keyframes reveal {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}

.stop-a { stop-color: var(--trend); stop-opacity: 0.26; }
.stop-b { stop-color: var(--trend); stop-opacity: 0; }
.area { fill: url(#pc-fill); }
.line {
  fill: none;
  stroke: var(--trend);
  stroke-width: 2.25;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.guide-line { stroke: var(--line); stroke-width: 1; stroke-dasharray: 3 4; }
.stem { stroke: var(--drop); stroke-width: 1; stroke-dasharray: 2 3; opacity: 0.55; }
.scrub { stroke: var(--ink-3); stroke-width: 1; }

.edge {
  position: absolute;
  right: 0;
  font-size: 0.72rem;
  line-height: 1;
  color: var(--ink-3);
  pointer-events: none;
  padding: 0 0 0 6px;
}
.edge.left { right: auto; left: 0; padding: 0 6px 0 0; }
.edge.max { transform: translateY(calc(-100% - 5px)); }
.edge.min { transform: translateY(5px); }

.dot {
  position: absolute;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 50%;
  background: var(--trend);
  border: 2px solid var(--surface);
  pointer-events: none;
}
.tip {
  position: absolute;
  top: -6px;
  display: flex;
  flex-direction: column;
  padding: 6px 10px;
  border-radius: var(--r-sm);
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-pop);
  font-size: 0.8rem;
  line-height: 1.3;
  white-space: nowrap;
  pointer-events: none;
  z-index: 3;
}
.tip .strong { font-weight: 700; color: var(--ink); font-size: 0.9rem; }

.marker {
  position: absolute;
  z-index: 2;
  width: 32px;
  height: 32px;
  margin: -16px 0 0 -16px;
  display: grid;
  place-items: center;
  border-radius: 50%;
}
.marker:hover { text-decoration: none; }
.pin {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--drop);
  border: 3px solid var(--surface);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--drop) 22%, transparent);
  transition: transform 0.15s;
}
.marker:hover .pin,
.marker:focus-visible .pin { transform: scale(1.25); }
.flag {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translate(-50%, -2px);
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--drop-soft);
  color: var(--drop);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.5;
  white-space: nowrap;
}

.axis {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}
</style>
