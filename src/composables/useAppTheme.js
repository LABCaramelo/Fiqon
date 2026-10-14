import { computed } from 'vue'
import { useTheme } from 'vuetify'
import { THEME_STORAGE_KEY } from '@/plugins/vuetify'

export function useAppTheme() {
  const theme = useTheme()
  const themeName = computed(() => (theme.global.current.value.dark ? 'dark' : 'light'))

  function toggleTheme() {
    const next = themeName.value === 'dark' ? 'light' : 'dark'
    theme.global.name.value = next
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // storage indisponível
    }
  }

  return { themeName, toggleTheme }
}
