<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authErrorKey, useAuthStore } from '../stores/auth'
import { ApiError } from '../api'
import AuthShell from '../components/AuthShell.vue'
import Icon from '../components/Icon.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const email = ref('')
const password = ref('')
const rememberMe = ref(true)
const showPassword = ref(false)
const error = ref('')
const unverified = ref(false)
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  unverified.value = false
  try {
    await auth.login(email.value, password.value, rememberMe.value)
    // Only same-app paths: "/x" but not "//host" or "/\host".
    const target = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    router.push(/^\/(?![/\\])/.test(target) ? target : '/')
  } catch (e) {
    if (e instanceof ApiError && e.status === 403 && e.code === 'email_not_verified') unverified.value = true
    else error.value = e instanceof ApiError && e.status === 401 ? t('login.invalid') : t('login.failed')
  } finally {
    busy.value = false
  }
}

async function resendVerification() {
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
  <AuthShell :title="t('login.headline')">
    <template #lead>
      <p class="muted">{{ t('login.value') }}</p>
    </template>

    <form class="panel form" @submit.prevent="submit">
      <div>
        <label class="field-label" for="email">{{ t('login.email') }}</label>
        <input
          id="email"
          v-model="email"
          class="input"
          type="email"
          autocomplete="username"
          inputmode="email"
          enterkeyhint="next"
          required
        />
      </div>
      <div>
        <div class="label-row">
          <label class="field-label" for="password">{{ t('login.password') }}</label>
          <RouterLink v-if="auth.registrationEnabled" :to="{ name: 'forgot-password', query: email ? { email } : {} }" class="small">
            {{ t('auth.login.forgot') }}
          </RouterLink>
        </div>
        <div class="pw">
          <input
            id="password"
            v-model="password"
            class="input"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            enterkeyhint="go"
            required
          />
          <button
            type="button"
            class="btn quiet sm pw-toggle"
            :aria-pressed="showPassword"
            :aria-label="showPassword ? t('login.hidePassword') : t('login.showPassword')"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? t('login.hide') : t('login.show') }}
          </button>
        </div>
      </div>

      <label class="remember">
        <span class="switch"><input v-model="rememberMe" type="checkbox" /><span></span></span>
        {{ t('login.rememberMe') }}
      </label>

      <div v-if="unverified" class="notice warn unverified" role="alert">
        <Icon name="info" :size="18" />
        <div>
          <p>{{ t('auth.login.notVerified') }}</p>
          <button type="button" class="btn sm resend" :disabled="busy" @click="resendVerification">
            {{ t('auth.login.resend') }}
          </button>
        </div>
      </div>
      <p v-if="error" class="notice error" role="alert"><Icon name="alert" :size="18" />{{ error }}</p>

      <button class="btn primary block submit" type="submit" :disabled="busy">
        {{ busy ? t('login.signingIn') : t('login.signIn') }}
      </button>
    </form>

    <template v-if="auth.registrationEnabled" #footer>
      {{ t('auth.login.newHere') }} <RouterLink to="/register">{{ t('auth.login.create') }}</RouterLink>
    </template>
  </AuthShell>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 18px; }
.label-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.label-row .field-label { margin-bottom: 0; }
.pw { position: relative; }
.pw .input { padding-right: 84px; }
.pw-toggle { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); color: var(--tide); }
.remember { display: flex; align-items: center; gap: 12px; font-size: 0.95rem; cursor: pointer; }
.unverified .resend { margin-top: 10px; }
.submit { min-height: 48px; margin-top: 4px; }
</style>
