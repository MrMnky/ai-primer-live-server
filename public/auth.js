/* ============================================
   AI Primer Live — Auth Module
   Wraps Supabase Auth for login, signup,
   session management, and role checking.

   When CONFIG.LOCAL_DEV is true, all auth
   checks are bypassed for local development.
   ============================================ */

(function () {
  'use strict';

  let supabase = null;
  const isLocalDev = () => typeof CONFIG !== 'undefined' && CONFIG.LOCAL_DEV === true;

  // --- Local dev user stub ---
  const LOCAL_USER = {
    id: 'local-dev-user',
    email: 'dev@localhost',
    user_metadata: { full_name: 'Presenter (local)', role: 'admin' },
  };
  const LOCAL_PROFILE = {
    id: 'local-dev-user',
    full_name: 'Presenter (local)',
    role: 'admin',
    organisation: 'AI Accelerator',
  };
  const LOCAL_SESSION = { access_token: 'local-dev-token', user: LOCAL_USER };

  // --- Initialise Supabase Client ---
  function initAuth() {
    if (isLocalDev()) {
      console.log('%c[Auth] Local dev mode — auth bypassed', 'color:#00FFBC');
      return null;
    }
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      console.error('Supabase client library not loaded');
      return null;
    }
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    return supabase;
  }

  // --- Sign Up ---
  async function signUp(email, password, fullName, role = 'participant') {
    if (isLocalDev()) return { user: LOCAL_USER, session: LOCAL_SESSION };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        }
      }
    });
    if (error) throw error;
    return data;
  }

  // --- Sign In ---
  async function signIn(email, password) {
    if (isLocalDev()) return { user: LOCAL_USER, session: LOCAL_SESSION };
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  // --- Magic Link (passwordless) ---
  async function sendMagicLink(email) {
    if (isLocalDev()) return {};
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      }
    });
    if (error) throw error;
    return data;
  }

  // --- Sign Out ---
  async function signOut() {
    if (isLocalDev()) { window.location.href = '/'; return; }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = '/login.html';
  }

  // --- Get Current User ---
  async function getUser() {
    if (isLocalDev()) return LOCAL_USER;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // --- Get Current Session (JWT) ---
  async function getSession() {
    if (isLocalDev()) return LOCAL_SESSION;
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  // --- Get User Profile (with role) ---
  async function getProfile() {
    if (isLocalDev()) return LOCAL_PROFILE;
    const user = await getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
    return data;
  }

  // --- Check Role ---
  async function hasRole(requiredRole) {
    if (isLocalDev()) return true;
    const profile = await getProfile();
    if (!profile) return false;

    if (requiredRole === 'presenter') {
      return profile.role === 'presenter' || profile.role === 'admin';
    }
    if (requiredRole === 'admin') {
      return profile.role === 'admin';
    }
    return true; // any authenticated user is a participant
  }

  // --- Auth Guard (redirect if not authenticated) ---
  async function requireAuth(redirectTo = '/login.html') {
    if (isLocalDev()) return LOCAL_SESSION;
    const session = await getSession();
    if (!session) {
      window.location.href = redirectTo;
      return null;
    }
    return session;
  }

  // --- Presenter Guard (redirect if not a presenter) ---
  async function requirePresenter(redirectTo = '/login.html') {
    if (isLocalDev()) return LOCAL_SESSION;
    const session = await requireAuth(redirectTo);
    if (!session) return null;

    const isPresenter = await hasRole('presenter');
    if (!isPresenter) {
      window.location.href = '/join.html';
      return null;
    }
    return session;
  }

  // --- Listen for Auth Changes ---
  function onAuthChange(callback) {
    if (isLocalDev()) return;
    supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  // --- Get Access Token (for WebSocket auth) ---
  async function getAccessToken() {
    if (isLocalDev()) return 'local-dev-token';
    const session = await getSession();
    return session?.access_token || null;
  }

  // --- Public API ---
  window.PrimerAuth = {
    init: initAuth,
    signUp,
    signIn,
    sendMagicLink,
    signOut,
    getUser,
    getSession,
    getProfile,
    hasRole,
    requireAuth,
    requirePresenter,
    onAuthChange,
    getAccessToken,
    getSupabase: () => supabase,
    isLocalDev,
  };

})();
