import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

const CALL_ALLOCATION = 75; // Base API calls allocated per subscription period (resets monthly)
const CALL_PACK_SIZE = 50; // Size of purchasable call packs
const TOKENS_PER_CHARACTER = 4; // Approximate: 1 token per 4 characters (for estimation only)

/**
 * Estimate token count for text input
 * @param {string} text - Text to estimate tokens for
 * @returns {number} Estimated token count
 */
export function estimateTokenCount(text) {
  if (!text || typeof text !== 'string') return 0;
  // Approximate: 1 token per 4 characters (English text)
  return Math.ceil(text.length / TOKENS_PER_CHARACTER);
}

/**
 * Estimate token count for multiple messages (for API requests)
 * @param {Array} messages - Array of message objects with 'content' property
 * @returns {number} Total estimated token count
 */
export function estimateTokenCountForMessages(messages) {
  if (!messages || !Array.isArray(messages)) return 0;
  
  let totalTokens = 0;
  messages.forEach(message => {
    if (message.content) {
      totalTokens += estimateTokenCount(message.content);
    }
  });
  
  // Add overhead for message formatting (rough estimate: ~10 tokens per message)
  totalTokens += messages.length * 10;
  
  return totalTokens;
}

/**
 * Check if reset is needed based on subscription start date
 * @param {Timestamp} subscriptionStartDate - When subscription started/renewed
 * @returns {boolean} True if reset is needed
 */
function shouldResetCalls(subscriptionStartDate) {
  if (!subscriptionStartDate) return false;
  
  const now = new Date();
  const startDate = subscriptionStartDate.toDate();
  
  // Calculate next reset date (1 month from subscription start)
  const nextResetDate = new Date(startDate);
  nextResetDate.setMonth(nextResetDate.getMonth() + 1);
  
  return now >= nextResetDate;
}

/**
 * Check and reset calls if needed based on subscription period
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function checkAndResetCalls(userId) {
  try {
    if (!userId) return;
    
    const settingsRef = doc(db, 'userSettings', userId);
    const settingsDoc = await getDoc(settingsRef);
    
    if (!settingsDoc.exists()) return;
    
    const settings = settingsDoc.data();
    const subscriptionPlan = (settings.subscriptionPlan || settings.plan || '').toLowerCase();
    
    // Only reset calls for Premium AI users
    if (subscriptionPlan !== 'premium_ai') return;
    
    const subscriptionStartDate = settings.subscriptionStartDate;
    const aiUsage = settings.aiUsage || {};
    const lastResetDate = aiUsage.lastResetDate;
    
    // Check if reset is needed
    const resetDate = subscriptionStartDate || lastResetDate;
    if (!resetDate) {
      // Initialize calls if they don't exist
      await setDoc(settingsRef, {
        aiUsage: {
          callsAllocated: CALL_ALLOCATION,
          callsUsed: 0,
          totalTokensUsed: 0,
          callPacks: [],
          lastResetDate: Timestamp.now()
        },
        subscriptionStartDate: Timestamp.now()
      }, { merge: true });
      return;
    }
    
    if (shouldResetCalls(resetDate)) {
      // Reset base calls (keep call packs, they never expire)
      const newStartDate = Timestamp.now();
      const currentPacks = aiUsage.callPacks || [];
      await setDoc(settingsRef, {
        aiUsage: {
          callsAllocated: CALL_ALLOCATION,
          callsUsed: 0,
          totalTokensUsed: 0,
          callPacks: currentPacks, // Preserve call packs on reset
          lastResetDate: newStartDate
        },
        subscriptionStartDate: newStartDate
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error checking/resetting calls:', error);
    throw error;
  }
}

// Keep old function name for backward compatibility during migration
export async function checkAndResetTokens(userId) {
  return checkAndResetCalls(userId);
}

/**
 * Get remaining calls from call packs
 * @param {Array} callPacks - Array of call pack objects
 * @returns {number} Total remaining calls from all packs
 */
function getCallPacksRemaining(callPacks) {
  if (!callPacks || !Array.isArray(callPacks)) return 0;
  return callPacks.reduce((sum, pack) => sum + (pack.remaining || 0), 0);
}

/**
 * Get current call status for user (including call packs)
 * @param {string} userId - User ID
 * @returns {Promise<{callsAllocated: number, callsUsed: number, callsRemaining: number, packsRemaining: number, totalAvailable: number, totalTokensUsed: number, callPacks: Array}>}
 */
