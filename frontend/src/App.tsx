import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import PublicOnlyRoute from '@/components/PublicOnlyRoute'
import OnboardingGuard from '@/components/OnboardingGuard'
import ChatGuard from '@/components/ChatGuard'
import AdminGuard from '@/components/AdminGuard'
import LoadingScreen from '@/components/LoadingScreen'

const LandingPage = lazy(() => import('@/pages/LandingPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const SignupPage = lazy(() => import('@/pages/SignupPage'))
const SetupRequiredPage = lazy(() => import('@/pages/SetupRequiredPage'))
const SetupOptionalPage = lazy(() => import('@/pages/SetupOptionalPage'))
const SetupThanksPage = lazy(() => import('@/pages/SetupThanksPage'))
const SetupInstallPage = lazy(() => import('@/pages/SetupInstallPage'))
const SetupNotifyPage = lazy(() => import('@/pages/SetupNotifyPage'))
const SetupCompletePage = lazy(() => import('@/pages/SetupCompletePage'))
const UploadStudentIdPage = lazy(() => import('@/pages/UploadStudentIdPage'))
const PendingPage = lazy(() => import('@/pages/PendingPage'))
const RejectedPage = lazy(() => import('@/pages/RejectedPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const BrowsePage = lazy(() => import('@/pages/BrowsePage'))
const ProfileDetailPage = lazy(() => import('@/pages/ProfileDetailPage'))
const ProfileEditPage = lazy(() => import('@/pages/ProfileEditPage'))
const MatchesPage = lazy(() => import('@/pages/MatchesPage'))
const ChatPage = lazy(() => import('@/pages/ChatPage'))
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'))
const FootprintsPage = lazy(() => import('@/pages/FootprintsPage'))
const LikesReceivedPage = lazy(() => import('@/pages/LikesReceivedPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const SafetyListPage = lazy(() => import('@/pages/SafetyListPage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'))
const TermsOfServicePage = lazy(() => import('@/pages/TermsOfServicePage'))
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
            <Route path="/pending" element={<ProtectedRoute><PendingPage /></ProtectedRoute>} />
            <Route path="/upload-student-id" element={<ProtectedRoute><UploadStudentIdPage /></ProtectedRoute>} />
            <Route path="/rejected" element={<ProtectedRoute><RejectedPage /></ProtectedRoute>} />
            <Route path="/setup/required" element={<ProtectedRoute><SetupRequiredPage /></ProtectedRoute>} />
            <Route path="/setup/optional" element={<ProtectedRoute><SetupOptionalPage /></ProtectedRoute>} />
            <Route path="/setup/thanks" element={<ProtectedRoute><SetupThanksPage /></ProtectedRoute>} />
            <Route path="/setup/install" element={<ProtectedRoute><SetupInstallPage /></ProtectedRoute>} />
            <Route path="/setup/notify" element={<ProtectedRoute><SetupNotifyPage /></ProtectedRoute>} />
            <Route path="/setup/complete" element={<ProtectedRoute><SetupCompletePage /></ProtectedRoute>} />
            <Route path="/home" element={<ProtectedRoute><OnboardingGuard><HomePage /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/profile/edit" element={<ProtectedRoute><OnboardingGuard><ProfileEditPage /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/matches" element={<ProtectedRoute><OnboardingGuard><MatchesPage /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><OnboardingGuard><NotificationsPage /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/browse" element={<ProtectedRoute><OnboardingGuard><BrowsePage /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/profile/:id" element={<ProtectedRoute><OnboardingGuard><ProfileDetailPage /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><OnboardingGuard><SettingsPage /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/settings/safety" element={<ProtectedRoute><OnboardingGuard><SafetyListPage /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/settings/contact" element={<ProtectedRoute><OnboardingGuard><ContactPage /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/footprints" element={<ProtectedRoute><OnboardingGuard><FootprintsPage /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/likes/received" element={<ProtectedRoute><OnboardingGuard><LikesReceivedPage /></OnboardingGuard></ProtectedRoute>} />
            <Route path="/chat/:matchId" element={<ProtectedRoute><OnboardingGuard><ChatGuard><ChatPage /></ChatGuard></OnboardingGuard></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminGuard><AdminDashboardPage /></AdminGuard></ProtectedRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
