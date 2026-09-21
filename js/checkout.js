/* ==========================================================================
   COMMANDE — enregistrée en base, puis transmise par WhatsApp.
   Fonctionne avec ou sans compte. Le total est recalculé côté serveur.
   ========================================================================== */

const PHONE_LEJ = '2250707773197';

function ensureCheckoutModal() {
  if (document.getElementById('checkoutModal')) return;

  const el = document.createElement('div');
  el.className = 'auth-overlay';
  el.id = 'checkoutModal';
  el.innerHTML = `
    <div class="auth-modal checkout-modal" role="dialog" aria-modal="true" aria-labelledby="coTitle">
      <button class="auth-close" id="coClose" aria-label="Fermer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <h2 class="auth-title" id="coTitle">Finaliser la commande</h2>
      <p class="auth-note" id="coGuestNote">
        Pas besoin de compte pour commander. Renseignez simplement de quoi vous rappeler.
        <button type="button" class="auth-inline-link" onclick="closeCheckout();openAuth('signin')">Se connecter</button>
      </p>

      <div class="co-recap" id="coRecap"></div>

      <form id="coForm" novalidate>
        <div class="auth-field">
          <label for="coName">Nom complet <span aria-hidden="true">*</span></label>
          <input id="coName" name="name" autocomplete="name" required/>
        </div>
        <div class="auth-field">
          <label for="coPhone">Téléphone (WhatsApp) <span aria-hidden="true">*</span></label>
          <input id="coPhone" name="phone" type="tel" autocomplete="tel" required placeholder="+225 07 07 77 31 97"/>
        </div>
        <div class="auth-field">
          <label for="coEmail">E-mail <em>facultatif</em></label>
          <input id="coEmail" name="email" type="email" autocomplete="email"/>
        </div>
        <div class="auth-field">
          <label for="coAddress">Adresse de livraison <em>facultatif</em></label>
          <input id="coAddress" name="address" autocomplete="street-address" placeholder="Quartier, repère…"/>
        </div>
        <div class="auth-field" id="coMessageField">
          <label for="coMessage">Message <em>facultatif</em></label>
          <textarea id="coMessage" name="message" rows="2"></textarea>
        </div>

        <label class="auth-check" id="coSaveWrap" hidden>
          <input type="checkbox" id="coSave" checked/>
          <span>Mémoriser ces informations dans mon compte</span>
        </label>

        <p class="auth-error" id="coError" hidden></p>

        <button type="submit" class="btn btn-whatsapp co-submit" id="coSubmit">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>
          Valider et envoyer sur WhatsApp
        </button>
      </form>
    </div>`;

  document.body.appendChild(el);

  document.getElementById('coClose').addEventListener('click', closeCheckout);
  el.addEventListener('click', e => { if (e.target === el) closeCheckout(); });
  document.getElementById('coForm').addEventListener('submit', submitCheckout);
}

let checkoutContext = null;

/**
 * @param {object} ctx
 *   kind      'panier' | 'coffret'
 *   items     [{ id, name, price, qty }]
 *   occasion  string
 *   boxCount  number
 *   onDone    callback après succès
 */
