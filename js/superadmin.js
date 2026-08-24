/* ==========================================================================
   PANNEAU PROPRIÉTAIRE — réservé à un seul compte. L'accès est confirmé côté
   base par la fonction is_owner() : même si quelqu'un d'autre affichait cette
   page, la lecture et l'écriture de app_settings resteraient refusées par la
   RLS. Ce script ne fait qu'éviter de montrer le panneau à qui que ce soit
   d'autre.
   ========================================================================== */

const OWNER_EMAIL = 'yjeanaristide@gmail.com';
const LOG_LIMIT = 300;

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg, isError) {
  const el = $('#adToast');
  el.textContent = msg;
  el.classList.toggle('is-error', !!isError);
  el.classList.add('is-on');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('is-on'), 3200);
}

function estProprietaire() {
  return !!(auth.user && auth.user.email &&
    auth.user.email.toLowerCase() === OWNER_EMAIL.toLowerCase() && auth.isAdmin);
}

async function chargerReglages() {
  const { data, error } = await sb.from('app_settings').select('*').eq('id', 1).maybeSingle();
  if (error || !data) {
    $('#saLabel').textContent = 'Réglages introuvables';
    $('#saState').textContent = error ? error.message : '';
    return;
  }

  const toggle = $('#saToggle');
  toggle.checked = !!data.writes_blocked;
  toggle.disabled = false;
  $('#saLabel').textContent = data.writes_blocked ? 'Écritures bloquées' : 'Écritures autorisées';
  $('#saState').textContent = data.writes_blocked
    ? 'Le compte client ne peut plus rien ajouter ni modifier.'
    : 'Le compte client peut travailler normalement.';
  $('#saUpdated').textContent = data.updated_at
    ? 'Dernier changement : ' + new Date(data.updated_at).toLocaleString('fr-FR')
    : '';
}

async function basculer(checked) {
  const toggle = $('#saToggle');
  toggle.disabled = true;
  const { error } = await sb.from('app_settings')
    .update({ writes_blocked: checked, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) {
    toast('Échec : ' + error.message, true);
    toggle.checked = !checked;
    toggle.disabled = false;
    return;
  }
  toast(checked ? 'Écritures bloquées' : 'Écritures réautorisées');
  await chargerReglages();
}

/* ==========================================================================
   Journal d'activité
   ========================================================================== */

const EVENT_LABELS = {
  page_view:     { label: 'Visite',      cls: 'is-view'   },
  login:         { label: 'Connexion',   cls: 'is-login'  },
  signup:        { label: 'Inscription', cls: 'is-signup' },
  write_attempt: { label: 'Écriture',    cls: 'is-write'  }
};

function formatDetails(row) {
  if (row.event_type === 'page_view') return row.path || '—';
  if (row.event_type === 'write_attempt') {
    const bloque = row.details && row.details.bloque;
    const statut = row.success === false
      ? `<span class="ad-log-bad">${bloque ? 'bloqué' : 'échec'}</span>`
      : '<span class="ad-log-ok">ok</span>';
    return `${esc(row.action || '—')} — ${statut}`;
  }
  return esc(row.path || row.action || '—');
}

async function chargerJournal() {
  const type = $('#saLogFilter').value;
  let req = sb.from('activity_log').select('*').order('created_at', { ascending: false }).limit(LOG_LIMIT);
  if (type) req = req.eq('event_type', type);

  const { data, error } = await req;
  if (error) {
    $('#saLogTable').innerHTML = `<thead></thead><tbody><tr><td>${esc(error.message)}</td></tr></tbody>`;
    return;
  }

  const total = data.length;
  const parType = data.reduce((acc, r) => { acc[r.event_type] = (acc[r.event_type] || 0) + 1; return acc; }, {});
  const bloques = data.filter(r => r.event_type === 'write_attempt' && r.details && r.details.bloque).length;

  $('#saLogStats').innerHTML = `
    <div class="ad-stat"><b>${total}</b><span>événements (${LOG_LIMIT} max)</span></div>
    <div class="ad-stat"><b>${parType.page_view || 0}</b><span>visites</span></div>
    <div class="ad-stat"><b>${(parType.login || 0) + (parType.signup || 0)}</b><span>connexions</span></div>
    <div class="ad-stat ${bloques ? 'is-alert' : ''}"><b>${bloques}</b><span>écritures bloquées</span></div>`;

  $('#saLogTable').innerHTML = `
    <thead><tr><th>Date</th><th>Type</th><th>Compte</th><th>Détail</th></tr></thead>
    <tbody>
      ${data.length ? data.map(r => {
        const meta = EVENT_LABELS[r.event_type] || { label: r.event_type, cls: 'is-write' };
        const date = new Date(r.created_at).toLocaleString('fr-FR',
          { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return `
          <tr>
            <td data-label="Date">${date}</td>
            <td data-label="Type"><span class="ad-log-badge ${meta.cls}">${esc(meta.label)}</span></td>
            <td data-label="Compte">${esc(r.user_email || 'Visiteur anonyme')}</td>
            <td data-label="Détail">${formatDetails(r)}</td>
          </tr>`;
      }).join('') : '<tr><td colspan="4">Rien pour le moment.</td></tr>'}
    </tbody>`;
}

async function verifierAcces() {
  const gate = $('#saGate');
  const app  = $('#saApp');

  if (!estProprietaire()) {
    gate.hidden = false;
    app.hidden = true;
    return;
  }

  gate.hidden = true;
  app.hidden = false;
  await chargerReglages();
  await chargerJournal();
}

document.addEventListener('DOMContentLoaded', async () => {
  $('#saToggle').addEventListener('change', e => basculer(e.target.checked));
  $('#saLogFilter').addEventListener('change', chargerJournal);
  $('#saLogRefresh').addEventListener('click', chargerJournal);
  await auth.init();
  auth.onChange(verifierAcces);
  await verifierAcces();
});
