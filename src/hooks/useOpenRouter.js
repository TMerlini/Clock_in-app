import { useState } from 'react';
import { OpenRouter } from '@openrouter/sdk';
import { OPENROUTER_API_KEY, OPENROUTER_DEFAULT_MODEL } from '../lib/openRouterConfig';

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
        hasApiKey: !!OPENROUTER_API_KEY
      });

      const completion = await client.chat.send(requestBody);

      if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
        throw new Error('Invalid response format from OpenRouter API');
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

  return {
    sendMessage,
    isLoading,
    error,
    listAvailableModels
  };
}
