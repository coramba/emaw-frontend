<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { LOCALES, setLocale } from '../i18n'
import AppLogo from './AppLogo.vue'

// Shared frame for signed-out screens: logo, headline, card slot, language switch.
const props = defineProps<{ title: string }>()

const { t, locale } = useI18n()
const LOCALE_NAMES: Record<string, string> = { en: 'EN', sk: 'SK', ru: 'RU' }

// A changed title means the screen moved to a new step: move focus there so
// screen readers announce it (language switches keep focus where it is).
const heading = ref<HTMLElement | null>(null)
watch(
  () => [props.title, locale.value],
  async (_now, [, prevLocale]) => {
    if (prevLocale !== locale.value) return
    await nextTick()
    heading.value?.focus()
  },
)
</script>

<template>
  <main class="auth">
    <!-- Brand motif: a price line dipping into the lens. Decorative only. -->
    <svg class="motif" viewBox="0 0 1200 600" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
      <path d="M-20 330 L260 365 L480 340 L700 375 L900 450 L1060 380 L1220 395" />
      <circle class="lens" cx="900" cy="450" r="46" />
      <circle class="dip" cx="900" cy="450" r="11" />
    </svg>

    <div class="wrap">
      <div class="intro">
        <AppLogo :size="40" />
        <h1 ref="heading" tabindex="-1">{{ title }}</h1>
        <slot name="lead" />
      </div>

      <slot />

      <div v-if="$slots.footer" class="footer"><slot name="footer" /></div>

      <div class="lang">
        <div class="seg" role="group" :aria-label="t('nav.language')">
          <button
            v-for="l in LOCALES"
            :key="l"
            type="button"
            :aria-pressed="locale === l"
            :lang="l"
            @click="setLocale(l)"
          >
            {{ LOCALE_NAMES[l] }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.auth {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32px + env(safe-area-inset-top, 0px)) 16px calc(24px + env(safe-area-inset-bottom, 0px));
  overflow: hidden;
}
.motif { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 45%; pointer-events: none; }
.motif path { fill: none; stroke: var(--tide); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; opacity: 0.2; vector-effect: non-scaling-stroke; }
.motif .lens { fill: none; stroke: var(--tide); stroke-width: 3; opacity: 0.2; vector-effect: non-scaling-stroke; }
.motif .dip { fill: var(--drop); opacity: 0.3; }
/* On phones the form fills the screen, so the motif would run behind controls. */
@media (max-width: 599px) { .motif { display: none; } }

.wrap { position: relative; width: 100%; max-width: 400px; }
.intro { margin-bottom: 24px; }
.intro h1 { margin: 24px 0 8px; font-size: 1.9rem; }
.intro h1:focus { outline: none; }
.footer { margin-top: 20px; text-align: center; color: var(--ink-2); font-size: 0.95rem; }
.lang { display: flex; justify-content: center; margin-top: 24px; }
.lang .seg { background: color-mix(in srgb, var(--surface-2) 80%, transparent); }

@media (max-width: 480px) {
  .auth { align-items: flex-start; }
}
</style>
