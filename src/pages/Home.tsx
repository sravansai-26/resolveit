// Home.tsx
import { useState, useEffect } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import {
  ThumbsUp,
  ThumbsDown,
  MapPin,
  Repeat2,
  MessageCircle,
  Share2,
} from "lucide-react";
import "/src/home.css"; // Ensure this path is correct

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
  _id: string; // Add _id for key prop
  text: string;
  user: User; // Assuming user object is populated
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

export function Home() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ category: "", location: "" });
  // userVotes state should reflect the actual vote of the current user
  const [userVotes, setUserVotes] = useState<Record<string, "upvote" | "downvote" | null>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({}); // Renamed to avoid confusion with issue.comments
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // State to store current user ID

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    setIsAuthenticated(Boolean(token));
    if (token) {
      getCurrentUserId(token).then(id => setCurrentUserId(id));
    } else {
      setCurrentUserId(null);
    }
    fetchIssues(1, true);
  }, []);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchIssues(1, true);
  }, [filters]);

  const fetchIssues = async (pageNumber = 1, reset = false) => {
    setIsLoading(true); // Set loading true at the start of fetch
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
      const url = new URL("http://localhost:5000/api/issues");
      url.searchParams.append("page", pageNumber.toString());
      url.searchParams.append("limit", "5");
      if (filters.category) url.searchParams.append("category", filters.category);
      if (filters.location) url.searchParams.append("location", filters.location);

      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const json = await res.json();

      if (!res.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(json.message || "Failed to fetch issues");
      }

      const issuesData = json.data;
      const loadedCurrentUserId = currentUserId || await getCurrentUserId(token); // Ensure currentUserId is available

      const initialUserVotes: Record<string, "upvote" | "downvote" | null> = {};
      const issuesWithFlags = issuesData.map((issue: Issue) => {
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
          repostedByUser: issue.repostedBy?.includes(loadedCurrentUserId),
        };
      });

      setUserVotes((prev) => ({ ...prev, ...initialUserVotes })); // Update userVotes state
      
      if (issuesWithFlags.length < 5) setHasMore(false);

      setIssues((prev) => (reset ? issuesWithFlags : [...prev, ...issuesWithFlags]));
    } catch (err) {
      console.error("Error loading issues:", err);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentUserId = async (token: string) => {
    if (!token) return null;
    try {
      const res = await fetch("http://localhost:5000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return res.ok ? json.user._id : null;
    } catch {
      return null;
    }
  };

  const handleVote = async (issueId: string, isUpvote: boolean) => {
    if (!isAuthenticated) return alert("Please log in to vote.");
    const currentVote = userVotes[issueId] ?? null;
    const newVote = isUpvote ? "upvote" : "downvote";
    if (currentVote === newVote) return;

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
      const res = await fetch(`http://localhost:5000/api/issues/${issueId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isUpvote }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Vote failed");

      setIssues((prev) =>
        prev.map((issue) => (issue._id === issueId ? json.data : issue))
      );
      setUserVotes((prev) => ({ ...prev, [issueId]: newVote }));
    } catch (err) {
      alert("Error voting.");
      console.error(err);
    }
  };

  const handleRepost = async (issue: Issue) => {
    if (!isAuthenticated) return alert("Please log in to repost.");
    // Remove the local check, rely on backend and update from its response
    // if (issue.repostedByUser) return alert("You already reposted this issue.");

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
      const res = await fetch(`http://localhost:5000/api/issues/${issue._id}/repost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error("Repost failed");

      setIssues((prev) =>
        prev.map((i) =>
          i._id === issue._id
            ? {
                ...i,
                repostCount: json.data.repostCount, // Ensure backend returns this
                repostedByUser: json.data.repostedByUser, // Ensure backend returns this
              }
            : i
        )
      );
    } catch (err) {
      console.error("Repost error:", err);
    }
  };

  const handleCommentChange = (issueId: string, text: string) => {
    setCommentTexts((prev) => ({ ...prev, [issueId]: text }));
  };

  const handleSubmitComment = async (issueId: string) => {
    if (!isAuthenticated) return alert("Please log in to comment.");
    const text = commentTexts[issueId]?.trim();
    if (!text) return;

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
      const res = await fetch(`http://localhost:5000/api/issues/${issueId}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Comment failed");
      }

      // Backend should return the new comment object, e.g., json.comment
      setIssues((prev) =>
        prev.map((issue) =>
          issue._id === issueId
            ? { ...issue, comments: [...(issue.comments || []), json.comment] } // json.comment is the new comment from backend
            : issue
        )
      );
      setCommentTexts((prev) => ({ ...prev, [issueId]: "" })); // Clear the input field
    } catch (err) {
      console.error("Comment error:", err);
      alert("Error submitting comment. See console for details.");
    }
  };

  const handleShare = (issueId: string) => {
    const url = `${window.location.origin}/issues/${issueId}`;
    navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard!"));
  };

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="home-container">
      <h1 className="home-title">Community Issues</h1>

      <div className="filter-controls">
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          title="Filter by category"
        >
          <option value="">All Categories</option>
          <option value="Roads">Roads</option>
          <option value="Garbage">Garbage</option>
          <option value="Electricity">Electricity</option>
         {/* Add other categories if you have them in your backend */}
          <option value="Road Infrastructure">Road Infrastructure</option>
          <option value="Sanitation">Sanitation</option>
          <option value="Public Safety">Public Safety</option>
          <option value="Environmental">Environmental</option>
          <option value="Public Transport">Public Transport</option>
          <option value="Other">Other</option>
        </select>

        <input
          type="text"
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          placeholder="Filter by location"
          title="Filter by location"
        />
      </div>

      <InfiniteScroll
        dataLength={issues.length}
        next={() => {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchIssues(nextPage);
        }}
        hasMore={hasMore}
        loader={<h4>Loading more issues...</h4>}
        endMessage={<p>No more issues to load.</p>}
      >
        {issues.map((issue) => {
          const imageUrl = issue.media?.[0]
            ? `http://localhost:5000${issue.media[0]}`
            : "";
          const totalVotes = issue.upvotes + issue.downvotes;
          const upvotePercent = totalVotes > 0 ? (issue.upvotes / totalVotes) * 100 : 0;
          const downvotePercent = totalVotes > 0 ? (issue.downvotes / totalVotes) * 100 : 0;

          return (
            <div key={issue._id} className="issue-card">
              {imageUrl && (
                <img src={imageUrl} alt={issue.title} className="issue-image" />
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
                  <MapPin size={16} /> {issue.location}
                </div>

                <div className="issue-date">
                  <small>Posted on: {formatDateTime(issue.createdAt)}</small>
                </div>

                <span className="issue-category">{issue.category}</span>

                <div className="issue-votes">
                  <button
                    onClick={() => handleVote(issue._id, true)}
                    className={`vote-button upvote ${userVotes[issue._id] === "upvote" ? "active" : ""}`}
                    title="Upvote"
                  >
                    <ThumbsUp size={20} />
                    <span>{issue.upvotes}</span>
                  </button>

                  <button
                    onClick={() => handleVote(issue._id, false)}
                    className={`vote-button downvote ${userVotes[issue._id] === "downvote" ? "active" : ""}`}
                    title="Downvote"
                  >
                    <ThumbsDown size={20} />
                    <span>{issue.downvotes}</span>
                  </button>

                  <button
                    onClick={() => handleRepost(issue)}
                    className={`vote-button repost ${issue.repostedByUser ? "active" : ""}`}
                    title={issue.repostedByUser ? "Already reposted" : "Repost"}
                    disabled={issue.repostedByUser}
                  >
                    <Repeat2 size={20} />
                    <span>{issue.repostCount || 0}</span>
                  </button>

                  <button
                    onClick={() => handleShare(issue._id)}
                    className="vote-button share"
                    title="Share issue"
                  >
                    <Share2 size={20} />
                  </button>

                  <div className="comment-count">
                    <MessageCircle size={18} /> {issue.comments?.length || 0}
                  </div>
                </div>

                <p className="issue-description">{issue.description}</p> {/* Added class for styling */}

                {/* Dynamic Progress Bar */}
                <div
                  className="progress-bar-container" // New class for the outer container
                  style={{
                    "--upvote-width": `${upvotePercent}%`,
                    "--downvote-width": `${downvotePercent}%`,
                  } as React.CSSProperties}
                >
                  <div className="progress-bar-fill upvote-fill"></div>
                  <div className="progress-bar-fill downvote-fill"></div>
                </div>

                {issue.emailSent && (
                  <div className="reported-message">✓ Reported to authorities</div>
                )}

                <div className="comment-section">
                  <h3 className="comments-title">Comments ({issue.comments?.length || 0})</h3>
                  {issue.comments && issue.comments.length > 0 ? (
                    <div className="comments-list">
                      {issue.comments.map((comment) => (
                        <div key={comment._id} className="comment-item">
                          <p className="comment-author">
                            <strong>
                              {comment.user ? `${comment.user.firstName} ${comment.user.lastName}` : "Unknown"}
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

                  <div className="comment-input-area">
                    <textarea
                      value={commentTexts[issue._id] || ""}
                      onChange={(e) => handleCommentChange(issue._id, e.target.value)}
                      placeholder="Add a comment..."
                      title="Comment on this issue"
                      rows={2} // Make it slightly larger
                    />
                    <button
                      onClick={() => handleSubmitComment(issue._id)}
                      title="Submit comment"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </InfiniteScroll>
    </div>
  );
}