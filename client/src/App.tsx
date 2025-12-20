// App.tsx - COMPLETE FIXED VERSION WITH RESET PASSWORD ROUTE

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Pages
import { Home } from './pages/Home';
import { Upload } from './pages/Upload';
import { Profile } from './pages/Profile';
import { EditProfile } from './pages/EditProfile';
import { About } from './pages/About';
import { Feedback } from './pages/Feedback';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { EditPost } from './pages/EditPost';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword"; // Added for Forgot Password flow

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';

// Auth Guard
import { RequireAuth } from './components/RequireAuth';

// Layout wrapper
import { AppLayout } from './components/AppLayout';

function App() {
  return (
    <Router>
      {/* =======================
          GLOBAL PROVIDERS
          ======================= */}
      <AuthProvider>
        <ProfileProvider>

          {/* =======================
              GLOBAL LAYOUT WRAPPER
              ======================= */}
          <AppLayout>

            <Routes>

              {/* Public Pages */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Reset Password Route - Receives the token from the email link */}
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* ========= Protected Routes ========= */}
              <Route
                path="/upload"
                element={
                  <RequireAuth>
                    <Upload />
                  </RequireAuth>
                }
              />

              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                }
              />

              <Route
                path="/profile/edit"
                element={
                  <RequireAuth>
                    <EditProfile />
                  </RequireAuth>
                }
              />

              <Route
                path="/issues/edit/:id"
                element={
                  <RequireAuth>
                    <EditPost />
                  </RequireAuth>
                }
              />

            </Routes>
          </AppLayout>

        </ProfileProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;