import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postAPI } from "../services/api";
import {
  Calendar,
  Trash2,
  Search,
  Plus,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  X,
  History as HistoryIcon,
  Music,
  ExternalLink,
} from "lucide-react";

export function HistoryPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionMsg, setActionMsg] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    postAPI
      .getPosts(token)
      .then((data) => {
        if (isMounted) {
          setPosts(data.posts || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setActionMsg({
            type: "error",
            text: err.message || "Failed to load date history",
          });
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleDelete = async (e, id, venueName) => {
    e.stopPropagation(); // prevent navigation when clicking delete

    if (
      !window.confirm(
        `Are you sure you want to delete the log for "${venueName || "this date"}"?`
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      await postAPI.deletePost(id, token);
      setPosts((prev) => prev.filter((p) => p._id !== id));
      setActionMsg({
        type: "success",
        text: `Log for "${venueName || "venue"}" deleted.`,
      });
    } catch (err) {
      setActionMsg({
        type: "error",
        text: err.message || "Failed to delete date log",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Filter & sort newest first
  const filteredPosts = posts
    .filter((post) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const venue = (post.venue || "").toLowerCase();
      const desc = (post.description || "").toLowerCase();
      return venue.includes(term) || desc.includes(term);
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return (
    <div className="curvey-page-container history-scrapbook-canvas">
      {/* Decorative Scrapbook Elements */}
      <div className="history-vintage-paperclip" aria-hidden="true">
        <div className="silver-clip-wire"></div>
      </div>
      <div className="history-vintage-lotus" aria-hidden="true"></div>

      {/* Top Header Row */}
      <div className="history-top-bar">
        <Link to="/" className="corner-icon-btn" aria-label="Back to dashboard">
          <ArrowLeft size={20} />
        </Link>
        <Link
          to="/log"
          className="corner-icon-btn corner-icon-primary"
          aria-label="Log a new date"
        >
          <Plus size={22} />
        </Link>
      </div>

      <div className="history-heading-wrap">
        <h1 className="curvey-title">Date History</h1>
        <p className="curvey-subtitle">
          {posts.length} {posts.length === 1 ? "memory" : "memories"} preserved
        </p>
      </div>

      {/* Action Notification */}
      {actionMsg && (
        <div
          className={`curvey-alert ${
            actionMsg.type === "success"
              ? "curvey-alert-success"
              : "curvey-alert-error"
          }`}
          role="alert"
        >
          {actionMsg.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span style={{ flex: 1 }}>{actionMsg.text}</span>
          <button
            type="button"
            className="alert-dismiss"
            onClick={() => setActionMsg(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="curvey-search-bar">
        <Search size={18} className="curvey-search-icon" />
        <input
          type="search"
          placeholder="Search venues or memories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="curvey-search-input"
        />
        {searchTerm && (
          <button
            type="button"
            className="curvey-search-clear"
            onClick={() => setSearchTerm("")}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Logs List - Staggered Left & Right */}
      {isLoading ? (
        <div className="curvey-loading">
          <div className="loading-spinner"></div>
          <span>Unrolling date memories...</span>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="curvey-empty-state">
          <div className="empty-circle">
            <HistoryIcon size={30} color="#8d3d2f" />
          </div>
          <h3>{searchTerm ? "No matching dates" : "No date logs yet"}</h3>
          <p>
            {searchTerm
              ? `No memories found matching "${searchTerm}".`
              : "Start documenting your favorite moments together in this journal!"}
          </p>
          <Link
            to="/log"
            className="curvey-btn-submit"
            style={{ marginTop: "16px", textDecoration: "none" }}
          >
            <Plus size={18} />
            <span>Log Your First Date</span>
          </Link>
        </div>
      ) : (
        <div className="curvey-logs-list scrapbook-staggered-list">
          {filteredPosts.map((post, index) => {
            const isStaggerRight = index % 2 === 0;
            const thumbnail =
              (post.images && post.images.length > 0
                ? post.images[0]
                : post.image) || null;
            const photoCount =
              (post.images && post.images.length > 0
                ? post.images.length
                : post.image
                ? 1
                : 0);

            return (
              <div
                key={post._id}
                className={`log-item-card ${
                  isStaggerRight ? "stagger-right" : "stagger-left"
                }`}
                onClick={() => navigate(`/history/${post._id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigate(`/history/${post._id}`);
                  }
                }}
              >
                {/* Collapsed / Summary View */}
                <div className="log-item-summary">
                  {/* Photo Thumbnail */}
                  <div className="log-thumbnail-wrap">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={post.venue || "Date thumbnail"}
                        className="log-thumbnail"
                        loading="lazy"
                      />
                    ) : (
                      <div className="log-no-thumbnail">No photo</div>
                    )}
                    {photoCount > 1 && (
                      <span className="log-thumbnail-badge">
                        +{photoCount}
                      </span>
                    )}
                  </div>

                  {/* Summary Details */}
                  <div className="log-summary-content">
                    <div className="log-venue-title">
                      {post.venue || "Unnamed Venue"}
                    </div>
                    {post.description && (
                      <div className="log-desc-preview">{post.description}</div>
                    )}
                    <div className="log-tags-row">
                      <div className="log-date-tag">
                        <Calendar size={12} />
                        <span>
                          {post.date
                            ? new Date(post.date).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "No date"}
                        </span>
                      </div>
                      {post.music?.audioUrl && (
                        <div
                          className="log-soundtrack-tag"
                          title="Includes soundtrack"
                        >
                          <Music size={11} />
                          <span>Soundtrack</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Row: View Details Link & Quick Delete */}
                <div className="log-card-footer-row">
                  <Link
                    to={`/history/${post._id}`}
                    className="log-view-details-action"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>View Details</span>
                    <ArrowRight size={14} />
                  </Link>

                  <button
                    type="button"
                    className="log-card-quick-delete"
                    onClick={(e) => handleDelete(e, post._id, post.venue)}
                    disabled={deletingId === post._id}
                    title="Delete log"
                    aria-label="Delete log"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
