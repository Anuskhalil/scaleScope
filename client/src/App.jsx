// src/App.jsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// ── Auth ──
import { AuthProvider, useAuth } from './auth/AuthContext';

// ── Layout ──
import RoleNavbar from './components/landing-page/RoleNavbar';

// ── MFA ──
import MfaChallenge from './components/mfaChallenge';
import MfaSetup from './components/mfaSetup';

// ── Public Pages ──
import LandingPage from './pages/LandingPage';
import RegisterPage from './auth/RegisterPage';
import LoginPage from './auth/LoginPage';
import ForgotPasswordPage from './auth/ForgotPasswordPage';
import AuthCallbackPage from './auth/AuthCallbackPage';

// ── Profile Pages ──
import ProfilePage from './pages/StudentRolePages/ProfilePage';
import FounderProfilePage from './pages/FounderProfile';

// ── Shared Protected Pages ──
import DiscoverPage from './pages/StudentRolePages/DiscoverPage';
import MessagesPage from './pages/StudentRolePages/MessagesPage';
import FindMentorsPage from './pages/StudentRolePages/FindMentorsPage';

// ── Student Pages ──
import StudentDashboard from './pages/StudentRolePages/StudentDashbaord';
import FindCoFoundersPage from './pages/StudentRolePages/FindCoFounder';
import ConnectionRequestsPage from './pages/StudentRolePages/ConnectionRequestsPage';
import StudentViewProfilePage from './pages/StudentRolePages/StudentViewProfile';

// ── Founder Pages ──
import FounderDashboard from './pages/EarlyStageFoundeRolerPages/EarlyStageDashboard';
import FindTeamPage from './pages/EarlyStageFoundeRolerPages/FindTeamPage';
import FindInvestorsPage from './pages/EarlyStageFoundeRolerPages/FindInvestorsPage';

// ── Mentor Pages ──
import MentorDashboard from './pages/MentorRolePages/MentorDashboard';
import MentorProfilePage from './pages/MentorProfile';
import FindFoundersPage from './pages/MentorRolePages/FindFoundersPage';
import MyMenteesPage from './pages/MentorRolePages/MyMenteesPage';

// ── Investor Pages ──
import InvestorDashboard from './pages/InvestorRolePages/InvestorDashboard';
import InvestorProfilePage from './pages/InvestorProfile';
import FindStartupsPage from './pages/InvestorRolePages/FindStartupsPage';

<<<<<<< HEAD
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#1B2D7F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">Loading...</p>
=======
import { Toaster } from 'react-hot-toast';

// ─── Dashboard: routes by role ────────────────────────────────────────────
function DashboardRouter() {
  const { user } = useAuth()
  const role = user?.user_metadata?.user_type

  if (role === 'student') return <StudentDashboard />
  if (role === 'early-stage-founder') return <FounderDashboard />
  if (role === 'mentor') return <MentorDashboard />
  if (role === 'investor') return <InvestorDashboard />

  return <Navigate to="/profile" replace />
}

// ─── Profile: routes by role ──────────────────────────────────────────────
function ProfileRouter() {
  const { user } = useAuth()
  const role = user?.user_metadata?.user_type

  if (role === 'early-stage-founder') return <FounderProfilePage />
  if (role === 'mentor') return <MentorProfilePage />
  if (role === 'investor') return <InvestorProfilePage />
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
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
      </div>
    </div>
  );
}

function VerifyEmailPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📩</span>
        </div>

        <h1 className="text-xl font-black text-gray-900 mb-2">
          Verify your email
        </h1>

        <p className="text-sm text-gray-500 mb-5">
          We sent a verification link to{' '}
          <span className="font-bold text-gray-700">{user?.email}</span>.
          Please verify your email before accessing ScaleScope.
        </p>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-2.5 rounded-xl bg-[#98DE38] text-black text-sm font-bold"
          >
            I have verified, refresh
          </button>

          <button
            type="button"
            onClick={signOut}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function getUserRole(user, profile) {
  return (
    profile?.user_type ||
    user?.user_metadata?.user_type ||
    user?.app_metadata?.user_type ||
    'student'
  );
}

function DashboardRouter() {
  const { user, profile } = useAuth();
  const role = getUserRole(user, profile);

  if (role === 'student') return <StudentDashboard />;
  if (role === 'early-stage-founder') return <FounderDashboard />;
  if (role === 'mentor') return <MentorDashboard />;
  if (role === 'investor') return <InvestorDashboard />;

  return <Navigate to="/profile" replace />;
}

function ProfileRouter() {
  const { user, profile } = useAuth();
  const role = getUserRole(user, profile);

  if (role === 'early-stage-founder') return <FounderProfilePage />;
  if (role === 'mentor') return <MentorProfilePage />;
  if (role === 'investor') return <InvestorProfilePage />;

  return <ProfilePage />;
}

function ProtectedPage({ children, allowMfaSetup = false, allowMfaChallenge = false }) {
  const {
    session,
    user,
    loading,
    emailVerified,
    needsMfa,
  } = useAuth();

  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!session || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (!emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (needsMfa && !allowMfaChallenge && !allowMfaSetup) {
    return (
      <Navigate
        to="/mfa"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}

function RolePage({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  const role = getUserRole(user, profile);

  return (
    <ProtectedPage>
      {allowedRoles.includes(role) ? children : <Navigate to="/dashboard" replace />}
    </ProtectedPage>
  );
}

function PublicOnlyPage({ children }) {
  const { session, user, loading, emailVerified, needsMfa } = useAuth();

  if (loading) return children;

  if (session && user && emailVerified && needsMfa) {
    return <Navigate to="/mfa" replace />;
  }

  if (session && user && emailVerified && !needsMfa) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

const AUTH_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/auth/callback',
  '/verify-email',
  '/mfa',
  '/mfa/setup',
];

const PUBLIC_PATHS_WITH_OWN_NAVBAR = [
  '/',
];

function AppLayout({ children }) {
  const { session, user, emailVerified, needsMfa } = useAuth();
  const location = useLocation();

  const isAuthPage = AUTH_PATHS.some((path) =>
    location.pathname.startsWith(path)
  );

  const isPublicLandingPage = PUBLIC_PATHS_WITH_OWN_NAVBAR.includes(
    location.pathname
  );

  const showRoleNavbar =
    Boolean(session && user && emailVerified && !needsMfa) &&
    !isAuthPage &&
    !isPublicLandingPage;

  return (
    <>
      {showRoleNavbar && <RoleNavbar />}
      {children}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
       <Toaster 
        position="top-right" 
        toastOptions={{ 
          duration: 4000,
          style: { background: '#1e293b', color: '#fff' },
        }} 
      />
      <AppLayout>
        <Routes>
          {/* Public landing only */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth */}
          <Route
            path="/register"
            element={
              <PublicOnlyPage>
                <RegisterPage />
              </PublicOnlyPage>
            }
          />

          <Route
            path="/login"
            element={
              <PublicOnlyPage>
                <LoginPage />
              </PublicOnlyPage>
            }
          />

          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route
            path="/verify-email"
            element={
              <ProtectedPage allowMfaSetup>
                <VerifyEmailPage />
              </ProtectedPage>
            }
          />

          <Route
            path="/mfa"
            element={
              <ProtectedPage allowMfaChallenge>
                <MfaChallenge />
              </ProtectedPage>
            }
          />

          <Route
            path="/mfa/setup"
            element={
              <ProtectedPage allowMfaSetup>
                <MfaSetup />
              </ProtectedPage>
            }
          />

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedPage>
                <DashboardRouter />
              </ProtectedPage>
            }
          />

          {/* Profiles */}
          <Route
            path="/profile"
            element={
              <ProtectedPage>
                <ProfileRouter />
              </ProtectedPage>
            }
          />

          <Route
            path="/user-profile/:userId"
            element={
              <ProtectedPage>
                <StudentViewProfilePage />
              </ProtectedPage>
            }
          />

          <Route
            path="/founder-profile"
            element={
              <RolePage allowedRoles={['early-stage-founder']}>
                <FounderProfilePage />
              </RolePage>
            }
          />

          {/* Shared protected */}
          <Route
            path="/discover"
            element={
              <ProtectedPage>
                <DiscoverPage />
              </ProtectedPage>
            }
          />

          <Route
            path="/messages"
            element={
              <ProtectedPage>
                <MessagesPage />
              </ProtectedPage>
            }
          />

          <Route
            path="/find-mentors"
            element={
              <ProtectedPage>
                <FindMentorsPage />
              </ProtectedPage>
            }
          />

          {/* Student only */}
          <Route
            path="/find-cofounders"
            element={
              <RolePage allowedRoles={['student']}>
                <FindCoFoundersPage />
              </RolePage>
            }
          />

          <Route
            path="/connection-requests"
            element={
              <RolePage allowedRoles={['student']}>
                <ConnectionRequestsPage />
              </RolePage>
            }
          />

          {/* Founder only */}
          <Route
            path="/find-team"
            element={
              <RolePage allowedRoles={['early-stage-founder']}>
                <FindTeamPage />
              </RolePage>
            }
          />

          <Route
            path="/find-investors"
            element={
              <RolePage allowedRoles={['early-stage-founder']}>
                <FindInvestorsPage />
              </RolePage>
            }
          />

          {/* Mentor only */}
          <Route
            path="/mentor-profile"
            element={
              <RolePage allowedRoles={['mentor']}>
                <MentorProfilePage />
              </RolePage>
            }
          />

          <Route
            path="/find-founders"
            element={
              <RolePage allowedRoles={['mentor']}>
                <FindFoundersPage />
              </RolePage>
            }
          />

          <Route
            path="/my-mentees"
            element={
              <RolePage allowedRoles={['mentor']}>
                <MyMenteesPage />
              </RolePage>
            }
          />

          {/* Investor only */}
          <Route
            path="/investor-profile"
            element={
              <RolePage allowedRoles={['investor']}>
                <InvestorProfilePage />
              </RolePage>
            }
          />

          <Route
            path="/find-startups"
            element={
              <RolePage allowedRoles={['investor']}>
                <FindStartupsPage />
              </RolePage>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </AuthProvider>
  );
}