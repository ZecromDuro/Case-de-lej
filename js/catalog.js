/* ==========================================================================
   CATALOGUE — lu depuis Supabase.
   Les pages appellent `await catalog.load()` avant de dessiner quoi que ce
   soit. Une copie est gardée en mémoire pour la durée de la visite ; si la
   base est injoignable, le site retombe sur un jeu de secours minimal
   plutôt que d'afficher une page vide.
   ========================================================================== */

/* --- Icônes (traits 24×24, héritent de la couleur du texte) --- */
const ICON = {
  choco:    '<path d="M5 3h14v18H5z"/><path d="M5 9h14M5 15h14M12 3v18"/>',
  cookie:   '<circle cx="12" cy="12" r="9"/><circle cx="9.5" cy="9.5" r="1"/><circle cx="14.5" cy="13" r="1"/><circle cx="10" cy="15" r="1"/>',
  juice:    '<path d="M5 4h14l-1.6 16.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8L5 4z"/><path d="M6 10h12"/><path d="M14 2l-1.5 6"/>',
  bottle:   '<path d="M8 2h8"/><path d="M9 2v3L7 8v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8l-2-3V2"/><path d="M7 14h10"/>',
  syrup:    '<path d="M10 2h4v3l2 3v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8l2-3V2z"/><path d="M12 12c1 1.4 1.6 2.3 1.6 3a1.6 1.6 0 0 1-3.2 0c0-.7.6-1.6 1.6-3z"/>',
  candy:    '<circle cx="12" cy="12" r="4.2"/><path d="M7.8 12L4 8.4v7.2L7.8 12z"/><path d="M16.2 12L20 8.4v7.2L16.2 12z"/>',
  jar:      '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><rect x="4" y="6" width="16" height="16" rx="2"/><path d="M4 10h16"/>',
  kitchen:  '<path d="M6 2v8a2 2 0 0 0 4 0V2"/><path d="M8 10v12"/><path d="M17 2c-1.7 1.4-2.5 3.2-2.5 5.5S15.3 12 17 13v9"/>',
  bag:      '<path d="M6 7h12l1.2 13a2 2 0 0 1-2 2.2H6.8a2 2 0 0 1-2-2.2L6 7z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
  mug:      '<path d="M4 6h12v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6z"/><path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16"/><path d="M7 2.5c.6.8.6 1.4 0 2.2M11 2.5c.6.8.6 1.4 0 2.2"/>',
  tea:      '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z"/><path d="M17 11h2a2 2 0 0 1 0 4h-2"/><path d="M4 22h13"/><path d="M9 5.5c.7-.9.7-1.6 0-2.5M13 5.5c.7-.9.7-1.6 0-2.5"/>',
  gift:     '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
  crescent: '<path d="M18.5 15.5A8 8 0 0 1 8.5 5.5a8 8 0 1 0 10 10z"/><path d="M17 3l.9 1.9L20 5.7l-1.6 1.4.4 2.1-1.8-1-1.8 1 .4-2.1L14 5.7l2.1-.8L17 3z"/>',
  tree:     '<path d="M12 2L6 10h3l-4 6h5v6h4v-6h5l-4-6h3L12 2z"/>',
  egg:      '<path d="M12 2c3.8 0 7 5.4 7 10a7 7 0 0 1-14 0c0-4.6 3.2-10 7-10z"/><path d="M6 12c2 1.4 3.6 1.4 6 0s4-1.4 6 0"/><path d="M6.5 16c2 1.3 3.5 1.3 5.5 0s3.5-1.3 5.5 0"/>',
  rattle:   '<circle cx="9" cy="8" r="5.5"/><path d="M12.9 11.9l5.6 5.6"/><rect x="17.5" y="16.5" width="4" height="4" rx="1.2" transform="rotate(45 19.5 18.5)"/>',
  rings:    '<circle cx="9" cy="9" r="3"/><circle cx="15" cy="9" r="3"/><path d="M12 12v9"/><path d="M9 21h6"/>',
  beauty:   '<path d="M12 21a6 6 0 0 0 6-6c0-3.5-4-8-6-11-2 3-6 7.5-6 11a6 6 0 0 0 6 6z"/><path d="M19 3l.7 1.6L21.5 5l-1.4 1 .3 1.8L19 6.9l-1.4.9.3-1.8L16.5 5l1.8-.4L19 3z"/>',
  heart:    '<path d="M19.8 5.5a5 5 0 0 0-7.1 0l-.7.7-.7-.7a5 5 0 1 0-7.1 7.1l7.8 7.9 7.8-7.9a5 5 0 0 0 0-7.1z"/>',
  bowtie:   '<path d="M10 8L3 4.5v15L10 16z"/><path d="M14 8l7-3.5v15L14 16z"/><rect x="9.5" y="8" width="5" height="8" rx="1.4"/>',
  star:     '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
  building: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
  drop:     '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12.5 5 12 2.5C11.5 5 10 7.4 8 9c-2 1.6-3 3.5-3 5a7 7 0 0 0 7 7z"/>',
  truck:    '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'
};