function openCheckout(ctx) {
  if (!ctx.items || !ctx.items.length) { showToast('Votre sélection est vide'); return; }

  ensureCheckoutModal();
  checkoutContext = ctx;

  const unit  = ctx.items.reduce((s, i) => s + i.price * i.qty, 0);
  const boxes = Math.max(1, ctx.boxCount || 1);

  document.getElementById('coRecap').innerHTML = `
    ${ctx.items.map(i => `
      <div class="co-line">
        <span>${i.name} <em>×${i.qty}</em></span>
        <span>${(i.price * i.qty).toLocaleString('fr-FR')} F</span>
      </div>`).join('')}
    ${boxes > 1 ? `<div class="co-line co-line-sub"><span>${boxes} coffrets identiques</span><span>×${boxes}</span></div>` : ''}
    <div class="co-total"><span>Total estimé</span><span>${(unit * boxes).toLocaleString('fr-FR')} FCFA</span></div>`;

  document.getElementById('coMessageField').hidden = ctx.kind !== 'coffret';

  // Pré-remplissage si la personne est connectée
  const pre = auth.prefill();
  document.getElementById('coName').value    = pre.name;
  document.getElementById('coPhone').value   = pre.phone;
  document.getElementById('coEmail').value   = pre.email;
  document.getElementById('coAddress').value = pre.address;
  document.getElementById('coSaveWrap').hidden = !auth.user;
  document.getElementById('coGuestNote').hidden = !!auth.user;

  document.getElementById('coError').hidden = true;
  document.getElementById('checkoutModal').classList.add('is-open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('coName').focus(), 120);
}

function closeCheckout() {
  const el = document.getElementById('checkoutModal');
  if (!el) return;
  el.classList.remove('is-open');
  document.body.style.overflow = '';
}

async function submitCheckout(e) {
  e.preventDefault();
  const err  = document.getElementById('coError');
  const btn  = document.getElementById('coSubmit');
  err.hidden = true;

  const name    = document.getElementById('coName').value.trim();
  const phone   = document.getElementById('coPhone').value.trim();
  const email   = document.getElementById('coEmail').value.trim();
  const address = document.getElementById('coAddress').value.trim();
  const message = document.getElementById('coMessage').value.trim();

  if (!name || !phone) {
    err.textContent = 'Le nom et le téléphone sont nécessaires pour vous recontacter.';
    err.hidden = false;
    return;
  }

  btn.disabled = true;
  const label = btn.innerHTML;
  btn.textContent = 'Enregistrement…';

  try {
    const { data, error } = await sb.rpc('place_order', {
      p_kind:      checkoutContext.kind,
      p_name:      name,
      p_phone:     phone,
      p_email:     email || null,
      p_address:   address,
      p_occasion:  checkoutContext.occasion || '',
      p_box_count: Math.max(1, checkoutContext.boxCount || 1),
      p_message:   message,
      p_items:     checkoutContext.items.map(i => ({ id: i.id, qty: i.qty }))
    });

    if (error) throw error;
    const order = Array.isArray(data) ? data[0] : data;

    // Mémorisation des coordonnées pour les prochaines fois
    if (auth.user && document.getElementById('coSave').checked) {
      auth.saveProfile({ full_name: name, phone, address }).catch(() => {});
    }

    const lignes = checkoutContext.items
      .map(i => `• ${i.name} ×${i.qty}`).join('\n');

    const texte = encodeURIComponent(
      `Bonjour La Case de LEJ,\n\n` +
      `Commande *${order.reference}*\n\n` +
      (checkoutContext.kind === 'coffret'
        ? `${checkoutContext.boxCount} coffret(s) — ${checkoutContext.occasion || 'occasion non précisée'}\n\nContenu par coffret :\n`
        : `Produits :\n`) +
      `${lignes}\n\n` +
      `Total estimé : ${order.total.toLocaleString('fr-FR')} FCFA\n` +
      `Nom : ${name}\nTéléphone : ${phone}\n` +
      (address ? `Livraison : ${address}\n` : '') +
      (message ? `\nMessage : ${message}\n` : '') +
      `\nMerci de confirmer la disponibilité et la livraison.`
    );

    closeCheckout();
    showToast(`Commande ${order.reference} enregistrée`);
    if (checkoutContext.onDone) checkoutContext.onDone(order);

    window.open(`https://wa.me/${PHONE_LEJ}?text=${texte}`, '_blank');
  } catch (ex) {
    err.textContent = traduireErreurCommande(ex);
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.innerHTML = label;
  }
}

function traduireErreurCommande(err) {
  const m = (err && err.message) || '';
  if (/Produit indisponible/i.test(m)) return "Un produit de votre sélection n'est plus disponible. Retirez-le et réessayez.";
  if (/commande est vide/i.test(m))    return 'Votre sélection est vide.';
  if (/obligatoires/i.test(m))         return 'Le nom et le téléphone sont obligatoires.';
  if (/fetch|network/i.test(m))        return 'Connexion impossible. Vérifiez votre réseau et réessayez.';
  return "La commande n'a pas pu être enregistrée. Réessayez ou écrivez-nous sur WhatsApp.";
}
