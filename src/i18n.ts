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
  // Slavic plural forms: "one | few | many".
  pluralRules: {
    sk: (n: number, choices: number) => (choices < 3 ? (n === 1 ? 0 : 1) : n === 1 ? 0 : n >= 2 && n <= 4 ? 1 : 2),
    ru: (n: number, choices: number) => {
      if (choices < 3) return n === 1 ? 0 : 1
      const m10 = n % 10
      const m100 = n % 100
      if (m10 === 1 && m100 !== 11) return 0
      return m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2
    },
  },
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
