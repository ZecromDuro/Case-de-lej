// Inject shared HTML components
function injectNavbar() {
  const placeholder = document.getElementById('navbarPlaceholder');
  if (!placeholder) return;
  placeholder.innerHTML = `
    <nav class="navbar dark" id="navbar">
      <div class="nav-inner">

        <!-- Logo -->
        <a href="index.html" class="nav-logo">
          <img src="images/logo/logo_nav.png?v=2" alt="La Case de LEJ"/>
          <span class="nav-brand-text">
            <span class="nav-brand-title">LA CASE DE LEJ</span>
            <span class="nav-brand-tagline">Épicerie fine locale &amp; confection coffret cadeau</span>
          </span>
        </a>

        <!-- Right: cart + hamburger -->
        <div class="nav-actions">
          <span class="nav-account"></span>
          <button class="nav-cart-btn cart-btn" aria-label="Voir le panier">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span class="cart-count"></span>
          </button>
          <button class="hamburger" id="hamburger" aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>

      </div>
    </nav>

    <!-- Mobile menu -->
    <div class="mobile-nav" id="mobileNav">
      <a href="index.html">Accueil</a>
      <a href="produits.html">Produits</a>
      <a href="cazchoco.html" class="mobile-nav-brand">
        CazChoco
        <small>Le chocolat ivoirien, notre fierté</small>
      </a>
      <a href="paniers.html">Coffrets cadeaux</a>
      <a href="apropos.html">À propos</a>
      <a href="contact.html">Contact</a>
      <a href="compte.html">Mon compte</a>
      <a href="admin.html" class="admin-only" hidden>Tableau de bord</a>
      <a href="paniers.html" class="btn btn-primary">Commander un coffret cadeau</a>
    </div>
  `;
}

function injectCartPanel() {
  const placeholder = document.getElementById('cartPlaceholder');
  if (!placeholder) return;
  placeholder.innerHTML = `
    <div class="cart-overlay" id="cartOverlay"></div>
    <aside class="cart-panel" id="cartPanel" role="dialog" aria-label="Panier">
      <div class="cart-header">
        <h3>Mon panier</h3>
        <button class="cart-close" id="cartCloseBtn" aria-label="Fermer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="cart-body" id="cartBody"></div>
      <div class="cart-footer">
        <div class="cart-total">
          <span class="cart-total-label">Total estimé</span>
          <span class="cart-total-amount" id="cartTotal">0 FCFA</span>
        </div>
        <button class="btn btn-whatsapp" id="checkoutWhatsApp">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>
          Commander via WhatsApp
        </button>
      </div>
    </aside>
  `;
}

function injectFooter() {
  const placeholder = document.getElementById('footerPlaceholder');
  if (!placeholder) return;
  placeholder.innerHTML = `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="footer-logo">La Case de LEJ</div>
            <p>Produits artisanaux issus de la transformation de fruits locaux ivoiriens. Saveurs authentiques, faites avec amour depuis Abidjan.</p>
            <div class="social-links" style="margin-top:1.5rem">
              <a href="#" class="social-link" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
                </svg>
              </a>
              <a href="#" class="social-link" aria-label="Facebook">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
              <a href="https://wa.me/2250707773197" class="social-link" aria-label="WhatsApp">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
              </a>
            </div>
          </div>
          <div class="footer-col">
            <h4>Navigation</h4>
            <ul>
              <li><a href="index.html">Accueil</a></li>
              <li><a href="produits.html">Nos produits</a></li>
              <li><a href="cazchoco.html">CazChoco</a></li>
              <li><a href="paniers.html">Coffrets cadeaux</a></li>
              <li><a href="apropos.html">Notre histoire</a></li>
              <li><a href="contact.html">Contact</a></li>
              <li><a href="compte.html">Mon compte</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Catégories</h4>
            <ul id="footerCategories"></ul>
          </div>
          <div class="footer-col">
            <h4>Contact</h4>
            <div class="footer-contact-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span>Abidjan, Côte d'Ivoire</span>
            </div>
            <div class="footer-contact-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l.97-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <a href="https://wa.me/2250707773197" style="color:inherit">+225 07 07 77 31 97</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2025 La Case de LEJ — Tous droits réservés</p>
          <p>Fait à Abidjan</p>
        </div>
      </div>
    </footer>
  `;
}

/* Colonne "Catégories" du pied de page : alimentée par le catalogue.
   Les catégories déjà approvisionnées d'abord, puis les autres. */
function injectFooterCategories() {
  const ul = document.getElementById('footerCategories');
  if (!ul || typeof catalog === 'undefined' || !catalog.data) return;
  const sorted = [...catalog.categories].sort((a, b) => catalog.count(b.slug) - catalog.count(a.slug));
  ul.innerHTML = sorted.slice(0, 7).map(c =>
    `<li><a href="produits.html#${c.slug}">${c.label}</a></li>`).join('')
    + `<li><a href="produits.html"><strong>Toutes les catégories</strong></a></li>`;
}

/* Les composants partagés sont posés tout de suite ; le catalogue et la
   session arrivent ensuite et complètent l'affichage. */
document.addEventListener('DOMContentLoaded', async () => {
  injectNavbar();
  injectCartPanel();
  injectFooter();

  await auth.init();
  await catalog.load();

  injectFooterCategories();
  showOfflineNotice();
  document.dispatchEvent(new CustomEvent('lej:ready'));
});
