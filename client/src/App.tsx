// App.tsx

import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layout Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';

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

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';

// Auth Guard
import { RequireAuth } from './components/RequireAuth';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <Router>
      {/* 
        =======================
        GLOBAL PROVIDERS
        =======================
        AuthProvider must wrap everything.
        ProfileProvider depends on AuthProvider (uses user/token).
      */}
      <AuthProvider>
        <ProfileProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            
            {/* Layout */}
            <Navbar toggleSidebar={toggleSidebar} />
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

            <main className="flex-grow pt-16 p-8">
              <Routes>
                
                {/* Public Pages */}
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />

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
            </main>

            <Footer />
          </div>
        </ProfileProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
