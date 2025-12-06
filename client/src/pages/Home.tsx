// src/pages/Home.tsx
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

// ======================================================================
// CONFIG: API base URL
// ======================================================================
const API_BASE_URL = import.meta.env.VITE_API_URL;

// ======================================================================
// Categories
// ======================================================================
const categories: string[] = [
    "Road Infrastructure",
    "Sanitation",
    "Public Safety",
    "Environmental",
    "Public Transport",
    "Other",
];

// ==================== Type Definitions ====================
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

// ======================================================================
// MEDIA URL HELPER — FIXED DOUBLE SLASH BUG
// ======================================================================
const getMediaUrl = (path: string): string => {
    if (!path) return "";
    if (path.startsWith("http")) return path;

    // remove leading slashes to avoid //uploads/image.jpg
    const normalizedPath = path.replace(/^\/+/, "");
    return `${API_BASE_URL}/${normalizedPath}`;
};

// ======================================================================
// HOME COMPONENT
// ======================================================================
export function Home() {
    const { user, isAuthenticated, loading } = useAuth();

    const [issues, setIssues] = useState<Issue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({ category: "", location: "" });
    const [userVotes, setUserVotes] = useState<Record<string, VoteStatus>>({});
    const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

    const getAuthToken = () =>
        localStorage.getItem("token") || sessionStorage.getItem("token") || "";

    // ======================================================================
    // FETCH ISSUES — FIXED: PUBLIC ACCESS + CLEAN VOTES RESET
    // ======================================================================
    const fetchIssues = useCallback(
        async (pageNumber = 1, reset = false) => {
            const token = getAuthToken();

            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            setIsLoading(true);

            try {
                const url = new URL(`${API_BASE_URL}/api/issues`);
                url.searchParams.append("page", pageNumber.toString());
                url.searchParams.append("limit", "5");

                if (filters.category) url.searchParams.append("category", filters.category);
                if (filters.location) url.searchParams.append("location", filters.location);

                const res = await fetch(url.toString(), { headers });

                if (res.status === 401) {
                    setIsLoading(false);
                    return;
                }

                const json = await res.json();

                if (!res.ok || !json.success || !Array.isArray(json.data)) {
                    throw new Error(json.message || "Failed to fetch issues");
                }

                const issuesData = json.data as Issue[];
                const initialVotes: Record<string, VoteStatus> = {};
                const authUserId = user?._id ?? null;

                const issuesWithFlags = issuesData.map((issue) => {
                    const userVote = issue.votes?.find(
                        (v) => authUserId && v.user === authUserId
                    );

                    initialVotes[issue._id] = userVote
                        ? userVote.isUpvote
                            ? "upvote"
                            : "downvote"
                        : null;

                    return {
                        ...issue,
                        repostedByUser: authUserId
                            ? issue.repostedBy?.includes(authUserId) ?? false
                            : false,
                    };
                });

                setUserVotes((prev) => (reset ? initialVotes : { ...prev, ...initialVotes }));

                if (issuesWithFlags.length < 5) setHasMore(false);
                else setHasMore(true);

                setIssues((prev) =>
                    reset ? issuesWithFlags : [...prev, ...issuesWithFlags]
                );
            } catch (err) {
                console.error("Error loading issues:", err);
                setHasMore(false);
            } finally {
                setIsLoading(false);
            }
        },
        [filters, user]
    );

    // ======================================================================
    // INITIAL LOAD WHEN AUTH CHECK COMPLETES
    // ======================================================================
    useEffect(() => {
        if (loading) return;

        setPage(1);
        setHasMore(true);
        fetchIssues(1, true);
    }, [loading, isAuthenticated, fetchIssues]);

    // ======================================================================
    // REFRESH ON FILTER CHANGE — FIXED: RESET userVotes + commentTexts
    // ======================================================================
    useEffect(() => {
        if (loading) return;
        setPage(1);
        setIssues([]);
        setUserVotes({});
        setCommentTexts({});
        fetchIssues(1, true);
    }, [filters, loading, fetchIssues]);

    // ======================================================================
    // VOTE HANDLER
    // ======================================================================
    const handleVote = async (issueId: string, isUpvote: boolean) => {
        if (!isAuthenticated) return alert("Please log in to vote.");

        const token = getAuthToken();
        if (!token) return alert("Session expired. Please log in again.");

        const currentVote = userVotes[issueId];
        const newVote: VoteStatus = isUpvote ? "upvote" : "downvote";

        // Optimistic UI
        setIssues((prev) =>
            prev.map((issue) => {
                if (issue._id !== issueId) return issue;

                let up = issue.upvotes;
                let down = issue.downvotes;

                if (currentVote === newVote) {
                    if (newVote === "upvote") up--;
                    else down--;
                    setUserVotes((prev) => ({ ...prev, [issueId]: null }));
                } else {
                    if (currentVote === "upvote") up--;
                    if (currentVote === "downvote") down--;

                    if (newVote === "upvote") up++;
                    else down++;

                    setUserVotes((prev) => ({ ...prev, [issueId]: newVote }));
                }

                return { ...issue, upvotes: up, downvotes: down };
            })
        );

        try {
            const res = await fetch(`${API_BASE_URL}/api/issues/${issueId}/vote`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ isUpvote }),
            });

            if (!res.ok) throw new Error("Vote failed");
        } catch (err) {
            console.error("Vote failed:", err);
            fetchIssues(page, true);
        }
    };

    // ======================================================================
    // FIXED: REPOST LOGIC (NO MORE WRONG TOGGLE)
    // ======================================================================
    const handleRepost = async (issue: Issue) => {
        if (!isAuthenticated) return alert("Please log in to repost.");

        const token = getAuthToken();
        if (!token) return alert("Session expired. Please log in again.");

        try {
            const res = await fetch(`${API_BASE_URL}/api/issues/${issue._id}/repost`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({}),
            });

            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message);

            setIssues((prev) =>
                prev.map((i) =>
                    i._id === issue._id
                        ? {
                              ...i,
                              repostCount: json.data.repostCount,
                              repostedByUser: json.data.repostedByUser, // FIXED
                          }
                        : i
                )
            );
        } catch (err) {
            console.error("Repost error:", err);
            alert("Error reposting/unreposting.");
        }
    };

    // ======================================================================
    // COMMENT SECTION HANDLERS
    // ======================================================================
    const handleSubmitComment = async (issueId: string) => {
        if (!isAuthenticated) return alert("Please log in to comment.");

        const text = commentTexts[issueId]?.trim();
        if (!text) return;

        const token = getAuthToken();
        if (!token) return alert("Session expired. Please log in again.");

        try {
            const res = await fetch(`${API_BASE_URL}/api/issues/${issueId}/comment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ text }),
            });

            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message);

            setIssues((prev) =>
                prev.map((issue) =>
                    issue._id === issueId
                        ? { ...issue, comments: [...(issue.comments || []), json.data.comment] }
                        : issue
                )
            );

            setCommentTexts((prev) => ({ ...prev, [issueId]: "" }));
        } catch (err) {
            console.error("Comment error:", err);
            alert("Error submitting comment.");
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
        navigator.clipboard?.writeText(url)
            .then(() => alert("Link copied: " + url))
            .catch(() => alert("Failed to copy link."));
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
    // AUTH STATES
    // ======================================================================
    if (loading) {
        return (
            <div className="text-center py-10">
                <h4 className="text-xl font-medium">Checking your session...</h4>
                <div className="animate-spin inline-block h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mt-4"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="home-container">
                <div className="text-center py-20 bg-white rounded-lg shadow-md mx-auto max-w-xl border border-gray-200">
                    <h2 className="text-3xl font-extrabold text-blue-600 mb-4">
                        Join the Conversation!
                    </h2>
                    <p className="text-gray-600 mb-8 px-4">
                        Please log in or register to view community issues and participate in resolving local problems.
                    </p>
                    <Link
                        to="/login"
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                    >
                        Log In / Register
                    </Link>
                </div>
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
                        {/* Upvote */}
                        <button
                            onClick={() => handleVote(issue._id, true)}
                            className={`vote-button upvote ${userVote === "upvote" ? "active" : ""}`}
                        >
                            <ThumbsUp size={20} /> <span>{issue.upvotes}</span>
                        </button>

                        {/* Downvote */}
                        <button
                            onClick={() => handleVote(issue._id, false)}
                            className={`vote-button downvote ${userVote === "downvote" ? "active" : ""}`}
                        >
                            <ThumbsDown size={20} /> <span>{issue.downvotes}</span>
                        </button>

                        {/* Repost */}
                        <button
                            onClick={() => handleRepost(issue)}
                            className={`vote-button repost ${issue.repostedByUser ? "active" : ""}`}
                        >
                            <Repeat2 size={20} />
                            <span>{issue.repostCount || 0}</span>
                        </button>

                        {/* Share */}
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

                    {/* Progress Bar */}
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

                    {/* Comments */}
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

                        <div className="comment-input-area">
                            <textarea
                                value={commentTexts[issue._id] || ""}
                                onChange={(e) =>
                                    handleCommentChange(issue._id, e.target.value)
                                }
                                placeholder="Add a comment..."
                                rows={2}
                                disabled={!isAuthenticated}
                            />

                            <button
                                onClick={() => handleSubmitComment(issue._id)}
                                disabled={!commentTexts[issue._id]?.trim()}
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ======================================================================
    // PAGE RENDER
    // ======================================================================
    return (
        <div className="home-container">
            <h1 className="home-title">Community Issues</h1>

            {isLoading && issues.length === 0 && (
                <div className="text-center py-4 text-gray-600">
                    Loading community issues...
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
                    disabled={issues.length === 0}
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
                    disabled={issues.length === 0}
                />
            </div>

            {!isLoading && issues.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    <p>No issues found matching your criteria.</p>
                    <p className="text-sm mt-1">Try clearing filters or check back later!</p>
                </div>
            )}

            <InfiniteScroll
                dataLength={issues.length}
                next={() => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchIssues(nextPage);
                }}
                hasMore={hasMore}
                loader={
                    issues.length > 0 ? (
                        <h4 className="text-center py-4">Loading more issues...</h4>
                    ) : null
                }
                endMessage={
                    <p className="text-center py-4 text-gray-600">
                        You&apos;ve reached the end of the issues feed.
                    </p>
                }
            >
                {issues.map(renderIssueCard)}
            </InfiniteScroll>
        </div>
    );
}
