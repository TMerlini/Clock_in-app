/**
 * Admin Utilities
 * Provides admin access control functions
 */

const ADMIN_EMAIL = 'merloproductions@gmail.com';

/**
 * Check if a user is an admin
 * @param {Object|null} user - Firebase auth user object
 * @returns {boolean} True if user is admin
 */
export function isAdmin(user) {
  if (!user || !user.email) return false;
  return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Get the admin email address
 * @returns {string} Admin email
 */
export function getAdminEmail() {
  return ADMIN_EMAIL;
}
