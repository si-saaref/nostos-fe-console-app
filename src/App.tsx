import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/api/queryClient'
import { ToastProvider } from '@/components/ToastProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppRoutes } from '@/routes'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Router outside AuthProvider: the provider's 401 handler navigates with
          useNavigate, which needs router context. */}
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
