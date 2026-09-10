import { createI18n } from 'vue-i18n'
import en from './locales/en'
import sk from './locales/sk'
import ru from './locales/ru'

export const LOCALES = ['en', 'sk', 'ru'] as const
export type Locale = (typeof LOCALES)[number]

const STORAGE_KEY = 'locale'

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && (LOCALES as readonly string[]).includes(saved)) return saved as Locale
  } catch {
    /* storage unavailable */
  }
  const nav = navigator.language.slice(0, 2)
  return (LOCALES as readonly string[]).includes(nav) ? (nav as Locale) : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages: { en, sk, ru },
})

export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
  document.documentElement.lang = locale
}

document.documentElement.lang = i18n.global.locale.value
