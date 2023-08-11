import { createSignal } from 'solid-js'

export type TToast = {
  id: string
  message: string
  type: 'success' | 'warning' | 'info' | 'alert'
  timeout?: number
  action?: {
    label: string
    onClick?: () => void
  }
}

const [toasts, setToasts] = createSignal<TToast[]>([])
const timeouts: { [key: string]: NodeJS.Timeout } = {}

const ToastStore = {
  get: () => toasts(),
  add: (toast: Omit<TToast, 'id'>) => {
    const id = crypto.randomUUID()
    const timeout = toast.timeout || 3000
    setToasts((toasts) => toasts.concat({ ...toast, id, timeout }))
    timeouts[id] = setTimeout(() => ToastStore.remove(id), timeout)
    return id
  },
  remove: (id: string) => {
    setToasts((toasts) => toasts.filter((toast) => toast.id !== id))
  },
  hold: (id: string) => {
    clearTimeout(timeouts[id])
  },
  release: (id: string) => {
    const toast = ToastStore.get().find((toast) => toast.id === id)
    if (toast)
      timeouts[id] = setTimeout(() => ToastStore.remove(id), toast.timeout)
  }
}

export default ToastStore