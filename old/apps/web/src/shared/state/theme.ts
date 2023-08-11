import { createMediaQuery } from '@solid-primitives/media'
import { createSignal } from 'solid-js'

type TColorScheme = 'follow-system' | 'dark' | 'light'
const isSystemDarkScheme = createMediaQuery('(prefers-color-scheme: dark)')
const getSystemColorScheme = (): TColorScheme => (isSystemDarkScheme() ? 'dark' : 'light')
const [colorScheme, setColorScheme] = createSignal<TColorScheme>(localStorage.getItem('theme') as TColorScheme ?? 'follow-system')
const getColorScheme = () => (colorScheme() === 'follow-system' ? getSystemColorScheme() : colorScheme())
const applyColorScheme = () => document.documentElement.setAttribute('data-theme', getColorScheme())
applyColorScheme()

export const useTheme = () => ({
  colorScheme: getColorScheme,
  setColorScheme: (colorScheme: TColorScheme) => {
    localStorage.setItem('theme', colorScheme)
    setColorScheme(colorScheme)
    applyColorScheme()
  }
})