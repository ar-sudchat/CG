import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import sql from './db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = 'clevrgold-token';

export interface AuthPayload {
  userId: number;
  username: string;
  role: 'admin' | 'user';
}

export async function getSession(): Promise<AuthPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

export async function createToken(payload: AuthPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET);
}

/**
 * Returns allowed account numbers for a user.
 * null = admin (sees all accounts)
 * number[] = user's active assigned accounts
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getAllowedAccounts(userId: number, _role: string): Promise<number[] | null> {
  const rows = await sql`
    SELECT ua.account_number FROM user_accounts ua
    JOIN accounts a ON ua.account_number = a.account_number
    WHERE ua.user_id = ${userId}
      AND ua.is_active = TRUE
      AND a.is_active = TRUE
  `;
  return rows.map((r) => Number(r.account_number));
}

/**
 * Get session + allowed accounts in one call. Used by API routes.
 */
export async function getSessionAndAccounts() {
  const session = await getSession();
  if (!session) return null;
  const accountFilter = await getAllowedAccounts(session.userId, session.role);
  return { session, accountFilter };
}

export { COOKIE_NAME, JWT_SECRET };
