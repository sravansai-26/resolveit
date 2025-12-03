// src/pages/EditProfile.tsx

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Save,
  User as UserIcon, // Renamed to avoid conflict with ProfileContext.User type
  Mail,
  Phone,
  MapPin,
  Camera,
  FileText,
} from "lucide-react";
import { useProfile } from "../context/ProfileContext";

// ======================================================================
// ✅ ARCHITECTURE FIX: Using VITE_API_URL (Option B) for media paths
// ======================================================================
const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Helper function to construct the full URL for media files stored on the backend.
 * This ensures the avatar loads correctly from the Render API.
 */
const getMediaUrl = (path: string): string => {
    // Return full path if it's already an absolute URL or a data/blob URL
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('/')) {
        // If the path is relative but starts with '/', we need to strip it to prevent double slashes.
        const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
        // Check if it's an API-relative path (e.g., /uploads/...)
        if (normalizedPath.startsWith('uploads/') || normalizedPath.startsWith('media/')) {
            return `${API_BASE_URL}/${normalizedPath}`;
        }
        return path;
    }
    // Prepend the API Base URL to the relative path (e.g., 'uploads/image.jpg').
    return `${API_BASE_URL}/${path}`;
};


export function EditProfile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useProfile();

  // If user data hasn't loaded yet (though this route should be protected)
  useEffect(() => {
    if (!user) {
      // Navigate away if session is lost or not available
      navigate("/profile", { replace: true });
    }
  }, [user, navigate]);


  // Initialize formData only when user object is available
  const initialFormData = useMemo(() => ({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "", // Email is disabled/read-only below
    phone: user?.phone || "",
    address: user?.address || "",
    bio: user?.bio || "",
  }), [user]);

  const [formData, setFormData] = useState(initialFormData);
  
  // 🟢 CRITICAL FIX: Ensure the initial preview image uses the absolute URL
  const initialAvatarPreview = user?.avatar 
    ? getMediaUrl(user.avatar) 
    : "/default-avatar.jpg"; 

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(initialAvatarPreview);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Update form data if the user object loads after the component mounts
  useEffect(() => {
    if (user) {
      setFormData(initialFormData);
      setAvatarPreview(initialAvatarPreview);
    }
  }, [user, initialFormData, initialAvatarPreview]);


  // Clean up preview URLs created by URL.createObjectURL
  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // Handle file selection and local preview
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Revoke previous blob URL to prevent memory leaks
      if (avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      
      setAvatarFile(file);
      const blobUrl = URL.createObjectURL(file);
      setAvatarPreview(blobUrl);
      setError(null); // Clear errors on new file selection
    }
  };

  // --------------------------------------------
  // 🔥 SUBMIT HANDLER (Delegates to updateProfile)
  // --------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await updateProfile(
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          address: formData.address,
          bio: formData.bio,
          // We DO NOT send the email here, as it's typically read-only
        },
        avatarFile || undefined // Pass the file only if a new one was selected
      );

      // updateProfile shows an alert() on success
      navigate("/profile", { replace: true });
    } catch (err: any) {
      console.error(err);
      // ProfileContext already throws the error message, so we catch it here.
      // The updateProfile function handles the alert for now, but we set the local error state too.
      setError(err.message || "Failed to update profile due to an unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  // Guard clause if user object is still null (shouldn't happen with the useEffect guard, but safe)
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-10 text-center">
        Loading profile data...
      </div>
    );
  }

  // --------------------------------------------
  //   JSX
  // --------------------------------------------
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Profile</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Avatar Upload */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <img
                src={avatarPreview}
                alt="Profile Avatar"
                // 🟢 Fallback to an API-resolved default image if needed, for consistency
                onError={(e) => {
                    (e.target as HTMLImageElement).src = "/default-avatar.jpg"; 
                }}
                className="w-32 h-32 rounded-full object-cover border"
              />

              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                className="hidden"
                aria-label="Upload profile picture"
                title="Upload profile picture"
                onChange={handleAvatarChange}
              />


              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700"
                title="Upload new profile picture"
              >
                <Camera size={20} className="text-white" />
              </label>
            </div>
          </div>

          {/* FIRST NAME */}
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-700"
            >
              First Name
            </label>
            <div className="mt-1 relative">
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className="pl-10 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <UserIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
            </div>
          </div>

          {/* LAST NAME */}
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-700"
            >
              Last Name
            </label>
            <div className="mt-1 relative">
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className="pl-10 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <UserIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
            </div>
          </div>

          {/* EMAIL (locked) */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <div className="mt-1 relative">
              <input
                type="email"
                id="email"
                disabled
                value={formData.email}
                className="pl-10 w-full rounded-lg border-gray-300 bg-gray-100 cursor-not-allowed"
              />
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
            </div>
          </div>

          {/* PHONE */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Phone
            </label>
            <div className="mt-1 relative">
              <input
                type="tel"
                id="phone"
                name="phone"
                pattern="[0-9]{10}"
                title="Enter a 10-digit number"
                placeholder="1234567890"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="pl-10 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <Phone
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
            </div>
          </div>

          {/* ADDRESS */}
          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700"
            >
              Address
            </label>
            <div className="mt-1 relative">
              <input
                type="text"
                id="address"
                name="address"
                placeholder="123 Main St"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="pl-10 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <MapPin
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
            </div>
          </div>

          {/* BIO */}
          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-gray-700"
            >
              Bio
            </label>
            <div className="mt-1 relative">
              <textarea
                id="bio"
                name="bio"
                rows={3}
                placeholder="A short bio..."
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                className="pl-10 pt-2 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <FileText
                className="absolute left-3 top-3 text-gray-400"
                size={18}
              />
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <p className="text-red-600 text-sm font-medium">{error}</p>
          )}

          {/* ACTIONS */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={20} />
              <span>{loading ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}