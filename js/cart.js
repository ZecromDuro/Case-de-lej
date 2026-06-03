// ========== CART STATE ==========
const cart = {
  items: JSON.parse(localStorage.getItem('lej_cart') || '[]'),

  save() {
    localStorage.setItem('lej_cart', JSON.stringify(this.items));
    this.updateUI();
  },

  add(product) {
    const existing = this.items.find(i => i.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      this.items.push({ ...product, qty: 1 });
    }
    this.save();
    showToast(`${product.name} ajouté au panier`);
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
          <button class="qty-btn" style="margin-left:0.25rem;color:#e44;" onclick="cart.remove('${item.id}')">✕</button>
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

// ========== WHATSAPP ORDER ==========
function orderViaWhatsApp(occasion = '') {
  if (cart.items.length === 0) {
    showToast('Votre panier est vide !');
    return;
  }
  const PHONE = '2250700000000'; // à remplacer par le vrai numéro
  const msg = cart.toWhatsAppText(occasion);
  window.open(`https://wa.me/${PHONE}?text=${msg}`, '_blank');
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
  toast.innerHTML = `<span class="toast-icon">✓</span> ${message}`;
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
