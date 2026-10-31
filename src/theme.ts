import { ref } from 'vue'

export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

const STORAGE_KEY = 'theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

function stored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v && (THEMES as readonly string[]).includes(v)) return v as Theme
  } catch {
    /* storage unavailable */
  }
  return 'system'
}

export const theme = ref<Theme>(stored())

// index.html runs the same resolution inline before first paint to avoid a flash.
function apply(): void {
  const dark = theme.value === 'dark' || (theme.value === 'system' && media.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function setTheme(value: Theme): void {
  theme.value = value
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    /* ignore */
  }
  apply()
}

media.addEventListener('change', apply)
apply()
