/**
 * Admin Utilities
 * Provides admin access control functions
 */

const ADMIN_EMAIL = 'merloproductions@gmail.com';

/** Regex for primary admin email */
const PRIMARY_ADMIN_REGEX = /^merloproductions@gmail\.com$/i;

/** Regex for Gmail +addressing: merloproductions+anything@gmail.com */
const ALIAS_ADMIN_REGEX = /^merloproductions\+[^@]+@gmail\.com$/i;

/**
 * Check if a user is an admin
 * @param {Object|null} user - Firebase auth user object
 * @returns {boolean} True if user is admin
 */
export function isAdmin(user) {
  if (!user || !user.email) return false;
  const email = user.email.trim().toLowerCase();
  return PRIMARY_ADMIN_REGEX.test(email) || ALIAS_ADMIN_REGEX.test(email);
}

/**
 * Get the primary admin email address
 * @returns {string} Admin email
 */
export function getAdminEmail() {
  return ADMIN_EMAIL;
}

/**
 * Get all admin email patterns (for reference / debug)
 * @returns {string[]} Admin email patterns
 */
export function getAdminEmails() {
  return [ADMIN_EMAIL, 'merloproductions+*@gmail.com'];
}
