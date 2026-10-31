<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authErrorKey, useAuthStore } from '../stores/auth'
import AuthShell from '../components/AuthShell.vue'
import Icon from '../components/Icon.vue'

const auth = useAuthStore()
const route = useRoute()
const { t } = useI18n()

const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const sent = ref(false)
const error = ref('')
const busy = ref(false)

const title = computed(() => t(sent.value ? 'auth.forgot.sentHeadline' : 'auth.forgot.headline'))

async function submit() {
  busy.value = true
  error.value = ''
  try {
    // Always the same confirmation, whether or not the account exists.
    await auth.forgotPassword(email.value.trim())
    sent.value = true
  } catch (e) {
    error.value = t(authErrorKey(e, 'auth.forgot.closed'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell :title="title">
    <template #lead>
      <i18n-t v-if="sent" keypath="auth.forgot.sentText" tag="p" class="muted" scope="global">
        <template #email><strong class="addr">{{ email.trim() }}</strong></template>
      </i18n-t>
      <p v-else class="muted">{{ t('auth.forgot.text') }}</p>
    </template>

    <section v-if="sent" class="panel card">
      <ul class="tips">
        <li><Icon name="clock" :size="18" />{{ t('auth.forgot.tipExpiry') }}</li>
        <li><Icon name="search" :size="18" />{{ t('auth.checkEmail.tipSpam') }}</li>
      </ul>
      <RouterLink to="/login" class="btn primary block submit">{{ t('auth.backToSignIn') }}</RouterLink>
      <button type="button" class="btn quiet block" @click="sent = false">{{ t('auth.forgot.otherEmail') }}</button>
    </section>

    <form v-else class="panel card" @submit.prevent="submit">
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
        {{ busy ? t('auth.sending') : t('auth.forgot.submit') }}
      </button>
    </form>

    <template v-if="!sent" #footer>
      <RouterLink to="/login">{{ t('auth.backToSignIn') }}</RouterLink>
    </template>
  </AuthShell>
</template>

<style scoped>
.addr { color: var(--ink); font-weight: 600; overflow-wrap: anywhere; }
.card { display: flex; flex-direction: column; gap: 14px; }
.submit { min-height: 48px; }
.tips { list-style: none; margin: 0 0 4px; padding: 0; display: grid; gap: 10px; color: var(--ink-2); font-size: 0.95rem; }
.tips li { display: flex; gap: 10px; align-items: flex-start; }
.tips svg { color: var(--ink-3); flex-shrink: 0; margin-top: 2px; }
</style>
