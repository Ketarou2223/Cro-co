// 解説: このファイルはルーティング設定を定義するアプリのルートコンポーネント。
// 解説: 呼ばれる場所: main.tsx から <App /> としてレンダリングされる
// 解説: ルーティングの構成:
//   - react-router-dom v7 の BrowserRouter + Routes で 26 ルートを管理
//   - lazy + Suspense = コード分割（各ページを遅延ロードしてバンドルサイズを削減）
//   - ProtectedRoute = ログイン必須ページのラッパー（未ログインはランディングへリダイレクト）
//   - PublicOnlyRoute = 非ログイン専用ページのラッパー（ログイン済みはホームへリダイレクト）
//   - OnboardingGuard = オンボーディング未完了ユーザーをセットアップ画面へリダイレクト
//   - ChatGuard = 審査中・却下ユーザーのチャットアクセスを制限
//   - AdminGuard = 管理者以外のアクセスをリダイレクト

import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { trackPageview } from '@/lib/analytics'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import PublicOnlyRoute from '@/components/PublicOnlyRoute'
import OnboardingGuard from '@/components/OnboardingGuard'
import ChatGuard from '@/components/ChatGuard'
import AdminGuard from '@/components/AdminGuard'
import LoadingScreen from '@/components/LoadingScreen'

// 解説: lazy(() => import(...)) = ページコンポーネントを動的インポートでコード分割する
//   最初にアクセスしたときだけバンドルを読み込む（初期ロードを速くするため）
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
const AuthConfirmedPage = lazy(() => import('@/pages/AuthConfirmedPage'))

// 解説: GoogleAnalytics = ルート変化を検知して GA4 にページビューを送信するコンポーネント
function GoogleAnalytics() {
  const location = useLocation()
  useEffect(() => {
    // 解説: pathname が変わるたびに GA4 にページビューを送信する
    trackPageview(location.pathname)
  }, [location.pathname])
  // 解説: null を返す = DOM を何も描画しない（副作用専用コンポーネント）
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      {/* 解説: AuthProvider = Supabase の認証状態を全コンポーネントから useAuth() で参照できるようにする */}
      <AuthProvider>
        <GoogleAnalytics />
        {/* 解説: Suspense = lazy コンポーネントの読み込み中に fallback を表示する */}
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* 解説: 認証不要の公開ページ */}
            <Route path="/" element={<LandingPage />} />
            {/* 解説: PublicOnlyRoute = ログイン済みユーザーはホームへリダイレクト */}
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
            {/* 解説: ProtectedRoute = 未ログインはランディングページへリダイレクト */}
            <Route path="/pending" element={<ProtectedRoute><PendingPage /></ProtectedRoute>} />
            <Route path="/upload-student-id" element={<ProtectedRoute><UploadStudentIdPage /></ProtectedRoute>} />
            <Route path="/rejected" element={<ProtectedRoute><RejectedPage /></ProtectedRoute>} />
            {/* 解説: セットアップフロー（/setup/*）= オンボーディング未完了ユーザー向け */}
            <Route path="/setup/required" element={<ProtectedRoute><SetupRequiredPage /></ProtectedRoute>} />
            <Route path="/setup/optional" element={<ProtectedRoute><SetupOptionalPage /></ProtectedRoute>} />
            <Route path="/setup/thanks" element={<ProtectedRoute><SetupThanksPage /></ProtectedRoute>} />
            <Route path="/setup/install" element={<ProtectedRoute><SetupInstallPage /></ProtectedRoute>} />
            <Route path="/setup/notify" element={<ProtectedRoute><SetupNotifyPage /></ProtectedRoute>} />
            <Route path="/setup/complete" element={<ProtectedRoute><SetupCompletePage /></ProtectedRoute>} />
            {/* 解説: OnboardingGuard = オンボーディング未完了ユーザーをセットアップへリダイレクト */}
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
            {/* 解説: ChatGuard = 審査中・却下ユーザーのチャット画面へのアクセスを制限 */}
            <Route path="/chat/:matchId" element={<ProtectedRoute><OnboardingGuard><ChatGuard><ChatPage /></ChatGuard></OnboardingGuard></ProtectedRoute>} />
            {/* 解説: AdminGuard = 管理者メールアドレス以外のアクセスをリダイレクト */}
            <Route path="/admin" element={<ProtectedRoute><AdminGuard><AdminDashboardPage /></AdminGuard></ProtectedRoute>} />
            {/* 解説: 認証コールバック系（認証不要） */}
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/confirmed" element={<AuthConfirmedPage />} />
            {/* 解説: 法的文書（認証不要の公開ページ） */}
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
