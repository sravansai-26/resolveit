// src/pages/Home.tsx
import { useState, useEffect, useCallback, ReactNode } from "react";
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

// 🟢 NEW: Import the centralized AuthContext
import { useAuth } from '../context/AuthContext'; 

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
    // 🟢 CRITICAL FIX: Get state from context (Single Source of Truth)
    const { isAuthenticated, loading, user } = useAuth();
    
    // Derived state for the current authenticated user's ID
    const currentUserId = user?._id || null;
    
    const [issues, setIssues] = useState<Issue[]>([]);
    // 🟢 FIX: Renamed isLoading to isLoadingIssues to avoid conflict with context 'loading'
    const [isLoadingIssues, setIsLoadingIssues] = useState(true); 
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({ category: "", location: "" });
    const [userVotes, setUserVotes] = useState<Record<string, VoteStatus>>({});
    const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
    
    // ❌ REMOVED: isAuthenticated state, currentUserId state, getToken, getCurrentUserId
    // The previous manual authentication states are now replaced by the useAuth() hook.

    // Unified token getter (reads from browser storage directly)
    const getToken = useCallback(() => 
        localStorage.getItem("token") || sessionStorage.getItem("token") || "", 
    [],);


    // ============================================
    // Fetch Issues (Now relies ONLY on context state)
    // ============================================
    const fetchIssues = useCallback(async (pageNumber = 1, reset = false) => {
        const token = getToken();
        
        // 🟢 FIX: Do not fetch issues if the user is not authenticated or context is loading.
        if (!isAuthenticated || !token) {
             setIsLoadingIssues(false);
             setIssues([]);
             return;
        }
        
        setIsLoadingIssues(true);
        
        try {
            const url = new URL(`${API_BASE_URL}/api/issues`); 
            url.searchParams.append("page", pageNumber.toString());
            url.searchParams.append("limit", "5");

            if (filters.category) url.searchParams.append("category", filters.category);
            if (filters.location) url.searchParams.append("location", filters.location);

            const headers = { Authorization: `Bearer ${token}` };

            const res = await fetch(url.toString(), {
                headers,
            });

            const json = await res.json();

            if (!res.ok || !json.success || !Array.isArray(json.data)) {
                // If API returns 401/403, the context should handle logout.
                throw new Error(json.message || "Failed to fetch issues");
            }

            const issuesData = json.data as Issue[];
            const initialUserVotes: Record<string, VoteStatus> = {};
            const userId = currentUserId; // Use ID from context

            const issuesWithFlags = issuesData.map((issue) => {
                const userHasVoted = issue.votes?.find(
                    (vote) => userId && vote.user === userId
                );
                
                if (userHasVoted) {
                    initialUserVotes[issue._id] = userHasVoted.isUpvote ? "upvote" : "downvote";
                } else {
                    initialUserVotes[issue._id] = null;
                }

                return {
                    ...issue,
                    repostedByUser: issue.repostedBy?.includes(userId as string),
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
            setIsLoadingIssues(false);
        }
    }, [isAuthenticated, currentUserId, filters]); // Dependencies now reflect context state


    // ============================================
    // Initial Load & Filter Effects
    // ============================================
    useEffect(() => {
        // 🟢 FIX 1: Only run when context loading is finished and authentication status is known.
        if (!loading) {
            if (isAuthenticated) {
                 // Trigger the initial issue fetch
                 fetchIssues(1, true);
            } else {
                 // If not authenticated, ensure issues are cleared and loading stops
                 setIsLoadingIssues(false);
                 setIssues([]);
            }
        }
    }, [isAuthenticated, loading, fetchIssues]); // Depend on central auth status and loading

    useEffect(() => {
        // Only run filter re-fetch if we are logged in and filters change
        if (isAuthenticated) { 
            setPage(1);
            setHasMore(true);
            fetchIssues(1, true);
        }
    }, [filters]); // Filter trigger remains

    // ============================================
    // Voting, Repost, Comment Handlers (CRITICAL: Removed logic that was causing conflicts)
    // ============================================
    
    // ... (handleVote remains unchanged in logic, but now relies on context isAuthenticated)
    const handleVote = async (issueId: string, isUpvote: boolean) => {
        if (!isAuthenticated) return alert("Please log in to vote.");
        // ... rest of handleVote logic
        
        const currentVote = userVotes[issueId] ?? null;
        const newVote: VoteStatus = isUpvote ? "upvote" : "downvote";
        
        const token = getToken();
        if (!token) return; 
        
        // Optimistic UI Update (Update state instantly)
        setIssues(prevIssues => prevIssues.map(issue => {
            if (issue._id === issueId) {
                let { upvotes, downvotes } = issue;
                
                if (currentVote === newVote) {
                    if (newVote === "upvote") upvotes--; else downvotes--;
                    setUserVotes(prev => ({ ...prev, [issueId]: null }));
                    return { ...issue, upvotes, downvotes };
                } else {
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

    // ... (handleRepost remains unchanged)
    const handleRepost = async (issue: Issue) => {
        if (!isAuthenticated) return alert("Please log in to repost.");
        const token = getToken();
        if (!token) return;

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
    
    // ... (handleSubmitComment remains unchanged)
    const handleSubmitComment = async (issueId: string) => {
        if (!isAuthenticated) return alert("Please log in to comment.");
        const text = commentTexts[issueId]?.trim();
        if (!text) return;
        
        const token = getToken();
        if (!token) return;

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

    // ... (handleCommentChange, handleShare, formatDateTime remain unchanged)
    const handleCommentChange = (issueId: string, text: string) => {
        setCommentTexts((prev) => ({ ...prev, [issueId]: text }));
    };

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
    // RENDER (Final Rendering Logic)
    // ============================================
    
    // 🟢 FIX 1: Use the central 'loading' state while context is verifying token
    if (loading) {
        return <div className="text-center py-10">
            <h4 className="text-xl font-medium">Loading User Session...</h4>
            <div className="animate-spin inline-block h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mt-4"></div>
        </div>;
    }
    
    // 🟢 FIX 2: Show Login/Register prompt if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="home-container">
                <div className="text-center py-20 bg-white rounded-lg shadow-md mx-auto max-w-xl border border-gray-200">
                    <h2 className="text-3xl font-extrabold text-blue-600 mb-4">Join the Conversation!</h2>
                    <p className="text-gray-600 mb-8 px-4">
                        Please **log in or register** to view community issues and participate in resolving local problems.
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
    
  function renderIssueCard(value: Issue, index: number, array: Issue[]): ReactNode {
    throw new Error("Function not implemented.");
  }

    // If authenticated, render the full application UI
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
                    disabled={isLoadingIssues} 
                >
                    <option value="">All Categories</option>
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
                    disabled={isLoadingIssues} 
                />
            </div>
            
            {/* Conditional Issue Rendering */}
            {isLoadingIssues && issues.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Fetching issues...</div>
            ) : !isLoadingIssues && issues.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    <p>No issues found matching your criteria.</p>
                </div>
            ) : (
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
            )}
        </div>
    );
}