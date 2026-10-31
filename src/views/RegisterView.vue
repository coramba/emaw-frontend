<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authErrorKey, useAuthStore } from '../stores/auth'
import { ApiError } from '../api'
import AuthShell from '../components/AuthShell.vue'
import PasswordInput from '../components/PasswordInput.vue'
import Icon from '../components/Icon.vue'

const auth = useAuthStore()
const router = useRouter()
const { t, locale } = useI18n()

const email = ref('')
const password = ref('')
const fieldErrors = ref<{ email?: string; password?: string }>({})
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  fieldErrors.value = {}
  try {
    await auth.register(email.value.trim(), password.value, locale.value)
    await router.push({ name: 'check-email', query: { email: email.value.trim() } })
  } catch (e) {
    const fields = e instanceof ApiError && e.status === 422 ? e.violations.map((v) => v.field) : []
    if (fields.includes('email')) fieldErrors.value.email = t('auth.invalidEmail')
    if (fields.includes('password')) fieldErrors.value.password = t('auth.password.tooShort')
    if (!fields.length) error.value = t(authErrorKey(e))
    busy.value = false
    await nextTick()
    if (fields.length) document.getElementById(fields.includes('email') ? 'email' : 'password')?.focus()
  }
}
</script>

<template>
  <AuthShell :title="t('auth.register.headline')">
    <template #lead>
      <ul class="benefits">
        <li v-for="n in 3" :key="n">
          <Icon name="check" :size="16" />{{ t(`auth.register.benefit${n}`) }}
        </li>
      </ul>
    </template>

    <form class="panel form" novalidate @submit.prevent="submit">
      <div>
        <label class="field-label" for="email">{{ t('login.email') }}</label>
        <input
          id="email"
          v-model="email"
          class="input"
          :class="{ invalid: fieldErrors.email }"
          type="email"
          autocomplete="email"
          inputmode="email"
          enterkeyhint="next"
          required
          :aria-invalid="!!fieldErrors.email"
          :aria-describedby="fieldErrors.email ? 'email-error' : undefined"
        />
        <p v-if="fieldErrors.email" id="email-error" class="field-error">{{ fieldErrors.email }}</p>
      </div>

      <PasswordInput id="password" v-model="password" :label="t('login.password')" :error="fieldErrors.password" />

      <p v-if="error" class="notice error" role="alert"><Icon name="alert" :size="18" />{{ error }}</p>

      <button class="btn primary block submit" type="submit" :disabled="busy">
        {{ busy ? t('auth.register.submitting') : t('auth.register.submit') }}
      </button>
    </form>

    <template #footer>
      {{ t('auth.register.haveAccount') }} <RouterLink to="/login">{{ t('login.signIn') }}</RouterLink>
    </template>
  </AuthShell>
</template>

<style scoped>
.benefits { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 6px; color: var(--ink-2); font-size: 0.95rem; }
.benefits li { display: flex; gap: 10px; align-items: flex-start; }
.benefits svg { color: var(--tide); flex-shrink: 0; margin-top: 3px; }
.form { display: flex; flex-direction: column; gap: 18px; }
.submit { min-height: 48px; margin-top: 4px; }
</style>
