// OpenAI API Configuration
// API calls are proxied through /api/chat (server-side) to avoid CORS and key exposure
// Set OPENAI_API_KEY in your Vercel environment variables (server-side only, no VITE_ prefix)

export const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';
