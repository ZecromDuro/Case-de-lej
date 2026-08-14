/* ==========================================================================
   COMPTE CLIENT — entièrement facultatif.
   On peut commander sans jamais s'inscrire. Le compte sert seulement à
   retrouver ses commandes et à ne pas ressaisir ses coordonnées.
   ========================================================================== */

const auth = {
  user: null,
  profile: null,
  _listeners: [],
  _signUpPending: false,
  _signInPending: false,

  async init() {
    // Un seul abonnement aux changements de session, même si init() est
    // appelée par plusieurs scripts de la page.
    if (this._initialised) return;
    this._initialised = true;

    const { data: sessionData } = await sb.auth.getSession();
    const session = sessionData?.session || null;

    if (session) {
      await this._apply(session);
    } else {
      const { data: userData, error } = await sb.auth.getUser();
      if (!error && userData?.user) {
        await this._apply({ user: userData.user });
      } else {
        this.user = null;
        this.profile = null;
        this._listeners.forEach(fn => fn(this.user, this.profile));
        renderAccountUI();
      }
    }

    sb.auth.onAuthStateChange(async (_event, session) => {
      await this._apply(session);
    });
  },

  async _apply(session) {
    this.user = session ? session.user : null;
    this.profile = null;

    if (this.user) {
      try {
        const { data, error } = await sb.from('profiles').select('*').eq('id', this.user.id).maybeSingle();
        if (error) {
          console.error('[auth] impossible de lire le profil:', error);
        } else {
          this.profile = data || null;
        }
      } catch (err) {
        console.error('[auth] erreur de lecture du profil:', err);
      }
    }

    this._listeners.forEach(fn => fn(this.user, this.profile));
    renderAccountUI();
  },

  onChange(fn) {
    this._listeners.push(fn);
    if (this.user !== undefined) fn(this.user, this.profile);
  },

  get isAdmin() { return !!(this.profile && this.profile.is_admin); },

  /** Nom et téléphone pré-remplis pour le formulaire de commande. */
  prefill() {
    if (!this.user) return { name: '', phone: '', email: '', address: '' };
    return {
      name:    (this.profile && this.profile.full_name) || '',
      phone:   (this.profile && this.profile.phone) || '',
      email:   this.user.email || '',
      address: (this.profile && this.profile.address) || ''
    };
  },

  async signUp({ email, password, fullName, phone }) {
    if (this._signUpPending) {
      throw new Error('Une création de compte est déjà en cours.');
    }

    this._signUpPending = true;
    try {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: location.origin + '/compte.html',
          data: { full_name: fullName, phone }
        }
      });
      if (error) throw error;
      if (data?.session) await this._apply(data.session);
      // Renvoie la session si elle existe : sans confirmation d'e-mail,
      // la personne est connectée immédiatement.
      return data?.session || null;
    } finally {
      this._signUpPending = false;
    }
  },

  async signIn({ email, password }) {
    if (this._signInPending) {
      throw new Error('Une connexion est déjà en cours.');
    }

    this._signInPending = true;
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data?.session) {
        await this._apply(data.session);
      } else {
        const { data: userData, error: userError } = await sb.auth.getUser();
        if (!userError && userData?.user) await this._apply({ user: userData.user });
      }

      // On s'assure que la session est bien enregistrée avant de rendre la
      // main : sinon une navigation immédiate peut partir sans elle.
      await sb.auth.getSession();
    } finally {
      this._signInPending = false;
    }
  },

  async signOut() {
    await sb.auth.signOut();
    this.user = null;
    this.profile = null;
    this._listeners.forEach(fn => fn(this.user, this.profile));
    renderAccountUI();
  },

  async resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + '/compte.html'
    });
    if (error) throw error;
  },

  async saveProfile(fields) {
    if (!this.user) return;
    const { error } = await sb.from('profiles').update(fields).eq('id', this.user.id);
    if (error) throw error;
    this.profile = { ...this.profile, ...fields };
  },

  async myOrders() {
    if (!this.user) return [];
    const { data, error } = await sb
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
};

