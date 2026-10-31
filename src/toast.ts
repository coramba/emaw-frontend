import { ref } from 'vue'

export interface ToastItem {
  id: number
  message: string
  tone: 'ok' | 'error'
  link?: { to: string; label: string }
}

export const toasts = ref<ToastItem[]>([])
let seq = 0

export function toast(message: string, tone: ToastItem['tone'] = 'ok', link?: ToastItem['link']): void {
  const id = ++seq
  toasts.value.push({ id, message, tone, link })
  setTimeout(() => (toasts.value = toasts.value.filter((t) => t.id !== id)), tone === 'error' ? 6000 : 3500)
}
