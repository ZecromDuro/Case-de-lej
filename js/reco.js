/* ==========================================================================
   SÉLECTION DES PRODUITS MIS EN AVANT
   Trois logiques distinctes, volontairement simples et explicables :

   1. Nouveautés   — les derniers produits ajoutés au catalogue.
   2. Best-sellers — les plus vendus, d'après les commandes réellement passées.
   3. Pour vous    — affinité de catégorie, calculée sur ce que la personne a
                     déjà commandé (si connectée) et sur ce qu'elle a consulté
                     ou mis au panier (mémorisé dans son navigateur).

   Aucune donnée personnelle ne quitte l'appareil : l'historique de navigation
   reste dans le navigateur, et les statistiques de vente lues sont des totaux
   anonymes.
   ========================================================================== */

const HISTO_KEY = 'lej.historique.v1';
const HISTO_MAX = 40;

const reco = {

  /* ---------- Historique local (consultations et ajouts au panier) ---------- */

  _histo() {
    try { return JSON.parse(localStorage.getItem(HISTO_KEY) || '[]'); }
    catch (e) { return []; }
  },

  /**
   * Mémorise un geste sur un produit.
   * @param {string} type 'vue' (fiche ouverte) ou 'panier' (ajouté au panier)
   */
  noter(productId, type = 'vue') {
    if (!productId) return;
    const h = this._histo().filter(e => !(e.id === productId && e.type === type));
    h.unshift({ id: productId, type, t: Date.now() });
    try { localStorage.setItem(HISTO_KEY, JSON.stringify(h.slice(0, HISTO_MAX))); }
    catch (e) { /* stockage plein : l'historique n'est pas vital */ }
  },

  oublier() { localStorage.removeItem(HISTO_KEY); },

  /* ---------- Signaux d'affinité ---------- */

  /**
   * Poids par catégorie, entre 0 et 1.
   * Une commande pèse plus qu'un ajout au panier, qui pèse plus qu'une visite.
   * Les gestes récents comptent davantage que les anciens.
   */
  async affinites() {
    const poids = {};
    const ajouter = (slug, valeur) => {
      if (!slug) return;
      poids[slug] = (poids[slug] || 0) + valeur;
    };

    // Historique local : consultations et paniers
    const maintenant = Date.now();
    for (const e of this._histo()) {
      const p = catalog.product(e.id);
      if (!p) continue;
      const ageJours = (maintenant - e.t) / 86400000;
      const fraicheur = Math.max(0.25, 1 - ageJours / 30);   // s'estompe sur un mois
      ajouter(p.category, (e.type === 'panier' ? 2 : 1) * fraicheur);
    }

    // Commandes passées : le signal le plus fort, réservé aux personnes connectées
    if (auth.user) {
      try {
        const { data } = await sb.from('orders')
          .select('created_at, order_items(product_id)')
          .order('created_at', { ascending: false })
          .limit(20);

        for (const o of (data || [])) {
          const ageJours = (maintenant - new Date(o.created_at)) / 86400000;
          const fraicheur = Math.max(0.3, 1 - ageJours / 180);
          for (const item of (o.order_items || [])) {
            const p = catalog.product(item.product_id);
            if (p) ajouter(p.category, 4 * fraicheur);
          }
        }
      } catch (e) { /* sans historique de commande, on se rabat sur le reste */ }
    }

    // Normalisation entre 0 et 1
    const max = Math.max(1, ...Object.values(poids));
    Object.keys(poids).forEach(k => { poids[k] = poids[k] / max; });
    return poids;
  },

  /** Produits déjà commandés ou déjà au panier : inutile de les re-proposer. */
  _dejaVus() {
    const set = new Set(cart.items.map(i => i.id));
    this._histo().filter(e => e.type === 'panier').forEach(e => set.add(e.id));
    return set;
  },

  /* ---------- Les trois sélections ---------- */

  /** Derniers produits entrés au catalogue. */
  nouveautes(n = 4) {
    return catalog.products
      .filter(catalog.estDisponible)
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, n);
  },

  /** Les plus vendus. À défaut de ventes, on ne montre rien plutôt que du faux. */
  bestSellers(n = 4) {
    return catalog.products
      .filter(catalog.estDisponible)
      .map(p => ({ p, v: catalog.statsOf(p.id).units_sold }))
      .filter(x => x.v > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, n)
      .map(x => x.p);
  },

  /**
   * Suggestions personnalisées.
   * Score = affinité de catégorie (60 %) + popularité (25 %) + nouveauté (15 %).
   * Sans aucun signal, renvoie une liste vide : l'appelant décide du repli.
   */
  async pourVous(n = 4) {
    const poids = await this.affinites();
    if (!Object.keys(poids).length) return [];

    const exclus = this._dejaVus();
    const venteMax = Math.max(1, ...catalog.stats.map(s => s.units_sold));
    const maintenant = Date.now();

    return catalog.products
      .filter(p => catalog.estDisponible(p) && !exclus.has(p.id))
      .map(p => {
        const affinite   = poids[p.category] || 0;
        const popularite = catalog.statsOf(p.id).units_sold / venteMax;
        const ageJours   = (maintenant - new Date(p.created_at)) / 86400000;
        const nouveaute  = Math.max(0, 1 - ageJours / 90);

        return { p, score: affinite * 0.6 + popularite * 0.25 + nouveaute * 0.15 };
      })
      .filter(x => x.score > 0.05)      // en dessous, ce n'est plus une suggestion
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map(x => x.p);
  },

  /** Repli quand rien de personnalisé n'est disponible. */
  aDecouvrir(n = 4, exclure = []) {
    const exclus = new Set(exclure.map(p => p.id));
    return catalog.products
      .filter(p => catalog.estDisponible(p) && !exclus.has(p.id))
      .map(p => ({ p, v: catalog.statsOf(p.id).units_sold, r: Math.random() }))
      .sort((a, b) => (b.v - a.v) || (a.r - b.r))
      .slice(0, n)
      .map(x => x.p);
  }
};
