import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PlusCircle, History, ArrowRight } from "lucide-react";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="dashboard-minimal">
      {/* Greeting Header */}
      <div className="minimal-header">
        <h1 className="minimal-title">Hello there!</h1>
        <p className="minimal-user-text">
          Logged in as <span>{user?.email || "User"}</span>
        </p>
      </div>

      {/* Two Big Action Buttons Filling Remaining Screen */}
      <div className="big-actions-container">
        {/* Button 1: Log Date */}
        <Link to="/log" className="big-action-card big-action-primary">
          <div className="big-action-content">
            <div className="big-action-icon-circle">
              <PlusCircle size={38} color="#ffffff" strokeWidth={2.2} />
            </div>
            <div className="big-action-text-wrap">
              <h2 className="big-action-title">Log Date</h2>
              <p className="big-action-desc">Record a new memory, venue & photo</p>
            </div>
          </div>
          <div className="big-action-arrow">
            <ArrowRight size={24} color="#ffffff" />
          </div>
        </Link>

        {/* Button 2: Check History */}
        <Link to="/history" className="big-action-card big-action-secondary">
          <div className="big-action-content">
            <div className="big-action-icon-circle secondary-icon">
              <History size={38} color="#e11d48" strokeWidth={2.2} />
            </div>
            <div className="big-action-text-wrap">
              <h2 className="big-action-title">Check History</h2>
              <p className="big-action-desc">Browse & relive all your past dates</p>
            </div>
          </div>
          <div className="big-action-arrow secondary-arrow">
            <ArrowRight size={24} color="#e11d48" />
          </div>
        </Link>
      </div>
    </div>
  );
}
