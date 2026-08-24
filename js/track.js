/* ==========================================================================
   MOUCHARD DE VISITE — un simple appel RPC à chaque chargement de page.
   log_event() tourne en SECURITY DEFINER et détermine lui-même qui est
   connecté à partir du jeton ; rien ici n'est à faire confiance côté client.
   Échec silencieux : jamais bloquant pour la navigation d'un visiteur.
   ========================================================================== */
(function () {
  function track() {
    if (!window.sb) return;
    sb.rpc('log_event', {
      p_event_type: 'page_view',
      p_path: location.pathname + location.search
    }).then(() => {}, () => {});
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', track);
  } else {
    track();
  }
})();
