import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminPage } from './admin/AdminPage'
import { AppShell } from './app/AppShell'
import { ErrorBoundary } from './app/ErrorBoundary'
import { RecipientPage } from './app/RecipientPage'
import { Privacy } from './pages/Privacy'
import { Terms } from './pages/Terms'
import { Transparency } from './pages/Transparency'

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <ErrorBoundary>
        <Routes>
          <Route
            path="/app/*"
            element={
              <Fixed>
                <AppShell />
              </Fixed>
            }
          />
          <Route path="/r" element={<RecipientPage />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/transparency" element={<Transparency />} />
          <Route path="/admin" element={<AdminPage />} />
          {/* The bare address, and any address the app does not know, opens the app. */}
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </ErrorBoundary>
    </div>
  )
}

/** The user app is a fixed-height shell (map, sheets, bottom nav); other pages scroll normally. */
function Fixed({ children }: { children: ReactNode }) {
  return <div className="flex h-dvh flex-col overflow-hidden">{children}</div>
}
