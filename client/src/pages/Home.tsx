// src/pages/Home.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useCallback } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { Link } from "react-router-dom";
import {
    ThumbsUp,
    ThumbsDown,
    MapPin,
    Repeat2,
    MessageCircle,
    Share2,
} from "lucide-react";

import "/src/home.css";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const categories: string[] = [
    "Road Infrastructure",
    "Sanitation",
    "Public Safety",
    "Environmental",
    "Public Transport",
    "Other",
];

interface User {
    _id: string;
    firstName: string;
    lastName: string;
}

interface Vote {
    user: string;
    isUpvote: boolean;
}

interface Comment {
    _id: string;
    text: string;
    user: User;
    createdAt: string;
}

interface Issue {
    _id: string;
    title: string;
    description: string;
    category: string;
    media: string[];
    upvotes: number;
    downvotes: number;
    location: string;
    createdAt: string;
    emailSent: boolean;
    votes?: Vote[];
    user: User;
    comments?: Comment[];
    repostCount?: number;
    repostedByUser?: boolean;
    repostedBy?: string[];
}

type VoteStatus = "upvote" | "downvote" | null;

const getMediaUrl = (path: string): string => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const normalizedPath = path.replace(/^\/+/, "");
    return `${API_BASE_URL}/${normalizedPath}`;
};