export async function getCallStatus(userId) {
  try {
    if (!userId) {
      return { 
        callsAllocated: 0, 
        callsUsed: 0, 
        callsRemaining: 0, 
        packsRemaining: 0,
        totalAvailable: 0,
        totalTokensUsed: 0,
        callPacks: []
      };
    }
    
    // First check and reset if needed
    await checkAndResetCalls(userId);
    
    const settingsRef = doc(db, 'userSettings', userId);
    const settingsDoc = await getDoc(settingsRef);
    
    if (!settingsDoc.exists()) {
      return { 
        callsAllocated: 0, 
        callsUsed: 0, 
        callsRemaining: 0,
        packsRemaining: 0,
        totalAvailable: 0,
        totalTokensUsed: 0,
        callPacks: []
      };
    }
    
    const settings = settingsDoc.data();
    // Check both old (aiTokens) and new (aiUsage) format for migration
    const aiUsage = settings.aiUsage || {};
    const aiTokens = settings.aiTokens || {};
    const callPacks = aiUsage.callPacks || [];
    
    // Migrate from old format if needed
    if (aiTokens.allocated && !aiUsage.callsAllocated) {
      // Old format exists, migrate to new format
      const callsAllocated = CALL_ALLOCATION;
      const callsUsed = 0; // Reset calls on migration
      await setDoc(settingsRef, {
        aiUsage: {
          callsAllocated,
          callsUsed,
          totalTokensUsed: aiTokens.used || 0,
          callPacks: [],
          lastResetDate: Timestamp.now()
        }
      }, { merge: true });
      return {
        callsAllocated,
        callsUsed,
        callsRemaining: callsAllocated - callsUsed,
        packsRemaining: 0,
        totalAvailable: callsAllocated - callsUsed,
        totalTokensUsed: aiTokens.used || 0,
        callPacks: []
      };
    }
    
    const callsAllocated = aiUsage.callsAllocated || CALL_ALLOCATION;
    const callsUsed = aiUsage.callsUsed || 0;
    const baseRemaining = Math.max(0, callsAllocated - callsUsed);
    const packsRemaining = getCallPacksRemaining(callPacks);
    const totalAvailable = baseRemaining + packsRemaining;
    const totalTokensUsed = aiUsage.totalTokensUsed || 0;
    
    return { 
      callsAllocated, 
      callsUsed, 
      callsRemaining: baseRemaining,
      packsRemaining,
      totalAvailable,
      totalTokensUsed,
      callPacks: callPacks.filter(p => (p.remaining || 0) > 0) // Only return packs with remaining calls
    };
  } catch (error) {
    console.error('Error getting call status:', error);
    return { 
      callsAllocated: 0, 
      callsUsed: 0, 
      callsRemaining: 0,
      packsRemaining: 0,
      totalAvailable: 0,
      totalTokensUsed: 0,
      callPacks: []
    };
  }
}

// Keep old function name for backward compatibility
export async function getTokenStatus(userId) {
  const callStatus = await getCallStatus(userId);
  // Map to old format for compatibility
  return {
    allocated: callStatus.callsAllocated,
    used: callStatus.callsUsed,
    remaining: callStatus.callsRemaining
  };
}

/**
 * Check if user has calls available (base + packs)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if user has calls remaining
 */
export async function checkCallAvailability(userId) {
  try {
    const status = await getCallStatus(userId);
    return status.totalAvailable >= 1;
  } catch (error) {
    console.error('Error checking call availability:', error);
    return false;
  }
}

// Keep old function name for backward compatibility
export async function checkTokenAvailability(userId, requiredTokens) {
  // For calls, we just need 1 call available
  return checkCallAvailability(userId);
}

/**
 * Deduct one call and track actual token usage after API call
 * Priority: Base allocation first, then oldest call pack (FIFO)
 * @param {string} userId - User ID
 * @param {number} actualTokens - Actual tokens used (prompt + completion from API response)
 * @returns {Promise<void>}
 */
