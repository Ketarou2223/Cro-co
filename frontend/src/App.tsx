import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import HomePage from '@/pages/HomePage'
import DebugPage from '@/pages/DebugPage'
import ProfileEditPage from '@/pages/ProfileEditPage'
import PendingPage from '@/pages/PendingPage'
import RejectedPage from '@/pages/RejectedPage'
import UploadStudentIdPage from '@/pages/UploadStudentIdPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import BrowsePage from '@/pages/BrowsePage'
import ProfileDetailPage from '@/pages/ProfileDetailPage'
import MatchesPage from '@/pages/MatchesPage'
import ChatPage from '@/pages/ChatPage'
import ProtectedRoute from '@/components/ProtectedRoute'
import PublicOnlyRoute from '@/components/PublicOnlyRoute'
import StatusGuard from '@/components/StatusGuard'
import AdminGuard from '@/components/AdminGuard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
          <Route path="/pending" element={<ProtectedRoute><PendingPage /></ProtectedRoute>} />
          <Route path="/upload-student-id" element={<ProtectedRoute><UploadStudentIdPage /></ProtectedRoute>} />
          <Route path="/rejected" element={<ProtectedRoute><RejectedPage /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><StatusGuard><HomePage /></StatusGuard></ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute><StatusGuard><ProfileEditPage /></StatusGuard></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><StatusGuard><ProfileDetailPage /></StatusGuard></ProtectedRoute>} />
          <Route path="/browse" element={<ProtectedRoute><StatusGuard><BrowsePage /></StatusGuard></ProtectedRoute>} />
          <Route path="/matches" element={<ProtectedRoute><StatusGuard><MatchesPage /></StatusGuard></ProtectedRoute>} />
          <Route path="/chat/:matchId" element={<ProtectedRoute><StatusGuard><ChatPage /></StatusGuard></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminGuard><AdminDashboardPage /></AdminGuard></ProtectedRoute>} />
          <Route path="/debug" element={<DebugPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
