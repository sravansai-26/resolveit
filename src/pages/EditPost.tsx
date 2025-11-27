// EditPost.tsx

import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

interface Issue {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  media: string[]; // These are now expected to be full Cloudinary URLs
  status: string;
}

const categories = [
  'Road Infrastructure',
  'Sanitation',
  'Public Safety',
  'Environmental',
  'Public Transport',
  'Other'
];

// ----------------------------------------------------------------------
// Base URL for Deployed API
// ----------------------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_URL;

export function EditPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('Pending');
  const [existingMedia, setExistingMedia] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Added submission state
  const [error, setError] = useState('');

  // Helper to get token from storage (consistent with AuthContext logic)
  const getToken = (): string | null => {
      return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  useEffect(() => {
    async function fetchIssue() {
      if (!id) {
        setError('Issue ID is missing.');
        setLoading(false);
        return;
      }

      try {
        const token = getToken(); // Use robust getToken
        if (!token) {
            setError("Authentication token not found. Please log in.");
            setLoading(false);
            return;
        }

        // API call uses API_BASE_URL
        const response = await axios.get(`${API_BASE_URL}/api/issues/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = response.data.data; 
        setTitle(data.title);
        setDescription(data.description);
        setCategory(data.category);
        setLocation(data.location);
        // Data is expected to be full Cloudinary URLs
        setExistingMedia(data.media || []); 
        setStatus(data.status);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch issue details:', err);
        if (axios.isAxiosError(err) && err.response) {
            setError(`Failed to load issue details: ${err.response.status} - ${err.response.data?.message || 'Server error'}`);
        } else {
            setError('Failed to load issue details. Please check network connection.');
        }
        setLoading(false);
      }
    }
    fetchIssue();
  }, [id]); 

  const onFieldChange =
    (setter: React.Dispatch<React.SetStateAction<any>>) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setter(e.target.value);
      if (error) setError('');
    };

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      setMediaFiles(prev => [...prev, ...Array.from(files)]);
      if (error) setError('');
    }
  }

  function removeExistingMedia(index: number) {
    setExistingMedia(prev => prev.filter((_, i) => i !== index));
  }

  function removeNewMedia(index: number) {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!title || !description || !location) {
      setError('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('location', location);
    formData.append('status', status);

    // CRITICAL: Send the array of URLs for media that should be KEPT
    formData.append('existingMedia', JSON.stringify(existingMedia));

    // Send new media files for upload
    mediaFiles.forEach(file => {
      formData.append('media', file);
    });

    try {
      const token = getToken(); // Use robust getToken
      if (!token) throw new Error('Authentication required.');

      // API call uses API_BASE_URL
      await axios.put(`${API_BASE_URL}/api/issues/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          // 'Content-Type': 'multipart/form-data' is handled automatically by axios
        }
      });
      
      alert('Issue updated successfully!');
      // Use replace: true for cleaner history after submission
      navigate('/profile', { replace: true }); 

    } catch (err) {
      console.error('Failed to update issue:', err); 
      if (axios.isAxiosError(err) && err.response) {
          setError(`Failed to update issue: ${err.response.data?.message || 'Server error'}`);
      } else {
          setError('Failed to update issue. Please check the network.');
      }
    } finally {
        setIsSubmitting(false);
    }
  }

  if (loading) return <div className="text-center py-10">Loading issue details...</div>;
  if (error && !loading && !isSubmitting) return <div className="text-red-600 text-center py-10">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Edit Issue</h1>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <label className="block" htmlFor="title">
          <span className="font-semibold">Title *</span>
          <input
            id="title"
            name="title"
            type="text"
            placeholder="Enter issue title"
            className="mt-1 block w-full border rounded px-3 py-2"
            value={title}
            onChange={onFieldChange(setTitle)}
            required
            aria-required="true"
            aria-label="Issue Title"
            title="Enter the issue title"
          />
        </label>

        <label className="block" htmlFor="description">
          <span className="font-semibold">Description *</span>
          <textarea
            id="description"
            name="description"
            placeholder="Enter detailed description"
            className="mt-1 block w-full border rounded px-3 py-2"
            value={description}
            onChange={onFieldChange(setDescription)}
            rows={4}
            required
            aria-required="true"
            aria-label="Issue Description"
            title="Enter a detailed description of the issue"
          />
        </label>

        <label className="block" htmlFor="category">
          <span className="font-semibold">Category *</span>
          <select
            id="category"
            name="category"
            className="mt-1 block w-full border rounded px-3 py-2"
            value={category}
            onChange={onFieldChange(setCategory)}
            required
            aria-required="true"
            aria-label="Issue Category"
            title="Select issue category"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label className="block" htmlFor="location">
          <span className="font-semibold">Location *</span>
          <input
            id="location"
            name="location"
            type="text"
            placeholder="Enter location"
            className="mt-1 block w-full border rounded px-3 py-2"
            value={location}
            onChange={onFieldChange(setLocation)}
            required
            aria-required="true"
            aria-label="Issue Location"
            title="Enter issue location"
          />
        </label>

        <label className="block" htmlFor="status">
          <span className="font-semibold">Status *</span>
          <select
            id="status"
            name="status"
            className="mt-1 block w-full border rounded px-3 py-2"
            value={status}
            onChange={onFieldChange(setStatus)}
            required
            aria-required="true"
            aria-label="Issue Status"
            title="Select issue status"
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </label>

        <div>
          <span className="font-semibold">Existing Media</span>
          <div className="flex flex-wrap gap-3 mt-2" aria-label="Existing media files">
            {existingMedia.length === 0 && <p className="text-gray-500">No media uploaded</p>}
            {existingMedia.map((url, i) => (
              <div
                key={i}
                className="relative"
                role="group"
                aria-label={`Existing media ${i + 1}`}
              >
                {/* Use the full Cloudinary URL directly */}
                <img
                  src={url} 
                  alt={`Existing media ${i + 1}`}
                  className="w-20 h-20 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => removeExistingMedia(i)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                  title="Remove media"
                  aria-label={`Remove existing media ${i + 1}`}
                >
                  ✖
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <span className="font-semibold">Replace/Add Media</span>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            className="mt-1"
            onChange={handleFileChange}
            aria-label="Upload new media files"
            title="Select new files to replace or add media"
          />
          <small className="text-gray-500 block mt-1">
            Select new files to replace or add media. Removed files will not be retained.
          </small>
          {mediaFiles.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2" aria-label="New media files to upload">
              {mediaFiles.map((file, i) => (
                <div
                  key={i}
                  className="relative"
                  role="group"
                  aria-label={`New media file ${file.name}`}
                >
                  <span className="inline-block w-20 h-20 border rounded flex items-center justify-center text-xs text-gray-700 bg-gray-100 text-center p-1">
                    {file.name.substring(0, 15)}...
                  </span>
                  <button
                    type="button"
                    onClick={() => removeNewMedia(i)}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                    title={`Remove new media file ${file.name}`}
                    aria-label={`Remove new media file ${file.name}`}
                  >
                    ✖
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
          disabled={isSubmitting || loading}
          aria-disabled={isSubmitting || loading}
        >
          {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}