export async function deductCall(userId, actualTokens = 0) {
  try {
    if (!userId) return;
    
    // First check and reset if needed
    await checkAndResetCalls(userId);
    
    const settingsRef = doc(db, 'userSettings', userId);
    const settingsDoc = await getDoc(settingsRef);
    
    if (!settingsDoc.exists()) {
      console.warn('Cannot deduct call: user settings document does not exist');
      return;
    }
    
    const settings = settingsDoc.data();
    const aiUsage = settings.aiUsage || { 
      callsAllocated: CALL_ALLOCATION, 
      callsUsed: 0, 
      totalTokensUsed: 0,
      callPacks: []
    };
    
    const callsAllocated = aiUsage.callsAllocated || CALL_ALLOCATION;
    let currentCallsUsed = aiUsage.callsUsed || 0;
    const currentTotalTokens = aiUsage.totalTokensUsed || 0;
    let callPacks = [...(aiUsage.callPacks || [])];
    
    // Deduct from base allocation first
    if (currentCallsUsed < callsAllocated) {
      currentCallsUsed = Math.min(currentCallsUsed + 1, callsAllocated);
    } else {
      // Base exhausted, deduct from oldest pack (first in array)
      const packToDeduct = callPacks.find(p => (p.remaining || 0) > 0);
      if (packToDeduct) {
        packToDeduct.used = (packToDeduct.used || 0) + 1;
        packToDeduct.remaining = Math.max(0, (packToDeduct.remaining || packToDeduct.calls || 0) - 1);
      }
    }
    
    // Add actual tokens to total
    const newTotalTokens = currentTotalTokens + (actualTokens || 0);
    
    await setDoc(settingsRef, {
      aiUsage: {
        ...aiUsage,
        callsAllocated: callsAllocated,
        callsUsed: currentCallsUsed,
        totalTokensUsed: newTotalTokens,
        callPacks: callPacks
      }
    }, { merge: true });
  } catch (error) {
    console.error('Error deducting call:', error);
    throw error;
  }
}

// Keep old function name for backward compatibility
export async function deductTokens(userId, tokenCount) {
  // For calls, we deduct 1 call and track tokens
  return deductCall(userId, tokenCount);
}

/**
 * Initialize calls for Premium AI users
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function initializeCalls(userId) {
  try {
    if (!userId) return;
    
    const settingsRef = doc(db, 'userSettings', userId);
    const now = Timestamp.now();
    
    await setDoc(settingsRef, {
      aiUsage: {
        callsAllocated: CALL_ALLOCATION,
        callsUsed: 0,
        totalTokensUsed: 0,
        callPacks: [],
        lastResetDate: now
      },
      subscriptionStartDate: now
    }, { merge: true });
  } catch (error) {
    console.error('Error initializing calls:', error);
    throw error;
  }
}

// Keep old function name for backward compatibility
export async function initializeTokens(userId) {
  return initializeCalls(userId);
}

/**
 * Add a call pack to user's account (after purchase)
 * @param {string} userId - User ID
 * @param {number} packSize - Number of calls in the pack (default: CALL_PACK_SIZE)
 * @returns {Promise<string>} Pack ID
 */
export async function addCallPack(userId, packSize = CALL_PACK_SIZE) {
  try {
    if (!userId || !packSize || packSize <= 0) {
      throw new Error('Invalid pack size');
    }
    
    const settingsRef = doc(db, 'userSettings', userId);
    const settingsDoc = await getDoc(settingsRef);
    
    if (!settingsDoc.exists()) {
      throw new Error('User settings document does not exist');
    }
    
    const settings = settingsDoc.data();
    const aiUsage = settings.aiUsage || { 
      callsAllocated: CALL_ALLOCATION, 
      callsUsed: 0, 
      totalTokensUsed: 0,
      callPacks: []
    };
    
    const callPacks = aiUsage.callPacks || [];
    
    // Create new pack
    const packId = `pack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newPack = {
      id: packId,
      calls: packSize,
      purchasedAt: Timestamp.now(),
      used: 0,
      remaining: packSize
    };
    
    // Add to packs array
    callPacks.push(newPack);
    
    await setDoc(settingsRef, {
      aiUsage: {
        ...aiUsage,
        callPacks: callPacks
      }
    }, { merge: true });
    
    return packId;
  } catch (error) {
    console.error('Error adding call pack:', error);
    throw error;
  }
}

/**
 * Get call packs status (for display/management)
 * @param {string} userId - User ID
 * @returns {Promise<{totalPacks: number, totalRemaining: number, packs: Array}>}
 */
export async function getCallPacksStatus(userId) {
  try {
    const status = await getCallStatus(userId);
    return {
      totalPacks: status.callPacks.length,
      totalRemaining: status.packsRemaining,
      packs: status.callPacks
    };
  } catch (error) {
    console.error('Error getting call packs status:', error);
    return { totalPacks: 0, totalRemaining: 0, packs: [] };
  }
}
