/* Lena's TriLab – Konfiguration.
   Leer lassen = Offline-/Demo-Modus (alles bleibt auf dem Gerät).
   Mit Supabase-Werten: Login, Sync, "Ask Lena"-Antworten. Siehe README.md */
window.TRILAB_CONFIG = {
  supabaseUrl: '',          // z. B. https://xxxx.supabase.co
  supabaseKey: '',          // "anon"/publishable key (darf öffentlich sein, Schutz läuft über RLS)
  garmin: false,            // true, sobald die Garmin-Edge-Function live ist (siehe README)
  instagram: 'https://www.instagram.com/lenaasang',
  linktree: 'https://linktr.ee/lenaasang'
};
