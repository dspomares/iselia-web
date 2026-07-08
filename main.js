// ── Navbar scroll shadow
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ── Mobile menu toggle
const ICON_MENU  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>';
const ICON_CLOSE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');
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

// ── Focus contact form: CTA nav + hero button
function goToContact(e) {
  e.preventDefault();
  const section = document.getElementById('contacto');
  const input   = document.getElementById('nombre');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => { input.focus({ preventScroll: true }); }, 600);
}
document.getElementById('ctaLink').addEventListener('click', goToContact);
document.getElementById('heroCta').addEventListener('click', goToContact);

// ── Reveal on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ── Active nav link on scroll
const navSections = ['nosotros', 'servicios', 'metodologia', 'contacto']
  .map(id => document.getElementById(id))
  .filter(Boolean);
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]:not(.nav-cta)');

function updateActiveNav() {
  let current = 'nosotros';
  navSections.forEach(section => {
    if (section.getBoundingClientRect().top <= window.innerHeight * 0.45) {
      current = section.id;
    }
  });
  navAnchors.forEach(a => {
    a.classList.toggle('nav-active', a.getAttribute('href') === `#${current}`);
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });
updateActiveNav();

// ── Lead capture — endpoint per environment (by hostname)
const isDevHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(location.hostname);
const CRM_BASE  = isDevHost ? 'http://localhost:9090' : 'https://crm.iselia.es';
const LEADS_API = `${CRM_BASE}/api/public/leads/`;

// ── Form submit
document.getElementById('contactForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const form    = this;
  const btn     = form.querySelector('.form-submit');
  const errorEl = document.getElementById('formError');

  // Privacy policy opt-in is mandatory
  const consent = form.querySelector('#privacidad');
  if (!consent.checked) {
    errorEl.textContent = currentLang === 'es'
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
  btn.innerHTML = currentLang === 'es' ? 'Enviando…' : 'Sending…';
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
        (currentLang === 'es'
          ? 'Ha ocurrido un error. Por favor, inténtalo de nuevo.'
          : 'Something went wrong. Please try again.');
      errorEl.hidden  = false;
      btn.disabled    = false;
      btn.innerHTML   = originalHTML;
    }
  } catch {
    errorEl.textContent = currentLang === 'es'
      ? 'No se pudo conectar con el servidor. Inténtalo de nuevo.'
      : 'Could not connect to the server. Please try again.';
    errorEl.hidden  = false;
    btn.disabled    = false;
    btn.innerHTML   = originalHTML;
  }
});
