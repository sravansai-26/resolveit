import { useState, useRef } from "react";
import { Upload as UploadIcon, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((file) => {
      const isValid = file.size <= 300 * 1024 * 1024; // 300MB max
      if (!isValid) {
        alert(`File ${file.name} is too large. Maximum size is 300MB.`);
      }
      return isValid;
    });

    if (validFiles.length > 0) {
      setFormData((prev) => ({
        ...prev,
        media: [...prev.media, ...validFiles],
      }));
    }
  };

  // Handle media file input change
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isValid = file.size <= 300 * 1024 * 1024; // 300MB max
      if (!isValid) {
        alert(`File ${file.name} is too large. Maximum size is 300MB.`);
      }
      return isValid;
    });

    setFormData((prev) => ({
      ...prev,
      media: [...prev.media, ...validFiles],
    }));

    e.target.value = ""; // Reset input to allow re-upload same files
  };

  // Remove selected media file by index
  const removeMedia = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index),
    }));
  };

  // Submit form handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category) {
      alert("Please select a category.");
      return;
    }

    try {
      const formPayload = new FormData();
      formPayload.append("title", formData.title);
      formPayload.append("description", formData.description);
      formPayload.append("category", formData.category);
      formPayload.append("location", formData.location);

      formData.media.forEach((file) => {
        formPayload.append("media", file);
      });

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token") || "";

      const response = await fetch("/api/issues/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Do NOT set Content-Type for FormData
        },
        body: formPayload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create issue");
      }

      await response.json();

      alert("Issue reported successfully!");

      navigate("/");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unexpected error occurred");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Report an Issue</h1>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter issue title"
            title="Enter issue title"
            required
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
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
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
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="Enter the location of the issue"
              title="Enter issue location"
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
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
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Describe the issue"
            title="Describe the issue"
            required
          />
        </div>

        {/* Media Upload */}
        <div
          className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 rounded-md ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
          } border-dashed`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="space-y-1 text-center">
            <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
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
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">Images and videos up to 300MB</p>
          </div>
        </div>

        {/* List selected files */}
        {formData.media.length > 0 && (
          <div className="mt-4 space-y-2">
            {formData.media.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 p-2 rounded"
              >
                <span className="text-sm text-gray-600">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="text-red-600 hover:text-red-800"
                  title="Remove this file"
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
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          title="Submit the issue report"
        >
          Submit Report
        </button>
      </form>
    </div>
  );
}
