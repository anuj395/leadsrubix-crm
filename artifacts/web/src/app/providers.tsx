import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'

import { store } from './store'
import { createAppTheme, DEFAULT_THEME_MODE, type ThemeMode } from '@/styles/theme'

// SidebarProvider removed — sidebar state is now in Redux (sidebarSlice).
// useSidebarMenu() hook initialises the menu automatically on login.

const THEME_MODE_STORAGE_KEY = 'rubix-crm.theme-mode'

interface AppProvidersProps {
  children: ReactNode
  mode?: ThemeMode
}

interface ThemeModeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null)

function getInitialThemeMode(initialMode?: ThemeMode): ThemeMode {
  if (initialMode) return initialMode

  const storedMode = globalThis.localStorage?.getItem(THEME_MODE_STORAGE_KEY)
  if (storedMode === 'light' || storedMode === 'dark') return storedMode

  if (globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'

  return DEFAULT_THEME_MODE
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext)
  if (!context) throw new Error('useThemeMode must be used within AppProviders')
  return context
}

import { ConfirmProvider } from '@/components/common/ConfirmContext'

export function AppProviders({ children, mode: initialMode }: AppProvidersProps) {
  const [mode, setMode] = useState<ThemeMode>(() => getInitialThemeMode(initialMode))
  const theme = useMemo(() => createAppTheme(mode), [mode])

  useEffect(() => {
    globalThis.localStorage?.setItem(THEME_MODE_STORAGE_KEY, mode)
    document.documentElement.style.colorScheme = mode
    document.documentElement.setAttribute('data-mui-color-scheme', mode)
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  const contextValue = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      setMode,
      toggleMode: () => setMode((m) => (m === 'light' ? 'dark' : 'light')),
    }),
    [mode],
  )

  return (
    <Provider store={store}>
      <ThemeModeContext.Provider value={contextValue}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ConfirmProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
              {children}
            </BrowserRouter>
          </ConfirmProvider>
        </ThemeProvider>
      </ThemeModeContext.Provider>
    </Provider>
  )
}
