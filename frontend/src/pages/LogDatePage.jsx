import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postAPI } from "../services/api";
import {
  MapPin,
  Calendar,
  FileText,
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Music,
  Disc,
  Plus,
  Image as ImageIcon,
} from "lucide-react";

export function LogDatePage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [venue, setVenue] = useState("");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileName, setAudioFileName] = useState("");
  const [audioPreview, setAudioPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleFilesSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const validFiles = [];
    const validPreviews = [];

    for (const file of selectedFiles) {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Please select image files only (JPEG, PNG, WEBP, etc.)");
        return;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    setErrorMsg("");
    setImageFiles((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...validPreviews]);
    e.target.value = ""; // Reset input so same files can be re-selected if desired
  };

  const handleRemoveImage = (indexToRemove) => {
    if (imagePreviews[indexToRemove]) {
      URL.revokeObjectURL(imagePreviews[indexToRemove]);
    }
    setImageFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClearAllImages = () => {
    imagePreviews.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleAudioSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (
        !file.type.startsWith("audio/") &&
        !file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i)
      ) {
        setErrorMsg("Please select an audio file (MP3, M4A, WAV, etc.)");
        return;
      }
      setErrorMsg("");
      setAudioFile(file);
      setAudioFileName(file.name);
      setAudioPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveAudio = () => {
    setAudioFile(null);
    setAudioFileName("");
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview);
      setAudioPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!venue.trim()) {
      setErrorMsg("Please enter a venue or place name.");
      return;
    }

    if (!date) {
      setErrorMsg("Please select the date.");
      return;
    }

    if (imageFiles.length === 0) {
      setErrorMsg("Please upload at least one photo for this date.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("venue", venue.trim());
    formData.append("date", date);
    formData.append("description", description.trim());

    // Append multiple images
    imageFiles.forEach((file) => {
      formData.append("images", file);
    });
    // Also append the primary image for backwards compatibility
    if (imageFiles[0]) {
      formData.append("image", imageFiles[0]);
    }

    // Audio / Soundtrack is optional
    if (audioFile) {
      formData.append("audio", audioFile);
    }

    try {
      await postAPI.createPost(formData, token);
      setSuccessMsg("Date memory saved successfully!");
      setVenue("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      handleClearAllImages();
      handleRemoveAudio();
      setTimeout(() => {
        navigate("/history");
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || "Failed to save date. Check your network.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="curvey-page-container">
      {/* Top Header Row */}
      <div className="history-top-bar" style={{ marginBottom: "16px" }}>
        <button
          type="button"
          className="corner-icon-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="curvey-card">
        {/* Header Icon & Title */}
        <div className="curvey-header">
          <div className="curvey-icon-badge">
            <Sparkles size={28} />
          </div>
          <h1 className="curvey-title">Log a New Date</h1>
          <p className="curvey-subtitle">
            Preserve multiple photos, notes, and music for your special memory
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="curvey-alert curvey-alert-error" role="alert">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="curvey-alert curvey-alert-success" role="status">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="curvey-form" noValidate>
          {/* Venue */}
          <div className="curvey-form-group">
            <label htmlFor="log-venue">Venue / Place</label>
            <div className="curvey-input-wrap">
              <MapPin size={18} className="curvey-input-icon" />
              <input
                id="log-venue"
                type="text"
                required
                placeholder="Where did you go? (e.g. Skyline Cafe)"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="curvey-input"
              />
            </div>
          </div>

          {/* Date */}
          <div className="curvey-form-group">
            <label htmlFor="log-date">Date</label>
            <div className="curvey-input-wrap">
              <Calendar size={18} className="curvey-input-icon" />
              <input
                id="log-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="curvey-input"
              />
            </div>
          </div>

          {/* Description */}
          <div className="curvey-form-group">
            <label htmlFor="log-desc">Description / Notes</label>
            <div className="curvey-input-wrap textarea-wrap">
              <FileText size={18} className="curvey-input-icon textarea-icon" />
              <textarea
                id="log-desc"
                rows={3}
                placeholder="What happened? Cute moments, food you loved, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="curvey-input curvey-textarea"
              />
            </div>
          </div>

          {/* Multiple Photos Dropzone */}
          <div className="curvey-form-group">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <label htmlFor="log-photos" style={{ marginBottom: 0 }}>
                Date Photos ({imageFiles.length})
              </label>
              {imageFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllImages}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-danger)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* If no images chosen yet, show full dropzone */}
            {imagePreviews.length === 0 ? (
              <label className="curvey-dropzone" htmlFor="log-photos">
                <div className="dropzone-circle">
                  <UploadCloud size={28} color="#8d3d2f" />
                </div>
                <span className="curvey-dropzone-title">Upload Photos</span>
                <span className="curvey-dropzone-hint">
                  Select one or multiple photos from gallery
                </span>
                <input
                  id="log-photos"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFilesSelect}
                  className="file-hidden-input"
                  required
                />
              </label>
            ) : (
              <div className="multi-photo-preview-grid">
                {imagePreviews.map((previewUrl, idx) => (
                  <div key={idx} className="multi-photo-thumb-wrap">
                    <img
                      src={previewUrl}
                      alt={`Selected preview ${idx + 1}`}
                      className="multi-photo-thumb-img"
                    />
                    <button
                      type="button"
                      className="multi-photo-remove-btn"
                      onClick={() => handleRemoveImage(idx)}
                      title="Remove this photo"
                      aria-label="Remove photo"
                    >
                      <X size={13} />
                    </button>
                    {idx === 0 && (
                      <span className="multi-photo-cover-badge">Cover</span>
                    )}
                  </div>
                ))}

                {/* Add more photos button */}
                <label className="multi-photo-add-more" htmlFor="log-photos-more">
                  <Plus size={20} color="#8d3d2f" />
                  <span>Add More</span>
                  <input
                    id="log-photos-more"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFilesSelect}
                    className="file-hidden-input"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Optional Audio / Soundtrack Upload */}
          <div className="curvey-form-group">
            <label htmlFor="log-audio">Date Soundtrack (Optional)</label>
            {!audioPreview ? (
              <label className="curvey-dropzone audio-dropzone" htmlFor="log-audio">
                <div className="dropzone-circle audio-circle">
                  <Music size={24} color="#8d3d2f" />
                </div>
                <span className="curvey-dropzone-title">Add Background Song</span>
                <span className="curvey-dropzone-hint">
                  Upload audio clip (MP3, M4A, etc.)
                </span>
                <input
                  id="log-audio"
                  type="file"
                  accept="audio/*,.mp3,.m4a,.wav"
                  onChange={handleAudioSelect}
                  className="file-hidden-input"
                />
              </label>
            ) : (
              <div className="curvey-audio-preview-card">
                <div className="audio-card-info">
                  <Disc size={20} color="#8d3d2f" className="spinning-disc-icon" />
                  <span className="audio-card-name" title={audioFileName}>
                    {audioFileName || "Attached soundtrack"}
                  </span>
                </div>
                <audio
                  controls
                  src={audioPreview}
                  className="scrapbook-audio-player mini-player"
                />
                <button
                  type="button"
                  className="curvey-preview-remove audio-remove-btn"
                  onClick={handleRemoveAudio}
                  aria-label="Remove soundtrack"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="curvey-btn-submit"
          >
            {isSubmitting ? (
              <>
                <div className="btn-spinner"></div>
                <span>Saving Memory...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Save Date Memory</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
