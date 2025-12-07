// src/pages/EditPost.tsx

import React, { useEffect, useState, ChangeEvent, FormEvent, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";

// ======================================================================
// Using VITE_API_URL for media URLs
// ======================================================================

interface Issue {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  media: string[];
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

// Build absolute media URL
const getMediaUrl = (path: string): string => {
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${import.meta.env.VITE_API_URL}/${p}`;
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
  const getToken = useCallback(
    () => localStorage.getItem("token") || sessionStorage.getItem("token"),
    []
  );

  // ------------------------------------------------------------
  // LOAD ISSUE DETAILS
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
        const resp = await api.get(`/issues/${id}`);
        const json = resp.data;

        if (!json.success) throw new Error(json.message || "Failed to load issue.");

        const data: Issue = json.data;
        setTitle(data.title);
        setDescription(data.description);
        setCategory(data.category);
        setLocation(data.location);
        setExistingMedia(data.media || []);
        setStatus(data.status);
      } catch (err: any) {
        console.error("Fetch issue failed:", err);
        setError(err.message || "Network error.");
      } finally {
        setLoading(false);
      }
    }
    fetchIssue();
  }, [id, getToken]);

  // ------------------------------------------------------------
  // FIELD HANDLERS
  // ------------------------------------------------------------
  const onFieldChange =
    (setter: any) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setter(e.target.value);
      if (error) setError("");
    };

 const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
  const fileList = e.target.files;
  if (!fileList) return;

  const files = Array.from(fileList); // TS-safe conversion
  setMediaFiles((prev) => [...prev, ...files]);
};


  const removeExistingMedia = (index: number) =>
    setExistingMedia((prev) => prev.filter((_, i) => i !== index));

  const removeNewMedia = (index: number) =>
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));

  // ------------------------------------------------------------
  // SUBMIT HANDLER (FINAL CLEAN VERSION)
  // ------------------------------------------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = getToken();
      if (!token) throw new Error("Authentication required.");

      // ---- Build FormData ----
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("location", location);
      formData.append("status", status);

      // Existing media to keep
      existingMedia.forEach((m) => formData.append("existingMedia[]", m));

      // New files
      mediaFiles.forEach((file) => formData.append("media", file));

      // ---- API Request ----
      const resp = await api.put(`/issues/${id}`, formData);

      if (!resp.data?.success) {
        throw new Error(resp.data?.message || "Update failed.");
      }

      alert("Issue updated successfully!");
      navigate("/profile", { replace: true });
    } catch (err: any) {
      console.error("Update error:", err);
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
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Edit Issue #{id?.substring(0, 8)}...
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        
        {/* TITLE */}
        <label className="block">
          <span className="font-semibold text-gray-700">Title *</span>
          <input
            type="text"
            className="mt-1 block w-full border rounded px-3 py-2"
            value={title}
            onChange={onFieldChange(setTitle)}
            required
          />
        </label>

        {/* DESCRIPTION */}
        <label className="block">
          <span className="font-semibold text-gray-700">Description *</span>
          <textarea
            className="mt-1 block w-full border rounded px-3 py-2"
            rows={4}
            value={description}
            onChange={onFieldChange(setDescription)}
            required
          />
        </label>

        {/* CATEGORY + LOCATION */}
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="font-semibold text-gray-700">Category *</span>
            <select
              className="mt-1 block w-full border rounded px-3 py-2 bg-white"
              value={category}
              onChange={onFieldChange(setCategory)}
              required
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="font-semibold text-gray-700">Location *</span>
            <input
              type="text"
              className="mt-1 block w-full border rounded px-3 py-2"
              value={location}
              onChange={onFieldChange(setLocation)}
              required
            />
          </label>
        </div>

        {/* STATUS */}
        <label className="block">
          <span className="font-semibold text-gray-700">Status *</span>
          <select
            className="mt-1 block w-full border rounded px-3 py-2 bg-white"
            value={status}
            onChange={onFieldChange(setStatus)}
          >
            <option>Pending</option>
            <option>In Progress</option>
            <option>Resolved</option>
          </select>
        </label>

        {/* EXISTING MEDIA */}
        <div>
          <span className="font-semibold text-gray-700">Existing Media</span>
          <div className="flex flex-wrap gap-3 mt-2">
            {existingMedia.map((url, i) => (
              <div key={i} className="relative group">
                <img
                  src={getMediaUrl(url)}
                  alt=""
                  className="w-20 h-20 object-cover border rounded"
                />
                <button
                  type="button"
                  onClick={() => removeExistingMedia(i)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white w-5 h-5 rounded-full opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* NEW MEDIA */}
        <div>
          <span className="font-semibold text-gray-700">Add New Media</span>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            className="mt-1 block w-full"
            title="Upload images or videos for this issue"
            onChange={handleFileChange}
          />
        </div>

        {/* ERROR */}
        {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}

        {/* SUBMIT */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded mt-6"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
