<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { ApiError } from '../api'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value, rememberMe.value)
    router.push((route.query.redirect as string) || '/')
  } catch (e) {
    error.value = e instanceof ApiError ? t('login.invalid') : t('login.failed')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div style="max-width: 360px; margin: 12vh auto 0">
    <h1>{{ t('login.title') }}</h1>
    <form class="card stack" @submit.prevent="submit">
      <div class="field">
        <label for="email">{{ t('login.email') }}</label>
        <input id="email" v-model="email" type="email" autocomplete="username" required />
      </div>
      <div class="field">
        <label for="password">{{ t('login.password') }}</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" required />
      </div>
      <label class="row" style="gap: 8px; margin-bottom: 0">
        <input v-model="rememberMe" type="checkbox" style="width: auto; min-height: 0" />
        <span>{{ t('login.rememberMe') }}</span>
      </label>
      <p v-if="error" class="alert error">{{ error }}</p>
      <button class="primary" type="submit" :disabled="busy">{{ t('login.signIn') }}</button>
    </form>
  </div>
</template>
