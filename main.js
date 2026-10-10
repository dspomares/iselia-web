// ── UI language, read lazily.
// currentLang is a top-level `let` in i18n.js, so a bare reference throws a
// ReferenceError if that script never ran. Read it at call time and fall back.
const uiLang = () => (typeof currentLang !== 'undefined' ? currentLang : 'es');

// ── Navbar: borde inferior real -> --nav-offset (scroll-margin-top de las
// secciones), para que un ancla deje la seccion justo debajo de la pildora y
// no escondida detras ni a media altura. Se mide al cambiar de tamano la nav
// (fuentes, idioma, salto movil/escritorio), nunca en un evento de scroll.
const navbar = document.getElementById('navbar');
if (navbar) {
  new ResizeObserver(() => {
    document.documentElement.style.setProperty(
      '--nav-offset', `${navbar.offsetTop + navbar.offsetHeight}px`);
  }).observe(navbar);
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
  navbar.querySelectorAll('.nav-links a, .nav-cta').forEach(a => {
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
// Se observan TODAS las secciones, no solo las que tienen enlace: al entrar en
// el hero o en contacto, que no estan en el menu, no queda ningun enlace
// marcado en vez de arrastrar el anterior. Una seccion sin enlace propio puede
// marcar otro con data-nav: "Donde duele" (#retos) marca A quien ayudamos.
const navSections = [...document.querySelectorAll('body > section')];
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

// Sin leer geometria. Esto llamaba a getBoundingClientRect() por seccion en
// cada scroll, y pedir geometria con el estilo recien tocado obliga al
// navegador a recalcular el layout de forma sincrona: 87 ms de reflow forzado
// en el informe de PageSpeed del 20-09-2026, que limitar la frecuencia a un
// pase por frame no quito. El observador recibe lo mismo del navegador sin
// pedirselo.
function setActiveNav(id) {
  navAnchors.forEach(a => {
    a.classList.toggle('nav-active', !!id && a.getAttribute('href') === `#${id}`);
  });
}

if (navAnchors.length && navSections.length) {
  // El margen recorta la raiz a una linea sin altura al 45% de la ventana.
  const crossing = new Set();
  const spy = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) crossing.add(e.target); else crossing.delete(e.target);
    }
    // La linea cruza como mucho una seccion; en el footer no cruza ninguna y
    // se mantiene lo ultimo, que es contacto (sin enlace).
    const active = navSections.find(sec => crossing.has(sec));
    if (active) setActiveNav(active.dataset.nav || active.id);
  }, { rootMargin: '-45% 0px -55% 0px' });
  navSections.forEach(sec => spy.observe(sec));
}

// ── Lead capture - endpoint per environment (by hostname)
const isDevHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(location.hostname);
const CRM_BASE  = isDevHost ? 'http://localhost:9090' : 'https://crm.iselia.es';
const LEADS_API = `${CRM_BASE}/api/public/leads/`;

// ── "Todavia no he lanzado mi negocio": Empresa pasa a opcional (la etiqueta
// cambia "*" por "(opcional)") y Nº de empleados se oculta y se vacia. Las dos
// etiquetas estan en el HTML con su propia clave i18n, asi que esto solo
// alterna `hidden` y no depende de las traducciones de i18n.js.
const sinLanzar = document.getElementById('sinLanzar');
if (sinLanzar) sinLanzar.addEventListener('change', () => {
  const on = sinLanzar.checked;
  document.getElementById('empresa').required = !on;
  document.getElementById('empresaReq').hidden = on;
  document.getElementById('empresaOpt').hidden = !on;
  document.getElementById('sinLanzarHint').hidden = !on;
  document.getElementById('empleadosGroup').hidden = on;
  if (on) document.getElementById('empleados').value = '';
});

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

  // Sin empresa y con "Todavia no he lanzado mi negocio" marcado, el CRM recibe
  // el centinela NO_COMPANY en vez de no recibir el campo.
  const company   = form.querySelector('#empresa').value.trim()
                 || (form.querySelector('#sinLanzar').checked ? 'NO_COMPANY' : undefined);
  const employees = form.querySelector('#empleados').value || undefined;
  const sector    = form.querySelector('#sector').value    || undefined;
  const notes     = form.querySelector('#mensaje').value.trim() || undefined;

  const payload = {
    first_name,
    ...(last_name  && { last_name }),
    email:   form.querySelector('#email').value.trim(),
    ...(company    && { company }),
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
