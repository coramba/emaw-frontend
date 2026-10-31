<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authErrorKey, useAuthStore } from '../stores/auth'
import { ApiError } from '../api'
import AuthShell from '../components/AuthShell.vue'
import PasswordInput from '../components/PasswordInput.vue'
import Icon from '../components/Icon.vue'

const auth = useAuthStore()
const route = useRoute()
const { t } = useI18n()

const token = typeof route.query.token === 'string' ? route.query.token : ''
// Keep the single-use token out of the address bar and history once read.
if (token) history.replaceState(history.state, '', route.path)
const step = ref<'form' | 'done' | 'invalid'>(token ? 'form' : 'invalid')
const password = ref('')
const fieldError = ref('')
const error = ref('')
const busy = ref(false)

const title = computed(() => t(`auth.reset.${step.value}Headline`))

async function submit() {
  busy.value = true
  error.value = ''
  fieldError.value = ''
  try {
    await auth.resetPassword(token, password.value)
    step.value = 'done'
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) step.value = 'invalid'
    else if (e instanceof ApiError && e.status === 422) fieldError.value = t('auth.password.tooShort')
    else error.value = t(authErrorKey(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell :title="title">
    <template #lead>
      <p class="muted">{{ t(`auth.reset.${step}Text`) }}</p>
    </template>

    <form v-if="step === 'form'" class="panel card" novalidate @submit.prevent="submit">
      <PasswordInput id="password" v-model="password" :label="t('auth.reset.newPassword')" :error="fieldError" />
      <p v-if="error" class="notice error" role="alert"><Icon name="alert" :size="18" />{{ error }}</p>
      <button class="btn primary block submit" type="submit" :disabled="busy">
        {{ busy ? t('auth.reset.saving') : t('auth.reset.submit') }}
      </button>
    </form>

    <section v-else-if="step === 'done'" class="panel card">
      <p class="notice ok"><Icon name="check" :size="18" />{{ t('auth.reset.saved') }}</p>
      <RouterLink to="/login" class="btn primary block submit">{{ t('login.signIn') }}</RouterLink>
    </section>

    <section v-else class="panel card">
      <RouterLink to="/forgot-password" class="btn primary block submit">{{ t('auth.reset.requestNew') }}</RouterLink>
      <RouterLink to="/login" class="btn quiet block">{{ t('auth.backToSignIn') }}</RouterLink>
    </section>
  </AuthShell>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 14px; }
.submit { min-height: 48px; }
</style>
