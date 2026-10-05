// ── UI language, read lazily.
// currentLang is a top-level `let` in i18n.js, so a bare reference throws a
// ReferenceError if that script never ran. Read it at call time and fall back.
const uiLang = () => (typeof currentLang !== 'undefined' ? currentLang : 'es');

// ── Navbar: claro arriba, oscuro al hacer scroll
// El umbral no es solo una sombra: .scrolled cambia el tema entero de la nav
// y funde entre las dos variantes del logo, asi que 20px se disparaba con
// cualquier toque de rueda. 80px pide un scroll deliberado.
// El listener de scroll vive mas abajo, junto al scroll-spy: los dos van en
// el mismo callback para no leer y escribir layout de forma alterna.
const navbar = document.getElementById('navbar');
function updateNavTheme(scrollY) {
  navbar.classList.toggle('scrolled', scrollY > 80);
}

// ── Mobile menu toggle
const ICON_MENU  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>';
const ICON_CLOSE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');
if (mobileToggle && navLinks) {
  mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    mobileToggle.innerHTML = navLinks.classList.contains('open') ? ICON_CLOSE : ICON_MENU;
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      mobileToggle.innerHTML = ICON_MENU;
    });
  });
}

// ── Focus contact form: CTA nav + hero button
// Solo en la home. Las paginas legales cargan este mismo script para tener la
// misma navbar, y ahi no existe la seccion de contacto: los enlaces apuntan a
// index.html#contacto y deben navegar de forma normal, sin preventDefault.
function goToContact(e) {
  e.preventDefault();
  const section = document.getElementById('contacto');
  const input   = document.getElementById('nombre');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (input) setTimeout(() => { input.focus({ preventScroll: true }); }, 600);
}
if (document.getElementById('contacto')) {
  const ctaLink = document.getElementById('ctaLink');
  const heroCta = document.getElementById('heroCta');
  if (ctaLink) ctaLink.addEventListener('click', goToContact);
  if (heroCta) heroCta.addEventListener('click', goToContact);
}

// ── Reveal on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ── Active nav link on scroll
const navSections = ['nosotros', 'servicios', 'sectores', 'contacto']
  .map(id => document.getElementById(id))
  .filter(Boolean);
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]:not(.nav-cta)');

// Sin leer geometria. Esto llamaba a getBoundingClientRect() por seccion en
// cada scroll, y pedir geometria con el estilo recien tocado obliga al
// navegador a recalcular el layout de forma sincrona: 87 ms de reflow forzado
// en el informe de PageSpeed del 20-09-2026, que limitar la frecuencia a un
// pase por frame no quito. El observador recibe lo mismo del navegador sin
// pedirselo.
function setActiveNav(id) {
  navAnchors.forEach(a => {
    a.classList.toggle('nav-active', a.getAttribute('href') === `#${id}`);
  });
}

if (navSections.length) {
  // El margen recorta la raiz a una linea sin altura al 45% de la ventana, que
  // es la altura que decidia la version anterior.
  const crossing = new Set();
  const spy = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) crossing.add(e.target); else crossing.delete(e.target);
    }
    // La linea cruza como mucho una seccion. Cuando no cruza ninguna - el
    // hero, el tramo sin id (why) y el footer - se mantiene la
    // ultima activa, que es lo que hacia el calculo anterior.
    const active = navSections.find(sec => crossing.has(sec));
    if (active) setActiveNav(active.id);
  }, { rootMargin: '-45% 0px -55% 0px' });
  navSections.forEach(sec => spy.observe(sec));
  setActiveNav('nosotros');
}

// El unico listener de scroll que queda solo escribe una clase; no lee nada
// del layout. Va limitado a un pase por frame porque el evento se dispara
// muchas mas veces de las que el navegador llega a pintar.
let scrollScheduled = false;
window.addEventListener('scroll', () => {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    scrollScheduled = false;
    updateNavTheme(window.scrollY);
  });
}, { passive: true });

updateNavTheme(window.scrollY);

// ── Lead capture - endpoint per environment (by hostname)
const isDevHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(location.hostname);
const CRM_BASE  = isDevHost ? 'http://localhost:9090' : 'https://crm.iselia.es';
const LEADS_API = `${CRM_BASE}/api/public/leads/`;

// ── Form submit (solo existe en la home)
const contactForm = document.getElementById('contactForm');
if (contactForm) contactForm.addEventListener('submit', async function(e) {
  e.preventDefault();

  const form    = this;
  const btn     = form.querySelector('.form-submit');
  const errorEl = document.getElementById('formError');

  // Privacy policy opt-in is mandatory
  const consent = form.querySelector('#privacidad');
  if (!consent.checked) {
    errorEl.textContent = uiLang() === 'es'
      ? 'Debes aceptar la Política de Privacidad para continuar.'
      : 'You must accept the Privacy Policy to continue.';
    errorEl.hidden = false;
    consent.focus();
    return;
  }

  const nombre = form.querySelector('#nombre').value.trim();
  const spaceIdx = nombre.indexOf(' ');
  const first_name = spaceIdx === -1 ? nombre : nombre.slice(0, spaceIdx);
  const last_name  = spaceIdx === -1 ? undefined : nombre.slice(spaceIdx + 1) || undefined;

  const employees = form.querySelector('#empleados').value || undefined;
  const sector    = form.querySelector('#sector').value    || undefined;
  const notes     = form.querySelector('#mensaje').value.trim() || undefined;

  const payload = {
    first_name,
    ...(last_name  && { last_name }),
    email:   form.querySelector('#email').value.trim(),
    company: form.querySelector('#empresa').value.trim(),
    ...(employees  && { employees }),
    ...(sector     && { sector }),
    ...(notes      && { notes }),
    campaign: form.querySelector('[name="campaign"]').value,
    privacy_optin: consent.checked,
  };

  const originalHTML = btn.innerHTML;
  btn.disabled  = true;
  btn.innerHTML = uiLang() === 'es' ? 'Enviando…' : 'Sending…';
  errorEl.hidden = true;

  try {
    const res = await fetch(LEADS_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (res.status === 201) {
      form.style.display = 'none';
      document.getElementById('formSuccess').style.display = 'block';
    } else {
      const data = await res.json().catch(() => ({}));
      errorEl.textContent = data.message ||
        (uiLang() === 'es'
          ? 'Ha ocurrido un error. Por favor, inténtalo de nuevo.'
          : 'Something went wrong. Please try again.');
      errorEl.hidden  = false;
      btn.disabled    = false;
      btn.innerHTML   = originalHTML;
    }
  } catch {
    errorEl.textContent = uiLang() === 'es'
      ? 'No se pudo conectar con el servidor. Inténtalo de nuevo.'
      : 'Could not connect to the server. Please try again.';
    errorEl.hidden  = false;
    btn.disabled    = false;
    btn.innerHTML   = originalHTML;
  }
});
