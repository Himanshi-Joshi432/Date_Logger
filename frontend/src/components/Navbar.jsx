import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, LogOut } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand */}
        <NavLink to="/" className="brand-logo">
          <span className="brand-icon">
            <Heart size={20} fill="#e11d48" color="#e11d48" />
          </span>
          <span className="brand-name">Date Logger</span>
        </NavLink>

        {/* User Avatar & Minimal Logout Button */}
        <div className="nav-user-section">
          {user && (
            <div
              className="nav-user-avatar"
              title={`Logged in as ${user.email}`}
              aria-label={`Logged in as ${user.email}`}
            >
              <span className="user-initial">{userInitial}</span>
            </div>
          )}
          <button
            type="button"
            className="nav-logout-btn"
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={17} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </header>
  );
}
