import React, { useState } from 'react';
import { Settings, MapPin, Mail, Phone, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';

export function Profile() {
  const navigate = useNavigate();
  // Destructure everything needed directly from the context, including toggleRepost
  const { user, issues, reposts, loading, error, deleteIssue, toggleRepost } = useProfile();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false); // State for delete operation loading
  const [unreposting, setUnreposting] = useState(false); // New state for un-repost loading

  // Consolidated loading and error states from context
  if (loading) {
    return (
      <div className="text-center py-10" role="status" aria-live="polite">
        <svg className="animate-spin h-8 w-8 mx-auto text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        <span className="sr-only">Loading profile data...</span>
        <p className="mt-2 text-gray-700">Loading your profile, reports, and reposts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-600" role="alert">
        <p>Error loading profile: {error}</p>
        <p className="mt-2">Please try logging in again or refresh the page.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-10 text-gray-700" role="alert">
        User data not available. Please ensure you are logged in.
        <button
          onClick={() => navigate('/login')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const avatarSrc = user.avatar?.startsWith('/uploads')
    ? `/api${user.avatar}`
    : user.avatar ||
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200';

  // Handler for deleting your own original reports
  const handleDeleteConfirmed = async (issueId: string) => {
    setDeleting(true);
    try {
      await deleteIssue(issueId);
      setConfirmDeleteId(null); // Close modal on success
    } catch (error) {
      alert('Failed to delete report. Please try again.');
      console.error('Failed to delete issue:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Handler for removing a repost
  const handleRemoveRepost = async (issueId: string) => {
    if (window.confirm('Are you sure you want to remove this repost?')) {
      setUnreposting(true);
      try {
        await toggleRepost(issueId);
        // The repost will be automatically removed from the list via ProfileContext state update
      } catch (error) {
        alert('Failed to remove repost. Please try again.');
        console.error('Failed to remove repost:', error);
      } finally {
        setUnreposting(false);
      }
    }
  };

  const openConfirmDeleteModal = (issueId: string) => {
    setConfirmDeleteId(issueId);
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMediaGallery = (media: string[]) => {
    if (!media || media.length === 0) return null;

    return (
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {media.map((file, idx) => {
          const isVideo = file.match(/\.(mp4|webm|ogg)$/i);
          const src = `http://localhost:5000${file}`;
          return isVideo ? (
            <video
              key={idx}
              src={src}
              controls
              className="rounded-md object-cover w-full max-h-48"
              preload="metadata"
              aria-label={`Video media ${idx + 1}`}
            />
          ) : (
            <img
              key={idx}
              src={src}
              alt={`Media ${idx + 1}`}
              className="rounded-md object-cover w-full max-h-48"
              loading="lazy"
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Profile Info */}
      <section aria-labelledby="profile-heading" className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <h2 id="profile-heading" className="sr-only">User Profile Information</h2>
        <div className="h-32 bg-gradient-to-r from-blue-500 to-blue-600"></div>
        <div className="px-6 py-4">
          <div className="flex items-start">
            <img
              src={avatarSrc}
              alt={`${user.firstName} ${user.lastName} Profile Picture`}
              className="w-24 h-24 rounded-full border-4 border-white -mt-12 object-cover"
            />
            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {user.firstName} {user.lastName}
                  </h1>
                  <p className="text-gray-600 mt-1">{user.bio || 'No bio available.'}</p>
                </div>
                <button
                  onClick={() => navigate('/profile/edit')}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Edit Profile"
                  title="Edit Profile"
                >
                  <Settings size={20} />
                  <span>Edit Profile</span>
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-gray-600">
                <div className="flex items-center" aria-label="User location">
                  <MapPin size={16} className="mr-1" />
                  <span>{user.address || 'Address not provided'}</span>
                </div>
                <div className="flex items-center" aria-label="User email">
                  <Mail size={16} className="mr-1" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center" aria-label="User phone">
                  <Phone size={16} className="mr-1" />
                  <span>{user.phone || 'Phone number not provided'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* My Reports */}
      <section aria-labelledby="my-reports-heading" className="mb-12">
        <h2 id="my-reports-heading" className="text-xl font-semibold text-gray-900 mb-4">My Reports</h2>

        {issues.length === 0 ? (
          <p className="text-center text-gray-500">You have not posted any reports yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="list">
            {issues.map((issue) => (
              <article
                key={issue._id}
                className="bg-white rounded-lg shadow-md p-4 relative"
                role="listitem"
                aria-label={`Issue titled ${issue.title}`}
              >
                <h3 className="font-semibold text-gray-900">{issue.title}</h3>
                <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full mt-2">
                  {issue.category}
                </span>
                <p className="text-gray-600 mt-2">{issue.description}</p>

                {renderMediaGallery(issue.media)}

                <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                  <time dateTime={new Date(issue.createdAt).toISOString()}>
                    {formatDate(issue.createdAt)}
                  </time>
                  <span>Status: {issue.status}</span>
                </div>

                <div className="absolute top-2 right-2 flex space-x-2">
                  <button
                    onClick={() => navigate(`/issues/edit/${issue._id}`)}
                    className="p-1 rounded hover:bg-gray-200"
                    aria-label={`Edit issue titled ${issue.title}`}
                    title="Edit"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => openConfirmDeleteModal(issue._id)}
                    className="p-1 rounded hover:bg-red-200 text-red-600"
                    aria-label={`Delete issue titled ${issue.title}`}
                    title="Delete"
                    disabled={deleting}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Confirmation Modal for deleting own reports */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
        >
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-lg">
            <h3 id="confirm-delete-title" className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Deletion
            </h3>
            <p className="mb-6">Are you sure you want to delete this report? This action cannot be undone.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirmed(confirmDeleteId)}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={deleting}
                aria-busy={deleting ? 'true' : 'false'}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Reposts */}
      <section aria-labelledby="my-reposts-heading" className="mb-12">
        <h2 id="my-reposts-heading" className="text-xl font-semibold text-gray-900 mb-4">My Reposts</h2>

        {reposts.length === 0 ? (
          <p className="text-center text-gray-500">You have not reposted any reports yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="list">
            {reposts.map((issue) => (
              <article
                key={issue._id}
                className="bg-white rounded-lg shadow-md p-4 relative"
                role="listitem"
                aria-label={`Reposted issue titled ${issue.title}`}
              >
                {/* Reposted Issue Content */}
                <h3 className="font-semibold text-gray-900">{issue.title}</h3>
                <span className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full mt-2">
                  {issue.category}
                </span>
                <p className="text-gray-600 mt-2">{issue.description}</p>
                {renderMediaGallery(issue.media)}
                <div className="mt-4 text-sm text-gray-500">
                  <time dateTime={new Date(issue.createdAt).toISOString()}>
                    {formatDate(issue.createdAt)}
                  </time>
                </div>

                {/* NEW: Remove Repost Button */}
                <div className="absolute top-2 right-2 flex space-x-2">
                  <button
                    onClick={() => handleRemoveRepost(issue._id)}
                    className="p-1 rounded hover:bg-red-200 text-red-600"
                    aria-label={`Remove repost for issue titled ${issue.title}`}
                    title="Remove Repost"
                    disabled={unreposting} // Disable while un-repost is in progress
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}