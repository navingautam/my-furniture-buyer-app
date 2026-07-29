// Central place to read environment variables from — import this instead of
// reaching into `process.env` directly elsewhere, so there's one spot to
// update if a variable gets renamed.

// Base URL for the furniture shop's API (Day 1 Participant Guide).
export const SHOP_API_BASE_URL = "https://day1.training.cognitivo.com.au";

// Server-only: never expose this to the browser (no NEXT_PUBLIC_ prefix).
// Sent as the `x-api-key` header on requests to the shop's API.
export const apiKey = process.env.API_KEY;

// Resolved once via `POST /claim` with the registered event email — identifies
// which account's ledger balance `GET /users/{user_id}` returns (see
// lib/ledger-api.ts). This is a single account tied to the API key above,
// not one per buyer signed up in this app.
export const participantUserId = process.env.PARTICIPANT_USER_ID;

// Azure OpenAI (GPT-5 mini) access. Unrelated to the furniture shop's API
// above — server-only, never expose azureOpenAiApiKey to the browser.
// Not wired into any feature yet.
export const azureOpenAiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
export const azureOpenAiApiVersion = process.env.AZURE_OPENAI_API_VERSION;
export const azureOpenAiDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;
export const azureOpenAiApiKey = process.env.AZURE_OPENAI_API_KEY;
