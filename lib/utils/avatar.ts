/**
 * Generates a deterministic DiceBear avatar URL from a client's name.
 * Used both server-side (when creating clients) and client-side (as fallback).
 */
export function generateAvatarUrl(name: string): string {
  const hash = name.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const avatarId = Math.abs(hash) % 1000;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarId}&backgroundColor=b6e3f4,c0aede,d1d4f9&size=80`;
}
