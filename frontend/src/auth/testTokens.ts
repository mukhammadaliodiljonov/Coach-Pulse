// Builds unsigned JWT-shaped tokens for tests. Real tokens come from the backend.

const base64Url = (value: unknown) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export function fakeToken(claims: Record<string, unknown>): string {
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(claims)}.signature`
}

export const inMinutes = (minutes: number) => Math.floor(Date.now() / 1000) + minutes * 60
