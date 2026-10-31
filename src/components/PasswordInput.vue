<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from './Icon.vue'

// New-password field: show/hide toggle, the length requirement and a 3-step
// strength meter. Presentation only — the backend enforces the real rule.
const props = defineProps<{ id: string; label: string; error?: string }>()
const model = defineModel<string>({ required: true })

const { t } = useI18n()
const MIN = 10
const show = ref(false)

const strength = computed(() => {
  const pw = model.value
  if (!pw) return 0
  if (pw.length < MIN) return 1
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length
  return pw.length >= 16 || (pw.length >= 12 && classes >= 3) ? 3 : 2
})
const STRENGTH_KEYS = ['', 'weak', 'ok', 'strong'] as const
const hintId = computed(() => `${props.id}-hint`)
const errorId = computed(() => `${props.id}-error`)
</script>

<template>
  <div>
    <label class="field-label" :for="id">{{ label }}</label>
    <div class="pw">
      <input
        :id="id"
        v-model="model"
        class="input"
        :class="{ invalid: !!error }"
        :type="show ? 'text' : 'password'"
        autocomplete="new-password"
        enterkeyhint="done"
        :minlength="MIN"
        required
        :aria-invalid="!!error"
        :aria-describedby="error ? `${hintId} ${errorId}` : hintId"
      />
      <button
        type="button"
        class="btn quiet sm pw-toggle"
        :aria-pressed="show"
        :aria-label="show ? t('login.hidePassword') : t('login.showPassword')"
        @click="show = !show"
      >
        {{ show ? t('login.hide') : t('login.show') }}
      </button>
    </div>

    <div :id="hintId" class="hint" :class="`s${strength}`" aria-live="polite">
      <span class="meter" aria-hidden="true"><i v-for="n in 3" :key="n" :class="{ on: n <= strength }"></i></span>
      <span class="req" :class="{ met: strength >= 2 }">
        <Icon v-if="strength >= 2" name="check" :size="14" />{{ t('auth.password.requirement') }}
      </span>
      <span v-if="strength" class="level">{{ t(`auth.password.${STRENGTH_KEYS[strength]}`) }}</span>
    </div>
    <p v-if="error" :id="errorId" class="field-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.pw { position: relative; }
.pw .input { padding-right: 84px; }
.pw-toggle { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); color: var(--tide); }

.hint { display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 0.85rem; color: var(--ink-3); }
.meter { display: inline-flex; gap: 3px; flex-shrink: 0; }
.meter i { width: 18px; height: 4px; border-radius: 999px; background: var(--line); transition: background-color 0.2s; }
.s1 .meter i.on { background: var(--amber); }
.s2 .meter i.on { background: var(--tide); }
.s3 .meter i.on { background: var(--rise); }
.req { display: inline-flex; align-items: center; gap: 4px; flex: 1; min-width: 0; }
.req.met { color: var(--ink-2); }
.req svg { color: var(--rise); }
.level { font-weight: 600; white-space: nowrap; }
.s1 .level { color: var(--amber); }
.s2 .level { color: var(--tide); }
.s3 .level { color: var(--rise); }
</style>
