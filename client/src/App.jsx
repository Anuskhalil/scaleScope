// src/App.jsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// ── Auth ──
import { AuthProvider, useAuth } from './auth/AuthContext';

// ── Layout ──
import RoleNavbar from './components/landing-page/RoleNavbar';
import Navbar from './components/landing-page/Navbar';
import Footer from './components/landing-page/Footer';

// ── MFA ──
import MfaChallenge from './components/MfaChallenge';
import MfaSetup from './components/MfaSetup';

// ── Public Pages ──
import LandingPage from './pages/LandingPage';
import RegisterPage from './auth/RegisterPage';
import LoginPage from './auth/LoginPage';
import ForgotPasswordPage from './auth/ForgotPasswordPage';
import AuthCallbackPage from './auth/AuthCallbackPage';

// ── Profile Pages ──
import ProfilePage from './pages/StudentRolePages/ProfilePage';
import FounderProfilePage from './pages/EarlyStageFounderRolePages/FounderProfile';

// ── Shared Protected Pages ──
import DiscoverPage from './pages/StudentRolePages/DiscoverPage';
import MessagesPage from './pages/StudentRolePages/MessagesPage';
import FindMentorsPage from './pages/StudentRolePages/FindMentorsPage';
import MeetingRoomPage from './pages/MeetingRoomPage';

// ── Student Pages ──
import StudentDashboard from './pages/StudentRolePages/StudentDashbaord';
import FindCoFoundersPage from './pages/StudentRolePages/FindCoFounder';
import ConnectionRequestsPage from './pages/StudentRolePages/ConnectionRequestsPage';
import StudentViewProfilePage from './pages/StudentRolePages/StudentViewProfile';

// ── Founder Pages ──
import FounderDashboard from './pages/EarlyStageFounderRolePages/EarlyStageDashboard';
import FindTeamPage from './pages/EarlyStageFounderRolePages/FindTeamPage';
import FindInvestorsPage from './pages/EarlyStageFounderRolePages/FindInvestorsPage';

// ── Mentor Pages ──
import MentorDashboard from './pages/MentorRolePages/MentorDashboard';
import MentorProfilePage from './pages/MentorRolePages/MentorProfile';
import FindFoundersPage from './pages/MentorRolePages/FindFoundersPage';
import MyMenteesPage from './pages/MentorRolePages/MyMenteesPage';

// ── Investor Pages ──
import InvestorDashboard from './pages/InvestorRolePages/InvestorDashboard';
import InvestorProfilePage from './pages/InvestorProfile';
import FindStartupsPage from './pages/InvestorRolePages/FindStartupsPage';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#1B2D7F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">Loading...</p>
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
    null
  );
}

function getRoleBasePath(role) {
  switch (role) {
    case 'student':
      return '/student';

    case 'early-stage-founder':
      return '/founder';

    case 'mentor':
      return '/mentor';

    case 'investor':
      return '/investor';

    default:
      return '/login';
  }
}

function getRoleDashboardPath(role) {
  const basePath = getRoleBasePath(role);
  return basePath === '/login' ? '/login' : `${basePath}/dashboard`;
}

function getRoleProfilePath(role) {
  const basePath = getRoleBasePath(role);
  return basePath === '/login' ? '/login' : `${basePath}/profile`;
}

function DashboardRouter() {
  const { user, profile } = useAuth();
  const role = getUserRole(user, profile);

  if (role === 'student') return <StudentDashboard />;
  if (role === 'early-stage-founder') return <FounderDashboard />;
  if (role === 'mentor') return <MentorDashboard />;
  if (role === 'investor') return <InvestorDashboard />;

  return <Navigate to="/register" replace />;
}

function ProfileRouter() {
  const { user, profile } = useAuth();
  const role = getUserRole(user, profile);

  if (role === 'early-stage-founder') return <FounderProfilePage />;
  if (role === 'mentor') return <MentorProfilePage />;
  if (role === 'investor') return <InvestorProfilePage />;
  if (!role) return <Navigate to="/register" replace />;

  return <ProfilePage />;
}

function DashboardRedirect() {
  const { user, profile } = useAuth();
  const role = getUserRole(user, profile);

  return <Navigate to={getRoleDashboardPath(role)} replace />;
}

function ProfileRedirect() {
  const { user, profile } = useAuth();
  const role = getUserRole(user, profile);

  return <Navigate to={getRoleProfilePath(role)} replace />;
}

function RolePathRedirect({ page }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const role = getUserRole(user, profile);

  return (
    <Navigate
      to={`${getRoleBasePath(role)}/${page}${location.search || ''}`}
      replace
    />
  );
}

