import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import HomePage from '@/pages/HomePage'
import DebugPage from '@/pages/DebugPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/debug" element={<DebugPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
