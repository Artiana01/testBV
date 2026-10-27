/**
 * Centralized selector constants.
 * Prefer data-testid attributes - they survive UI refactors.
 * Add selectors here when a value is used in 2+ places.
 */

export const SELECTORS = {
  common: {
    navMenu: '[data-testid="nav-menu"]',
    mobileMenuBtn: '[data-testid="mobile-menu-btn"]',
    toastSuccess: '[data-testid="toast-success"]',
    toastError: '[data-testid="toast-error"]',
    loadingSpinner: '[data-testid="loading"]',
  },
  ecommerce: {
    cartIcon: '[data-testid="cart-icon"]',
    cartCount: '[data-testid="cart-count"]',
    cartItem: '[data-testid="cart-item"]',
    productCard: '[data-testid="product-card"]',
    addToCartBtn: '[data-testid="add-to-cart"]',
    checkoutBtn: '[data-testid="checkout-btn"]',
  },
  saas: {
    sidebar: '[data-testid="sidebar"]',
    userMenu: '[data-testid="user-menu"]',
    statCard: '[data-testid="stat-card"]',
    logoutBtn: '[data-testid="logout-btn"]',
  },
  vitrine: {
    heroSection: '[data-testid="hero"]',
    ctaButton: '[data-testid="cta"]',
    contactForm: '[data-testid="contact-form"]',
  },
};
