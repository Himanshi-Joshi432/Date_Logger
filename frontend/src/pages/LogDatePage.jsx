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
} from "lucide-react";

export function LogDatePage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [venue, setVenue] = useState("");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Please select an image file (JPEG, PNG, etc.)");
        return;
      }
      setErrorMsg("");
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
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

    if (!imageFile) {
      setErrorMsg("Please upload a photo for this date.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("venue", venue.trim());
    formData.append("date", date);
    formData.append("description", description.trim());
    formData.append("image", imageFile);

    try {
      await postAPI.createPost(formData, token);
      setSuccessMsg("Date memory saved successfully!");
      setVenue("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      handleRemoveImage();
    } catch (err) {
      setErrorMsg(err.message || "Failed to save date. Check your network.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="curvey-page-container">
      {/* Top Bar Navigation */}
      <div className="curvey-nav-row">
        <Link to="/" className="corner-icon-btn" aria-label="Back to dashboard">
          <ArrowLeft size={20} />
        </Link>
      </div>

      <div className="curvey-card">
        <div className="curvey-card-header">
          <div className="curvey-icon-badge">
            <Sparkles size={20} color="#e11d48" />
          </div>
          <h1 className="curvey-title">Log a New Date</h1>
          <p className="curvey-subtitle">
            Record your special memories and place
          </p>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="curvey-alert curvey-alert-error" role="alert">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="curvey-alert curvey-alert-success" role="alert">
            <CheckCircle2 size={18} />
            <div style={{ flex: 1 }}>
              <span>{successMsg}</span>
              <div style={{ marginTop: "6px" }}>
                <button
                  type="button"
                  className="curvey-alert-link"
                  onClick={() => navigate("/history")}
                >
                  View in History &rarr;
                </button>
              </div>
            </div>
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

          {/* Photo Dropzone */}
          <div className="curvey-form-group">
            <label htmlFor="log-photo">Date Photo</label>
            {!imagePreview ? (
              <label className="curvey-dropzone" htmlFor="log-photo">
                <div className="dropzone-circle">
                  <UploadCloud size={28} color="#e11d48" />
                </div>
                <span className="curvey-dropzone-title">Upload a Photo</span>
                <span className="curvey-dropzone-hint">
                  Tap to choose from gallery
                </span>
                <input
                  id="log-photo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="file-hidden-input"
                  required
                />
              </label>
            ) : (
              <div className="curvey-preview-card">
                <img
                  src={imagePreview}
                  alt="Selected preview"
                  className="curvey-preview-img"
                />
                <button
                  type="button"
                  className="curvey-preview-remove"
                  onClick={handleRemoveImage}
                  title="Remove photo"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="curvey-btn-submit"
            disabled={isSubmitting || !venue || !date || !imageFile}
          >
            {isSubmitting ? "Saving & Uploading..." : "Save Date Log"}
          </button>
        </form>
      </div>
    </div>
  );
}
