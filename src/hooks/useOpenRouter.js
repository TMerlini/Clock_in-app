import { useState } from 'react';
import { OPENAI_DEFAULT_MODEL } from '../lib/openRouterConfig';
import { auth } from '../lib/firebase';
import { checkCallAvailability, deductCall, getCallStatus } from '../lib/tokenManager';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

async function checkUserAccess() {
  const currentUser = auth.currentUser;
  const ADMIN_EMAIL = 'merloproductions@gmail.com';
  const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  let isPremiumAI = false;
  let canUseAI = false;
  let subscriptionPlan = '';

  if (currentUser && !isAdmin) {
    const settingsRef = doc(db, 'userSettings', currentUser.uid);
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      const settings = settingsDoc.data();
      subscriptionPlan = (settings.subscriptionPlan || settings.plan || '').toLowerCase();

      if (subscriptionPlan === 'basic') {
        throw new Error('AI Advisor is not included in the Basic plan. Upgrade to Pro or Premium AI to use AI features.');
      }

      isPremiumAI = subscriptionPlan === 'premium_ai' || subscriptionPlan === 'enterprise';

      const hasCalls = await checkCallAvailability(currentUser.uid);
      if (!hasCalls) {
        if (isPremiumAI) {
          const status = await getCallStatus(currentUser.uid);
          throw new Error(`You've used all your calls for this subscription period (${status.callsUsed}/${status.callsAllocated}). Your calls will reset on your next subscription renewal.`);
        }
        if (subscriptionPlan === 'pro') {
          throw new Error('You need to purchase AI call packs to use the AI Advisor. Go to Premium+ to buy call packs.');
        }
      }
      canUseAI = isPremiumAI || subscriptionPlan === 'pro';
    }
  } else if (isAdmin) {
    isPremiumAI = true;
    canUseAI = true;
  }

  return { currentUser, isAdmin, isPremiumAI, canUseAI };
}

async function trackTokens(currentUser, isAdmin, canUseAI, actualTokens) {
  if (!canUseAI || !currentUser || actualTokens === 0) return;
  try {
    if (!isAdmin) {
      await deductCall(currentUser.uid, actualTokens);
    } else {
      const settingsRef = doc(db, 'userSettings', currentUser.uid);
      const settingsDoc = await getDoc(settingsRef);
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        const aiUsage = settings.aiUsage || { totalTokensUsed: 0 };
        await setDoc(settingsRef, {
          aiUsage: { ...aiUsage, totalTokensUsed: (aiUsage.totalTokensUsed || 0) + actualTokens },
        }, { merge: true });
      }
    }
  } catch (err) {
    console.error('Error updating call/token status:', err);
  }
}

async function parseSSEStream(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let usage = null;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete last line for next iteration

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const chunk = JSON.parse(data);
        if (chunk.error) throw new Error(chunk.error);
        const delta = chunk?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') {
          accumulated += delta;
          onChunk?.(accumulated);
        }
        if (chunk?.usage) usage = chunk.usage;
      } catch (e) {
        if (e.message && !e.message.startsWith('JSON')) throw e;
      }
    }
  }

  return { accumulated, usage };
}

export function useOpenRouter() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async (messages, model = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const { currentUser, isAdmin, isPremiumAI, canUseAI } = await checkUserAccess();
      const modelToUse = model || OPENAI_DEFAULT_MODEL;

      console.log('Sending request to /api/chat:', { model: modelToUse, messageCount: messages.length, isPremiumAI, isAdmin });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model: modelToUse }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `API error ${response.status}`);
      }

      const { accumulated, usage } = await parseSSEStream(response, null);
      const actualTokens = (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0);
      await trackTokens(currentUser, isAdmin, canUseAI, actualTokens);
      return accumulated;
    } catch (err) {
      const errorMessage = err.message || 'Failed to send message to AI';
      setError(errorMessage);
      console.error('AI API Error:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessageStreaming = async (messages, { onChunk, onDone, onError }, model = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const { currentUser, isAdmin, isPremiumAI, canUseAI } = await checkUserAccess();
      const modelToUse = model || OPENAI_DEFAULT_MODEL;

      console.log('Sending streaming request to /api/chat:', { model: modelToUse, messageCount: messages.length, isPremiumAI, isAdmin });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model: modelToUse }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `API error ${response.status}`);
      }

      const { accumulated, usage } = await parseSSEStream(response, onChunk);
      const actualTokens = (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0);
      await trackTokens(currentUser, isAdmin, canUseAI, actualTokens);
      onDone?.({ fullContent: accumulated, usage });
    } catch (err) {
      const errorMessage = err.message || 'Failed to send message to AI';
      setError(errorMessage);
      console.error('AI streaming error:', err);
      onError?.(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const listAvailableModels = async () => [];

  return {
    sendMessage,
    sendMessageStreaming,
    isLoading,
    error,
    listAvailableModels,
  };
}
