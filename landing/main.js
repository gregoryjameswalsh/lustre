/* ==============================================
   LUSTRE LANDING PAGE — main.js
   www.simplylustre.com
   ============================================== */

(function () {
  'use strict';

  /* ---- Pricing toggle ---- */
  const toggleBtns = document.querySelectorAll('.toggle-btn');
  const annualPrices = document.querySelectorAll('.annual-price');
  const monthlyPrices = document.querySelectorAll('.monthly-price');
  const annualBillings = document.querySelectorAll('.annual-billing');
  const monthlyBillings = document.querySelectorAll('.monthly-billing');

  function setPeriod(period) {
    const isAnnual = period === 'annual';
    annualPrices.forEach(el => el.classList.toggle('hidden', !isAnnual));
    monthlyPrices.forEach(el => el.classList.toggle('hidden', isAnnual));
    annualBillings.forEach(el => el.classList.toggle('hidden', !isAnnual));
    monthlyBillings.forEach(el => el.classList.toggle('hidden', isAnnual));
    toggleBtns.forEach(btn => {
      const active = btn.dataset.period === period;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => setPeriod(btn.dataset.period));
  });


  /* ---- FAQ accordion ---- */
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const answerId = btn.getAttribute('aria-controls');
      const answer = document.getElementById(answerId);

      // Close all others
      faqQuestions.forEach(other => {
        if (other !== btn) {
          other.setAttribute('aria-expanded', 'false');
          const otherId = other.getAttribute('aria-controls');
          const otherAnswer = document.getElementById(otherId);
          if (otherAnswer) otherAnswer.hidden = true;
        }
      });

      btn.setAttribute('aria-expanded', String(!expanded));
      if (answer) answer.hidden = expanded;
    });
  });


  /* ---- Mobile nav toggle ---- */
  const mobileToggle = document.querySelector('.nav-mobile-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      const open = mobileToggle.getAttribute('aria-expanded') === 'true';
      mobileToggle.setAttribute('aria-expanded', String(!open));
      navLinks.style.display = open ? '' : 'flex';
      if (!open) {
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '64px';
        navLinks.style.left = '0';
        navLinks.style.right = '0';
        navLinks.style.background = '#fff';
        navLinks.style.borderBottom = '1px solid #E2E8F0';
        navLinks.style.padding = '12px 24px 20px';
        navLinks.style.zIndex = '99';
        navLinks.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
      } else {
        navLinks.removeAttribute('style');
      }
    });
  }


  /* ---- Smooth scroll for anchor links ---- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Close mobile nav if open
        if (navLinks && mobileToggle && mobileToggle.getAttribute('aria-expanded') === 'true') {
          mobileToggle.setAttribute('aria-expanded', 'false');
          navLinks.removeAttribute('style');
        }
      }
    });
  });


  /* ---- Nav highlight on scroll ---- */
  const navWrapper = document.querySelector('.nav-wrapper');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navWrapper.style.boxShadow = '0 2px 16px rgba(0,0,0,0.06)';
    } else {
      navWrapper.style.boxShadow = '';
    }
  }, { passive: true });

})();
