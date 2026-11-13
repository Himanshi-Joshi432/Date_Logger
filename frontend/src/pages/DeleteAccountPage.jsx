import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, Trash2, CheckCircle2 } from "lucide-react";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

/**
 * Public page for permanently deleting an account. It asks for the email and
 * password directly, so it works even for someone who is not signed in or no
 * longer has the mobile app installed.
 */
export function DeleteAccountPage() {
  const { user, endSession } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      const { token } = await authAPI.login(email.trim(), password);
      await authAPI.deleteAccount(password, token);
      endSession();
      setIsDone(true);
    } catch (err) {
      setErrorMsg(err.message || "Could not delete the account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <div className="auth-page-container">
        <div className="auth-card deckle-card">
          <div className="auth-header">
            <div className="auth-brand-badge">
              <CheckCircle2 size={26} color="#376342" />
            </div>
            <h1 className="auth-title">Account deleted</h1>
            <p className="auth-subtitle">
              Your account, date logs, photos and bucket list have been permanently
              removed. Thank you for using Date Logger.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card deckle-card">
        <div className="auth-header">
          <div className="auth-brand-badge">
            <Trash2 size={24} color="#9c2e24" />
          </div>
          <h1 className="auth-title">Delete your account</h1>
          <p className="auth-subtitle">
            This permanently deletes your Date Logger account, all your date logs, their
            photos and audio, and your bucket list. It cannot be undone.
          </p>
        </div>

        {errorMsg && (
          <div className="alert-box alert-error" role="alert">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="delete-email">Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="delete-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="delete-password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="delete-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password to confirm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-input"
              />
            </div>
          </div>

          <label
            style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "0.9rem" }}
          >
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{ marginTop: "3px" }}
            />
            <span>I understand my memories will be permanently deleted.</span>
          </label>

          <button
            type="submit"
            className="btn-submit"
            style={{ background: "#9c2e24" }}
            disabled={isSubmitting || !email || !password || !confirmed}
          >
            <Trash2 size={18} />
            <span>{isSubmitting ? "Deleting..." : "Delete my account"}</span>
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Changed your mind?{" "}
            <Link to="/" className="auth-link">
              Back to Date Logger
            </Link>
            {" · "}
            <Link to="/privacy" className="auth-link">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
