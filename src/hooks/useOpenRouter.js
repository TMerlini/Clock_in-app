import { useState } from 'react';
import { OpenRouter } from '@openrouter/sdk';
import { OPENROUTER_API_KEY, OPENROUTER_DEFAULT_MODEL } from '../lib/openRouterConfig';
import { auth } from '../lib/firebase';
import { checkCallAvailability, deductCall, getCallStatus } from '../lib/tokenManager';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

let openRouterClient = null;

function getOpenRouterClient() {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key is not configured. Please set VITE_OPENROUTER_API_KEY in your environment variables.');
  }

  if (!openRouterClient) {
    openRouterClient = new OpenRouter({
      apiKey: OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Clock In App',
      },
    });
  }

  return openRouterClient;
}

export function useOpenRouter() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async (messages, model = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const client = getOpenRouterClient();
      
      // Check if user is Premium AI and has calls available
      const currentUser = auth.currentUser;
      let isPremiumAI = false;
      let actualTokens = 0;
      
      // Admin email - full Premium AI access, no call limits
      const ADMIN_EMAIL = 'merloproductions@gmail.com';
      const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      
      if (currentUser && !isAdmin) {
        // Check if user has Premium AI subscription
        const settingsRef = doc(db, 'userSettings', currentUser.uid);
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          const subscriptionPlan = (settings.subscriptionPlan || settings.plan || '').toLowerCase();
          isPremiumAI = subscriptionPlan === 'premium_ai' || subscriptionPlan === 'enterprise';
          
          if (isPremiumAI) {
            // Check call availability (need at least 1 call)
            const hasCalls = await checkCallAvailability(currentUser.uid);
            
            if (!hasCalls) {
              const status = await getCallStatus(currentUser.uid);
              throw new Error(`You've used all your calls for this subscription period (${status.callsUsed}/${status.callsAllocated}). Your calls will reset on your next subscription renewal.`);
            }
          }
        }
      } else if (isAdmin) {
        // Admin always has Premium AI access
        isPremiumAI = true;
      }

      // Use provided model, or fallback to default, or use user's OpenRouter default
      // Since user has specific providers allowed, we'll use a model that works with those providers
      const modelToUse = model || OPENROUTER_DEFAULT_MODEL;
      
      // Build request object
      const requestBody = {
        model: modelToUse,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
        provider: {
          allowFallbacks: true, // Allow fallback providers if primary is unavailable
        },
      };
      
      console.log('Sending request to OpenRouter:', {
        model: modelToUse,
        messageCount: messages.length,
        hasApiKey: !!OPENROUTER_API_KEY,
        isPremiumAI: isPremiumAI,
        isAdmin: isAdmin
      });

      const completion = await client.chat.send(requestBody);

      if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
        throw new Error('Invalid response format from OpenRouter API');
      }

      // Extract actual token usage from API response
      if (completion.usage) {
        const promptTokens = completion.usage.prompt_tokens || 0;
        const completionTokens = completion.usage.completion_tokens || 0;
        actualTokens = promptTokens + completionTokens;
        console.log('Actual token usage:', { promptTokens, completionTokens, total: actualTokens });
      }

      // Deduct one call and track actual tokens after successful API call
      // Admin still tracks tokens for monitoring/testing, but doesn't deduct calls
      if (isPremiumAI && currentUser) {
        try {
          if (!isAdmin) {
            // Regular users: deduct call and track tokens
            await deductCall(currentUser.uid, actualTokens);
          } else {
            // Admin: only track tokens (don't deduct calls), for testing/monitoring
            // We still want to see token usage but not limit calls
            if (actualTokens > 0) {
              // Update token count only (increment totalTokensUsed without decrementing callsRemaining)
              const settingsRef = doc(db, 'userSettings', currentUser.uid);
              const settingsDoc = await getDoc(settingsRef);
              if (settingsDoc.exists()) {
                const settings = settingsDoc.data();
                const aiUsage = settings.aiUsage || { totalTokensUsed: 0 };
                const currentTotalTokens = aiUsage.totalTokensUsed || 0;
                await setDoc(settingsRef, {
                  aiUsage: {
                    ...aiUsage,
                    totalTokensUsed: currentTotalTokens + actualTokens
                  }
                }, { merge: true });
              }
            }
          }
        } catch (callError) {
          console.error('Error updating call/token status:', callError);
          // Don't fail the request if update fails
        }
      }

      return completion.choices[0].message.content;
    } catch (err) {
      // Extract more detailed error information
      let errorMessage = err.message || 'Failed to send message to AI';
      
      // Try to get more details from the error object
      if (err.name === 'ChatError' || err.name === 'OpenRouterDefaultError') {
        // Try to extract more details from the error body
        if (err.body) {
          try {
            const errorData = typeof err.body === 'string' ? JSON.parse(err.body) : err.body;
            
            // Check for rate limiting (429)
            if (err.statusCode === 429 || errorData.error?.code === 429) {
              // Extract the helpful message from metadata if available
              const metadataMessage = errorData.error?.metadata?.raw;
              if (metadataMessage) {
                errorMessage = metadataMessage;
              } else {
                errorMessage = 'The AI model is currently rate-limited. Please wait a moment and try again, or add your own API key at https://openrouter.ai/settings/integrations to increase rate limits.';
              }
            } else if (errorData.error?.message) {
              errorMessage = errorData.error.message;
              
              // Add helpful guidance for routing errors
              if (errorMessage.includes('No allowed providers')) {
                errorMessage = 'Your OpenRouter default model has no providers enabled.\n\n' +
                  'To fix this:\n' +
                  '1. Go to https://openrouter.ai/settings/routing\n' +
                  '2. Check your "Default Model" setting\n' +
                  '3. Ensure at least one provider is enabled/allowed for that model\n' +
                  '4. Or set a different default model that has providers enabled\n\n' +
                  'The app is using your OpenRouter default model (no model parameter specified).';
              }
            }
          } catch {
            // If parsing fails, provide a generic message
            if (err.statusCode === 429) {
              errorMessage = 'The AI model is currently rate-limited. Please wait a moment and try again.';
            }
          }
        } else if (err.statusCode === 429) {
          errorMessage = 'The AI model is currently rate-limited. Please wait a moment and try again.';
        }
      }
      
      setError(errorMessage);
      
      // Log the full error for debugging
      console.error('OpenRouter API Error:', {
        error: err,
        errorName: err.name,
        errorMessage: errorMessage,
        model: model,
        body: err.body,
        statusCode: err.statusCode,
        stack: err.stack
      });
      
      // Create a user-friendly error
      const userFriendlyError = new Error(errorMessage);
      userFriendlyError.name = err.name;
      throw userFriendlyError;
    } finally {
      setIsLoading(false);
    }
  };

  const listAvailableModels = async () => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      return data.data || [];
    } catch (err) {
      console.error('Error listing models:', err);
      return [];
    }
  };

  const sendMessageStreaming = async (messages, { onChunk, onDone, onError }, model = null) => {
    setIsLoading(true);
    setError(null);

    let currentUser = auth.currentUser;
    let isPremiumAI = false;
    let isAdmin = false;

    try {
      const client = getOpenRouterClient();

      const ADMIN_EMAIL = 'merloproductions@gmail.com';
      isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      if (currentUser && !isAdmin) {
        const settingsRef = doc(db, 'userSettings', currentUser.uid);
        const settingsDoc = await getDoc(settingsRef);
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          const subscriptionPlan = (settings.subscriptionPlan || settings.plan || '').toLowerCase();
          isPremiumAI = subscriptionPlan === 'premium_ai' || subscriptionPlan === 'enterprise';
          if (isPremiumAI) {
            const hasCalls = await checkCallAvailability(currentUser.uid);
            if (!hasCalls) {
              const status = await getCallStatus(currentUser.uid);
              throw new Error(`You've used all your calls for this subscription period (${status.callsUsed}/${status.callsAllocated}). Your calls will reset on your next subscription renewal.`);
            }
          }
        }
      } else if (isAdmin) {
        isPremiumAI = true;
      }

      const modelToUse = model || OPENROUTER_DEFAULT_MODEL;
      const requestBody = {
        model: modelToUse,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
        provider: { allowFallbacks: true },
      };

      console.log('Sending streaming request to OpenRouter:', {
        model: modelToUse,
        messageCount: messages.length,
        hasApiKey: !!OPENROUTER_API_KEY,
        isPremiumAI,
        isAdmin,
      });

      const stream = await client.chat.send(requestBody);
      let accumulated = '';
      let usage = null;

      for await (const chunk of stream) {
        if (chunk?.error) {
          const errMsg = chunk.error?.message || 'Stream error';
          onError?.(new Error(errMsg));
          return;
        }
        const finishReason = chunk?.choices?.[0]?.finish_reason ?? chunk?.choices?.[0]?.finishReason;
        if (finishReason === 'error') {
          const errMsg = chunk?.error?.message || 'Stream ended with error';
          onError?.(new Error(errMsg));
          return;
        }

        const delta = chunk?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') {
          accumulated += delta;
          onChunk?.(accumulated);
        }
        if (chunk?.usage) {
          usage = chunk.usage;
        }
      }

      const promptTokens = usage?.prompt_tokens || 0;
      const completionTokens = usage?.completion_tokens || 0;
      const actualTokens = promptTokens + completionTokens;
      if (actualTokens > 0) {
        console.log('Stream token usage:', { promptTokens, completionTokens, total: actualTokens });
      }

      if (isPremiumAI && currentUser) {
        try {
          if (!isAdmin) {
            await deductCall(currentUser.uid, actualTokens);
          } else if (actualTokens > 0) {
            const settingsRef = doc(db, 'userSettings', currentUser.uid);
            const settingsDoc = await getDoc(settingsRef);
            if (settingsDoc.exists()) {
              const settings = settingsDoc.data();
              const aiUsage = settings.aiUsage || { totalTokensUsed: 0 };
              const currentTotalTokens = aiUsage.totalTokensUsed || 0;
              await setDoc(settingsRef, {
                aiUsage: {
                  ...aiUsage,
                  totalTokensUsed: currentTotalTokens + actualTokens,
                },
              }, { merge: true });
            }
          }
        } catch (callError) {
          console.error('Error updating call/token status:', callError);
        }
      }

      onDone?.({ fullContent: accumulated, usage });
    } catch (err) {
      const errorMessage = err.message || 'Failed to send message to AI';
      setError(errorMessage);
      console.error('OpenRouter streaming error:', err);
      onError?.(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    sendMessageStreaming,
    isLoading,
    error,
    listAvailableModels
  };
}
