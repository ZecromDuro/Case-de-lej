/* ==========================================================================
   TABLEAU DE BORD — écrit directement dans Supabase.
   L'accès est gardé par les règles RLS : sans le drapeau is_admin sur le
   profil, chaque écriture est refusée par la base, même si quelqu'un
   parvient à afficher cette page.
   ========================================================================== */

const IMG_MAX = 1200;
const IMG_QUALITY = 0.82;

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function slugify(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toast(msg, isError) {
  const el = $('#adToast');
  el.textContent = msg;
  el.classList.toggle('is-error', !!isError);
  el.classList.add('is-on');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('is-on'), 3200);
}
const showToast = toast;   // partagé avec les scripts communs

function erreurLisible(err) {
  const m = (err && (err.message || err.error_description)) || '';
  if (/row-level security|violates row-level/i.test(m))
    return "Écriture refusée : votre compte n'a pas les droits d'administration.";
  if (/duplicate key/i.test(m))  return 'Cet identifiant existe déjà.';
  if (/foreign key/i.test(m))    return 'Référence invalide (catégorie ou univers inexistant).';
  if (/fetch|network/i.test(m))  return 'Connexion impossible. Vérifiez votre réseau.';
  return m || 'Une erreur est survenue.';
}

/* ==========================================================================
   Accès
   ========================================================================== */

/* Relu à chaque changement de session, pas seulement au chargement :
   sans ça, l'écran de connexion restait affiché après s'être connecté. */
function guardAccess() {
  const gate = $('#adGate');
  const app  = $('#adApp');

  if (!auth.user) {
    gate.hidden = false; app.hidden = true;
    $('#gateTitle').textContent = 'Connexion requise';
    $('#gateText').textContent  = 'Connectez-vous avec le compte administrateur de La Case de LEJ.';
    $('#gateAction').hidden = false;
    $('#gateSignOut').hidden = true;
    return false;
  }

  if (!auth.isAdmin) {
    gate.hidden = false; app.hidden = true;
    $('#gateTitle').textContent = 'Accès réservé';
    $('#gateText').textContent  =
      `Le compte ${auth.user.email} n'a pas les droits d'administration. ` +
      'Demandez à ce qu\'ils vous soient accordés, ou connectez-vous avec un autre compte.';
    $('#gateAction').hidden = true;
    $('#gateSignOut').hidden = false;
    return false;
  }

  gate.hidden = true; app.hidden = false;
  return true;
}

/* ==========================================================================
   Images — envoyées dans le bucket « produits »
   ========================================================================== */

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, IMG_MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        cv.toBlob(b => b ? resolve(b) : reject(new Error('Conversion impossible')),
                  'image/jpeg', IMG_QUALITY);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadImage(file, productId) {
  const blob = await compressImage(file);
  const path = `${productId || 'tmp'}-${Date.now()}.jpg`;

  const { error } = await sb.storage.from('produits')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data } = sb.storage.from('produits').getPublicUrl(path);
  return data.publicUrl;
}

/* ==========================================================================
   Tiroir d'édition
   ========================================================================== */

let drawerSaveHandler = null;

function openDrawer(title, fieldsHTML, onSave) {
  $('#drawerTitle').textContent = title;
  $('#drawerForm').innerHTML = fieldsHTML;
  drawerSaveHandler = onSave;
  $('#drawer').classList.add('is-open');
  $('#drawerOverlay').classList.add('is-open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#drawerForm input, #drawerForm textarea')?.focus(), 120);
}

function closeDrawer() {
  $('#drawer').classList.remove('is-open');
  $('#drawerOverlay').classList.remove('is-open');
  document.body.style.overflow = '';
  drawerSaveHandler = null;
}

