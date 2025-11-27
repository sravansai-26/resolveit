// App.tsx

import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';

// Page Imports
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

// Context and Components Imports
import { ProfileProvider } from './context/ProfileContext'; // Keep ProfileProvider
import { RequireAuth } from './components/RequireAuth';
// ----------------------------------------------------------------------
// ✅ CRITICAL FIX: IMPORT AND USE AuthProvider
import { AuthProvider } from './context/AuthContext'; 
// ----------------------------------------------------------------------


function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <Router>
        {/* ------------------------------------------------------------------ */}
        {/* ✅ FIX: AuthProvider is the outermost provider for core state */}
        <AuthProvider>
            {/* ProfileProvider should be inside AuthProvider as it depends on user data */}
            <ProfileProvider>
                <div className="min-h-screen bg-gray-50 flex flex-col">
                    <Navbar toggleSidebar={toggleSidebar} />
                    <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
                    <main className="flex-grow pt-16 p-8">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            
                            {/* PROTECTED ROUTES */}
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

                            {/* PUBLIC ROUTES */}
                            <Route path="/about" element={<About />} />
                            <Route path="/feedback" element={<Feedback />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/terms" element={<TermsOfService />} />
                            <Route path="/privacy" element={<PrivacyPolicy />} />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </ProfileProvider>
        </AuthProvider>
        {/* ------------------------------------------------------------------ */}
    </Router>
  );
}

export default App;