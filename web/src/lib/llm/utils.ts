/** Shared utilities for LLM tool modules. */

/** Get the base URL for internal API calls — needed in edge runtime where relative URLs fail. */
export const getBaseUrl = () => {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return 'http://localhost:3000';
};
