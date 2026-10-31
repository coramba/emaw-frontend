<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authErrorKey, useAuthStore } from '../stores/auth'
import AuthShell from '../components/AuthShell.vue'
import Icon from '../components/Icon.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const token = typeof route.query.token === 'string' ? route.query.token : ''
// Keep the single-use token out of the address bar and history once read.
if (token) history.replaceState(history.state, '', route.path)
const step = ref<'verifying' | 'done' | 'expired'>(token ? 'verifying' : 'expired')
const email = ref('')
const error = ref('')
const busy = ref(false)

const title = computed(() => t(`auth.verify.${step.value}Headline`))

onMounted(async () => {
  if (!token) return
  try {
    await auth.verifyEmail(token)
    step.value = 'done'
  } catch {
    // Invalid, used and expired links look the same to the user: offer a new one.
    step.value = 'expired'
  }
})

async function resend() {
  busy.value = true
  error.value = ''
  try {
    await auth.resendVerification(email.value.trim())
    await router.push({ name: 'check-email', query: { email: email.value.trim() } })
  } catch (e) {
    error.value = t(authErrorKey(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell :title="title">
    <template #lead>
      <p v-if="step !== 'verifying'" class="muted">{{ t(`auth.verify.${step}Text`) }}</p>
    </template>

    <section v-if="step === 'verifying'" class="panel verifying" role="status">
      <span class="ring" aria-hidden="true"></span>
      <span class="muted">{{ t('auth.verify.verifyingText') }}</span>
    </section>

    <section v-else-if="step === 'done'" class="panel card">
      <p class="notice ok"><Icon name="check" :size="18" />{{ t('auth.verify.signedIn', { email: auth.user?.email ?? '' }) }}</p>
      <RouterLink to="/tickers/new" class="btn primary block submit"><Icon name="plus" :size="18" />{{ t('auth.verify.addStock') }}</RouterLink>
      <RouterLink to="/" class="btn quiet block">{{ t('auth.verify.goWatchlist') }}</RouterLink>
    </section>

    <form v-else class="panel card" @submit.prevent="resend">
      <div>
        <label class="field-label" for="email">{{ t('login.email') }}</label>
        <input
          id="email"
          v-model="email"
          class="input"
          type="email"
          autocomplete="email"
          inputmode="email"
          enterkeyhint="send"
          required
        />
      </div>
      <p v-if="error" class="notice error" role="alert"><Icon name="alert" :size="18" />{{ error }}</p>
      <button class="btn primary block submit" type="submit" :disabled="busy">
        {{ busy ? t('auth.sending') : t('auth.verify.sendNew') }}
      </button>
    </form>

    <template v-if="step === 'expired'" #footer>
      <RouterLink to="/login">{{ t('auth.backToSignIn') }}</RouterLink>
    </template>
  </AuthShell>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 14px; }
.submit { min-height: 48px; }
.verifying { display: flex; align-items: center; gap: 14px; }
.ring {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 3px solid var(--tide-soft);
  border-top-color: var(--tide);
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
