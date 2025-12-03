// src/pages/EditPost.tsx

import React, { useEffect, useState, ChangeEvent, FormEvent, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
// ❌ REMOVED: import axios from "axios"; 
// We are consolidating to the native Fetch API for consistency.

// ======================================================================
// ✅ ARCHITECTURE FIX: Using VITE_API_URL (Option B) for all calls.
// NO RELATIVE PATHS are allowed here.
// ======================================================================
const API_BASE_URL = import.meta.env.VITE_API_URL;

interface Issue {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  media: string[]; // Relative paths (e.g., 'uploads/...')
  status: string;
}

const categories = [
  "Road Infrastructure",
  "Sanitation",
  "Public Safety",
  "Environmental",
  "Public Transport",
  "Other",
];

// Helper to construct the full URL for media files
const getMediaUrl = (path: string): string => {
    if (path.startsWith('http') || path.startsWith('blob:')) {
        return path;
    }
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_BASE_URL}/${normalizedPath}`;
};

export function EditPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("Pending");
  const [existingMedia, setExistingMedia] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Unified token getter
  const getToken = useCallback(() => 
    localStorage.getItem("token") || sessionStorage.getItem("token"), []);

  // ------------------------------------------------------------
  // FETCH ISSUE DETAILS
  // ------------------------------------------------------------
  useEffect(() => {
    async function fetchIssue() {
      if (!id) {
        setError("Issue ID missing.");
        setLoading(false);
        return;
      }

      const token = getToken();
      if (!token) {
        setError("Please log in first.");
        setLoading(false);
        return;
      }

      try {
        // 🟢 CRITICAL FIX: Use ABSOLUTE URL
        const response = await fetch(`${API_BASE_URL}/api/issues/${id}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        // Check for non-OK status first
        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({ message: `Server error: ${response.status}` }));
            throw new Error(errorJson.message || `Failed to fetch issue. Status: ${response.status}`);
        }

        const responseData = await response.json();

        if (responseData.success) {
            const data: Issue = responseData.data;

            setTitle(data.title);
            setDescription(data.description);
            setCategory(data.category);
            setLocation(data.location);
            // Media paths are relative, stored as is
            setExistingMedia(data.media || []); 
            setStatus(data.status);
            setLoading(false);
        } else {
            throw new Error(responseData.message || "Failed to load issue.");
        }
      } catch (err: any) {
        console.error("Failed to fetch issue:", err);
        // Consolidated error setting
        setError(err.message || "Network error while loading issue.");
        setLoading(false);
      }
    }
    fetchIssue();
  }, [id, getToken]);

  // ------------------------------------------------------------
  // FIELD HANDLERS
  // ------------------------------------------------------------
  const onFieldChange =
    (setter: React.Dispatch<React.SetStateAction<any>>) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setter(e.target.value);
      if (error) setError("");
    };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setMediaFiles((prev) => [...prev, ...Array.from(files)]);
    if (error) setError("");
  };

  const removeExistingMedia = (index: number) =>
    setExistingMedia((prev) => prev.filter((_, i) => i !== index));

  const removeNewMedia = (index: number) =>
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));

  // ------------------------------------------------------------
  // SUBMIT HANDLER
  // ------------------------------------------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!title || !description || !location) {
      setError("All required fields must be filled.");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();

    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("location", location);
    formData.append("status", status);

    // Keep existing media URLs (passed as a JSON string array)
    // Backend should interpret this as a list of media to retain.
    formData.append("existingMedia", JSON.stringify(existingMedia)); 

    // Add new files
    mediaFiles.forEach((file) => formData.append("media", file));

    try {
      const token = getToken();
      if (!token) throw new Error("Authentication required.");

      // 🟢 CRITICAL FIX: Use ABSOLUTE URL and Fetch API
      const response = await fetch(`${API_BASE_URL}/api/issues/${id}`, {
        method: "PUT",
        headers: { 
            Authorization: `Bearer ${token}` 
            // ❌ DO NOT set Content-Type: browser handles 'multipart/form-data'
        },
        body: formData,
      });

      // Check for non-OK status
      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({ message: `Server error: ${response.status}` }));
        throw new Error(errorJson.message || "Issue update failed.");
      }
      
      // We don't need to read the body if we just check for response.ok
      // const responseData = await response.json(); 

      alert("Issue updated successfully!");

      // 🟢 Objective 4: Test successful feature operation
      navigate("/profile", { replace: true }); 
    } catch (err: any) {
      console.error("Issue update failed:", err);
      setError(err.message || "Network error while updating issue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------
  if (loading)
    return (
      <div className="text-center py-10">
        <div className="animate-spin inline-block h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="mt-2 text-gray-700">Loading issue details...</p>
      </div>
    );

  if (error && !isSubmitting)
    return (
      <div className="text-red-600 text-center py-10 font-medium">
        {error}
        <p className="text-gray-500 text-sm mt-2">Please check your network or token status.</p>
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow my-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Edit Issue #{id?.substring(0, 8)}...</h1>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>

        {/* TITLE */}
        <label className="block">
          <span className="font-semibold text-gray-700">Title *</span>
          <input
            type="text"
            className="mt-1 block w-full border rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            value={title}
            onChange={onFieldChange(setTitle)}
            required
            aria-label="Issue title"
          />
        </label>

        {/* DESCRIPTION */}
        <label className="block">
          <span className="font-semibold text-gray-700">Description *</span>
          <textarea
            className="mt-1 w-full border rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            value={description}
            onChange={onFieldChange(setDescription)}
            required
            aria-label="Issue description"
          />
        </label>

        {/* CATEGORY */}
        <div className="grid grid-cols-2 gap-4">
            <label className="block">
            <span className="font-semibold text-gray-700">Category *</span>
            <select
                className="mt-1 block w-full border rounded px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
                value={category}
                onChange={onFieldChange(setCategory)}
                aria-label="Select category"
                required
            >
                {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
            </label>

            {/* LOCATION */}
            <label className="block">
            <span className="font-semibold text-gray-700">Location *</span>
            <input
                type="text"
                className="mt-1 block w-full border rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                value={location}
                onChange={onFieldChange(setLocation)}
                required
                aria-label="Issue location"
            />
            </label>
        </div>

        {/* STATUS */}
        <label className="block">
          <span className="font-semibold text-gray-700">Status *</span>
          <select
            className="mt-1 block w-full border rounded px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
            value={status}
            onChange={onFieldChange(setStatus)}
            required
            aria-label="Issue status"
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </label>

        {/* EXISTING MEDIA (CRITICAL FIX: Display via ABSOLUTE URL) */}
        <div>
          <span className="font-semibold text-gray-700">Existing Media (Remove to delete)</span>
          <div className="flex flex-wrap gap-3 mt-2">
            {existingMedia.length === 0 && (
              <p className="text-gray-500 text-sm">No media currently attached.</p>
            )}

            {existingMedia.map((url, i) => (
              <div key={i} className="relative group">
                <img
                  // 🟢 FIX: Use getMediaUrl to display the correct asset
                  src={getMediaUrl(url)} 
                  alt={`Existing media ${i + 1}`}
                  className="w-20 h-20 object-cover border rounded"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=Error'; }}
                />
                <button
                  type="button"
                  onClick={() => removeExistingMedia(i)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove existing media"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* NEW MEDIA */}
        <div>
          <span className="font-semibold text-gray-700">Add New Media (Max 5 files)</span>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            onChange={handleFileChange}
            aria-label="Upload media"
          />
          {mediaFiles.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2">
              {mediaFiles.map((file, i) => (
                <div key={i} className="relative">
                  <div className="w-20 h-20 bg-gray-100 border rounded flex flex-col items-center justify-center text-xs p-1 overflow-hidden">
                    <p className="truncate w-full text-center">{file.name}</p>
                    <p className="text-gray-500">{Math.round(file.size / 1024)} KB</p>
                  </div>
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-red-600 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center"
                    onClick={() => removeNewMedia(i)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ERROR MESSAGE */}
        {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded font-medium" role="alert">
                {error}
            </div>
        )}

        {/* SUBMIT */}
        <button
          type="submit"
          className="mt-6 w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:opacity-60 font-semibold transition-colors"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving Changes..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}