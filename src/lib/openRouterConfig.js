// OpenAI API Configuration
// Get your API key from https://platform.openai.com/api-keys
// Add VITE_OPENAI_API_KEY to your environment variables

export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

export const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';
