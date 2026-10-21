import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postAPI } from "../services/api";
import {
  Calendar,
  MapPin,
  Trash2,
  Search,
  Plus,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  History as HistoryIcon,
  Music,
  Disc,
} from "lucide-react";

export function HistoryPage() {
  const { token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);
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

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDelete = async (e, id, venueName) => {
    e.stopPropagation(); // prevent collapsing/expanding when clicking delete

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
      if (expandedId === id) setExpandedId(null);
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
      {/* Decorative Scrapbook Elements from Image 2 */}
      <div className="history-vintage-paperclip" aria-hidden="true">
        <div className="silver-clip-wire"></div>
      </div>
      <div className="history-vintage-lotus" aria-hidden="true"></div>

      {/* Top Header Row */}
      <div className="history-top-bar">
        <Link to="/" className="corner-icon-btn" aria-label="Back to dashboard">
          <ArrowLeft size={20} />
        </Link>
        <Link to="/log" className="corner-icon-btn corner-icon-primary" aria-label="Log a new date">
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

      {/* Logs List - Staggered Left & Right matching Image 3 wireframe! */}
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
            const isExpanded = expandedId === post._id;
            const isStaggerRight = index % 2 === 0; // index 0, 2, 4 right, index 1, 3 left (matching Image 3 wireframe)

            return (
              <div
                key={post._id}
                className={`log-item-card ${isStaggerRight ? "stagger-right" : "stagger-left"} ${isExpanded ? "is-expanded" : ""}`}
                onClick={() => toggleExpand(post._id)}
              >
                {/* Collapsed / Header Summary View */}
                <div className="log-item-summary">
                  {/* Photo Thumbnail */}
                  <div className="log-thumbnail-wrap">
                    {post.image ? (
                      <img
                        src={post.image}
                        alt={post.venue || "Date thumbnail"}
                        className="log-thumbnail"
                        loading="lazy"
                      />
                    ) : (
                      <div className="log-no-thumbnail">No photo</div>
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
                        <div className="log-soundtrack-tag" title="Includes soundtrack">
                          <Music size={11} />
                          <span>Soundtrack</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expand Chevron */}
                  <div className="log-expand-icon" aria-label="Toggle details">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Expanded Details View */}
                {isExpanded && (
                  <div
                    className="log-expanded-details"
                    onClick={(e) => e.stopPropagation()} // let clicks inside work
                  >
                    {/* Full Photo */}
                    {post.image && (
                      <div className="log-full-photo-wrap">
                        <img
                          src={post.image}
                          alt={post.venue || "Full date photo"}
                          className="log-full-photo"
                        />
                      </div>
                    )}

                    {/* Venue & Full Date */}
                    <div className="log-detail-meta">
                      <div className="log-detail-row">
                        <MapPin size={16} color="#8d3d2f" />
                        <span className="log-detail-venue">
                          {post.venue || "Unnamed Venue"}
                        </span>
                      </div>
                      <div className="log-detail-row">
                        <Calendar size={16} color="#8d3d2f" />
                        <span className="log-detail-date">
                          {post.date
                            ? new Date(post.date).toLocaleDateString(undefined, {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Undated"}
                        </span>
                      </div>
                    </div>

                    {/* Full Description */}
                    {post.description && (
                      <div className="log-detail-notes">
                        <div className="notes-header">
                          <FileText size={14} color="#8d3d2f" />
                          <span>Notes & Description</span>
                        </div>
                        <p className="notes-text">{post.description}</p>
                      </div>
                    )}

                    {/* Memory Soundtrack Player (if post has music) */}
                    {post.music?.audioUrl && (
                      <div className="log-detail-soundtrack">
                        <div className="soundtrack-header">
                          <Disc size={15} color="#8d3d2f" />
                          <span>Date Soundtrack</span>
                        </div>
                        <audio
                          controls
                          src={post.music.audioUrl}
                          className="scrapbook-audio-player"
                          preload="metadata"
                        />
                      </div>
                    )}

                    {/* Card Footer: Author & Delete */}
                    <div className="log-detail-footer">
                      <span className="log-detail-author">
                        Preserved by {post.createdBy?.email || "You"}
                      </span>
                      <button
                        type="button"
                        className="curvey-delete-btn"
                        onClick={(e) => handleDelete(e, post._id, post.venue)}
                        disabled={deletingId === post._id}
                      >
                        <Trash2 size={14} />
                        <span>
                          {deletingId === post._id ? "Deleting..." : "Delete Log"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