const field = {
  text: (name, label, value = '', opts = {}) => `
    <label class="ad-field">
      <span>${label}${opts.hint ? `<em>${opts.hint}</em>` : ''}</span>
      <input class="ad-input" name="${name}" value="${esc(value)}" ${opts.attrs || ''}/>
    </label>`,

  /** Champ nombre facultatif : vide = valeur nulle en base. */
  optionalNumber: (name, label, value, opts = {}) => `
    <label class="ad-field">
      <span>${label}${opts.hint ? `<em>${opts.hint}</em>` : ''}</span>
      <input class="ad-input" type="number" name="${name}" min="0"
             value="${value === null || value === undefined ? '' : Number(value)}"
             placeholder="${opts.placeholder || ''}"/>
    </label>`,

  number: (name, label, value = 0, opts = {}) => `
    <label class="ad-field">
      <span>${label}${opts.hint ? `<em>${opts.hint}</em>` : ''}</span>
      <input class="ad-input" type="number" name="${name}" value="${Number(value) || 0}" min="0"/>
    </label>`,

  area: (name, label, value = '') => `
    <label class="ad-field">
      <span>${label}</span>
      <textarea class="ad-input" name="${name}" rows="4">${esc(value)}</textarea>
    </label>`,

  select: (name, label, value, options) => `
    <label class="ad-field">
      <span>${label}</span>
      <select class="ad-input" name="${name}">
        ${options.map(o => `<option value="${esc(o.value)}" ${o.value === value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
      </select>
    </label>`,

  toggle: (name, label, checked) => `
    <label class="ad-check">
      <input type="checkbox" name="${name}" ${checked ? 'checked' : ''}/>
      <span>${label}</span>
    </label>`,

  image: (value = '') => `
    <div class="ad-field">
      <span>Photo<em>envoyée sur Supabase, visible par tous</em></span>
      <div class="ad-image-row">
        <div class="ad-image-preview" id="imgPreview">
          ${value ? `<img src="${esc(value)}" alt=""/>` : '<span>Aucune</span>'}
        </div>
        <div class="ad-image-actions">
          <input type="file" id="imgInput" accept="image/*" hidden/>
          <button type="button" class="ad-btn ad-btn-ghost" id="imgPick">Choisir une photo</button>
          <button type="button" class="ad-btn ad-btn-ghost" id="imgClear">Retirer</button>
          <input class="ad-input ad-input-sm" name="image_url" id="imgValue" value="${esc(value)}"
                 placeholder="ou une adresse d'image"/>
        </div>
      </div>
    </div>`
};

function wireImageField(productId) {
  const pick = $('#imgPick');
  if (!pick) return;

  pick.addEventListener('click', () => $('#imgInput').click());

  $('#imgInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    $('#imgPreview').innerHTML = '<span>Envoi…</span>';
    try {
      const url = await uploadImage(file, productId);
      $('#imgValue').value = url;
      $('#imgPreview').innerHTML = `<img src="${url}" alt=""/>`;
      toast('Photo envoyée');
    } catch (err) {
      $('#imgPreview').innerHTML = '<span>Échec</span>';
      toast(erreurLisible(err), true);
    }
  });

  $('#imgClear').addEventListener('click', () => {
    $('#imgValue').value = '';
    $('#imgPreview').innerHTML = '<span>Aucune</span>';
  });
}

function formData() {
  const out = {};
  $$('#drawerForm [name]').forEach(el => {
    out[el.name] = el.type === 'checkbox' ? el.checked
                 // un nombre laissé vide vaut « non renseigné », pas zéro
                 : el.type === 'number'   ? (el.value === '' ? null : Number(el.value))
                 : el.value.trim();
  });
  return out;
}

/* ==========================================================================
   Écritures
   ========================================================================== */

async function save(table, row, keyCol) {
  const { error } = await sb.from(table).upsert(row, { onConflict: keyCol });
  if (error) { toast(erreurLisible(error), true); return false; }
  toast('Enregistré');
  await catalog.load(true);
  renderAll();
  return true;
}

async function remove(table, keyCol, value, question) {
  if (!confirm(question)) return;
  const { error } = await sb.from(table).delete().eq(keyCol, value);
  if (error) { toast(erreurLisible(error), true); return; }
  toast('Supprimé');
  await catalog.load(true);
  renderAll();
}

/* ==========================================================================
   PRODUITS
   ========================================================================== */

function renderProducts() {
  const q   = $('#prodSearch').value.trim().toLowerCase();
  const cat = $('#prodCatFilter').value;

  const items = catalog.allProducts.filter(p =>
    (!cat || p.category === cat) &&
    (!q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)));

  $('#prodCount').textContent =
    `${catalog.allProducts.length} produit(s) au total · ${items.length} affiché(s)`;

  $('#productList').innerHTML = items.length ? items.map(p => `
    <article class="ad-card ${p.is_active === false ? 'is-off' : ''}">
      <div class="ad-card-thumb">
        ${p.image_url ? `<img src="${esc(p.image_url)}" alt=""/>` : `<span>${esc(p.name.charAt(0))}</span>`}
      </div>
      <div class="ad-card-body">
        <div class="ad-card-title">
          ${esc(p.name)}
          ${p.badge ? `<em class="ad-chip">${esc(p.badge)}</em>` : ''}
          ${p.is_active === false ? '<em class="ad-chip is-muted">Masqué</em>' : ''}
        </div>
        <div class="ad-card-meta">
          ${esc(catalog.label(p.category) || p.category || '—')} ·
          ${Number(p.price).toLocaleString('fr-FR')} FCFA ·
          ${!catalog.suitLeStock(p)
              ? '<span class="ad-stock-free">stock non suivi</span>'
              : `<span class="${p.stock === 0 ? 'ad-stock-out' : p.stock < 6 ? 'ad-stock-low' : ''}">
                   stock ${p.stock}
                 </span>`}
        </div>
      </div>
      <div class="ad-card-actions">
        <button class="ad-btn ad-btn-ghost" data-edit-product="${esc(p.id)}">Modifier</button>
        <button class="ad-btn ad-btn-danger" data-del-product="${esc(p.id)}">Supprimer</button>
      </div>
    </article>`).join('')
    : '<p class="ad-empty">Aucun produit ne correspond.</p>';
}

function editProduct(id) {
  const p = id ? catalog.product(id) : null;
  const isNew = !p;
  const d = p || {
    id: '', category: catalog.categories[0]?.slug || '', name: '', description: '',
    price: 0, stock: null, badge: '', image_url: '', is_active: true
  };

  openDrawer(isNew ? 'Nouveau produit' : 'Modifier le produit', `
    ${field.text('name', 'Nom', d.name)}
    ${field.select('category', 'Catégorie', d.category, catalog.categories.map(c => ({ value: c.slug, label: c.label })))}
    ${field.number('price', 'Prix', d.price, { hint: 'en FCFA' })}
    ${field.optionalNumber('stock', 'Stock', d.stock, {
        hint: 'facultatif', placeholder: 'laisser vide si vous ne comptez pas'
      })}
    ${field.text('badge', 'Badge', d.badge, { hint: 'facultatif : Nouveau, Best-seller…' })}
    ${field.area('description', 'Description', d.description)}
    ${field.image(d.image_url)}
    ${field.toggle('is_active', 'Visible sur le site', d.is_active !== false)}
  `, async () => {
    const v = formData();
    if (!v.name) { toast('Le nom est obligatoire', true); return; }
    v.id = isNew ? slugify(v.name) + '-' + Date.now().toString(36).slice(-4) : d.id;
    if (await save('products', v, 'id')) closeDrawer();
  });

  wireImageField(d.id || 'nouveau');
}

/* ==========================================================================
   EMBALLAGES (« box »)
   ========================================================================== */

function renderBoxes() {
  const items = catalog.allBoxes;

  $('#boxList').innerHTML = items.length ? items.map(b => `
    <article class="ad-card ${b.is_active === false ? 'is-off' : ''}">
      <div class="ad-card-thumb">
        ${b.image_url ? `<img src="${esc(b.image_url)}" alt=""/>` : `<span>${esc((b.name || '?').charAt(0))}</span>`}
      </div>
      <div class="ad-card-body">
        <div class="ad-card-title">
          ${esc(b.name)}
          ${b.is_active === false ? '<em class="ad-chip is-muted">Masqué</em>' : ''}
        </div>
        <div class="ad-card-meta">${Number(b.price).toLocaleString('fr-FR')} FCFA</div>
      </div>
      <div class="ad-card-actions">
        <button class="ad-btn ad-btn-ghost" data-edit-box="${esc(b.id)}">Modifier</button>
        <button class="ad-btn ad-btn-danger" data-del-box="${esc(b.id)}">Supprimer</button>
      </div>
    </article>`).join('')
    : '<p class="ad-empty">Aucun emballage. Le configurateur de coffret restera bloqué à l\'étape « Emballage » tant qu\'aucun n\'est créé.</p>';
}

function editBox(id) {
  const b = id ? catalog.box(id) : null;
  const isNew = !b;
  const d = b || { id: '', name: '', description: '', price: 0, image_url: '', is_active: true };

  openDrawer(isNew ? 'Nouvel emballage' : "Modifier l'emballage", `
    ${field.text('name', 'Nom', d.name)}
    ${field.number('price', 'Prix', d.price, { hint: 'en FCFA, par coffret' })}
    ${field.area('description', 'Description', d.description)}
    ${field.image(d.image_url)}
    ${field.toggle('is_active', 'Proposé aux clients', d.is_active !== false)}
  `, async () => {
    const v = formData();
    if (!v.name) { toast('Le nom est obligatoire', true); return; }
    v.id = isNew ? slugify(v.name) + '-' + Date.now().toString(36).slice(-4) : d.id;
    if (await save('boxes', v, 'id')) closeDrawer();
  });

  wireImageField('box-' + (d.id || 'nouveau'));
}

/* ==========================================================================
   CATÉGORIES
   ========================================================================== */

function renderCategories() {
  $('#categoryList').innerHTML = catalog.groups.map(g => `
    <div class="ad-group">
      <h2 class="ad-group-title">${esc(g.label)}</h2>
      ${catalog.categoriesOfGroup(g.id).map(c => `
        <article class="ad-card">
          <div class="ad-card-thumb ad-card-thumb-icon">${catalog.icon(c.slug, 22)}</div>
          <div class="ad-card-body">
            <div class="ad-card-title">
              ${esc(c.label)}
              ${c.is_brand ? '<em class="ad-chip">Branche</em>' : ''}
            </div>
            <div class="ad-card-meta">${catalog.count(c.slug)} produit(s) · <code>#${esc(c.slug)}</code></div>
          </div>
          <div class="ad-card-actions">
            <button class="ad-btn ad-btn-ghost" data-edit-cat="${esc(c.slug)}">Modifier</button>
            <button class="ad-btn ad-btn-danger" data-del-cat="${esc(c.slug)}">Supprimer</button>
          </div>
        </article>`).join('')}
    </div>`).join('');
}

function editCategory(slug) {
  const c = slug ? catalog.category(slug) : null;
  const isNew = !c;
  const d = c || { slug: '', label: '', group_id: catalog.groups[0]?.id, icon: 'gift', blurb: '', is_brand: false };

  openDrawer(isNew ? 'Nouvelle catégorie' : 'Modifier la catégorie', `
    ${field.text('label', 'Nom affiché', d.label)}
    ${field.select('group_id', 'Univers', d.group_id, catalog.groups.map(g => ({ value: g.id, label: g.label })))}
    ${field.select('icon', 'Icône', d.icon, catalog.iconKeys().map(k => ({ value: k, label: k })))}
    ${field.area('blurb', 'Description courte', d.blurb)}
    ${field.toggle('is_brand', 'Branche à part entière (comme CazChoco)', !!d.is_brand)}
  `, async () => {
    const v = formData();
    if (!v.label) { toast('Le nom est obligatoire', true); return; }
    v.slug = isNew ? slugify(v.label) : d.slug;
    if (await save('categories', v, 'slug')) closeDrawer();
  });
}

/* ==========================================================================
   OCCASIONS ET ÉVÉNEMENTS
   ========================================================================== */

function renderSimpleList(hostId, list, keyName, editAttr, delAttr, subtitle) {
  $(hostId).innerHTML = list.length ? list.map(it => `
    <article class="ad-card">
      <div class="ad-card-thumb ad-card-thumb-icon">${catalog.icon(it.icon, 22)}</div>
      <div class="ad-card-body">
        <div class="ad-card-title">${esc(it.label || it.name)}</div>
        <div class="ad-card-meta">${esc(subtitle(it))}</div>
      </div>
      <div class="ad-card-actions">
        <button class="ad-btn ad-btn-ghost" ${editAttr}="${esc(it[keyName])}">Modifier</button>
        <button class="ad-btn ad-btn-danger" ${delAttr}="${esc(it[keyName])}">Supprimer</button>
      </div>
    </article>`).join('') : '<p class="ad-empty">Rien pour le moment.</p>';
}

function renderOccasions() {
  renderSimpleList('#occasionList', catalog.occasions, 'id',
    'data-edit-occ', 'data-del-occ', it => `Icône : ${it.icon}`);
}

function editOccasion(id) {
  const o = id ? catalog.occasions.find(x => x.id === id) : null;
  const isNew = !o;
  const d = o || { id: '', label: '', icon: 'gift' };

  openDrawer(isNew ? 'Nouvelle occasion' : "Modifier l'occasion", `
    ${field.text('label', 'Nom', d.label)}
    ${field.select('icon', 'Icône', d.icon, catalog.iconKeys().map(k => ({ value: k, label: k })))}
  `, async () => {
    const v = formData();
    if (!v.label) { toast('Le nom est obligatoire', true); return; }
    v.id = isNew ? slugify(v.label) : d.id;
    if (await save('occasions', v, 'id')) closeDrawer();
  });
}

function renderEvents() {
  renderSimpleList('#eventList', catalog.events, 'id',
    'data-edit-ev', 'data-del-ev', it => (it.description || '').slice(0, 90) + '…');
}

function editEvent(id) {
  const ev = id ? catalog.events.find(x => x.id === id) : null;
  const isNew = !ev;
  const d = ev || { id: '', name: '', icon: 'gift', description: '' };

  openDrawer(isNew ? 'Nouvel événement' : "Modifier l'événement", `
    ${field.text('name', 'Titre', d.name)}
    ${field.select('icon', 'Icône', d.icon, catalog.iconKeys().map(k => ({ value: k, label: k })))}
    ${field.area('description', 'Description', d.description)}
  `, async () => {
    const v = formData();
    if (!v.name) { toast('Le titre est obligatoire', true); return; }
    v.id = isNew ? slugify(v.name) : d.id;
    if (await save('events', v, 'id')) closeDrawer();
  });
}

/* ==========================================================================
   STOCKS
   ========================================================================== */

function renderStocks() {
  const suivis = catalog.allProducts.filter(catalog.suitLeStock);
  const items = [...catalog.allProducts].sort((a, b) => {
    const av = catalog.suitLeStock(a) ? a.stock : Infinity;
    const bv = catalog.suitLeStock(b) ? b.stock : Infinity;
    return av - bv;
  });
  const out = suivis.filter(p => p.stock === 0).length;
  const low = suivis.filter(p => p.stock > 0 && p.stock < 6).length;

  $('#stockSummary').innerHTML = `
    <div class="ad-stat"><b>${items.length}</b><span>références</span></div>
    <div class="ad-stat"><b>${suivis.length}</b><span>suivies</span></div>
    <div class="ad-stat ${out ? 'is-alert' : ''}"><b>${out}</b><span>épuisées</span></div>
    <div class="ad-stat ${low ? 'is-warn' : ''}"><b>${low}</b><span>stock faible</span></div>`;

  $('#stockTable').innerHTML = `
    <thead><tr><th>Produit</th><th>Catégorie</th><th class="ad-num">Stock</th><th></th></tr></thead>
    <tbody>
      ${items.map(p => `
        <tr>
          <td data-label="Produit">${esc(p.name)}</td>
          <td data-label="Catégorie">${esc(catalog.label(p.category) || '—')}</td>
          <td data-label="Stock" class="ad-num">
            <input class="ad-input ad-input-xs" type="number" min="0" placeholder="—"
                   value="${catalog.suitLeStock(p) ? p.stock : ''}" data-stock="${esc(p.id)}"/>
          </td>
          <td data-label="État">
            ${!catalog.suitLeStock(p)
              ? '<span class="ad-pill is-free">Non suivi</span>'
              : `<span class="ad-pill ${p.stock === 0 ? 'is-out' : p.stock < 6 ? 'is-low' : 'is-ok'}">
                   ${p.stock === 0 ? 'Épuisé' : p.stock < 6 ? 'Faible' : 'En stock'}
                 </span>`}
          </td>
        </tr>`).join('')}
    </tbody>`;
}

/* ==========================================================================
   COMMANDES
   ========================================================================== */

const STATUTS = {
  nouvelle:  'Reçue', confirmee: 'Confirmée', preparee: 'En préparation',
  livree:    'Livrée', annulee: 'Annulée'
};

async function renderOrders() {
  const host = $('#orderList');
  const filtre = $('#orderStatusFilter').value;

  let req = sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(100);
  if (filtre) req = req.eq('status', filtre);

  const { data, error } = await req;
  if (error) { host.innerHTML = `<p class="ad-empty">${esc(erreurLisible(error))}</p>`; return; }

  $('#orderCount').textContent = `${data.length} commande(s)`;

  host.innerHTML = data.length ? data.map(o => {
    const date = new Date(o.created_at).toLocaleString('fr-FR',
      { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `
      <article class="ad-card ad-order">
        <div class="ad-card-body">
          <div class="ad-card-title">
            ${esc(o.reference)}
            <em class="ad-chip is-muted">${o.kind === 'coffret' ? 'Coffret' : 'Panier'}</em>
            ${o.user_id ? '' : '<em class="ad-chip is-muted">Sans compte</em>'}
          </div>
          <div class="ad-card-meta">
            ${date} · ${esc(o.customer_name)} · ${esc(o.customer_phone)}
            ${o.delivery_address ? ' · ' + esc(o.delivery_address) : ''}
            ${o.box_name ? ` · Emballage : ${esc(o.box_name)} (${Number(o.box_price).toLocaleString('fr-FR')} F)` : ''}
          </div>
          <ul class="ad-order-items">
            ${o.order_items.map(i => `<li>${esc(i.name)} ×${i.quantity} — ${(i.unit_price * i.quantity).toLocaleString('fr-FR')} F</li>`).join('')}
          </ul>
          ${o.is_gift ? `
            <div class="ad-order-gift">
              <strong>À offrir</strong> — ${esc(o.recipient_name)} · ${esc(o.recipient_phone)}
              ${o.recipient_address ? `<br/>Livraison : ${esc(o.recipient_address)}` : ''}
            </div>` : ''}
          ${o.card_text ? `<p class="ad-order-msg">« ${esc(o.card_text)} »</p>` : ''}
          ${o.card_image_url ? `<a class="ad-order-card-link" href="carte.html?url=${encodeURIComponent(o.card_image_url)}" target="_blank" rel="noopener">Voir la carte personnalisée →</a>` : ''}
          ${!o.card_text && o.message ? `<p class="ad-order-msg">« ${esc(o.message)} »</p>` : ''}
          <div class="ad-order-total">${o.total.toLocaleString('fr-FR')} FCFA</div>
        </div>
        <div class="ad-card-actions ad-order-actions">
          <select class="ad-input ad-input-sm" data-status="${esc(o.id)}">
            ${Object.entries(STATUTS).map(([k, v]) =>
              `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
          <a class="ad-btn ad-btn-ghost" target="_blank" rel="noopener"
             href="https://wa.me/${esc(String((o.is_gift ? o.recipient_phone : o.customer_phone) || o.customer_phone).replace(/\D/g, ''))}">WhatsApp</a>
        </div>
      </article>`;
  }).join('') : '<p class="ad-empty">Aucune commande.</p>';
}

/* ==========================================================================
   Rendu global et branchements
   ========================================================================== */

function renderAll() {
  $('#prodCatFilter').innerHTML =
    '<option value="">Toutes les catégories</option>' +
    catalog.categories.map(c => `<option value="${esc(c.slug)}">${esc(c.label)}</option>`).join('');

  renderProducts();
  renderBoxes();
  renderCategories();
  renderOccasions();
  renderEvents();
  renderStocks();
}

document.addEventListener('click', async e => {
  const t = e.target.closest('button');
  if (!t) return;

  if (t.dataset.editProduct) return editProduct(t.dataset.editProduct);
  if (t.dataset.editBox)     return editBox(t.dataset.editBox);
  if (t.dataset.editCat)     return editCategory(t.dataset.editCat);
  if (t.dataset.editOcc)     return editOccasion(t.dataset.editOcc);
  if (t.dataset.editEv)      return editEvent(t.dataset.editEv);

  if (t.dataset.delProduct) {
    const p = catalog.product(t.dataset.delProduct);
    return remove('products', 'id', p.id, `Supprimer « ${p.name} » ?`);
  }
  if (t.dataset.delBox) {
    const b = catalog.box(t.dataset.delBox);
    return remove('boxes', 'id', b.id, `Supprimer l'emballage « ${b.name} » ?`);
  }
  if (t.dataset.delCat) {
    const c = catalog.category(t.dataset.delCat);
    const n = catalog.count(c.slug);
    return remove('categories', 'slug', c.slug,
      `Supprimer « ${c.label} » ?${n ? ` Ses ${n} produit(s) resteront mais sans catégorie.` : ''}`);
  }
  if (t.dataset.delOcc) return remove('occasions', 'id', t.dataset.delOcc, 'Supprimer cette occasion ?');
  if (t.dataset.delEv)  return remove('events', 'id', t.dataset.delEv, 'Supprimer cet événement ?');
});

document.addEventListener('change', async e => {
  const stock = e.target.closest('[data-stock]');
  if (stock) {
    const val = stock.value === '' ? null : Math.max(0, Number(stock.value) || 0);
    const { error } = await sb.from('products').update({ stock: val }).eq('id', stock.dataset.stock);
    if (error) { toast(erreurLisible(error), true); return; }
    toast('Stock mis à jour');
    await catalog.load(true);
    renderStocks();
    renderProducts();
    return;
  }

  const status = e.target.closest('[data-status]');
  if (status) {
    const { error } = await sb.from('orders').update({ status: status.value }).eq('id', status.dataset.status);
    toast(error ? erreurLisible(error) : 'Statut mis à jour', !!error);
    return;
  }
});

/* ==========================================================================
   Démarrage
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  $$('.ad-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.ad-tab').forEach(t => t.classList.toggle('is-active', t === tab));
      $$('.ad-view').forEach(v => v.classList.toggle('is-active', v.id === 'view-' + tab.dataset.view));
      if (tab.dataset.view === 'commandes') renderOrders();
    });
  });

  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#drawerCancel').addEventListener('click', closeDrawer);
  $('#drawerOverlay').addEventListener('click', closeDrawer);
  $('#drawerSave').addEventListener('click', () => { if (drawerSaveHandler) drawerSaveHandler(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  $('#gateAction').addEventListener('click', () => openAuth('signin'));
  $('#gateSignOut').addEventListener('click', async () => { await auth.signOut(); location.reload(); });

  $('#prodSearch').addEventListener('input', renderProducts);
  $('#prodCatFilter').addEventListener('change', renderProducts);
  $('#orderStatusFilter').addEventListener('change', renderOrders);
  $('#btnRefresh').addEventListener('click', async () => {
    await catalog.load(true); renderAll(); renderOrders(); toast('Données rafraîchies');
  });

  $('#btnNewProduct').addEventListener('click', () => editProduct(null));
  $('#btnNewBox').addEventListener('click', () => editBox(null));
  $('#btnNewCategory').addEventListener('click', () => editCategory(null));
  $('#btnNewOccasion').addEventListener('click', () => editOccasion(null));
  $('#btnNewEvent').addEventListener('click', () => editEvent(null));

  // Les données ne se chargent qu'une fois, à la première entrée autorisée.
  let charge = false;

  async function entrer() {
    if (charge) return;
    charge = true;
    await catalog.load(true);
    renderAll();
    renderOrders();
  }

  async function verifierAcces() {
    if (guardAccess()) await entrer();
  }

  await auth.init();
  auth.onChange(verifierAcces);   // rejoué à chaque connexion ou déconnexion
  await verifierAcces();
});
