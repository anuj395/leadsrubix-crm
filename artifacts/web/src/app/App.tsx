import { AppRoutes } from '@/routes/AppRoutes'

import { AppProviders } from './providers'

function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  )
}

export default App