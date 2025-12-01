// EditProfile.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  FileText,
} from "lucide-react";
import { useProfile } from "../context/ProfileContext";

// 🚫 REMOVE – breaks Vercel & unnecessary here
// const API_BASE_URL = import.meta.env.VITE_API_URL;

export function EditProfile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useProfile();

  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    bio: user?.bio || "",
    avatar: user?.avatar || "", // Cloudinary URL
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(
    user?.avatar || "/default-avatar.jpg"
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clean up preview URLs created by URL.createObjectURL
  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // --------------------------------------------
  // 🔥 SUBMIT HANDLER (Sends to updateProfile())
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
          // ⚠️ DO NOT send avatarPreview/URL here.
          // Backend handles avatar from avatarFile ONLY.
        },
        avatarFile || undefined
      );

      navigate("/profile", { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------
  //   JSX
  // --------------------------------------------
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Profile</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Avatar Upload */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <img
                src={avatarPreview}
                alt="Profile Avatar"
                className="w-32 h-32 rounded-full object-cover border"
              />

              <input
  type="file"
  id="avatar-upload"
  accept="image/*"
  className="hidden"
  aria-label="Upload profile picture"
  title="Upload profile picture"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const blobUrl = URL.createObjectURL(file);
      setAvatarPreview(blobUrl);
    }
  }}
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
                required
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className="pl-10 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <User
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
                required
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className="pl-10 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <User
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
