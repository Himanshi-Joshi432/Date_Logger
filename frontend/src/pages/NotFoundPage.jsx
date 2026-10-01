import { Link } from "react-router-dom";
import { Heart, Home } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="not-found-container">
      <div className="not-found-card">
        <div className="auth-brand-badge" style={{ margin: "0 auto 16px" }}>
          <Heart size={32} fill="#db2777" color="#db2777" />
        </div>
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Page Not Found</h2>
        <p className="not-found-desc">
          The page or memory you are looking for does not exist or has moved.
        </p>
        <Link
          to="/"
          className="btn-primary-action"
          style={{ display: "inline-flex", marginTop: "20px" }}
        >
          <Home size={18} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
