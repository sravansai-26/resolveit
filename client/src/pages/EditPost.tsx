// EditPost.tsx

import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

interface Issue {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  media: string[]; // Full Cloudinary URLs
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

// ❌ REMOVE — breaks Vercel builds
// const API_BASE_URL = import.meta.env.VITE_API_URL;

// ------------------------------------------------------------
// ✔ FIX: Use RELATIVE PATHS so Vercel rewrites to your backend
// ------------------------------------------------------------
// Example: fetch(`/api/issues/${id}`) → rewritten → render-backend/api/issues/:id

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
  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

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

      try {
        const token = getToken();
        if (!token) {
          setError("Please log in first.");
          setLoading(false);
          return;
        }

        const response = await axios.get(`/api/issues/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = response.data.data;

        setTitle(data.title);
        setDescription(data.description);
        setCategory(data.category);
        setLocation(data.location);
        setExistingMedia(data.media || []);
        setStatus(data.status);
        setLoading(false);
      } catch (err: any) {
        console.error("Failed to fetch issue:", err);

        if (axios.isAxiosError(err) && err.response) {
          setError(
            `Failed to load issue: ${
              err.response.data?.message || "Server error"
            }`
          );
        } else {
          setError("Network error while loading issue.");
        }

        setLoading(false);
      }
    }
    fetchIssue();
  }, [id]);

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

    // Keep existing media URLs
    formData.append("existingMedia", JSON.stringify(existingMedia));

    // Add new files
    mediaFiles.forEach((file) => formData.append("media", file));

    try {
      const token = getToken();
      if (!token) throw new Error("Authentication required.");

      await axios.put(`/api/issues/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Issue updated successfully!");

      navigate("/profile", { replace: true });
    } catch (err: any) {
      console.error("Issue update failed:", err);

      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data?.message || "Server error.");
      } else {
        setError("Network error while updating issue.");
      }
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
        Loading issue details...
      </div>
    );

  if (error && !isSubmitting)
    return (
      <div className="text-red-600 text-center py-10">{error}</div>
    );

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Edit Issue</h1>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>

        {/* TITLE */}
        <label className="block">
          <span className="font-semibold">Title *</span>
          <input
            type="text"
            className="mt-1 block w-full border rounded px-3 py-2"
            value={title}
            onChange={onFieldChange(setTitle)}
            required
            aria-label="Issue title"
          />
        </label>

        {/* DESCRIPTION */}
        <label className="block">
          <span className="font-semibold">Description *</span>
          <textarea
            className="mt-1 w-full border rounded px-3 py-2"
            rows={4}
            value={description}
            onChange={onFieldChange(setDescription)}
            required
            aria-label="Issue description"
          />
        </label>

        {/* CATEGORY */}
        <label className="block">
          <span className="font-semibold">Category *</span>
          <select
            className="mt-1 block w-full border rounded px-3 py-2"
            value={category}
            onChange={onFieldChange(setCategory)}
            aria-label="Select category"
            required
          >
            {categories.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
        </label>

        {/* LOCATION */}
        <label className="block">
          <span className="font-semibold">Location *</span>
          <input
            type="text"
            className="mt-1 block w-full border rounded px-3 py-2"
            value={location}
            onChange={onFieldChange(setLocation)}
            required
            aria-label="Issue location"
          />
        </label>

        {/* STATUS */}
        <label className="block">
          <span className="font-semibold">Status *</span>
          <select
            className="mt-1 block w-full border rounded px-3 py-2"
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

        {/* EXISTING MEDIA */}
        <div>
          <span className="font-semibold">Existing Media</span>
          <div className="flex flex-wrap gap-3 mt-2">
            {existingMedia.length === 0 && (
              <p className="text-gray-500">No media uploaded</p>
            )}

            {existingMedia.map((url, i) => (
              <div key={i} className="relative">
                <img
                  src={url}
                  alt={`Existing media ${i + 1}`}
                  className="w-20 h-20 object-cover border rounded"
                />
                <button
                  type="button"
                  onClick={() => removeExistingMedia(i)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs"
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
          <span className="font-semibold">Add / Replace Media</span>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            className="mt-1"
            onChange={handleFileChange}
            aria-label="Upload media"
          />
          {mediaFiles.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2">
              {mediaFiles.map((file, i) => (
                <div key={i} className="relative">
                  <div className="w-20 h-20 bg-gray-100 border rounded flex items-center justify-center text-xs p-1">
                    {file.name.substring(0, 15)}...
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

        {/* SUBMIT */}
        <button
          type="submit"
          className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
