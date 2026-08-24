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
      <Route path="/" element={<Navigate to="/console" replace />} />
      <Route path="/console/signin" element={<ConsoleSigninPage />} />
      <Route path="/console/auth/signin/:token" element={<ConsoleSigninCallbackPage />} />
      <Route
        path="/console"
        element={
          <ProtectedRoute>
            <ConsoleDashboardPage />
          </ProtectedRoute>
        }
      />
      {/* Create and detail are nested, not siblings: the register stays
          mounted underneath and they render into its <Outlet /> as overlays.
          The URLs are unchanged, so a link out of a support ticket still
          addresses one household — it just no longer costs the operator their
          scroll position, their search, or their page. */}
      <Route
        path="/console/households"
        element={
          <ProtectedRoute>
            <HouseholdsPage />
          </ProtectedRoute>
        }
      >
        <Route path="new" element={<CreateHouseholdPage />} />
        <Route path=":id" element={<HouseholdDetailPage />} />
      </Route>
    </Routes>
  )
}