export function Home() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();

    const [issues, setIssues] = useState<Issue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({ category: "", location: "" });
    const [userVotes, setUserVotes] = useState<Record<string, VoteStatus>>({});
    const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

    const getAuthToken = () => {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        console.log("🔵 Getting auth token:", token ? "Found" : "Not found");
        return token || "";
    };

    // ======================================================================
    // FETCH ISSUES - WORKS FOR BOTH LOGGED IN AND PUBLIC USERS
    // ======================================================================
    const fetchIssues = useCallback(
        async (pageNumber = 1, reset = false) => {
            console.log("🔵 Fetching issues - Page:", pageNumber, "Reset:", reset);
            console.log("🔵 Auth state:", { isAuthenticated, userId: user?._id });

            const token = getAuthToken();

            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };
            
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
                console.log("✅ Token added to request");
            } else {
                console.log("🔵 No token - fetching public issues");
            }

            setIsLoading(true);

            try {
                const url = new URL(`${API_BASE_URL}/api/issues`);
                url.searchParams.append("page", pageNumber.toString());
                url.searchParams.append("limit", "5");

                if (filters.category) url.searchParams.append("category", filters.category);
                if (filters.location) url.searchParams.append("location", filters.location);

                console.log("🔵 Fetching:", url.toString());

                const res = await fetch(url.toString(), { 
                    headers,
                    credentials: 'include' // IMPORTANT for cross-origin auth
                });

                console.log("🔵 Issues response status:", res.status);

                // For public access, 401 is acceptable
                if (!res.ok && res.status !== 401) {
                    const errorText = await res.text();
                    console.error("❌ Issues fetch failed:", errorText);
                    throw new Error(`HTTP ${res.status}`);
                }

                const json = await res.json();

                if (!json.success || !Array.isArray(json.data)) {
                    console.error("❌ Invalid response structure:", json);
                    throw new Error(json.message || "Failed to fetch issues");
                }

                const issuesData = json.data as Issue[];
                console.log("✅ Issues loaded:", issuesData.length);

                // Process user votes if authenticated
                const initialVotes: Record<string, VoteStatus> = {};
                const authUserId = user?._id ?? null;

                const issuesWithFlags = issuesData.map((issue) => {
                    // Check if current user has voted
                    const userVote = issue.votes?.find(
                        (v) => authUserId && v.user === authUserId
                    );

                    if (userVote) {
                        initialVotes[issue._id] = userVote.isUpvote ? "upvote" : "downvote";
                    } else {
                        initialVotes[issue._id] = null;
                    }

                    return {
                        ...issue,
                        repostedByUser: authUserId
                            ? issue.repostedBy?.includes(authUserId) ?? false
                            : false,
                    };
                });

                setUserVotes((prev) => (reset ? initialVotes : { ...prev, ...initialVotes }));

                // Check if there are more pages
                if (issuesWithFlags.length < 5) {
                    setHasMore(false);
                    console.log("🔵 No more issues to load");
                } else {
                    setHasMore(true);
                }

                setIssues((prev) =>
                    reset ? issuesWithFlags : [...prev, ...issuesWithFlags]
                );

                console.log("✅ Issues state updated");
            } catch (err) {
                console.error("❌ Error loading issues:", err);
                setHasMore(false);
            } finally {
                setIsLoading(false);
            }
        },
        [filters, user, isAuthenticated]
    );

    // ======================================================================
    // INITIAL LOAD - WAIT FOR AUTH CHECK TO COMPLETE
    // ======================================================================
    useEffect(() => {
        console.log("🔵 Initial load effect - Auth loading:", authLoading);

        if (authLoading) {
            console.log("⏳ Waiting for auth check to complete...");
            return;
        }

        console.log("✅ Auth check complete, loading issues");
        console.log("🔵 User:", user?.email || "Not authenticated");
        
        setPage(1);
        setHasMore(true);
        fetchIssues(1, true);
    }, [authLoading]); // Only depend on authLoading, not fetchIssues

    // ======================================================================
    // REFRESH ON FILTER CHANGE
    // ======================================================================
    useEffect(() => {
        if (authLoading) {
            console.log("⏳ Skipping filter effect - auth still loading");
            return;
        }
        
        console.log("🔵 Filters changed, reloading issues");
        setPage(1);
        setIssues([]);
        setUserVotes({});
        setCommentTexts({});
        setHasMore(true);
        fetchIssues(1, true);
    }, [filters.category, filters.location]); // Only depend on filter values

    // ======================================================================
    // VOTE HANDLER
    // ======================================================================
    const handleVote = async (issueId: string, isUpvote: boolean) => {
        console.log("🔵 Vote handler called:", { issueId, isUpvote, isAuthenticated });

        if (!isAuthenticated) {
            alert("Please log in to vote.");
            return;
        }

        const token = getAuthToken();
        if (!token) {
            alert("Session expired. Please log in again.");
            return;
        }

        const currentVote = userVotes[issueId];
        const newVote: VoteStatus = isUpvote ? "upvote" : "downvote";

        console.log("🔵 Current vote:", currentVote, "New vote:", newVote);

        // Optimistic UI update
        setIssues((prev) =>
            prev.map((issue) => {
                if (issue._id !== issueId) return issue;

                let up = issue.upvotes;
                let down = issue.downvotes;

                // If clicking the same vote, remove it
                if (currentVote === newVote) {
                    if (newVote === "upvote") up--;
                    else down--;
                    setUserVotes((prev) => ({ ...prev, [issueId]: null }));
                } else {
                    // Remove old vote if exists
                    if (currentVote === "upvote") up--;
                    if (currentVote === "downvote") down--;

                    // Add new vote
                    if (newVote === "upvote") up++;
                    else down++;

                    setUserVotes((prev) => ({ ...prev, [issueId]: newVote }));
                }

                return { ...issue, upvotes: up, downvotes: down };
            })
        );

        try {
            console.log("🔵 Sending vote to server...");
            const res = await fetch(`${API_BASE_URL}/api/issues/${issueId}/vote`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
                body: JSON.stringify({ isUpvote }),
            });

            if (!res.ok) {
                const error = await res.text();
                console.error("❌ Vote failed:", error);
                throw new Error("Vote failed");
            }

            console.log("✅ Vote successful");
        } catch (err) {
            console.error("❌ Vote error:", err);
            alert("Failed to register vote. Please try again.");
            // Revert on failure
            fetchIssues(page, true);
        }
    };

    // ======================================================================
    // REPOST HANDLER
    // ======================================================================
    const handleRepost = async (issue: Issue) => {
        console.log("🔵 Repost handler called:", { issueId: issue._id, isAuthenticated });

        if (!isAuthenticated) {
            alert("Please log in to repost.");
            return;
        }

        const token = getAuthToken();
        if (!token) {
            alert("Session expired. Please log in again.");
            return;
        }

        try {
            console.log("🔵 Sending repost to server...");
            const res = await fetch(`${API_BASE_URL}/api/issues/${issue._id}/repost`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
                body: JSON.stringify({}),
            });

            const json = await res.json();
            
            if (!res.ok || !json.success) {
                console.error("❌ Repost failed:", json.message);
                throw new Error(json.message);
            }

            console.log("✅ Repost successful");

            setIssues((prev) =>
                prev.map((i) =>
                    i._id === issue._id
                        ? {
                              ...i,
                              repostCount: json.data.repostCount,
                              repostedByUser: json.data.repostedByUser,
                          }
                        : i
                )
            );
        } catch (err) {
            console.error("❌ Repost error:", err);
            alert("Error toggling repost. Please try again.");
        }
    };

    // ======================================================================
    // COMMENT HANDLERS
    // ======================================================================
    const handleSubmitComment = async (issueId: string) => {
        console.log("🔵 Submit comment called:", { issueId, isAuthenticated });

        if (!isAuthenticated) {
            alert("Please log in to comment.");
            return;
        }

        const text = commentTexts[issueId]?.trim();
        if (!text) {
            console.warn("⚠️ Empty comment text");
            return;
        }

        const token = getAuthToken();
        if (!token) {
            alert("Session expired. Please log in again.");
            return;
        }

        try {
            console.log("🔵 Sending comment to server...");
            const res = await fetch(`${API_BASE_URL}/api/issues/${issueId}/comment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
                body: JSON.stringify({ text }),
            });

            const json = await res.json();
            
            if (!res.ok || !json.success) {
                console.error("❌ Comment failed:", json.message);
                throw new Error(json.message);
            }

            console.log("✅ Comment submitted successfully");

            setIssues((prev) =>
                prev.map((issue) =>
                    issue._id === issueId
                        ? { ...issue, comments: [...(issue.comments || []), json.data.comment] }
                        : issue
                )
            );

            setCommentTexts((prev) => ({ ...prev, [issueId]: "" }));
        } catch (err) {
            console.error("❌ Comment error:", err);
            alert("Error submitting comment. Please try again.");
        }
    };

    const handleCommentChange = (issueId: string, text: string) => {
        setCommentTexts((prev) => ({ ...prev, [issueId]: text }));
    };

    // ======================================================================
    // SHARE HANDLER
    // ======================================================================
    const handleShare = (issueId: string) => {
        const url = `${window.location.origin}/issues/${issueId}`;
        
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url)
                .then(() => alert("Link copied to clipboard!"))
                .catch(() => {
                    // Fallback for browsers without clipboard API
                    prompt("Copy this link:", url);
                });
        } else {
            // Fallback for older browsers
            prompt("Copy this link:", url);
        }
    };

    const formatDateTime = (dateStr: string) =>
        new Date(dateStr).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    // ======================================================================
    // LOADING STATE - ONLY SHOW WHILE CHECKING AUTH
    // ======================================================================
    if (authLoading) {
        return (
            <div className="text-center py-10">
                <h4 className="text-xl font-medium text-gray-700">Initializing...</h4>
                <div className="animate-spin inline-block h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mt-4"></div>
                <p className="text-gray-600 mt-2">Checking authentication status</p>
            </div>
        );
    }

    // ======================================================================
    // ISSUE CARD RENDERER
    // ======================================================================
    const renderIssueCard = (issue: Issue) => {
        const imageUrl = issue.media?.[0] ? getMediaUrl(issue.media[0]) : "";
        const totalVotes = issue.upvotes + issue.downvotes;

        const upvotePercent = totalVotes ? (issue.upvotes / totalVotes) * 100 : 0;
        const downvotePercent = totalVotes ? (issue.downvotes / totalVotes) * 100 : 0;

        const userVote = userVotes[issue._id] ?? null;

        return (
            <div key={issue._id} className="issue-card">
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt={issue.title}
                        className="issue-image"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                        }}
                    />
                )}

                <div className="issue-content">
                    <h2 className="issue-title">{issue.title}</h2>

                    <div className="issue-uploader">
                        Posted by{" "}
                        <strong>
                            {issue.user
                                ? `${issue.user.firstName} ${issue.user.lastName}`
                                : "Unknown"}
                        </strong>
                    </div>

                    <div className="issue-location">
                        <MapPin size={16} aria-hidden="true" /> {issue.location}
                    </div>

                    <div className="issue-date">
                        <small>Posted on: {formatDateTime(issue.createdAt)}</small>
                    </div>

                    <span className="issue-category">{issue.category}</span>

                    <div className="issue-votes">
                        <button
                            onClick={() => handleVote(issue._id, true)}
                            className={`vote-button upvote ${userVote === "upvote" ? "active" : ""}`}
                            disabled={!isAuthenticated}
                            title={!isAuthenticated ? "Log in to vote" : "Upvote"}
                        >
                            <ThumbsUp size={20} /> <span>{issue.upvotes}</span>
                        </button>

                        <button
                            onClick={() => handleVote(issue._id, false)}
                            className={`vote-button downvote ${userVote === "downvote" ? "active" : ""}`}
                            disabled={!isAuthenticated}
                            title={!isAuthenticated ? "Log in to vote" : "Downvote"}
                        >
                            <ThumbsDown size={20} /> <span>{issue.downvotes}</span>
                        </button>

                        <button
                            onClick={() => handleRepost(issue)}
                            className={`vote-button repost ${issue.repostedByUser ? "active" : ""}`}
                            disabled={!isAuthenticated}
                            title={!isAuthenticated ? "Log in to repost" : "Repost"}
                        >
                            <Repeat2 size={20} />
                            <span>{issue.repostCount || 0}</span>
                        </button>

                        <button
                            onClick={() => handleShare(issue._id)}
                            className="vote-button share"
                            aria-label="Share this issue"
                            title="Share this issue"
                        >
                            <Share2 size={20} />
                        </button>

                        <div className="comment-count">
                            <MessageCircle size={18} /> {issue.comments?.length || 0}
                        </div>
                    </div>

                    <p className="issue-description">{issue.description}</p>

                    <div
                        className="progress-bar-container"
                        style={
                            {
                                "--upvote-width": `${upvotePercent}%`,
                                "--downvote-width": `${downvotePercent}%`,
                            } as React.CSSProperties
                        }
                    >
                        <div className="progress-bar-fill upvote-fill"></div>
                        <div className="progress-bar-fill downvote-fill"></div>
                    </div>

                    {issue.emailSent && (
                        <div className="reported-message">
                            ✓ Reported to authorities
                        </div>
                    )}

                    {/* Comments Section */}
                    <div className="comment-section">
                        <h3 className="comments-title">
                            Comments ({issue.comments?.length || 0})
                        </h3>

                        {issue.comments?.length ? (
                            <div className="comments-list">
                                {issue.comments.map((comment) => (
                                    <div key={comment._id} className="comment-item">
                                        <p className="comment-author">
                                            <strong>
                                                {comment.user
                                                    ? `${comment.user.firstName} ${comment.user.lastName}`
                                                    : "Anonymous"}
                                            </strong>
                                            <span className="comment-date">
                                                {" "}
                                                - {formatDateTime(comment.createdAt)}
                                            </span>
                                        </p>
                                        <p className="comment-text">{comment.text}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-comments">No comments yet. Be the first!</p>
                        )}

                        {!isAuthenticated ? (
                            <div className="text-center py-3 text-gray-600">
                                <Link to="/login" className="text-blue-600 hover:underline font-medium">
                                    Log in
                                </Link>{" "}
                                to comment
                            </div>
                        ) : (
                            <div className="comment-input-area">
                                <textarea
                                    value={commentTexts[issue._id] || ""}
                                    onChange={(e) =>
                                        handleCommentChange(issue._id, e.target.value)
                                    }
                                    placeholder="Add a comment..."
                                    rows={2}
                                />

                                <button
                                    onClick={() => handleSubmitComment(issue._id)}
                                    disabled={!commentTexts[issue._id]?.trim()}
                                >
                                    Submit
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ======================================================================
    // MAIN RENDER
    // ======================================================================
    return (
        <div className="home-container">
            <h1 className="home-title">Community Issues</h1>

            {!isAuthenticated && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
                    <p className="text-blue-800">
                        Join the Conversation!
                    </p>
                    <p className="text-blue-700 mt-1">
                        <Link to="/login" className="font-semibold hover:underline">
                            Log in
                        </Link>{" "}
                        or{" "}
                        <Link to="/register" className="font-semibold hover:underline">
                            register
                        </Link>{" "}
                        to view community issues and participate in resolving local problems.
                    </p>
                </div>
            )}

            <div className="filter-controls">
                <select
                    id="filter-category"
                    aria-label="Filter by category"
                    value={filters.category}
                    onChange={(e) =>
                        setFilters({ ...filters, category: e.target.value })
                    }
                    className="filter-select"
                >
                    <option value="">All Categories</option>
                    {categories.map((cat: string) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>

                <input
                    type="text"
                    placeholder="Filter by location"
                    value={filters.location}
                    onChange={(e) =>
                        setFilters({ ...filters, location: e.target.value })
                    }
                    className="filter-input"
                />
            </div>

            {isLoading && issues.length === 0 && (
                <div className="text-center py-8 text-gray-600">
                    <div className="animate-spin inline-block h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    <p className="mt-2">Loading community issues...</p>
                </div>
            )}

            {!isLoading && issues.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    <p className="text-lg font-medium">No issues found</p>
                    <p className="text-sm mt-1">Try clearing filters or check back later!</p>
                </div>
            )}

            <InfiniteScroll
                dataLength={issues.length}
                next={() => {
                    const nextPage = page + 1;
                    console.log("🔵 Loading next page:", nextPage);
                    setPage(nextPage);
                    fetchIssues(nextPage);
                }}
                hasMore={hasMore}
                loader={
                    issues.length > 0 ? (
                        <div className="text-center py-4 text-gray-600">
                            <div className="animate-spin inline-block h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                            <p className="mt-2">Loading more issues...</p>
                        </div>
                    ) : null
                }
                endMessage={
                    issues.length > 0 ? (
                        <p className="text-center py-4 text-gray-600">
                            You&apos;ve reached the end of the issues feed.
                        </p>
                    ) : null
                }
            >
                {issues.map(renderIssueCard)}
            </InfiniteScroll>
        </div>
    );
}