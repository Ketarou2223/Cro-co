import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import HomePage from '@/pages/HomePage'
import ProfileEditPage from '@/pages/ProfileEditPage'
import PendingPage from '@/pages/PendingPage'
import RejectedPage from '@/pages/RejectedPage'
import UploadStudentIdPage from '@/pages/UploadStudentIdPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import BrowsePage from '@/pages/BrowsePage'
import ProfileDetailPage from '@/pages/ProfileDetailPage'
import MatchesPage from '@/pages/MatchesPage'
import ChatPage from '@/pages/ChatPage'
import NotificationsPage from '@/pages/NotificationsPage'
import SettingsPage from '@/pages/SettingsPage'
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage'
import TermsOfServicePage from '@/pages/TermsOfServicePage'
import LandingPage from '@/pages/LandingPage'
import SetupRequiredPage from '@/pages/SetupRequiredPage'
import SetupOptionalPage from '@/pages/SetupOptionalPage'
import SetupThanksPage from '@/pages/SetupThanksPage'
import SetupCompletePage from '@/pages/SetupCompletePage'
import ProtectedRoute from '@/components/ProtectedRoute'
import PublicOnlyRoute from '@/components/PublicOnlyRoute'
import OnboardingGuard from '@/components/OnboardingGuard'
import ChatGuard from '@/components/ChatGuard'
import AdminGuard from '@/components/AdminGuard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
          <Route path="/pending" element={<ProtectedRoute><PendingPage /></ProtectedRoute>} />
          <Route path="/upload-student-id" element={<ProtectedRoute><UploadStudentIdPage /></ProtectedRoute>} />
          <Route path="/rejected" element={<ProtectedRoute><RejectedPage /></ProtectedRoute>} />
          {/* 初回セットアップ・再申請（OnboardingGuard なし） */}
          <Route path="/setup/required" element={<ProtectedRoute><SetupRequiredPage /></ProtectedRoute>} />
          <Route path="/setup/optional" element={<ProtectedRoute><SetupOptionalPage /></ProtectedRoute>} />
          <Route path="/setup/thanks" element={<ProtectedRoute><SetupThanksPage /></ProtectedRoute>} />
          <Route path="/setup/complete" element={<ProtectedRoute><SetupCompletePage /></ProtectedRoute>} />
          {/* 全認証済みユーザー（OnboardingGuard でセットアップ状態を確認） */}
          <Route path="/home" element={<ProtectedRoute><OnboardingGuard><HomePage /></OnboardingGuard></ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute><OnboardingGuard><ProfileEditPage /></OnboardingGuard></ProtectedRoute>} />
          <Route path="/matches" element={<ProtectedRoute><OnboardingGuard><MatchesPage /></OnboardingGuard></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><OnboardingGuard><NotificationsPage /></OnboardingGuard></ProtectedRoute>} />
          <Route path="/browse" element={<ProtectedRoute><OnboardingGuard><BrowsePage /></OnboardingGuard></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><OnboardingGuard><ProfileDetailPage /></OnboardingGuard></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><OnboardingGuard><SettingsPage /></OnboardingGuard></ProtectedRoute>} />
          {/* チャットは承認済みユーザーのみ */}
          <Route path="/chat/:matchId" element={<ProtectedRoute><OnboardingGuard><ChatGuard><ChatPage /></ChatGuard></OnboardingGuard></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminGuard><AdminDashboardPage /></AdminGuard></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
