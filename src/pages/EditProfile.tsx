import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, User, Mail, Phone, MapPin, Camera, FileText } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';

// NOTE: We keep this constant because it is used for navigation (not shown here)
// and other API calls, but we REMOVE its use in media display.
const API_BASE_URL = import.meta.env.VITE_API_URL;

export function EditProfile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useProfile();

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(formData.avatar);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cleanup object URL on unmount or avatar change
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.avatar && !avatarFile) {
      setError("Please upload a profile picture.");
      setLoading(false);
      return;
    }

    try {
      // The API call happens inside this function (updateProfile).
      await updateProfile(formData, avatarFile || undefined); 
      navigate('/profile');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Profile</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <img
                // ----------------------------------------------------------
                // ✅ FINAL FIX: Use avatarPreview directly (now contains Cloudinary URL)
                // We check if it starts with 'http' (Cloudinary URL) or 'blob:' (local preview)
                // ----------------------------------------------------------
                src={
                  avatarPreview.startsWith('http') || avatarPreview.startsWith('blob:')
                    ? avatarPreview 
                    : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200'
                }
                alt="Profile Avatar"
                className="w-32 h-32 rounded-full object-cover"
              />
              <input
                type="file"
                id="avatar-upload"
                title="Upload a profile picture"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAvatarFile(file);
                    const objectUrl = URL.createObjectURL(file);
                    setAvatarPreview(objectUrl);
                    setFormData((prev) => ({
                      ...prev,
                      avatar: objectUrl,
                    }));
                  }
                }}
              />
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700"
                title="Upload Profile Picture"
              >
                <Camera size={20} className="text-white" />
              </label>
            </div>
          </div>

          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
            <div className="mt-1 relative">
              <input
                type="text"
                id="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="pl-10 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
            <div className="mt-1 relative">
              <input
                type="text"
                id="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="pl-10 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          {/* Email (disabled) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <div className="mt-1 relative">
              <input
                type="email"
                id="email"
                value={formData.email}
                disabled
                className="pl-10 w-full rounded-lg border-gray-300 bg-gray-100 cursor-not-allowed"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
            <div className="mt-1 relative">
              <input
                type="tel"
                id="phone"
                placeholder="1234567890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                pattern="[0-9]{10}"
                title="Enter a 10-digit phone number"
                className="pl-10 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
            <div className="mt-1 relative">
              <input
                type="text"
                id="address"
                placeholder="123 Main St"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="pl-10 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio</label>
            <div className="mt-1 relative">
              <textarea
                id="bio"
                placeholder="A short bio..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="pl-10 pt-2 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-600 text-sm font-medium">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/profile')}
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
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
      
    </div>
  );
}