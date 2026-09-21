// ========== CART STATE ==========
const cart = {
  items: JSON.parse(localStorage.getItem('lej_cart') || '[]'),

  save() {
    localStorage.setItem('lej_cart', JSON.stringify(this.items));
    this.updateUI();
  },

  /**
   * @param {object} product   { id, name, price, image_url? }
   * @param {HTMLElement} [sourceEl]  bouton cliqué : sert de point de départ
   *   à l'animation de vol vers le panier. Facultatif.
   */
  add(product, sourceEl) {
    const existing = this.items.find(i => i.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      this.items.push({ ...product, qty: 1 });
    }
    this.save();
    showToast(`${product.name} ajouté au panier`);
    if (sourceEl) flyToCart(sourceEl, product);
  },

  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
  },

  updateQty(id, delta) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    item.qty = Math.max(0, item.qty + delta);
    if (item.qty === 0) this.remove(id);
    else this.save();
  },

  total() {
    return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  count() {
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  },

  updateUI() {
    const count = this.count();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.classList.toggle('visible', count > 0);
    });
    renderCartPanel();
  },

  toWhatsAppText(occasion = '') {
    const lines = this.items.map(i =>
      `• ${i.name} x${i.qty} — ${(i.price * i.qty).toLocaleString('fr-FR')} FCFA`
    );
    const total = this.total().toLocaleString('fr-FR');
    const occasionLine = occasion ? `\nOccasion : ${occasion}` : '';
    return encodeURIComponent(
      `Bonjour La Case de LEJ,\n\nJe souhaite commander :\n${lines.join('\n')}${occasionLine}\n\nTotal estimé : ${total} FCFA\n\nMerci de confirmer la disponibilité et la livraison.`
    );
  }
};

// ========== RENDER CART PANEL ==========
function renderCartPanel() {
  const body = document.getElementById('cartBody');
  if (!body) return;

  if (cart.items.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <p>Votre panier est vide</p>
        <small>Découvrez nos produits et ajoutez vos favoris !</small>
      </div>`;
    document.getElementById('cartTotal').textContent = '0 FCFA';
    return;
  }

  body.innerHTML = cart.items.map(item => `
    <div class="cart-item">
      <div class="cart-item-img"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${(item.price * item.qty).toLocaleString('fr-FR')} FCFA</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="cart.updateQty('${item.id}', -1)">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="cart.updateQty('${item.id}', 1)">+</button>
          <button class="qty-btn" style="margin-left:0.25rem;color:#e44;" onclick="cart.remove('${item.id}')" aria-label="Retirer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('cartTotal').textContent = cart.total().toLocaleString('fr-FR') + ' FCFA';
}

// ========== CART PANEL TOGGLE ==========
function openCart() {
  document.getElementById('cartOverlay')?.classList.add('open');
  document.getElementById('cartPanel')?.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCartPanel();
}

function closeCart() {
  document.getElementById('cartOverlay')?.classList.remove('open');
  document.getElementById('cartPanel')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ========== COMMANDE ==========
// La commande est enregistrée en base avant d'ouvrir WhatsApp.
function orderViaWhatsApp() {
  if (cart.items.length === 0) {
    showToast('Votre panier est vide !');
    return;
  }
  closeCart();
  openCheckout({
    kind: 'panier',
    items: cart.items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
    onDone: () => { cart.items = []; cart.save(); }
  });
}

// ========== ANIMATION "VOL VERS LE PANIER" ==========
// Une miniature du produit part du bouton cliqué et rejoint l'icône panier
// de la barre de navigation, en s'amenuisant sur une trajectoire courbe.
function flyToCart(sourceEl, product) {
  const target = document.querySelector('.nav-cart-btn');
  if (!target || !sourceEl) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { bumpCartIcon(); return; }

  // On cherche un visuel du produit près du bouton : la photo de la carte,
  // celle de la fiche modale, ou à défaut le bouton lui-même.
  const hote = sourceEl.closest('.product-card, .product-modal, .picker-card') || sourceEl;
  const visuel = hote.querySelector('.product-photo, .product-img-placeholder, .product-modal-mono, .picker-emoji') || sourceEl;

  const depart = visuel.getBoundingClientRect();
  const arrivee = target.getBoundingClientRect();
  if (depart.width === 0 || depart.height === 0) { bumpCartIcon(); return; }

  const taille = Math.min(depart.width, depart.height, 84);
  const image = visuel.querySelector ? visuel.querySelector('img') : null;

  const clone = document.createElement('div');
  clone.className = 'fly-clone' + (image ? '' : ' fly-clone-plain');
  clone.style.width  = taille + 'px';
  clone.style.height = taille + 'px';
  clone.style.left = (depart.left + depart.width / 2 - taille / 2) + 'px';
  clone.style.top  = (depart.top  + depart.height / 2 - taille / 2) + 'px';

  if (image) {
    clone.style.backgroundImage = `url("${image.src}")`;
  } else {
    clone.textContent = (product.name || '?').trim().charAt(0).toUpperCase();
  }

  document.body.appendChild(clone);

  const dx = (arrivee.left + arrivee.width / 2) - (depart.left + depart.width / 2);
  const dy = (arrivee.top  + arrivee.height / 2) - (depart.top  + depart.height / 2);

  // Point intermédiaire relevé : la miniature passe par-dessus la page,
  // plutôt que de filer en ligne droite.
  const milieuX = dx * 0.5;
  const milieuY = dy * 0.5 - Math.max(90, Math.abs(dy) * 0.5);

  const anim = clone.animate([
    { transform: 'translate(0px, 0px) scale(1) rotate(0deg)',                          opacity: 1,    offset: 0 },
    { transform: `translate(${milieuX}px, ${milieuY}px) scale(0.75) rotate(8deg)`,      opacity: 1,    offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.1) rotate(14deg)`,                opacity: 0.35, offset: 1 }
  ], { duration: 700, easing: 'cubic-bezier(0.3, 0.6, 0.35, 1)' });

  // La promesse `finished` plutôt que l'événement `onfinish` : sur un onglet
  // en arrière-plan, le navigateur peut retarder indéfiniment la remise des
  // événements d'animation alors que la promesse, elle, se résout normalement.
  const nettoyer = () => { clone.remove(); bumpCartIcon(); };
  anim.finished.then(nettoyer, nettoyer);
}

function bumpCartIcon() {
  const target = document.querySelector('.nav-cart-btn');
  if (!target) return;
  target.classList.remove('cart-bump');
  void target.offsetWidth;   // relance l'animation même si elle vient de jouer
  target.classList.add('cart-bump');
}

// ========== TOAST ==========
function showToast(message) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span class="toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span> ${message}`;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  cart.updateUI();

  document.querySelectorAll('.cart-btn, .nav-cart-btn').forEach(btn => {
    btn.addEventListener('click', openCart);
  });

  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
  document.getElementById('cartCloseBtn')?.addEventListener('click', closeCart);

  document.getElementById('checkoutWhatsApp')?.addEventListener('click', () => {
    orderViaWhatsApp();
  });
});
