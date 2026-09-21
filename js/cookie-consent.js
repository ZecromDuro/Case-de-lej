(function () {
  var storageKey = 'case-de-lej-cookie-consent';

  function applyConsent(choice) {
    localStorage.setItem(storageKey, choice);
    if (choice === 'accepted' && typeof window.initializeMetaPixel === 'function') {
      window.initializeMetaPixel();
    }
  }

  function removeBanner() {
    var banner = document.getElementById('cookieConsent');
    if (banner) banner.remove();
  }

  function createBanner() {
    var banner = document.createElement('section');
    banner.id = 'cookieConsent';
    banner.className = 'cookie-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Choix des cookies');
    banner.innerHTML =
      '<div class="cookie-consent__content">' +
        '<h2>Vos choix de confidentialité</h2>' +
        '<p>Nous utilisons des cookies nécessaires au bon fonctionnement du site et, avec votre accord, des cookies de mesure publicitaire via Meta Pixel.</p>' +
        '<a href="cookies.html">En savoir plus sur les cookies</a>' +
      '</div>' +
      '<div class="cookie-consent__actions">' +
        '<button class="cookie-consent__secondary" type="button" data-cookie-choice="refused">Refuser</button>' +
        '<button class="cookie-consent__primary" type="button" data-cookie-choice="accepted">Accepter</button>' +
      '</div>';

    banner.addEventListener('click', function (event) {
      var choice = event.target.getAttribute('data-cookie-choice');
      if (!choice) return;
      applyConsent(choice);
      removeBanner();
    });
    document.body.appendChild(banner);
  }

  function init() {
    var choice = localStorage.getItem(storageKey);
    if (choice === 'accepted') {
      applyConsent(choice);
    } else if (choice !== 'refused') {
      createBanner();
    }

    document.querySelectorAll('[data-reset-cookie-consent]').forEach(function (button) {
      button.addEventListener('click', function () {
        localStorage.removeItem(storageKey);
        createBanner();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
