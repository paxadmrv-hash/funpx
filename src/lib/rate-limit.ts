import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting com Upstash Redis (central, serve bem a Vercel serverless).
 *
 * Degrada com segurança: se UPSTASH_REDIS_REST_URL / _TOKEN não estiverem
 * configurados, NÃO bloqueia nada (deixa o site funcionar) e avisa no log.
 * Assim o deploy não quebra enquanto as chaves não estão na Vercel.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV === "production") {
  console.warn("[rate-limit] Upstash não configurado — rate limiting DESLIGADO. Defina UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN.");
}

// Formulário público: até 5 envios por minuto por IP (sliding window).
const publicLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 m"), prefix: "rl:public", analytics: true })
  : null;

// Login admin: até 8 tentativas a cada 5 minutos por IP (anti brute-force).
const loginLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(8, "5 m"), prefix: "rl:login", analytics: true })
  : null;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Retorna true se a requisição PODE prosseguir, false se estourou o limite. */
export async function allowPublic(request: Request): Promise<boolean> {
  if (!publicLimiter) return true;
  const { success } = await publicLimiter.limit(clientIp(request));
  return success;
}

export async function allowLogin(request: Request): Promise<boolean> {
  if (!loginLimiter) return true;
  const { success } = await loginLimiter.limit(clientIp(request));
  return success;
}
