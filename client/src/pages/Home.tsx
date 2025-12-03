// src/pages/Home.tsx
import { useState, useEffect, useCallback } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import {
  ThumbsUp,
  ThumbsDown,
  MapPin,
  Repeat2,
  MessageCircle,
  Share2,
} from "lucide-react";

// Assuming you still use home.css for styling
import "/src/home.css"; 

// ======================================================================
// ✅ ARCHITECTURE FIX: Using VITE_API_URL (Option B) for all calls.
// ======================================================================
const API_BASE_URL = import.meta.env.VITE_API_URL;

// ======================================================================
// ✅ FIX 1 & 2: Moved categories array definition into the file's scope
// ======================================================================
const categories: string[] = [
    "Road Infrastructure",
    "Sanitation",
    "Public Safety",
    "Environmental",
    "Public Transport",
    "Other",
];
// ======================================================================


// ==================== Type Definitions (Centralized for Home) ====================
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

// Helper to construct the full URL for media files stored on the backend.
const getMediaUrl = (path: string): string => {
    if (!path) return '';
    if (path.startsWith('http')) return path; // Already an absolute URL
    
    // Ensure consistent path structure
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_BASE_URL}/${normalizedPath}`;
};

export function Home() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ category: "", location: "" });
  const [userVotes, setUserVotes] = useState<Record<string, VoteStatus>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Unified token getter
  const getToken = useCallback(() => 
    localStorage.getItem("token") || sessionStorage.getItem("token") || "", 
    []);

  // ============================================
  // Fetch Current User ID (CRITICAL FIX: Use API_BASE_URL)
  // ============================================
  const getCurrentUserId = useCallback(async (token: string): Promise<string | null> => {
    if (!token) return null;
    try {
      // 🟢 CRITICAL FIX: Use ABSOLUTE URL
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, { 
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return res.ok && json.user ? json.user._id : null;
    } catch (err) {
      console.error("Failed to fetch current user ID:", err);
      return null;
    }
  }, []);

  // ============================================
  // Fetch Issues (CRITICAL FIX: Use API_BASE_URL)
  // ============================================
  const fetchIssues = useCallback(async (pageNumber = 1, reset = false) => {
    setIsLoading(true);
    const token = getToken();
    let loadedCurrentUserId = currentUserId;

    if (token && !loadedCurrentUserId) {
        loadedCurrentUserId = await getCurrentUserId(token);
        setCurrentUserId(loadedCurrentUserId);
        setIsAuthenticated(Boolean(loadedCurrentUserId));
    }
    
    try {
      // 🟢 CRITICAL FIX: Use ABSOLUTE URL
      const url = new URL(`${API_BASE_URL}/api/issues`); 
      url.searchParams.append("page", pageNumber.toString());
      url.searchParams.append("limit", "5");

      if (filters.category) url.searchParams.append("category", filters.category);
      if (filters.location) url.searchParams.append("location", filters.location);

      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const res = await fetch(url.toString(), {
        headers,
      });

      const json = await res.json();

      if (!res.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(json.message || "Failed to fetch issues");
      }

      const issuesData = json.data as Issue[];
      const initialUserVotes: Record<string, VoteStatus> = {};

      const issuesWithFlags = issuesData.map((issue) => {
        const userHasVoted = issue.votes?.find(
          (vote) => loadedCurrentUserId && vote.user === loadedCurrentUserId
        );
        
        if (userHasVoted) {
          initialUserVotes[issue._id] = userHasVoted.isUpvote ? "upvote" : "downvote";
        } else {
          initialUserVotes[issue._id] = null;
        }

        return {
          ...issue,
          repostedByUser: issue.repostedBy?.includes(loadedCurrentUserId as string),
        };
      });

      setUserVotes((prev) => ({ ...prev, ...initialUserVotes }));

      if (issuesWithFlags.length === 0 && pageNumber > 1) {
          setHasMore(false);
      } else if (issuesWithFlags.length < 5) {
          setHasMore(false);
      } else {
          setHasMore(true);
      }

      setIssues((prev) => reset ? issuesWithFlags : [...prev, ...issuesWithFlags]);
    } catch (err) {
      console.error("Error loading issues:", err);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, currentUserId, getCurrentUserId, filters]);

  // ============================================
  // Initial Load & Filter Effects
  // ============================================
  useEffect(() => {
    const token = getToken();
    if (token) {
      getCurrentUserId(token).then((id) => {
          setCurrentUserId(id);
          setIsAuthenticated(Boolean(id));
      });
    } else {
      setIsAuthenticated(false);
      setCurrentUserId(null);
      setIsLoading(false); 
    }
    fetchIssues(1, true);
  }, [getToken, getCurrentUserId, fetchIssues]);


  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchIssues(1, true);
  }, [filters, fetchIssues]);


  // ============================================
  // Voting (CRITICAL FIX: Use API_BASE_URL)
  // ============================================
  const handleVote = async (issueId: string, isUpvote: boolean) => {
    if (!isAuthenticated) return alert("Please log in to vote.");

    const currentVote = userVotes[issueId] ?? null;
    const newVote: VoteStatus = isUpvote ? "upvote" : "downvote";
    
    const token = getToken();
    if (!token) return; 
    
    // Optimistic UI Update (Update state instantly)
    setIssues(prevIssues => prevIssues.map(issue => {
        if (issue._id === issueId) {
            let { upvotes, downvotes } = issue;
            
            if (currentVote === newVote) {
                // Clicking the same vote: unvote
                if (newVote === "upvote") upvotes--; else downvotes--;
                setUserVotes(prev => ({ ...prev, [issueId]: null }));
                return { ...issue, upvotes, downvotes };
            } else {
                // Changing vote (downvote -> upvote, or vice versa)
                if (currentVote === "upvote") upvotes--;
                if (currentVote === "downvote") downvotes--;

                if (newVote === "upvote") upvotes++; else downvotes++;
                
                setUserVotes(prev => ({ ...prev, [issueId]: newVote }));
                return { ...issue, upvotes, downvotes };
            }
        }
        return issue;
    }));

    try {
      // 🟢 CRITICAL FIX: Use ABSOLUTE URL
      const res = await fetch(`${API_BASE_URL}/api/issues/${issueId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isUpvote }),
      });

      if (!res.ok) throw new Error("Vote failed on server.");
      
    } catch (err) {
      console.error(err);
      alert("Error voting. Reverting change.");
      fetchIssues(page, true); 
    }
  };


  // ============================================
  // Repost (CRITICAL FIX: Use API_BASE_URL and fix toggle logic)
  // ============================================
  const handleRepost = async (issue: Issue) => {
    if (!isAuthenticated) return alert("Please log in to repost.");

    const token = getToken();
    if (!token) return;

    try {
      // 🟢 CRITICAL FIX: Use ABSOLUTE URL
      const res = await fetch(`${API_BASE_URL}/api/issues/${issue._id}/repost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error("Repost failed");

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
      console.error("Repost error:", err);
      alert("Error reposting/unreposting.");
    }
  };

  // ============================================
  // Comments (CRITICAL FIX: Use API_BASE_URL)
  // ============================================
  const handleCommentChange = (issueId: string, text: string) => {
    setCommentTexts((prev) => ({ ...prev, [issueId]: text }));
  };

  const handleSubmitComment = async (issueId: string) => {
    if (!isAuthenticated) return alert("Please log in to comment.");
    const text = commentTexts[issueId]?.trim();
    if (!text) return;
    
    const token = getToken();
    if (!token) return;

    try {
      // 🟢 CRITICAL FIX: Use ABSOLUTE URL
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
            ? {
                ...issue,
                comments: [...(issue.comments || []), json.data.comment],
              }
            : issue
        )
      );

      setCommentTexts((prev) => ({ ...prev, [issueId]: "" }));
    } catch (err) {
      console.error("Comment error:", err);
      alert("Error submitting comment.");
    }
  };

  // ============================================
  // Utilities
  // ============================================
  const handleShare = (issueId: string) => {
    const url = `${window.location.origin}/issues/${issueId}`;
    if (navigator.clipboard) {
        navigator.clipboard
            .writeText(url)
            .then(() => alert("Link copied to clipboard: " + url))
            .catch(err => alert("Failed to copy link."));
    } else {
        alert("Share link: " + url);
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

  // ============================================
  // RENDER
  // ============================================
  
  if (isLoading && issues.length === 0) {
      return <div className="text-center py-10">
          <h4 className="text-xl font-medium">Loading Community Issues...</h4>
          <div className="animate-spin inline-block h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mt-4"></div>
      </div>;
  }
  
  const renderIssueCard = (issue: Issue) => {
      const imageUrl = issue.media?.[0] ? getMediaUrl(issue.media[0]) : ""; 
      const totalVotes = issue.upvotes + issue.downvotes;
      const upvotePercent = totalVotes > 0 ? (issue.upvotes / totalVotes) * 100 : 0;
      const downvotePercent = totalVotes > 0 ? (issue.downvotes / totalVotes) * 100 : 0;
      const userVote = userVotes[issue._id] ?? null;

      return (
          <div key={issue._id} className="issue-card">
              {imageUrl && (
                  <img
                      src={imageUrl}
                      alt={issue.title}
                      className="issue-image"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
              )}

              <div className="issue-content">
                  <h2 className="issue-title">{issue.title}</h2>

                  <div className="issue-uploader">
                      Posted by:{" "}
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
                          aria-label="Upvote this issue"
                          title="Upvote this issue"
                      >
                          <ThumbsUp size={20} aria-hidden="true" />
                          <span>{issue.upvotes}</span>
                      </button>

                      {/* Downvote */}
                      <button
                          onClick={() => handleVote(issue._id, false)}
                          className={`vote-button downvote ${userVote === "downvote" ? "active" : ""}`}
                          aria-label="Downvote this issue"
                          title="Downvote this issue"
                      >
                          <ThumbsDown size={20} aria-hidden="true" />
                          <span>{issue.downvotes}</span>
                      </button>

                      {/* Repost (Now a Toggle) */}
                      <button
                          onClick={() => handleRepost(issue)}
                          className={`vote-button repost ${issue.repostedByUser ? "active" : ""}`}
                          aria-label={issue.repostedByUser ? "Unrepost this issue" : "Repost this issue"}
                          title={issue.repostedByUser ? "Unrepost this issue" : "Repost this issue"}
                      >
                          <Repeat2 size={20} aria-hidden="true" />
                          <span>{issue.repostCount || 0}</span>
                      </button>

                      {/* Share */}
                      <button
                          onClick={() => handleShare(issue._id)}
                          className="vote-button share"
                          aria-label="Share this issue"
                          title="Share this issue"
                      >
                          <Share2 size={20} aria-hidden="true" />
                      </button>

                      <div className="comment-count" aria-label="Number of comments">
                          <MessageCircle size={18} aria-hidden="true" />{" "}
                          {issue.comments?.length || 0}
                      </div>
                  </div>

                  <p className="issue-description">{issue.description}</p>

                  {/* Progress Bar (Inline style retained) */}
                  <div
                      className="progress-bar-container"
                      style={{
                          "--upvote-width": `${upvotePercent}%`,
                          "--downvote-width": `${downvotePercent}%`,
                      } as React.CSSProperties}
                  >
                      <div className="progress-bar-fill upvote-fill"></div>
                      <div className="progress-bar-fill downvote-fill"></div>
                  </div>

                  {issue.emailSent && (
                      <div
                          className="reported-message"
                          aria-label="Reported to authorities"
                      >
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
                                                  : "Unknown"}
                                          </strong>
                                          <span className="comment-date">
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

                      {/* Add Comment Input */}
                      <div className="comment-input-area">
                          <label
                              htmlFor={`comment-${issue._id}`}
                              className="sr-only"
                          >
                              Add a comment
                          </label>
                          <textarea
                              id={`comment-${issue._id}`}
                              value={commentTexts[issue._id] || ""}
                              onChange={(e) =>
                                  handleCommentChange(issue._id, e.target.value)
                              }
                              placeholder={isAuthenticated ? "Add a comment..." : "Login to comment..."}
                              rows={2}
                              title="Add a comment"
                              disabled={!isAuthenticated}
                          />

                          <button
                              onClick={() => handleSubmitComment(issue._id)}
                              aria-label="Submit comment"
                              title="Submit comment"
                              disabled={!isAuthenticated || !commentTexts[issue._id]?.trim()}
                          >
                              Submit
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  };
  
  return (
    <div className="home-container">
      <h1 className="home-title">Community Issues</h1>

      <div className="filter-controls">

        {/* Category Filter */}
        <label htmlFor="filter-category" className="sr-only">
          Filter by category
        </label>
        <select
          id="filter-category"
          value={filters.category}
          onChange={(e) =>
            setFilters({ ...filters, category: e.target.value })
          }
          title="Filter by category"
          className="filter-select"
        >
          <option value="">All Categories</option>
          {/* 🟢 FIX: Correctly mapping the local categories array */}
          {categories.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        {/* Location Filter */}
        <label htmlFor="filter-location" className="sr-only">
          Filter by location
        </label>
        <input
          id="filter-location"
          type="text"
          value={filters.location}
          onChange={(e) =>
            setFilters({ ...filters, location: e.target.value })
          }
          placeholder="Filter by location"
          title="Filter by location"
          className="filter-input"
        />
      </div>
        
      {/* Fallback for no issues after loading */}
      {!isLoading && issues.length === 0 && (
          <div className="text-center py-10 text-gray-500">
              <p>No issues found matching your criteria.</p>
              <p className="text-sm mt-1">Try clearing the filters or check back later!</p>
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
        loader={issues.length > 0 ? <h4 className="text-center py-4">Loading more issues...</h4> : null}
        endMessage={<p className="text-center py-4 text-gray-600">You've reached the end of the issues feed.</p>}
      >
        {issues.map(renderIssueCard)}
      </InfiniteScroll>
    </div>
  );
}