function RoleMentorRedirect() {
  const { user, profile } = useAuth();
  const role = getUserRole(user, profile);

  if (role === 'student') {
    return <Navigate to="/student/find-mentors" replace />;
  }

  if (role === 'early-stage-founder') {
    return <Navigate to="/founder/find-mentors" replace />;
  }

  return <Navigate to={getRoleDashboardPath(role)} replace />;
}

function ProtectedPage({
  children,
  allowMfaSetup = false,
  allowMfaChallenge = false,
}) {
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
      {allowedRoles.includes(role) ? (
        children
      ) : (
        <Navigate to={getRoleDashboardPath(role)} replace />
      )}
    </ProtectedPage>
  );
}

function PublicOnlyPage({ children }) {
  const {
    session,
    user,
    profile,
    loading,
    emailVerified,
    needsMfa,
  } = useAuth();

  if (loading) return children;

  if (session && user && emailVerified && needsMfa) {
    return <Navigate to="/mfa" replace />;
  }

  if (session && user && emailVerified && !needsMfa) {
    const role = getUserRole(user, profile);

    if (role) {
      return <Navigate to={getRoleDashboardPath(role)} replace />;
    }
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

const AUTH_PATHS_WITH_LANDING_CHROME = [
  '/login',
  '/register',
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

  const showLandingChrome = AUTH_PATHS_WITH_LANDING_CHROME.includes(
    location.pathname
  );

  const showRoleNavbar =
    Boolean(session && user && emailVerified && !needsMfa) &&
    !isAuthPage &&
    !isPublicLandingPage;

  return (
    <>
      {showLandingChrome && <Navbar />}
      {showRoleNavbar && <RoleNavbar />}
      {showLandingChrome ? (
        <main className="pt-16 md:pt-20">{children}</main>
      ) : (
        children
      )}
      {showLandingChrome && <Footer />}
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
          style: {
            background: '#1e293b',
            color: '#fff',
          },
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

          {/* ───────────────────────────────────────────── */}
          {/* New role-prefixed student routes */}
          {/* ───────────────────────────────────────────── */}
          <Route
            path="/meetings/:meetingId"
            element={
              <RolePage allowedRoles={['student', 'early-stage-founder', 'mentor', 'investor']}>
                <MeetingRoomPage />
              </RolePage>
            }
          />

          <Route
            path="/student/dashboard"
            element={
              <RolePage allowedRoles={['student']}>
                <StudentDashboard />
              </RolePage>
            }
          />

          <Route
            path="/student/profile"
            element={
              <RolePage allowedRoles={['student']}>
                <ProfilePage />
              </RolePage>
            }
          />

          <Route
            path="/student/discover"
            element={
              <RolePage allowedRoles={['student']}>
                <DiscoverPage />
              </RolePage>
            }
          />

          <Route
            path="/student/messages"
            element={
              <RolePage allowedRoles={['student']}>
                <MessagesPage />
              </RolePage>
            }
          />

          <Route
            path="/student/find-mentors"
            element={
              <RolePage allowedRoles={['student']}>
                <FindMentorsPage />
              </RolePage>
            }
          />

          <Route
            path="/student/find-cofounders"
            element={
              <RolePage allowedRoles={['student']}>
                <FindCoFoundersPage />
              </RolePage>
            }
          />

          <Route
            path="/student/connection-requests"
            element={
              <RolePage allowedRoles={['student']}>
                <ConnectionRequestsPage />
              </RolePage>
            }
          />

          {/* ───────────────────────────────────────────── */}
          {/* New role-prefixed founder routes */}
          {/* ───────────────────────────────────────────── */}
          <Route
            path="/founder/dashboard"
            element={
              <RolePage allowedRoles={['early-stage-founder']}>
                <FounderDashboard />
              </RolePage>
            }
          />

          <Route
            path="/founder/profile"
            element={
              <RolePage allowedRoles={['early-stage-founder']}>
                <FounderProfilePage />
              </RolePage>
            }
          />

          <Route
            path="/founder/discover"
            element={
              <RolePage allowedRoles={['early-stage-founder']}>
                <DiscoverPage />
              </RolePage>
            }
          />

          <Route
            path="/founder/messages"
            element={
              <RolePage allowedRoles={['early-stage-founder']}>
                <MessagesPage />
              </RolePage>
            }
          />

          <Route
            path="/founder/find-team"
            element={
              <RolePage allowedRoles={['early-stage-founder']}>
                <FindTeamPage />
              </RolePage>
            }
          />

          <Route
            path="/founder/find-investors"
            element={
              <RolePage allowedRoles={['early-stage-founder']}>
                <FindInvestorsPage />
              </RolePage>
            }
          />

          <Route
            path="/founder/find-mentors"
            element={
              <RolePage allowedRoles={['early-stage-founder']}>
                <FindMentorsPage />
              </RolePage>
            }
          />

          {/* ───────────────────────────────────────────── */}
          {/* New role-prefixed mentor routes */}
          {/* ───────────────────────────────────────────── */}
          <Route
            path="/mentor/dashboard"
            element={
              <RolePage allowedRoles={['mentor']}>
                <MentorDashboard />
              </RolePage>
            }
          />

          <Route
            path="/mentor/profile"
            element={
              <RolePage allowedRoles={['mentor']}>
                <MentorProfilePage />
              </RolePage>
            }
          />

          <Route
            path="/mentor/discover"
            element={
              <RolePage allowedRoles={['mentor']}>
                <DiscoverPage />
              </RolePage>
            }
          />

          <Route
            path="/mentor/messages"
            element={
              <RolePage allowedRoles={['mentor']}>
                <MessagesPage />
              </RolePage>
            }
          />

          <Route
            path="/mentor/find-founders"
            element={
              <RolePage allowedRoles={['mentor']}>
                <FindFoundersPage />
              </RolePage>
            }
          />

          <Route
            path="/mentor/my-mentees"
            element={
              <RolePage allowedRoles={['mentor']}>
                <MyMenteesPage />
              </RolePage>
            }
          />

          {/* ───────────────────────────────────────────── */}
          {/* New role-prefixed investor routes */}
          {/* ───────────────────────────────────────────── */}
          <Route
            path="/investor/dashboard"
            element={
              <RolePage allowedRoles={['investor']}>
                <InvestorDashboard />
              </RolePage>
            }
          />

          <Route
            path="/investor/profile"
            element={
              <RolePage allowedRoles={['investor']}>
                <InvestorProfilePage />
              </RolePage>
            }
          />

          <Route
            path="/investor/discover"
            element={
              <RolePage allowedRoles={['investor']}>
                <DiscoverPage />
              </RolePage>
            }
          />

          <Route
            path="/investor/messages"
            element={
              <RolePage allowedRoles={['investor']}>
                <MessagesPage />
              </RolePage>
            }
          />

          <Route
            path="/investor/find-startups"
            element={
              <RolePage allowedRoles={['investor']}>
                <FindStartupsPage />
              </RolePage>
            }
          />

          {/* ───────────────────────────────────────────── */}
          {/* Shared profile viewer */}
          {/* ───────────────────────────────────────────── */}
          <Route
            path="/user-profile/:userId"
            element={
              <ProtectedPage>
                <StudentViewProfilePage />
              </ProtectedPage>
            }
          />

          {/* ───────────────────────────────────────────── */}
          {/* Backward-compatible old routes */}
          {/* Keep these so deployed old URLs do not break */}
          {/* ───────────────────────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedPage>
                <DashboardRedirect />
              </ProtectedPage>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedPage>
                <ProfileRedirect />
              </ProtectedPage>
            }
          />

          <Route
            path="/discover"
            element={
              <ProtectedPage>
                <RolePathRedirect page="discover" />
              </ProtectedPage>
            }
          />

          <Route
            path="/messages"
            element={
              <ProtectedPage>
                <RolePathRedirect page="messages" />
              </ProtectedPage>
            }
          />

          <Route
            path="/find-mentors"
            element={
              <ProtectedPage>
                <RoleMentorRedirect />
              </ProtectedPage>
            }
          />

          <Route
            path="/find-cofounders"
            element={<Navigate to="/student/find-cofounders" replace />}
          />

          <Route
            path="/connection-requests"
            element={<Navigate to="/student/connection-requests" replace />}
          />

          <Route
            path="/founder-profile"
            element={<Navigate to="/founder/profile" replace />}
          />

          <Route
            path="/find-team"
            element={<Navigate to="/founder/find-team" replace />}
          />

          <Route
            path="/find-investors"
            element={<Navigate to="/founder/find-investors" replace />}
          />

          <Route
            path="/mentor-profile"
            element={<Navigate to="/mentor/profile" replace />}
          />

          <Route
            path="/find-founders"
            element={<Navigate to="/mentor/find-founders" replace />}
          />

          <Route
            path="/my-mentees"
            element={<Navigate to="/mentor/my-mentees" replace />}
          />

          <Route
            path="/investor-profile"
            element={<Navigate to="/investor/profile" replace />}
          />

          <Route
            path="/find-startups"
            element={<Navigate to="/investor/find-startups" replace />}
          />

          {/* Optional legacy investor aliases */}
          <Route
            path="/deal-flow"
            element={<Navigate to="/investor/find-startups" replace />}
          />

          <Route
            path="/startups"
            element={<Navigate to="/investor/find-startups" replace />}
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </AuthProvider>
  );
}
