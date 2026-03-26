/**
 * Promo code utilities for clock-in.pt
 * Firestore collection: promoCodes / doc ID = code (uppercase)
 *
 * Schema:
 *   code          string   e.g. "BETA2026"
 *   plan          string   'basic' | 'pro' | 'premium_ai' | 'enterprise'
 *   durationDays  number   0 = permanent
 *   maxUses       number   0 = unlimited
 *   uses          number   current redemption count
 *   active        boolean
 *   createdAt     Timestamp
 *   expiresAt     Timestamp | null  (code availability expiry, not plan expiry)
 *   notes         string
 *
 * User doc fields set on redeem:
 *   promoCode         string
 *   promoGrantedPlan  string
 *   promoRedeemedAt   Timestamp
 *   promoExpiresAt    Timestamp | null
 */

import {
  doc, getDoc, setDoc, updateDoc, collection,
  getDocs, deleteDoc, serverTimestamp, increment, Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'promoCodes';

// ── Admin: list all promo codes ───────────────────────────────────────────────
export async function listPromoCodes() {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Admin: create / upsert a promo code ──────────────────────────────────────
export async function createPromoCode({ code, plan, durationDays = 0, maxUses = 0, expiresAt = null, notes = '' }) {
  const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '');
  if (!normalizedCode) throw new Error('Code cannot be empty');

  const ref = doc(db, COLLECTION, normalizedCode);
  const existing = await getDoc(ref);
  if (existing.exists()) throw new Error(`Code "${normalizedCode}" already exists`);

  await setDoc(ref, {
    code: normalizedCode,
    plan,
    durationDays,
    maxUses,
    uses: 0,
    active: true,
    createdAt: serverTimestamp(),
    expiresAt: expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null,
    notes,
  });

  return normalizedCode;
}

// ── Admin: toggle active ─────────────────────────────────────────────────────
export async function togglePromoActive(code, active) {
  await updateDoc(doc(db, COLLECTION, code), { active });
}

// ── Admin: delete ────────────────────────────────────────────────────────────
export async function deletePromoCode(code) {
  await deleteDoc(doc(db, COLLECTION, code));
}

// ── User: redeem a promo code ─────────────────────────────────────────────────
export async function redeemPromoCode(userId, rawCode) {
  const code = rawCode.trim().toUpperCase();
  const promoRef = doc(db, COLLECTION, code);
  const promoSnap = await getDoc(promoRef);

  if (!promoSnap.exists()) throw new Error('Invalid promo code.');

  const promo = promoSnap.data();

  if (!promo.active) throw new Error('This promo code is no longer active.');

  if (promo.expiresAt && promo.expiresAt.toDate() < new Date()) {
    throw new Error('This promo code has expired.');
  }

  if (promo.maxUses > 0 && promo.uses >= promo.maxUses) {
    throw new Error('This promo code has reached its usage limit.');
  }

  // Check if user already redeemed this code
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data().promoCode === code) {
    throw new Error('You have already redeemed this code.');
  }

  // Calculate plan expiry
  let promoExpiresAt = null;
  if (promo.durationDays > 0) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + promo.durationDays);
    promoExpiresAt = Timestamp.fromDate(expiry);
  }

  // Update user doc
  await updateDoc(userRef, {
    subscriptionPlan: promo.plan,
    plan: promo.plan,
    promoCode: code,
    promoGrantedPlan: promo.plan,
    promoRedeemedAt: serverTimestamp(),
    promoExpiresAt,
  });

  // Increment usage counter
  await updateDoc(promoRef, { uses: increment(1) });

  return { plan: promo.plan, durationDays: promo.durationDays };
}

// ── Helper: check if user's promo has expired and downgrade if needed ─────────
export async function checkPromoExpiry(userId) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const data = userSnap.data();
  if (!data.promoExpiresAt || !data.promoCode) return;

  const expiry = data.promoExpiresAt.toDate();
  if (expiry < new Date()) {
    // Promo expired — revert to free
    await updateDoc(userRef, {
      subscriptionPlan: 'free',
      plan: 'free',
      promoCode: null,
      promoGrantedPlan: null,
      promoExpiresAt: null,
    });
  }
}
