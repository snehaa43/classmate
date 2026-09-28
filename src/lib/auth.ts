import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'classmate_secure_jwt_secret_key_2026';
const TOKEN_COOKIE_NAME = 'classmate_auth_token';

/**
 * ============================================================================
 * ACTION 1: Hash Password with Salt
 * ============================================================================
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * ============================================================================
 * ACTION 2: Compare Plaintext Password with Stored Hash
 * ============================================================================
 */
export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

/**
 * ============================================================================
 * ACTION 3: Generate Signed JWT Token
 * ============================================================================
 */
export function signToken(payload: { userId: string; email: string; name?: string | null }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * ============================================================================
 * ACTION 4: Verify and Decode JWT Token
 * ============================================================================
 */
export function verifyToken(token: string): { userId: string; email: string; name?: string | null } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; name?: string | null };
  } catch {
    return null;
  }
}

/**
 * ============================================================================
 * ACTION 5: Get Currently Authenticated User From Next.js Cookies
 * ============================================================================
 */
export async function getAuthUser(): Promise<{ userId: string; email: string; name?: string | null } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export { TOKEN_COOKIE_NAME };
