// OpenRouter API Configuration
// Get your API key from https://openrouter.ai/keys
// Add VITE_OPENROUTER_API_KEY to your environment variables

export const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

// Default model - used as fallback if no model is specified
// NOTE: The app now omits the model parameter by default, allowing OpenRouter
// to use your configured default model from your routing settings.
// This works with OpenRouter's auto-routing feature.
//
// If you want to explicitly use a specific model, you can set it here:
// - mistralai/mistral-large
// - mistralai/mistral-7b-instruct:free (free tier)
// - meta-llama/llama-3.2-3b-instruct
// - google/gemini-2.0-flash-exp:free (free tier, may be rate-limited)
//
// See available models: https://openrouter.ai/models
// Configure your default model: https://openrouter.ai/settings/routing
export const OPENROUTER_DEFAULT_MODEL = 'mistralai/mistral-large';
