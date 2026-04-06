// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'

// ── Auth ──
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/AuthContext'
import ProtectedRoute from './components/ProtectedRoutes'

// ── Layout ──
import RoleNavbar from './components/landing-page/RoleNavbar'

// ── Public Pages ──
import LandingPage from './pages/LandingPage'
import RegisterPage from './auth/RegisterPage'
import LoginPage from './auth/LoginPage'

// ── Profile Pages (role-split) ──
import ProfilePage from './pages/ProfilePage'                
import FounderProfilePage from './pages/FounderProfile'   

// ── Shared Protected Pages (both roles) ──
import DiscoverPage from './pages/DiscoverPage'
import MessagesPage from './pages/MessagesPage'
import FindMentorsPage from './pages/FindMentorsPage'

// ── Student Pages ──
import StudentDashboard from './pages/StudentRolePages/StudentDashbaord'
import FindCoFoundersPage from './pages/StudentRolePages/FindCoFounder'

// ── Founder Pages ──
import FounderDashboard from './pages/EarlyStageFoundeRolerPages/EarlyStageDashboard'
import FindTeamPage from './pages/EarlyStageFoundeRolerPages/FindTeamPage'
import FindInvestorsPage from './pages/EarlyStageFoundeRolerPages/FindInvestorsPage'

// ── Mentor Pages ──
import MentorDashboard from './pages/MentorRolePages/MentorDashboard'
import MentorProfilePage from './pages/MentorProfile'
import FindFoundersPage from './pages/MentorRolePages/FindFoundersPage'
import MyMenteesPage from './pages/MentorRolePages/MyMenteesPage'

// ── Investor Pages ──
import InvestorDashboard from './pages/InvestorRolePages/InvestorDashboard'
import InvestorProfilePage from './pages/InvestorProfile'
import FindStartupsPage from './pages/InvestorRolePages/FindStartupsPage'

// ─── Dashboard: routes by role ────────────────────────────────────────────
function DashboardRouter() {
  const { user } = useAuth()
  const role = user?.user_metadata?.user_type

  if (role === 'student')               return <StudentDashboard />
  if (role === 'early-stage-founder')   return <FounderDashboard />
  if (role === 'mentor')                return <MentorDashboard />
  if (role === 'investor')              return <InvestorDashboard />

  return <Navigate to="/profile" replace />
}

// ─── Profile: routes by role ──────────────────────────────────────────────
function ProfileRouter() {
  const { user } = useAuth()
  const role = user?.user_metadata?.user_type

  if (role === 'early-stage-founder') return <FounderProfilePage />
  if (role === 'mentor')              return <MentorProfilePage />
  if (role === 'investor')            return <InvestorProfilePage />
  return <ProfilePage />   // student, other
}

// ─── RoleRoute: guards a route to specific roles ──────────────────────────
function RoleRoute({ children, allowedRoles }) {
  const { user, session, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!session) return <Navigate to="/login" replace />

  // session exists but email not confirmed yet
  if (session && !user) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold">Please Verify Your Email</h2>
        <p>Check your inbox to activate your account.</p>
      </div>
    )
  }

  const role = user?.user_metadata?.user_type
  if (!allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />

  return children
}

function AppLayout({ children }) {
  const { session, user } = useAuth()
  const showNavbar = Boolean(session && user)

  return (
    <>
      {showNavbar && <RoleNavbar />}
      {children}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout>
        <Routes>

          {/* ══ Public ══ */}
          <Route path="/"         element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login"    element={<LoginPage />} />

          {/* ══ Profile — smart router: founder → FounderProfilePage, else → ProfilePage ══ */}
          <Route path="/profile" element={
            <ProtectedRoute><ProfileRouter /></ProtectedRoute>
          } />

          {/* Explicit founder-profile deep link (same page, for direct nav) */}
          <Route path="/founder-profile" element={
            <RoleRoute allowedRoles={['early-stage-founder']}>
              <FounderProfilePage />
            </RoleRoute>
          } />

          {/* ══ Dashboard — smart router ══ */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardRouter /></ProtectedRoute>
          } />

          {/* ══ Shared ══ */}
          <Route path="/discover" element={
            <ProtectedRoute><DiscoverPage /></ProtectedRoute>
          } />

          <Route path="/messages" element={
            <ProtectedRoute><MessagesPage /></ProtectedRoute>
          } />

          {/* Mentors: shared between students AND founders */}
          <Route path="/find-mentors" element={
            <ProtectedRoute><FindMentorsPage /></ProtectedRoute>
          } />

          {/* ══ Student only ══ */}
          <Route path="/find-cofounders" element={
            <RoleRoute allowedRoles={['student']}>
              <FindCoFoundersPage />
            </RoleRoute>
          } />

          {/* ══ Founder only ══ */}
          <Route path="/find-team" element={
            <RoleRoute allowedRoles={['early-stage-founder']}>
              <FindTeamPage />
            </RoleRoute>
          } />

          <Route path="/find-investors" element={
            <RoleRoute allowedRoles={['early-stage-founder']}>
              <FindInvestorsPage />
            </RoleRoute>
          } />

          {/* ══ Mentor only ══ */}
          <Route path="/mentor-profile" element={
            <RoleRoute allowedRoles={['mentor']}>
              <MentorProfilePage />
            </RoleRoute>
          } />

          <Route path="/find-founders" element={
            <RoleRoute allowedRoles={['mentor']}>
              <FindFoundersPage />
            </RoleRoute>
          } />

          <Route path="/my-mentees" element={
            <RoleRoute allowedRoles={['mentor']}>
              <MyMenteesPage />
            </RoleRoute>
          } />

          {/* ══ Investor only ══ */}
          <Route path="/investor-profile" element={
            <RoleRoute allowedRoles={['investor']}>
              <InvestorProfilePage />
            </RoleRoute>
          } />

          <Route path="/find-startups" element={
            <RoleRoute allowedRoles={['investor']}>
              <FindStartupsPage />
            </RoleRoute>
          } />

          {/* ══ Catch-all ══ */}
          <Route path="*" element={<LandingPage />} />

        </Routes>
      </AppLayout>
    </AuthProvider>
  )
}