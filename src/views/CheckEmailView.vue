<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authErrorKey, useAuthStore } from '../stores/auth'
import AuthShell from '../components/AuthShell.vue'
import Icon from '../components/Icon.vue'

const COOLDOWN = 60

const auth = useAuthStore()
const route = useRoute()
const { t } = useI18n()

const email = typeof route.query.email === 'string' ? route.query.email : ''
const status = ref<{ tone: 'ok' | 'error'; text: string } | null>(null)
const busy = ref(false)

// We only land here right after a mail was sent, so start with the cooldown running.
const wait = ref(COOLDOWN)
let timer = 0
function startCooldown() {
  wait.value = COOLDOWN
  clearInterval(timer)
  timer = window.setInterval(() => {
    if (--wait.value <= 0) clearInterval(timer)
  }, 1000)
}
startCooldown()
onBeforeUnmount(() => clearInterval(timer))

async function resend() {
  busy.value = true
  status.value = null
  try {
    await auth.resendVerification(email)
    status.value = { tone: 'ok', text: t('auth.checkEmail.resent') }
    startCooldown()
  } catch (e) {
    status.value = { tone: 'error', text: t(authErrorKey(e)) }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell :title="t('auth.checkEmail.headline')">
    <template #lead>
      <i18n-t v-if="email" keypath="auth.checkEmail.sent" tag="p" class="muted" scope="global">
        <template #email><strong class="addr">{{ email }}</strong></template>
      </i18n-t>
      <p v-else class="muted">{{ t('auth.checkEmail.sentNoEmail') }}</p>
    </template>

    <section class="panel card">
      <!-- An envelope whose flap dips to the coral dot, like the logo's price line. -->
      <div class="art" aria-hidden="true">
        <svg viewBox="0 0 76 52" width="76" height="52">
          <rect class="env" x="2" y="2" width="72" height="48" rx="8" />
          <path class="flap" d="M6 7 L38 31 L70 7" />
          <circle class="dip" cx="38" cy="31" r="5" />
        </svg>
      </div>

      <ul class="tips">
        <li><Icon name="clock" :size="18" />{{ t('auth.checkEmail.tipExpiry') }}</li>
        <li><Icon name="search" :size="18" />{{ t('auth.checkEmail.tipSpam') }}</li>
      </ul>

      <p v-if="status" class="notice" :class="status.tone" role="status">
        <Icon :name="status.tone === 'ok' ? 'check' : 'alert'" :size="18" />{{ status.text }}
      </p>

      <button v-if="email" type="button" class="btn block" :disabled="busy || wait > 0" @click="resend">
        <Icon name="refresh" :size="18" />
        <span v-if="wait > 0" class="num">{{ t('auth.checkEmail.resendIn', { n: wait }) }}</span>
        <span v-else>{{ t('auth.checkEmail.resend') }}</span>
      </button>
    </section>

    <template #footer>
      <div class="links">
        <RouterLink to="/register">{{ t('auth.checkEmail.otherEmail') }}</RouterLink>
        <RouterLink to="/login">{{ t('auth.backToSignIn') }}</RouterLink>
      </div>
    </template>
  </AuthShell>
</template>

<style scoped>
.addr { color: var(--ink); font-weight: 600; overflow-wrap: anywhere; }
.card { display: flex; flex-direction: column; gap: 18px; }
.art { align-self: stretch; display: grid; place-items: center; padding: 22px; border-radius: var(--r-md); background: var(--tide-soft); }
.art .env { fill: var(--surface); stroke: var(--tide); stroke-width: 3; }
.art .flap { fill: none; stroke: var(--tide); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.art .dip { fill: var(--drop); }
.tips { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; color: var(--ink-2); font-size: 0.95rem; }
.tips li { display: flex; gap: 10px; align-items: flex-start; }
.tips svg { color: var(--ink-3); flex-shrink: 0; margin-top: 2px; }
.links { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 24px; }
</style>
