import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PlusCircle, History, ArrowRight, Heart } from "lucide-react";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="dashboard-minimal dashboard-scrapbook">
      {/* Scrapbook Deckle Journal Card */}
      <div className="scrapbook-main-card">
        {/* Paperclip decoration from Image 1 */}
        <div className="scrapbook-clip-decoration" aria-hidden="true">
          <div className="paperclip-shape"></div>
        </div>

        {/* Washi tape decoration */}
        <div className="scrapbook-tape-decoration" aria-hidden="true"></div>

        {/* Greeting Header */}
        <div className="minimal-header">
          <div className="scrapbook-wax-badge">
            <Heart size={20} fill="#8d3d2f" color="#8d3d2f" />
          </div>
          <h1 className="minimal-title">Our Date Journal</h1>
          <p className="minimal-user-text">
            Preserving memories for <span>{user?.email || "User"}</span>
          </p>
        </div>

        {/* Two Big Action Buttons */}
        <div className="big-actions-container">
          {/* Button 1: Log Date */}
          <Link to="/log" className="big-action-card big-action-primary">
            <div className="big-action-content">
              <div className="big-action-icon-circle">
                <PlusCircle size={36} color="#ffffff" strokeWidth={2.2} />
              </div>
              <div className="big-action-text-wrap">
                <h2 className="big-action-title">Log Date</h2>
                <p className="big-action-desc">Record a new memory, venue & photo</p>
              </div>
            </div>
            <div className="big-action-arrow">
              <ArrowRight size={22} color="#ffffff" />
            </div>
          </Link>

          {/* Button 2: Check History */}
          <Link to="/history" className="big-action-card big-action-secondary">
            <div className="big-action-content">
              <div className="big-action-icon-circle secondary-icon">
                <History size={36} color="#8d3d2f" strokeWidth={2.2} />
              </div>
              <div className="big-action-text-wrap">
                <h2 className="big-action-title">Check History</h2>
                <p className="big-action-desc">Browse & relive all your past dates</p>
              </div>
            </div>
            <div className="big-action-arrow secondary-arrow">
              <ArrowRight size={22} color="#8d3d2f" />
            </div>
          </Link>
        </div>

        {/* Torn Note Quote from Image 1 */}
        <div className="scrapbook-quote-scrap">
          <p className="scrapbook-quote-text">there is beauty in small things.</p>
          <span className="scrapbook-quote-heart">♡</span>
        </div>
      </div>
    </div>
  );
}