/* Jeu de secours : affiché seulement si la base est injoignable. */
const FALLBACK = {
  groups: [
    { id: 'epicerie', label: "L'épicerie sucrée", blurb: '', position: 0 },
    { id: 'boissons', label: 'Les boissons',      blurb: '', position: 1 }
  ],
  categories: [
    { slug: 'cazchoco',   label: 'CazChoco',     group_id: 'epicerie', icon: 'choco', blurb: '', is_brand: true },
    { slug: 'jus-nectar', label: 'Jus & Nectar', group_id: 'boissons', icon: 'juice', blurb: '', is_brand: false }
  ],
  products: [], occasions: [], events: []
};

const catalog = {
  data: null,
  offline: false,

  /** Charge tout le catalogue en une passe. Idempotent. */
  async load(force) {
    if (this.data && !force) return this.data;

    try {
      const [groups, categories, products, occasions, events, stats] = await Promise.all([
        sb.from('groups').select('*').order('position'),
        sb.from('categories').select('*').order('position'),
        sb.from('products').select('*').order('position'),
        sb.from('occasions').select('*').order('position'),
        sb.from('events').select('*').order('position'),
        sb.from('product_stats').select('*')
      ]);

      const failed = [groups, categories, products, occasions, events].find(r => r.error);
      if (failed) throw failed.error;

      this.data = {
        groups: groups.data,
        categories: categories.data,
        products: products.data,
        occasions: occasions.data,
        events: events.data,
        // Les statistiques ne sont pas vitales : en cas d'échec on continue.
        stats: stats.error ? [] : stats.data
      };
      this.offline = false;
    } catch (err) {
      console.error('Catalogue indisponible :', err.message);
      this.data = JSON.parse(JSON.stringify(FALLBACK));
      this.offline = true;
    }

    return this.data;
  },

  /* ----- Lecture ----- */
  get groups()      { return this.data.groups; },
  get categories()  { return this.data.categories; },
  get products()    { return this.data.products.filter(p => p.is_active !== false); },
  get allProducts() { return this.data.products; },
  get occasions()   { return this.data.occasions; },
  get events()      { return this.data.events; },

  get stats() { return this.data.stats || []; },

  /** Ventes d'un produit. Zéro par défaut si jamais commandé. */
  statsOf(id) {
    return (this.data.stats || []).find(s => s.product_id === id)
        || { product_id: id, units_sold: 0, orders_count: 0, last_ordered_at: null };
  },

  /* ----- Stock : NULL = non suivi, 0 = épuisé ----- */
  suitLeStock: (p) => p.stock !== null && p.stock !== undefined,
  estEpuise:   (p) => p.stock === 0,
  estDisponible: (p) => p.stock === null || p.stock === undefined || p.stock > 0,

  category:   (slug) => catalog.data.categories.find(c => c.slug === slug),
  product:    (id)   => catalog.data.products.find(p => p.id === id),
  byCategory: (slug) => catalog.products.filter(p => p.category === slug),
  categoriesOfGroup: (groupId) => catalog.data.categories.filter(c => c.group_id === groupId),
  label: (slug) => (catalog.data.categories.find(c => c.slug === slug) || {}).label || '',
  count: (slug) => catalog.products.filter(p => p.category === slug).length,

  /** Icône SVG prête à insérer (clé d'icône ou slug de catégorie). */
  icon(key, size = 24) {
    const cat = catalog.data ? catalog.data.categories.find(c => c.slug === key) : null;
    const paths = ICON[cat ? cat.icon : key];
    if (!paths) return '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  },

  /** Visuel d'un produit : sa photo si elle existe, sinon un monogramme. */
  visual(p, cssClass = 'product-img-placeholder') {
    if (p.image_url) {
      return `<img class="product-photo" src="${p.image_url}" alt="${p.name}" loading="lazy"/>`;
    }
    return `<div class="${cssClass}"><span>${p.name.charAt(0).toUpperCase()}</span></div>`;
  },

  /** Sous-titre d'une carte catégorie : produits phares, ou état de la gamme. */
  teaser(slug) {
    const items = catalog.byCategory(slug);
    if (!items.length) return 'Sur commande';
    return items.slice(0, 3)
      .map(p => p.name.replace(/^(Jus|Liqueur|Confiture|Gelée|Cookies|Biscuits|Cake|Tablette|Pâte à Tartiner|Chocolat en)\s+(de |d’|à l’|au )?/i, ''))
      .join(', ') + (items.length > 3 ? '…' : '');
  },

  iconKeys: () => Object.keys(ICON)
};

/* Bandeau discret si la base ne répond pas — mieux qu'une page muette. */
function showOfflineNotice() {
  if (!catalog.offline || document.getElementById('lejOffline')) return;
  const el = document.createElement('div');
  el.id = 'lejOffline';
  el.className = 'offline-notice';
  el.innerHTML = `Le catalogue est momentanément indisponible.
    <a href="https://wa.me/2250707773197" target="_blank" rel="noopener">Écrivez-nous sur WhatsApp</a>`;
  document.body.appendChild(el);
}
