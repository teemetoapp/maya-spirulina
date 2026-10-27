import { randomBytes } from "crypto";
import cache from "@/lib/redis";

// One-time token for t.me/<bot>?start=<token> (Telegram allows at most 64
// characters of [A-Za-z0-9_-]). The token maps to the user for one hour.

const TTL_SECONDS = 60 * 60;

export async function createTelegramLinkToken(userId: string): Promise<string> {
  const token = randomBytes(18).toString("base64url");
  await cache.set(`tg_link:${token}`, userId, "EX", TTL_SECONDS);
  return token;
}

export async function consumeTelegramLinkToken(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
  const key = `tg_link:${token}`;
  const userId = await cache.get(key);
  if (userId) await cache.del(key);
  return userId;
}
