// src/pages/Upload.tsx

import { useState, useRef } from "react";
import { Upload as UploadIcon, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

// ======================================================================
// ✅ ARCHITECTURE FIX: Using VITE_API_URL (Option B) for all calls.
// ======================================================================
const MAX_FILE_SIZE_BYTES = 300 * 1024 * 1024; // 300MB, as per your server config

const categories = [
  "Road Infrastructure",
  "Sanitation",
  "Public Safety",
  "Environmental",
  "Public Transport",
  "Other",
];

export function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    media: [] as File[],
  });

  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unified token getter
  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");


  // Drag event handlers
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Drop handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);

    const files = Array.from(e.dataTransfer.files);
    handleFileValidation(files);
  };

  // Handle media file input change
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError(null);
    handleFileValidation(files);
    e.target.value = ""; // Reset input to allow re-upload same files
  };
  
  // File Validation and state update logic
  const handleFileValidation = (files: File[]) => {
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    
    files.forEach((file) => {
      const isValid = file.size <= MAX_FILE_SIZE_BYTES; 
      if (isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push(`${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
      }
    });

    if (invalidFiles.length > 0) {
      setError(`Files exceeded 300MB limit: ${invalidFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      setFormData((prev) => ({
        ...prev,
        media: [...prev.media, ...validFiles],
      }));
    }
  };


  // Remove selected media file by index
  const removeMedia = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index),
    }));
  };
  
  // Input change handler for regular fields
  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
    setError(null);
  };

  // Submit form handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!formData.category || !formData.title || !formData.description || !formData.location) {
      setError("Please fill in all required fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      const formPayload = new FormData();
      formPayload.append("title", formData.title);
      formPayload.append("description", formData.description);
      formPayload.append("category", formData.category);
      formPayload.append("location", formData.location);

      // Append all media files
      formData.media.forEach((file) => {
        formPayload.append("media", file);
      });

      const token = getToken();
      if (!token) {
        throw new Error("Authentication token missing. Please log in.");
      }

      // 🟢 CRITICAL FIX: Use API_BASE_URL for the API call
      const response = await api.post('/issues/', formPayload);

      // Success
      alert("Issue reported successfully!");
      // 🟢 Objective 4: Test successful feature operation
      navigate("/profile", { replace: true }); // Navigate to profile to see the new report

    } catch (err: any) {
      console.error("Issue submission error:", err);
      const msg = err.response?.data?.message || err.message || "Unexpected error occurred during submission.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Report an Issue</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md" noValidate>
        
        {/* Error Display */}
        {error && (
            <div className="p-4 bg-red-100 text-red-700 rounded-md font-medium" role="alert">
                {error}
            </div>
        )}

        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={handleFieldChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter issue title"
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700"
          >
            Category
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={handleFieldChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
            required
            disabled={isSubmitting}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-gray-700"
          >
            Location
          </label>
          <div className="mt-1 relative">
            <input
              type="text"
              id="location"
              value={formData.location}
              onChange={handleFieldChange}
              placeholder="Enter the location of the issue"
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              disabled={isSubmitting}
            />
            <MapPin
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={handleFieldChange}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Describe the issue"
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Media Upload (Drag and Drop Area) */}
        <div
          className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 rounded-md transition-colors ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
          } border-dashed`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="space-y-1 text-center">
            <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600 justify-center">
              <label
                htmlFor="media"
                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <span>Upload files</span>
                <input
                  id="media"
                  type="file"
                  className="sr-only"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  title="Upload images or videos"
                  ref={fileInputRef}
                  disabled={isSubmitting}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">Images and videos up to 300MB</p>
          </div>
  {/* Invisible overlay for drop area activation */}
  {dragActive && (
    <div
      className="absolute inset-0 z-10"
      onDrop={handleDrop}
      role="presentation"
    />
  )}
</div>

{/* List selected files */}
        {formData.media.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Attached Media ({formData.media.length}):</p>
            {formData.media.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 p-3 rounded"
              >
                <span className="text-sm text-gray-700 truncate max-w-[70%]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                  title="Remove this file"
                  disabled={isSubmitting}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 transition-colors"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Submitting...</span>
            </div>
          ) : (
            "Submit Report"
          )}
        </button>
      </form>
    </div>
  );
}