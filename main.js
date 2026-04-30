// ── Navbar scroll shadow
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ── Mobile menu toggle
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');
mobileToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  mobileToggle.textContent = navLinks.classList.contains('open') ? '✕' : '☰';
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    mobileToggle.textContent = '☰';
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

// ── Form submit
document.getElementById('contactForm').addEventListener('submit', function(e) {
  e.preventDefault();
  this.style.display = 'none';
  document.getElementById('formSuccess').style.display = 'block';
});