/* ==========================================================================
   Fenêtre de connexion
   ========================================================================== */

function ensureAuthModal() {
  if (document.getElementById('authModal')) return;

  const el = document.createElement('div');
  el.className = 'auth-overlay';
  el.id = 'authModal';
  el.innerHTML = `
    <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <button class="auth-close" id="authClose" aria-label="Fermer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <h2 class="auth-title" id="authTitle">Se connecter</h2>
      <p class="auth-note" id="authNote">
        Le compte est facultatif : vous pouvez commander sans vous inscrire.
        Il sert à retrouver vos commandes et à ne pas ressaisir vos coordonnées.
      </p>

      <form id="authForm" novalidate>
        <div class="auth-field" id="fieldName" hidden>
          <label for="authName">Nom complet</label>
          <input id="authName" name="fullName" autocomplete="name"/>
        </div>
        <div class="auth-field" id="fieldPhone" hidden>
          <label for="authPhone">Téléphone</label>
          <input id="authPhone" name="phone" type="tel" autocomplete="tel" placeholder="+225 07 07 77 31 97"/>
        </div>
        <div class="auth-field">
          <label for="authEmail">Adresse e-mail</label>
          <input id="authEmail" name="email" type="email" autocomplete="email" required/>
        </div>
        <div class="auth-field">
          <label for="authPassword">Mot de passe</label>
          <div class="auth-password-wrap">
            <input id="authPassword" name="password" type="password" autocomplete="current-password" required minlength="8"/>
            <button type="button" class="auth-password-toggle" id="authPasswordToggle" aria-label="Afficher le mot de passe" aria-pressed="false">
              <svg class="eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <svg class="eye-closed" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" hidden>
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.4 19.4 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a19.5 19.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

        <p class="auth-error" id="authError" hidden></p>

        <button type="submit" class="btn btn-primary auth-submit" id="authSubmit">Se connecter</button>
      </form>

      <div class="auth-switch">
        <button type="button" id="authToggle">Pas encore de compte ? S'inscrire</button>
        <button type="button" id="authForgot">Mot de passe oublié</button>
      </div>
    </div>`;

  document.body.appendChild(el);

  let mode = 'signin';

  const setMode = (m) => {
    mode = m;
    const signup = m === 'signup';
    document.getElementById('authTitle').textContent = signup ? 'Créer un compte' : 'Se connecter';
    document.getElementById('fieldName').hidden = !signup;
    document.getElementById('fieldPhone').hidden = !signup;
    document.getElementById('authSubmit').textContent = signup ? 'Créer mon compte' : 'Se connecter';
    document.getElementById('authToggle').textContent = signup
      ? 'Déjà un compte ? Se connecter'
      : "Pas encore de compte ? S'inscrire";
    document.getElementById('authPassword').autocomplete = signup ? 'new-password' : 'current-password';
    hideError();
  };

  const showError = (msg) => {
    const p = document.getElementById('authError');
    p.textContent = msg;
    p.hidden = false;
  };
  const hideError = () => { document.getElementById('authError').hidden = true; };

  document.getElementById('authToggle').addEventListener('click', () =>
    setMode(mode === 'signup' ? 'signin' : 'signup'));

  document.getElementById('authPasswordToggle').addEventListener('click', function () {
    const input = document.getElementById('authPassword');
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    this.setAttribute('aria-pressed', String(!visible));
    this.setAttribute('aria-label', visible ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
    this.querySelector('.eye-open').hidden = !visible;
    this.querySelector('.eye-closed').hidden = visible;
  });

  document.getElementById('authClose').addEventListener('click', closeAuth);
  el.addEventListener('click', e => { if (e.target === el) closeAuth(); });

  document.getElementById('authForgot').addEventListener('click', async () => {
    const email = document.getElementById('authEmail').value.trim();
    if (!email) { showError('Renseignez votre e-mail, puis recliquez.'); return; }
    try {
      await auth.resetPassword(email);
      showToast('E-mail de réinitialisation envoyé');
      closeAuth();
    } catch (err) { showError(traduireErreur(err)); }
  });

  document.getElementById('authForm').addEventListener('submit', async e => {
    e.preventDefault();
    hideError();
    const btn = document.getElementById('authSubmit');
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    if (password.length < 8) { showError('Le mot de passe doit faire au moins 8 caractères.'); return; }

    const libelle = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Un instant…';

    try {
      if (mode === 'signup') {
        const session = await auth.signUp({
          email, password,
          fullName: document.getElementById('authName').value.trim(),
          phone: document.getElementById('authPhone').value.trim()
        });
        showToast(session ? 'Compte créé. Bienvenue !' : 'Compte créé. Vérifiez votre boîte mail.');
      } else {
        await auth.signIn({ email, password });
        // Pas de redirection automatique ici : quitter la page avant que la
        // session soit écrite dans le navigateur faisait arriver sur le
        // tableau de bord sans session, d'où l'écran « Connexion requise ».
        showToast('Bienvenue');
      }
      closeAuth();
    } catch (err) {
      // Surtout ne pas repasser par setMode ici : il efface le message d'erreur
      // qu'on vient d'afficher, et l'échec devient invisible.
      showError(traduireErreur(err));
    } finally {
      btn.disabled = false;
      btn.textContent = libelle;
    }
  });

  el._setMode = setMode;
}

function traduireErreur(err) {
  const m = (err && err.message) || '';
  const code = (err && (err.status || err.code)) || 0;

  if (/Invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.';
  if (/User already registered/i.test(m))   return 'Un compte existe déjà avec cet e-mail.';
  if (/Email not confirmed/i.test(m))       return 'Confirmez votre e-mail avant de vous connecter.';
  if (/email address .*invalid|is invalid/i.test(m)) {
    return 'Cette adresse est refusée. Utilisez une adresse réelle (Gmail, Yahoo, Outlook…).';
  }
  if (/error sending|smtp|confirmation email/i.test(m)) {
    return "L'e-mail de confirmation n'a pas pu partir, le compte n'a donc pas été créé. " +
           'Vous pouvez commander sans compte en attendant.';
  }
  if (code === 429 || /429|rate limit|too many requests|too many/i.test(m)) {
    return "Limite d'envoi d'e-mails atteinte sur Supabase. Patientez environ une heure, " +
           'ou commandez sans compte — c’est possible et sans perte.';
  }
  if (/Password should be/i.test(m))        return 'Mot de passe trop court (8 caractères minimum).';
  if (/fetch|network/i.test(m))             return 'Connexion impossible. Vérifiez votre réseau.';
  if (/Une création de compte est déjà en cours|Une connexion est déjà en cours/i.test(m)) {
    return 'Une demande est déjà en cours, veuillez patienter quelques secondes.';
  }
  return m || 'Une erreur est survenue.';
}

function openAuth(mode) {
  ensureAuthModal();
  const el = document.getElementById('authModal');
  el._setMode(mode || 'signin');
  el.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('authEmail').focus(), 120);
}

function closeAuth() {
  const el = document.getElementById('authModal');
  if (!el) return;
  el.classList.remove('is-open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAuth(); });

/* ==========================================================================
   Bouton de compte dans la barre de navigation
   ========================================================================== */

function renderAccountUI() {
  document.querySelectorAll('.nav-account').forEach(host => {
    if (auth.user) {
      const nom = (auth.profile && auth.profile.full_name) || auth.user.email;
      host.innerHTML = `
        <a class="nav-account-btn is-in" href="compte.html" title="${nom}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span class="nav-account-name">${nom.split(' ')[0]}</span>
        </a>`;
    } else {
      host.innerHTML = `
        <button class="nav-account-btn" onclick="openAuth('signin')" aria-label="Se connecter">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </button>`;
    }
  });

  // Lien admin visible seulement pour un administrateur connecté
  document.querySelectorAll('.admin-only').forEach(el => {
    el.hidden = !(auth.user && auth.isAdmin);
  });
}
