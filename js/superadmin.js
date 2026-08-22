/* ==========================================================================
   PANNEAU PROPRIÉTAIRE — réservé à un seul compte. L'accès est confirmé côté
   base par la fonction is_owner() : même si quelqu'un d'autre affichait cette
   page, la lecture et l'écriture de app_settings resteraient refusées par la
   RLS. Ce script ne fait qu'éviter de montrer le panneau à qui que ce soit
   d'autre.
   ========================================================================== */

const OWNER_EMAIL = 'yjeanaristide@gmail.com';

const $ = (s, r = document) => r.querySelector(s);

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
}

document.addEventListener('DOMContentLoaded', async () => {
  $('#saToggle').addEventListener('change', e => basculer(e.target.checked));
  await auth.init();
  auth.onChange(verifierAcces);
  await verifierAcces();
});
