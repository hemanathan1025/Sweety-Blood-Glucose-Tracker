import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Toast from '../components/Toast.jsx';
import { authApi, glucoseApi } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate } from '../date.js';
import './Profile.css';

function getInitials(name, email) {
  const value = (name || email || '?').trim();
  const words = value.split(/\s+/).filter(Boolean);

  if (words.length > 1) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
}

function getGlucoseBadge(value) {
  if (value < 70) return 'badge-low';
  if (value > 180) return 'badge-veryhigh';
  if (value <= 140) return 'badge-normal';
  return 'badge-high';
}

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(user);
  const [name, setName] = useState(user?.full_name || user?.name || '');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let isActive = true;

    // Load identity and account-wide reading stats independently.
    Promise.allSettled([
      authApi.profile(),
      glucoseApi.summary(),
    ]).then(([profileResult, summaryResult]) => {
      if (!isActive) {
        return;
      }

      if (profileResult.status === 'fulfilled') {
        const result = profileResult.value;
        const freshProfile =
          result.user || result.data?.user || result.data;

        if (freshProfile) {
          setProfile(freshProfile);
          setName(freshProfile.full_name || freshProfile.name || '');
          updateUser(freshProfile);
        }
      } else {
        setLoadError(
          profileResult.reason.message || 'Unable to load your profile.',
        );
      }

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value);
      } else {
        setLoadError(
          (currentError) =>
            currentError ||
            summaryResult.reason.message ||
            'Unable to load your readings summary.',
        );
      }

      setLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [updateUser]);

  async function saveName(event) {
    event.preventDefault();

    const cleanName = name.trim();
    if (!cleanName) {
      setFormError('Please enter your name.');
      return;
    }

    if (cleanName.length > 120) {
      setFormError('Name must be 120 characters or fewer.');
      return;
    }

    setFormError('');
    setSaving(true);

    try {
      // The API request sends the name only, leaving email and password alone.
      const result = await authApi.updateProfile(cleanName);
      const returnedUser =
        result.user || result.data?.user || result.data;

      const nextProfile = {
        ...profile,
        ...(returnedUser && typeof returnedUser === 'object'
          ? returnedUser
          : {}),
        full_name:
          returnedUser?.full_name ||
          returnedUser?.name ||
          cleanName,
      };

      setProfile(nextProfile);
      setName(nextProfile.full_name);
      updateUser(nextProfile);
      setToast({
        type: 'success',
        message: 'Name updated successfully.',
      });
    } catch (error) {
      setFormError(error.message || 'Unable to update your name.');
    } finally {
      setSaving(false);
    }
  }

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  const displayName =
    profile?.full_name || profile?.name || 'Sweety member';
  const latestReading = summary?.latest;
  const latestValue = latestReading
    ? Number(latestReading.glucose_value ?? latestReading.value)
    : null;

  return (
    <div className="profile-shell">
      <Navbar />

      <main className="profile-main">
        <header className="profile-heading">
          <div>
            <span className="eyebrow">ACCOUNT DETAILS</span>
            <h1>Your profile</h1>
            <p>
              Review your account and your glucose history at a glance.
            </p>
          </div>
        </header>

        {loadError && (
          <div className="profile-load-error" role="alert">
            {loadError}
          </div>
        )}

        <section
          className="profile-identity-card"
          aria-label="Profile information"
        >
          <div className="profile-avatar" aria-hidden="true">
            {getInitials(displayName, profile?.email)}
          </div>

          <div className="profile-identity-copy">
            <h2>{displayName}</h2>
            <p>{profile?.email || user?.email || 'Email unavailable'}</p>
            <span className="profile-member-since">
              Member since{' '}
              <strong>
                {profile?.created_at
                  ? formatDate(profile.created_at)
                  : '-'}
              </strong>
            </span>
          </div>

          <button
            className="button button-quiet profile-logout"
            type="button"
            onClick={signOut}
          >
            Logout
          </button>
        </section>

        <section
          className="profile-stat-grid"
          aria-label="Reading summary"
        >
          <article className="profile-stat-card">
            <span>Total readings recorded</span>
            <strong>
              {loading ? '...' : (summary?.totalReadings ?? 0)}
            </strong>
            <small>Across your account</small>
          </article>

          <article className="profile-stat-card">
            <span>Overall average</span>
            <strong>
              {loading
                ? '...'
                : summary?.average == null
                  ? '-'
                  : Number(summary.average).toFixed(1)}
            </strong>
            <small>
              {summary?.average == null
                ? 'mg/dl'
                : 'mg/dl across all readings'}
            </small>
          </article>

          <article className="profile-stat-card profile-latest-card">
            <span>Latest reading</span>
            {loading ? (
              <strong>...</strong>
            ) : latestReading && Number.isFinite(latestValue) ? (
              <strong>
                <span
                  className={
                    'glucose-badge ' + getGlucoseBadge(latestValue)
                  }
                >
                  {latestValue}
                </span>
                <small> mg/dl</small>
              </strong>
            ) : (
              <strong className="profile-no-reading">
                No readings yet
              </strong>
            )}
            <small>
              {latestReading
                ? [
                    latestReading.time_slot,
                    formatDate(latestReading.reading_date),
                  ]
                    .filter(Boolean)
                    .join(' | ')
                : 'Your most recent glucose value'}
            </small>
          </article>
        </section>

        <section
          className="profile-edit-card"
          aria-labelledby="edit-name-title"
        >
          <div className="profile-edit-heading">
            <span className="eyebrow">PERSONAL INFORMATION</span>
            <h2 id="edit-name-title">Edit name</h2>
            <p>Your email and password are not changed here.</p>
          </div>

          <form
            className="profile-name-form"
            onSubmit={saveName}
            noValidate
          >
            <label htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(formError)}
            />

            {formError && (
              <div className="profile-form-error" role="alert">
                {formError}
              </div>
            )}

            <button
              className="button button-primary"
              type="submit"
              disabled={saving || loading}
            >
              {saving ? (
                <>
                  <span
                    className="spinner spinner-small"
                    aria-hidden="true"
                  />
                  Saving
                </>
              ) : (
                'Save'
              )}
            </button>
          </form>
        </section>

        {loading && (
          <div
            className="profile-loading"
            aria-label="Loading profile"
          >
            <span className="spinner" />
          </div>
        )}
      </main>

      <Toast
        toast={toast}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
