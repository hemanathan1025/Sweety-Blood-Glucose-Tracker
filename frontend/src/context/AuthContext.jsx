import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authApi } from '../api/api.js';

const AuthContext = createContext(null);
const TOKEN_KEY = 'sweety_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY)),
  );

  useEffect(() => {
    // Clear local auth state when an API request reports an expired token.
    function clearSession() {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setLoading(false);
    }

    window.addEventListener('sweety:unauthorized', clearSession);
    return () => {
      window.removeEventListener('sweety:unauthorized', clearSession);
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!token) {
      setUser(null);
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    // Refresh the user profile when the app starts with a saved token.
    setLoading(true);
    authApi
      .profile()
      .then((result) => {
        if (isActive) {
          setUser(result.user);
        }
      })
      .catch(() => {
        if (!isActive) return;

        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [token]);

  function saveSession(result) {
    localStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
    setLoading(false);
  }

  async function login(credentials) {
    const result = await authApi.login(credentials);
    saveSession(result);
    return result;
  }

  async function signup(details) {
    const result = await authApi.register(details);
    saveSession(result);
    return result;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  // Keep the navbar and profile page in sync after a name change.
  const updateUser = useCallback((nextUser) => {
    setUser((currentUser) =>
      currentUser ? { ...currentUser, ...nextUser } : nextUser,
    );
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      signup,
      logout,
      updateUser,
    }),
    [user, token, loading, updateUser],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}

export default AuthProvider;
