export const LIMITS = { name: 100, email: 254, message: 2000 } as const;

export function isWellFormedEmail(email: string): boolean {
  return email.length <= LIMITS.email && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email);
}
