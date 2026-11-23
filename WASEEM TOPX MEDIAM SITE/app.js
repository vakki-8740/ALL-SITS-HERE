/**
 * TOPX Game Support - Interactive Scripts
 * iOS-style micro-interactions & functionality
 */

// ===== GALLERY / GUIDE IMAGES - TAP TO ENLARGE (iOS style) =====
function initGalleryEffects() {
  const galleryImages = document.querySelectorAll('.guide-imgs img, .gallery-img, .guide-img');

  galleryImages.forEach(img => {
    img.addEventListener('click', function () {
      this.style.transition = 'transform 0.25s ease, border-color 0.25s ease';
      this.style.transform = 'scale(1.06)';
      this.style.borderColor = 'var(--accent-red)';

      setTimeout(() => {
        this.style.transform = '';
        this.style.borderColor = '';
      }, 300);
    });
  });
}

// ===== IOS-STYLE HOVER EFFECTS FOR CARDS =====
function initCardEffects() {
  const cards = document.querySelectorAll('.service-card, .guide-card-modern, .trust-badge-modern, .ios-card');

  cards.forEach(card => {
    card.addEventListener('mouseenter', function () {
      this.style.borderColor = 'rgba(255, 59, 48, 0.4)';
    });
    card.addEventListener('mouseleave', function () {
      this.style.borderColor = 'rgba(255, 255, 255, 0.06)';
    });
  });
}

// ===== PRELOAD IMPORTANT IMAGES FOR SMOOTH iOS EXPERIENCE =====
// NOTE: IMAGES/LOGO.png preload nahi karte (rel="icon" / <img> se already load hota hai).
// Path galat ho to console me 404 spam hota hai.
function preloadImportantImages() {
  const importantImages = [
    'https://i.ibb.co/7xSSBr0h/Chat-GPT-Image-May-22-2026-05-11-42-PM.png',
    'https://i.ibb.co/4nNPvKMs/Chat-GPT-Image-May-22-2026-05-11-45-PM.png',
    'https://i.ibb.co/zVvJDQf0/Chat-GPT-Image-May-22-2026-05-11-48-PM.png',
    'https://i.ibb.co/8gL71Mfn/Chat-GPT-Image-May-22-2026-05-11-50-PM.png',
    'https://i.ibb.co/JPGQZKf/Chat-GPT-Image-May-22-2026-05-11-52-PM.png'
  ];

  importantImages.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

// ===== DETECT IOS DEVICE FOR ENHANCED EXPERIENCE =====
function detectIOS() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    document.body.classList.add('ios-device');
    console.log('🍎 iOS device detected - Enhanced interactions enabled');
  }
}

// ===== INIT (DOMContentLoaded se pehle bhi safe) =====
function initTopxUI() {
  initGalleryEffects();
  initCardEffects();
  preloadImportantImages();
  detectIOS();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTopxUI);
} else {
  initTopxUI();
}

// Baaki scripts ke liye bhi available
window.TopxUI = { init: initTopxUI };
