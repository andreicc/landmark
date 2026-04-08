// Mobile navigation toggle
const menuToggle = document.querySelector('[data-menu-toggle]')
const nav = document.querySelector('.header__nav')

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    nav.classList.toggle('is-open')
    const isOpen = nav.classList.contains('is-open')
    menuToggle.setAttribute('aria-expanded', String(isOpen))
  })

  // Close nav on link click (mobile)
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open')
      menuToggle.setAttribute('aria-expanded', 'false')
    })
  })
}

// Scroll-triggered animations via Intersection Observer
// Only animate when user has no motion preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (!prefersReducedMotion) {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  }

  const animateOnScroll = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        animateOnScroll.unobserve(entry.target)
      }
    })
  }, observerOptions)

  document.querySelectorAll('[data-animate]').forEach((el) => {
    animateOnScroll.observe(el)
  })
}
