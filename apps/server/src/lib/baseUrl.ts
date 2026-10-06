/** Returns the client base URL with no trailing slash. */
export function getBaseUrl(): string {
  return (process.env.CLIENT_URL || 'https://shopsuitedirect.com').replace(/\/+$/, '');
}
