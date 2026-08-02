import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { ConsoleSigninPage } from '@/modules/auth/pages/ConsoleSigninPage'
import { ConsoleSigninCallbackPage } from '@/modules/auth/pages/ConsoleSigninCallbackPage'
import { ConsoleDashboardPage } from '@/modules/dashboard/pages/ConsoleDashboardPage'
import { HouseholdsPage } from '@/modules/households/pages/HouseholdsPage'
import { CreateHouseholdPage } from '@/modules/households/pages/CreateHouseholdPage'
import { HouseholdDetailPage } from '@/modules/households/pages/HouseholdDetailPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/console/dashboard" replace />} />
      <Route path="/console/signin" element={<ConsoleSigninPage />} />
      <Route path="/console/auth/signin/:token" element={<ConsoleSigninCallbackPage />} />
      <Route
        path="/console/dashboard"
        element={
          <ProtectedRoute>
            <ConsoleDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/console/households"
        element={
          <ProtectedRoute>
            <HouseholdsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/console/households/new"
        element={
          <ProtectedRoute>
            <CreateHouseholdPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/console/households/:id"
        element={
          <ProtectedRoute>
            <HouseholdDetailPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
