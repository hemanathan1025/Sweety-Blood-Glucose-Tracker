
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Navbar.css';

// Turn a name into initials for the small mobile profile shortcut.
function getInitials(name, email) {
  const value = (name || email || '?').trim();
  const words = value.split(/\s+/).filter(Boolean);

  if (words.length > 1) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
}

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-inner">

        {/* Brand */}
        <NavLink
          className="brand-link"
          to="/dashboard"
          aria-label="Sweety dashboard"
        >
          <span className="brand-copy">
            Sweety
            <small>Glucose care</small>
          </span>
        </NavLink>

        {/* Navigation and account */}
        <div className="navbar-account">

          <nav className="navbar-links" aria-label="Main navigation">
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/profile">Profile</NavLink>
          </nav>

          {/* Mobile profile shortcut */}
          <NavLink
            className="navbar-mobile-profile"
            to="/profile"
            aria-label="Open profile"
          >
            {getInitials(
              user?.full_name || user?.name,
              user?.email
            )}
          </NavLink>

        </div>
      </div>
    </header>
  );
}
