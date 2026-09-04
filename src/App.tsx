import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/landing/Landing'
import Login from './pages/login/Login'
import BorrowerApp from './pages/borrower/BorrowerApp'
import LenderApp from './pages/lender/LenderApp'
import RequireRole from './lib/RequireRole'
import { ThemeProvider } from './lib/theme'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/borrower/*"
            element={
              <RequireRole role="borrower">
                <BorrowerApp />
              </RequireRole>
            }
          />
          <Route
            path="/lender/*"
            element={
              <RequireRole role="lender">
                <LenderApp />
              </RequireRole>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}