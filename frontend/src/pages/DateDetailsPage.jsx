import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postAPI } from "../services/api";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Disc,
  AlertCircle,
  Clock,
  Sparkles,
  Share2,
} from "lucide-react";

export function DateDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [touchStart, setTouchStart] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMsg("");

    postAPI
      .getPostById(id, token)
      .then((data) => {
        if (isMounted) {
          setPost(data.post);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMsg(err.message || "Failed to load date log details.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, token]);

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete the memory for "${post?.venue || "this date"}"?`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await postAPI.deletePost(id, token);
      navigate("/history", { replace: true });
    } catch (err) {
      alert(err.message || "Failed to delete date log");
      setIsDeleting(false);
    }
  };

  // Carousel helpers
  const images = post?.images?.length
    ? post.images
    : post?.image
    ? [post.image]
    : [];

  const handlePrev = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    setTouchStart(null);
  };

  if (isLoading) {
    return (
      <div className="curvey-page-container history-scrapbook-canvas">
        <div className="history-top-bar">
          <button
            type="button"
            className="corner-icon-btn"
            onClick={() => navigate("/history")}
            aria-label="Back to history"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="curvey-loading" style={{ marginTop: "60px" }}>
          <div className="loading-spinner"></div>
          <span>Unrolling date memory details...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !post) {
    return (
      <div className="curvey-page-container history-scrapbook-canvas">
        <div className="history-top-bar">
          <button
            type="button"
            className="corner-icon-btn"
            onClick={() => navigate("/history")}
            aria-label="Back to history"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="curvey-empty-state" style={{ marginTop: "40px" }}>
          <div className="empty-circle">
            <AlertCircle size={30} color="#8d3d2f" />
          </div>
          <h3>Memory Not Found</h3>
          <p>{errorMsg || "The requested date log could not be found or has been deleted."}</p>
          <Link
            to="/history"
            className="curvey-btn-submit"
            style={{ marginTop: "16px", textDecoration: "none" }}
          >
            <ArrowLeft size={18} />
            <span>Back to Date History</span>
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = post.date
    ? new Date(post.date).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Undated Memory";

  return (
    <div className="curvey-page-container history-scrapbook-canvas date-details-page-container">
      {/* Vintage Scrapbook Decor */}
      <div className="history-vintage-paperclip" aria-hidden="true">
        <div className="silver-clip-wire"></div>
      </div>

      {/* Top Header Row */}
      <div className="history-top-bar details-top-bar">
        <button
          type="button"
          className="corner-icon-btn"
          onClick={() => navigate("/history")}
          aria-label="Back to date history"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="details-header-title">Date Memory</span>
        <button
          type="button"
          className="corner-icon-btn details-delete-icon-btn"
          onClick={handleDelete}
          disabled={isDeleting}
          title="Delete this date memory"
          aria-label="Delete this memory"
        >
          <Trash2 size={18} color="#9c2e24" />
        </button>
      </div>

      {/* Full Page Details Card */}
      <article className="details-card-scrapbook">
        {/* 1. CAROUSEL OF MULTIPLE PHOTOS */}
        <section className="details-carousel-section" aria-label="Photo gallery">
          {images.length > 0 ? (
            <div
              className="carousel-main-container"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Active Image with Polaroid effect */}
              <div className="carousel-polaroid-frame">
                <img
                  src={images[currentImageIndex]}
                  alt={`${post.venue || "Date memory"} - Photo ${currentImageIndex + 1}`}
                  className="carousel-active-image"
                />

                {/* Photo Counter Pill */}
                {images.length > 1 && (
                  <div className="carousel-counter-badge">
                    <span>
                      {currentImageIndex + 1} / {images.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Navigation arrows (shown when > 1 image) */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="carousel-nav-btn carousel-prev-btn"
                    onClick={handlePrev}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    type="button"
                    className="carousel-nav-btn carousel-next-btn"
                    onClick={handleNext}
                    aria-label="Next photo"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}

              {/* Dot Indicators */}
              {images.length > 1 && (
                <div className="carousel-dots-row">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`carousel-dot ${
                        idx === currentImageIndex ? "is-active" : ""
                      }`}
                      onClick={() => setCurrentImageIndex(idx)}
                      aria-label={`Go to photo ${idx + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Mini Thumbnails Strip */}
              {images.length > 1 && (
                <div className="carousel-thumbnails-strip">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`carousel-thumb-btn ${
                        idx === currentImageIndex ? "is-active" : ""
                      }`}
                      onClick={() => setCurrentImageIndex(idx)}
                      aria-label={`Select photo ${idx + 1}`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Thumbnail ${idx + 1}`}
                        className="carousel-thumb-img"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="carousel-empty-photo">
              <Sparkles size={24} color="#8d3d2f" />
              <span>No photos attached to this memory</span>
            </div>
          )}
        </section>

        {/* 2. TITLE (VENUE) */}
        <header className="details-title-section">
          <div className="details-venue-row">
            <MapPin size={22} className="details-venue-pin" />
            <h1 className="details-venue-heading">
              {post.venue || "Unnamed Venue"}
            </h1>
          </div>
        </header>

        {/* 3. DATE */}
        <section className="details-date-section">
          <div className="details-date-badge">
            <Calendar size={16} />
            <span className="details-date-text">{formattedDate}</span>
          </div>
        </section>

        {/* 4. DESCRIPTION */}
        <section className="details-description-section">
          <div className="details-notes-label">
            <FileText size={16} />
            <span>Journal Notes & Memories</span>
          </div>
          <div className="details-notes-content">
            {post.description ? (
              <p className="details-notes-paragraph">{post.description}</p>
            ) : (
              <p className="details-notes-empty">
                No description was recorded for this special day.
              </p>
            )}
          </div>
        </section>

        {/* Soundtrack Player (if available) */}
        {post.music?.audioUrl && (
          <section className="details-soundtrack-section">
            <div className="soundtrack-header">
              <Disc size={18} color="#8d3d2f" />
              <span>Date Soundtrack</span>
            </div>
            <audio
              controls
              src={post.music.audioUrl}
              className="scrapbook-audio-player details-audio-player"
              preload="metadata"
            />
          </section>
        )}

        {/* Footer info & Delete Action */}
        <footer className="details-footer-section">
          <div className="details-author-tag">
            Preserved by {post.createdBy?.email || "You"}
          </div>
          <button
            type="button"
            className="curvey-delete-btn"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 size={15} />
            <span>{isDeleting ? "Deleting..." : "Delete Memory"}</span>
          </button>
        </footer>
      </article>
    </div>
  );
}

