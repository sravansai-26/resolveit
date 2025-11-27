import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

// ----------------------------------------------------------------------
// ✅ CRITICAL FIX: Base URL for Deployed API
// This constant pulls the live Render URL from the Vercel environment variable.
// ----------------------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_URL;

// ==================== Type Definitions (FIXED for TypeScript) ====================

export type User = { // ✅ FIX: Added export
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
  avatar: string;
};

export type Vote = { // ✅ FIX: Added export
  user: string;
  isUpvote: boolean;
};

export type Issue = { // ✅ FIX: Added export
  _id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  media: string[];
  votes: Vote[];
  upvotes: number;
  downvotes: number;
  status: 'Pending' | 'In Progress' | 'Resolved';
  user: string;
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProfileContextType = { // ✅ CRITICAL FIX: Added export
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  issues: Issue[];
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
  reposts: Issue[];
  setReposts: React.Dispatch<React.SetStateAction<Issue[]>>;
  loading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  fetchIssues: () => Promise<void>;
  fetchReposts: () => Promise<void>;
  updateProfile: (data: Partial<User>, avatarFile?: File) => Promise<void>;
  deleteIssue: (issueId: string) => Promise<void>;
  toggleRepost: (issueId: string) => Promise<void>;
};

// ==================== Context Setup ====================

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// ==================== Provider Component ====================

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [reposts, setReposts] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  // ==================== API Calls ====================

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      // ✅ FIX 4: fetchProfile - Using live URL
      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setUser(json.data);
        // Use session storage if present, otherwise local storage (maintains 'remember me' logic)
        if (sessionStorage.getItem('token')) {
          sessionStorage.setItem('user', JSON.stringify(json.data));
        } else {
          localStorage.setItem('user', JSON.stringify(json.data));
        }
      } else {
        throw new Error(json.message || 'Failed to fetch profile.');
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err.message || err);
      setError(err.message || 'Failed to load profile.');
      setUser(null);
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async () => {
    setIssues([]);
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      // ✅ FIX 5: fetchIssues - Using live URL
      const res = await fetch(`${API_BASE_URL}/api/issues/my`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (res.ok) {
        if (json.success && Array.isArray(json.data)) {
          setIssues(json.data);
        } else if (Array.isArray(json)) {
          setIssues(json);
        } else {
          console.warn('Issues API response is not an array as expected:', json);
          setIssues([]);
        }
      } else {
        throw new Error(json.message || 'Failed to fetch issues.');
      }
    } catch (err: any) {
      console.error('Error fetching issues:', err.message || err);
      setIssues([]);
    }
  };

  const fetchReposts = async () => {
    setReposts([]);
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      // ✅ FIX 6: fetchReposts - Using live URL
      const res = await fetch(`${API_BASE_URL}/api/issues/reposts/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (res.ok) {
        if (json.success && Array.isArray(json.data)) {
          setReposts(json.data);
        } else if (Array.isArray(json)) {
          setReposts(json);
        } else {
          console.warn('Reposts API response is not an array as expected:', json);
          setReposts([]);
        }
      } else {
        throw new Error(json.message || 'Failed to fetch reposts.');
      }
    } catch (err: any) {
      console.error('Error fetching reposts:', err.message || err);
      setReposts([]);
    }
  };

  const updateProfile = async (data: Partial<User>, avatarFile?: File) => {
    try {
      const token = getToken();
      if (!token) throw new Error('No authentication token found. Please log in.');

      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value as string);
        }
      });

      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      // ✅ FIX 7: updateProfile - Using live URL
      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setUser(json.data);
        // Use session storage if present, otherwise local storage (maintains 'remember me' logic)
        const storageKey = localStorage.getItem('token') ? 'localStorage' : 'sessionStorage';
        if (storageKey === 'localStorage') {
          localStorage.setItem('user', JSON.stringify(json.data));
        } else {
          sessionStorage.setItem('user', JSON.stringify(json.data));
        }
        alert('Profile updated successfully!');
      } else {
        throw new Error(json.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      console.error('Error updating profile:', err.message || err);
      alert(err.message || 'Error updating profile.');
      throw err;
    }
  };

  const deleteIssue = async (issueId: string) => {
    try {
      const token = getToken();
      if (!token) throw new Error('No authentication token found. Please log in.');

      // ✅ FIX 8: deleteIssue - Using live URL
      const res = await fetch(`${API_BASE_URL}/api/issues/${issueId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (res.ok) {
        setIssues((prev) => prev.filter((issue) => issue._id !== issueId));
        // Also remove from reposts if it was an issue that was also reposted by the user
        setReposts((prev) => prev.filter((issue) => issue._id !== issueId));
        alert(json.message || 'Issue deleted successfully!');
      } else {
        throw new Error(json.message || 'Failed to delete issue.');
      }
    } catch (err: any) {
      console.error('Error deleting issue:', err.message || err);
      alert(err.message || 'Error deleting issue.');
      throw err;
    }
  };

  // NEW: Function to toggle repost status (used for "un-reposting" in My Reposts)
  const toggleRepost = async (issueId: string) => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found.');
      }

      // ✅ FIX 9: toggleRepost - Using live URL
      const res = await fetch(`${API_BASE_URL}/api/issues/${issueId}/repost`, {
        method: 'POST', // This endpoint acts as a toggle, so POST is correct
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}), // Empty body for a toggle POST
      });

      const json = await res.json();

      if (res.ok && json.success) {
        // Since this function is called from "My Reposts" and is for un-reposting,
        // we filter the issue out of the local reposts state.
        setReposts((prevReposts) => prevReposts.filter((issue) => issue._id !== issueId));
      } else {
        throw new Error(json.message || 'Failed to toggle repost status.');
      }
    } catch (err: any) {
      console.error('Error toggling repost:', err.message || err);
      throw new Error(err.message || 'Failed to remove repost.');
    }
  };


  // ==================== Initial Load Effect ====================

  useEffect(() => {
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    const token = getToken();

    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser._id) {
          setUser(parsedUser);
        } else {
          console.warn('Invalid user data in storage. Clearing...');
          localStorage.removeItem('user');
          sessionStorage.removeItem('user');
          setUser(null);
        }
      } catch (e) {
        console.warn('Error parsing user data from storage. Clearing...', e);
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        setUser(null);
      }
    } else {
      setUser(null);
    }

    if (token) {
      // Fetch user profile first, then issues/reposts
      fetchProfile().then(() => {
        fetchIssues();
        fetchReposts();
      }).catch(err => {
        console.error("Initial profile/issues/reposts fetch sequence failed:", err);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  // ==================== Context Return ====================

  return (
    <ProfileContext.Provider
      value={{
        user,
        setUser,
        issues,
        setIssues,
        reposts,
        setReposts,
        loading,
        error,
        fetchProfile,
        fetchIssues,
        fetchReposts,
        updateProfile,
        deleteIssue,
        toggleRepost, // Include the new function here
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

// ==================== Hook for Using Context ====================

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}