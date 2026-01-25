/**
 * Enterprise helpers – Firestore operations for enterprises, invites, and members.
 *
 * Data model:
 * - enterprises: { id, name, createdAt, createdBy }
 * - enterpriseInvites: { enterpriseId, email (lowercase), invitedBy, invitedAt, status: 'pending'|'accepted'|'declined' }
 * - userSettings: extend with enterpriseId (string|null), enterpriseRole ('admin'|'member')
 *
 * Indexes (create in Firebase Console if needed):
 * - enterpriseInvites composite: (email, status) and (enterpriseId, status)
 * - userSettings single-field: (enterpriseId) – use Single field tab if Firebase prompts
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const ENTERPRISES = 'enterprises';
const INVITES = 'enterpriseInvites';
const USER_SETTINGS = 'userSettings';

/**
 * Create a new enterprise and set the current user as admin.
 * @param {string} userId - Admin user id
 * @param {string} name - Organization name
 * @returns {Promise<{ id: string }>} Enterprise id
 */
export async function createEnterprise(userId, name) {
  const ref = await addDoc(collection(db, ENTERPRISES), {
    name: (name || '').trim(),
    createdAt: serverTimestamp(),
    createdBy: userId
  });

  const settingsRef = doc(db, USER_SETTINGS, userId);
  const existing = await getDoc(settingsRef);
  const data = existing.exists() ? existing.data() : {};
  await setDoc(settingsRef, {
    ...data,
    enterpriseId: ref.id,
    enterpriseRole: 'admin'
  }, { merge: true });

  return { id: ref.id };
}

/**
 * Create an invite for an email. Idempotent per (enterpriseId, email) for pending.
 * @param {string} enterpriseId
 * @param {string} email - Lowercased
 * @param {string} invitedBy - User id of admin
 */
export async function createInvite(enterpriseId, email, invitedBy) {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) throw new Error('Email is required');

  const q = query(
    collection(db, INVITES),
    where('enterpriseId', '==', enterpriseId),
    where('email', '==', normalized),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  if (!snap.empty) throw new Error('Invite already pending for this email');

  await addDoc(collection(db, INVITES), {
    enterpriseId,
    email: normalized,
    invitedBy,
    invitedAt: serverTimestamp(),
    status: 'pending'
  });
}

/**
 * List users (user ids) in the same enterprise. Reads userSettings.
 * @param {string} enterpriseId
 * @returns {Promise<Array<{ id: string, email?: string, username?: string, enterpriseRole: string }>>}
 */
export async function listMembers(enterpriseId) {
  const q = query(
    collection(db, USER_SETTINGS),
    where('enterpriseId', '==', enterpriseId)
  );
  const snap = await getDocs(q);
  const members = [];
  snap.forEach((d) => {
    const data = d.data();
    members.push({
      id: d.id,
      email: data.email || '',
      username: data.username || '',
      enterpriseRole: data.enterpriseRole || 'member'
    });
  });
  return members;
}

/**
 * List pending invites for an enterprise.
 * @param {string} enterpriseId
 * @returns {Promise<Array<{ id: string, email: string, invitedAt, invitedBy }>>}
 */
export async function listPendingInvites(enterpriseId) {
  const q = query(
    collection(db, INVITES),
    where('enterpriseId', '==', enterpriseId),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => {
    const data = d.data();
    list.push({
      id: d.id,
      email: data.email || '',
      invitedAt: data.invitedAt,
      invitedBy: data.invitedBy || ''
    });
  });
  return list;
}

/**
 * List pending invites for the current user's email.
 * @param {string} email - Current user email (lowercase)
 * @returns {Promise<Array<{ id: string, enterpriseId: string, email: string }>>}
 */
export async function listPendingInvitesForUser(email) {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return [];

  const q = query(
    collection(db, INVITES),
    where('email', '==', normalized),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => {
    const data = d.data();
    list.push({
      id: d.id,
      enterpriseId: data.enterpriseId || '',
      email: data.email || ''
    });
  });
  return list;
}

/**
 * Get enterprise by id.
 * @param {string} enterpriseId
 * @returns {Promise<{ id: string, name: string, createdBy: string } | null>}
 */
export async function getEnterprise(enterpriseId) {
  const ref = doc(db, ENTERPRISES, enterpriseId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Accept an invite: set user's enterpriseId/role, update invite status.
 * @param {string} inviteId
 * @param {string} userId - Current user id
 * @param {string} userEmail - Current user email (for validation)
 */
export async function acceptInvite(inviteId, userId, userEmail) {
  const inviteRef = doc(db, INVITES, inviteId);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) throw new Error('Invite not found');
  const inv = inviteSnap.data();
  const normalized = (userEmail || '').trim().toLowerCase();
  if ((inv.email || '').toLowerCase() !== normalized) throw new Error('Invite email does not match');

  await updateDoc(inviteRef, { status: 'accepted' });

  const settingsRef = doc(db, USER_SETTINGS, userId);
  const existing = await getDoc(settingsRef);
  const data = existing.exists() ? existing.data() : {};
  const existingEid = data.enterpriseId || null;
  const existingRole = data.enterpriseRole || null;
  const sameOrg = existingEid === inv.enterpriseId;
  if (sameOrg && existingRole === 'admin') {
    return;
  }
  await setDoc(settingsRef, {
    ...data,
    enterpriseId: inv.enterpriseId,
    enterpriseRole: 'member'
  }, { merge: true });
}

/**
 * Decline an invite.
 * @param {string} inviteId
 * @param {string} userEmail - For validation
 */
export async function declineInvite(inviteId, userEmail) {
  const inviteRef = doc(db, INVITES, inviteId);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) throw new Error('Invite not found');
  const inv = inviteSnap.data();
  const normalized = (userEmail || '').trim().toLowerCase();
  if ((inv.email || '').toLowerCase() !== normalized) throw new Error('Invite email does not match');

  await updateDoc(inviteRef, { status: 'declined' });
}
