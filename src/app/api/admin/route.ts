import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { blockCrossOrigin } from "@/lib/origin";

async function isAuthorized() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  // Trava por e-mail: estar logado NÃO basta — precisa estar na lista de admins.
  // Defina ADMIN_EMAILS no .env (separados por vírgula). Sem a env, cai no admin padrão.
  const allowed = (process.env.ADMIN_EMAILS ?? "administrador@pax.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes((user.email ?? "").toLowerCase());
}

export async function GET(request: Request) {
  if (!await isAuthorized()) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const minScore = Number(url.searchParams.get("minScore") || 0);
    const commentOnly = url.searchParams.get("commentOnly") === "true";
    const where = {
      ...(from || to ? { createdAt: { ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}) } } : {}),
      ...(minScore ? { recommendScore: { lte: minScore } } : {}),
      ...(commentOnly ? { comment: { not: null } } : {}),
    };
    const responses = await prisma.surveyResponse.findMany({ where, orderBy: { createdAt: "desc" } });
    const count = responses.length;
    const averages = {
      welcome: count ? responses.reduce((sum, item) => sum + item.welcomeScore, 0) / count : 0,
      facilities: count ? responses.reduce((sum, item) => sum + item.facilitiesScore, 0) / count : 0,
      services: count ? responses.reduce((sum, item) => sum + item.servicesScore, 0) / count : 0,
      overall: count ? responses.reduce((sum, item) => sum + item.welcomeScore + item.facilitiesScore + item.servicesScore, 0) / (count * 3) : 0,
    };
    const promoters = responses.filter((item) => item.recommendScore >= 9).length;
    const detractors = responses.filter((item) => item.recommendScore <= 6).length;
    const nps = count ? Math.round(((promoters - detractors) / count) * 100) : 0;
    const trendMap = new Map<string, { total: number; count: number }>();

    responses.forEach((item) => {
      const date = item.createdAt.toISOString().slice(0, 10);
      const current = trendMap.get(date) ?? { total: 0, count: 0 };
      trendMap.set(date, { total: current.total + item.welcomeScore + item.facilitiesScore + item.servicesScore, count: current.count + 3 });
    });

    const periodStart = from ? new Date(`${from}T00:00:00`) : responses.at(-1)?.createdAt;
    const periodEnd = to ? new Date(`${to}T23:59:59`) : responses[0]?.createdAt;
    const periodLength = periodStart && periodEnd ? periodEnd.getTime() - periodStart.getTime() : 0;
    const previousResponses = periodLength && periodStart ? await prisma.surveyResponse.findMany({ where: { createdAt: { gte: new Date(periodStart.getTime() - periodLength), lt: periodStart } } }) : [];
    const previousAverage = previousResponses.length ? previousResponses.reduce((sum, item) => sum + item.welcomeScore + item.facilitiesScore + item.servicesScore, 0) / (previousResponses.length * 3) : null;

    return NextResponse.json({
      summary: { count, nps, averages, previousAverage, averageChange: previousAverage === null ? null : Number((averages.overall - previousAverage).toFixed(1)) },
      trend: [...trendMap.entries()].reverse().map(([date, values]) => ({ date, score: Number((values.total / values.count).toFixed(1)) })),
      responses: responses.map((item) => ({
        id: item.id,
        fullName: item.fullName,
        phoneNumber: item.phoneNumber,
        scores: [item.welcomeScore, item.facilitiesScore, item.servicesScore, item.recommendScore],
        comment: item.comment,
        contactStatus: item.contactStatus,
        internalNote: item.internalNote,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    // TEMP DIAGNÓSTICO: expõe a causa real do 500. REMOVER depois.
    const raw = process.env.DATABASE_URL ?? "";
    const probe = { present: Boolean(raw), length: raw.length, first8: raw.slice(0, 8), startsOk: raw.startsWith("postgres") };
    return NextResponse.json({ error: "Não foi possível carregar os dados.", debug: e instanceof Error ? e.message : String(e), probe }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const originBlock = blockCrossOrigin(request);
  if (originBlock) return originBlock;
  if (!await isAuthorized()) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const status = ["PENDING", "CRITICAL", "CONTACTED", "RESOLVED"].includes(body.contactStatus) ? body.contactStatus : "PENDING";
    const response = await prisma.surveyResponse.update({
      where: { id: body.id },
      data: { contactStatus: status, internalNote: typeof body.internalNote === "string" ? body.internalNote.trim() || null : null, contactedAt: status === "PENDING" || status === "CRITICAL" ? null : new Date() },
    });
    return NextResponse.json({ id: response.id, contactStatus: response.contactStatus, internalNote: response.internalNote });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o acompanhamento." }, { status: 400 });
  }
}