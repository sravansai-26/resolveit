import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Upload } from './pages/Upload';
import { Profile } from './pages/Profile';
import { EditProfile } from './pages/EditProfile';
import { About } from './pages/About';
import { Feedback } from './pages/Feedback';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ProfileProvider } from './context/ProfileContext';
import { RequireAuth } from './components/RequireAuth';
import { EditPost } from './pages/EditPost';

// Import the new pages you added
import { TermsOfService } from './pages/TermsOfService'; // Make sure the path is correct
import { PrivacyPolicy } from './pages/PrivacyPolicy';   // Make sure the path is correct

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <Router>
      <ProfileProvider>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar toggleSidebar={toggleSidebar} />
          <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
          <main className="flex-grow pt-16 p-8">
            <Routes>
              <Route path="/" element={<Home />} />
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

              {/* ROUTE FOR EDITING AN ISSUE */}
              <Route
                path="/issues/edit/:id"
                element={
                  <RequireAuth>
                    <EditPost />
                  </RequireAuth>
                }
              />

              <Route path="/about" element={<About />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* NEW ROUTES FOR TERMS OF SERVICE AND PRIVACY POLICY */}
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </ProfileProvider>
    </Router>
  );
}

export default App;