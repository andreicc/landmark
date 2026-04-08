// Mobile navigation toggle
const menuToggle = document.querySelector('[data-menu-toggle]')
const mobileNav = document.querySelector('.header__mobile-nav')

if (menuToggle && mobileNav) {
  menuToggle.addEventListener('click', () => {
    mobileNav.classList.toggle('is-open')
    const isOpen = mobileNav.classList.contains('is-open')
    menuToggle.setAttribute('aria-expanded', String(isOpen))
  })

  // Close nav on link click (mobile)
  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('is-open')
      menuToggle.setAttribute('aria-expanded', 'false')
    })
  })
}

// Scroll-triggered animations via Intersection Observer
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
