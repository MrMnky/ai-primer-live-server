/* ============================================
   AI Primer Live — Configuration

   For local dev: set LOCAL_DEV to true and
   SERVER_URL to '' (empty string = same origin).
   For production: set the deployed server URL.
   ============================================ */

const CONFIG = {
  // Server URL for API calls and WebSocket connections.
  // Leave empty for local dev (same origin). Set to deployed
  // server URL for production (e.g. 'https://ai-primer-live.up.railway.app')
  SERVER_URL: 'https://ai-primer-live-production.up.railway.app',

  // Replace with your Supabase project values
  SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_ANON_KEY',

  // Local dev mode — set to true to skip auth entirely
  LOCAL_DEV: true,
};
