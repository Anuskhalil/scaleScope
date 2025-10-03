// src/App.jsx
// Import Router and the new LandingPage so we can route to it
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import RegisterPage from './auth/RegisterPage'
import LoginPage from './auth/LoginPage'
import ProfilePage from './pages/ProfilePage'
import { AuthProvider } from './auth/AuthContext'

export default function App() {
  // Wrap routes in AuthProvider to manage auth state globally
  return (
    <AuthProvider>
      <Routes>
        {/* Landing route at the site root */}
        <Route path="/" element={<LandingPage />} />
        {/* Auth routes */}
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Protected dashboard route */}
       // In your router
        <Route path="/profile" element={<ProfilePage />} />
        {/* Fallback: redirect unknown routes to landing */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </AuthProvider>
  )
}