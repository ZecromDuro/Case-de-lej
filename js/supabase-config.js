/* ==========================================================================
   Connexion Supabase.
   La clé publiable est faite pour vivre dans le navigateur : elle n'ouvre
   que ce que les règles RLS autorisent. Ne jamais mettre ici la clé
   « service_role », qui contourne toutes les règles.
   ========================================================================== */

const SUPABASE_URL = 'https://ncuyaqjzvtoiiprdbnzj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ox4YSmE47U0K5CVdETLWjA_efq7fHaU';

/* Client chargé depuis le CDN officiel (UMD, sans build). */
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'lej.auth'
  }
});
