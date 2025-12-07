// src/pages/Profile.tsx — FINAL COMPLETE FIXED VERSION

import React, { useState } from "react";
import { Settings, MapPin, Mail, Phone, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../context/ProfileContext";


/**
 * Helper function to construct the full URL for media files stored on the backend.
 * @param path The relative path (e.g., 'uploads/image.jpg')
 * @returns The full absolute URL.
 */
const getMediaUrl = (path: string): string => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("blob:")) return path;

    return `${import.meta.env.VITE_API_URL}/${path.replace(/^\/+/, "")}`;
};

export function Profile() {
    const navigate = useNavigate();

    const {
        user,
        issues,
        reposts,
        loading,
        error,
        deleteIssue,
        toggleRepost,
    } = useProfile();

    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [unreposting, setUnreposting] = useState(false);

    // ----------------------------------------------------
    // LOADING & ERROR STATES
    // ----------------------------------------------------
    if (loading) {
        return (
            <div className="text-center py-10" aria-live="polite" role="status">
                <svg
                    className="animate-spin h-8 w-8 mx-auto text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                    />
                </svg>
                <p className="mt-2 text-gray-700">Loading your profile...</p>
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

    // Prevent false "User not available" after refresh
    if (!user || !user._id) {
        return (
            <div className="text-center py-10 text-gray-700" role="alert">
                User data not available. Please login.
                <button
                    onClick={() => navigate("/login")}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Go to Login
                </button>
            </div>
        );
    }

    // ----------------------------------------------------
    // AVATAR PATH CALCULATION
    // ----------------------------------------------------
    const defaultAvatar =
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200";

    const avatarSrc = user.avatar ? getMediaUrl(user.avatar) : defaultAvatar;

    // ----------------------------------------------------
    // HANDLERS
    // ----------------------------------------------------
    const handleDeleteConfirmed = async (issueId: string) => {
        if (deleting) return;

        setDeleting(true);
        try {
            await deleteIssue(issueId);
            setConfirmDeleteId(null);
        } catch {
            alert("Failed to delete report.");
        } finally {
            setDeleting(false);
        }
    };

    const handleRemoveRepost = async (issueId: string) => {
        if (!window.confirm("Remove this repost?")) return;
        if (unreposting) return;

        setUnreposting(true);
        try {
            await toggleRepost(issueId);
        } catch {
            alert("Failed to remove repost.");
        } finally {
            setUnreposting(false);
        }
    };

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    // ----------------------------------------------------
    // MEDIA RENDERER (no crashes on undefined media)
    // ----------------------------------------------------
    const renderMediaGallery = (media: string[] = []) => {
        if (!media || media.length === 0) return null;

        return (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {media.map((file, idx) => {
                    const isVideo = /\.[mp4|webm|ogg]+$/i.test(file);
                    const src = getMediaUrl(file);

                    return isVideo ? (
                        <video
                            key={idx}
                            src={src}
                            controls
                            className="rounded-md object-cover w-full max-h-48"
                            preload="metadata"
                        />
                    ) : (
                        <img
                            key={idx}
                            src={src}
                            alt={`Media ${idx + 1}`}
                            className="rounded-md object-cover w-full max-h-48"
                        />
                    );
                })}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* ====================== PROFILE HEADER ====================== */}
            <section className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
                <div className="h-32 bg-gradient-to-r from-blue-500 to-blue-600" />
                <div className="px-6 py-4">
                    <div className="flex items-start">

                        <img
                            src={avatarSrc}
                            alt="Profile avatar"
                            className="w-24 h-24 rounded-full border-4 border-white -mt-12 object-cover"
                        />

                        <div className="ml-4 flex-1">
                            <div className="flex items-center justify-between">

                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        {user.firstName} {user.lastName}
                                    </h1>
                                    <p className="text-gray-600 mt-1">
                                        {user.bio || "No bio available."}
                                    </p>
                                </div>

                                <button
                                    onClick={() => navigate("/profile/edit")}
                                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200"
                                >
                                    <Settings size={20} />
                                    <span>Edit Profile</span>
                                </button>

                            </div>

                            <div className="mt-4 flex flex-wrap gap-4 text-gray-600">

                                <div className="flex items-center">
                                    <MapPin size={16} className="mr-1" />
                                    <span>{user.address || "Address not provided"}</span>
                                </div>

                                <div className="flex items-center">
                                    <Mail size={16} className="mr-1" />
                                    <span>{user.email}</span>
                                </div>

                                <div className="flex items-center">
                                    <Phone size={16} className="mr-1" />
                                    <span>{user.phone || "Phone number not provided"}</span>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ====================== MY REPORTS ====================== */}
            <section className="mb-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">My Reports</h2>

                {issues.length === 0 ? (
                    <p className="text-center text-gray-500">You haven't posted any reports yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {issues.map((issue) => (
                            <article key={issue._id} className="bg-white rounded-lg shadow-md p-4 relative">

                                <h3 className="font-semibold text-gray-900">{issue.title}</h3>

                                <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full mt-2">
                                    {issue.category}
                                </span>

                                <p className="text-gray-600 mt-2">{issue.description}</p>

                                {renderMediaGallery(issue.media)}

                                <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                                    <time>{formatDate(issue.createdAt)}</time>

                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium
                                        ${
                                            issue.status === "Resolved"
                                                ? "bg-green-100 text-green-800"
                                                : issue.status === "In Progress"
                                                ? "bg-yellow-100 text-yellow-800"
                                                : "bg-red-100 text-red-800"
                                        }`}
                                    >
                                        Status: {issue.status}
                                    </span>
                                </div>

                                <div className="absolute top-2 right-2 flex space-x-2">

                                    <button
                                        onClick={() => navigate(`/issues/edit/${issue._id}`)}
                                        className="p-1 rounded hover:bg-gray-200"
                                        title="Edit Issue"
                                    >
                                        <Edit size={18} />
                                    </button>

                                    <button
                                        onClick={() => setConfirmDeleteId(issue._id)}
                                        className="p-1 rounded hover:bg-red-200 text-red-600"
                                        title="Delete Issue"
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

            {/* ====================== DELETE CONFIRM MODAL ====================== */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-lg">

                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Deletion</h3>

                        <p className="mb-6">Are you sure you want to delete this report? This cannot be undone.</p>

                        <div className="flex justify-end space-x-4">

                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => handleDeleteConfirmed(confirmDeleteId)}
                                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                                disabled={deleting}
                            >
                                {deleting ? "Deleting..." : "Delete"}
                            </button>

                        </div>

                    </div>
                </div>
            )}

            {/* ====================== MY REPOSTS ====================== */}
            <section className="mb-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">My Reposts</h2>

                {reposts.length === 0 ? (
                    <p className="text-center text-gray-500">You haven't reposted anything yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {reposts.map((issue) => (
                            <article key={issue._id} className="bg-white rounded-lg shadow-md p-4 relative">

                                <h3 className="font-semibold text-gray-900">{issue.title}</h3>

                                <span className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full mt-2">
                                    {issue.category}
                                </span>

                                <p className="text-gray-600 mt-2">{issue.description}</p>

                                {renderMediaGallery(issue.media)}

                                <div className="mt-4 text-sm text-gray-500">
                                    <time>{formatDate(issue.createdAt)}</time>
                                </div>

                                <div className="absolute top-2 right-2 flex space-x-2">
                                    <button
                                        onClick={() => handleRemoveRepost(issue._id)}
                                        className="p-1 rounded hover:bg-red-200 text-red-600"
                                        disabled={unreposting}
                                        title="Remove Repost"
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
