import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { blockCrossOrigin } from "@/lib/origin";
import { allowPublic } from "@/lib/rate-limit";

const scoreFields = ["welcomeScore", "facilitiesScore", "servicesScore", "recommendScore"] as const;

export async function POST(request: Request) {
  try {
    const originBlock = blockCrossOrigin(request);
    if (originBlock) return originBlock;

    if (!await allowPublic(request)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto e tente novamente." }, { status: 429 });
    }

    const body = await request.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    const phoneDigits = phoneNumber.replace(/\D/g, "");

    if (!fullName || !phoneNumber) {
      return NextResponse.json({ error: "Nome e telefone são obrigatórios." }, { status: 400 });
    }
    if (fullName.length > 120) {
      return NextResponse.json({ error: "Nome muito longo." }, { status: 400 });
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      return NextResponse.json({ error: "Informe um telefone válido com DDD." }, { status: 400 });
    }
    if (body.privacyConsent !== true) {
      return NextResponse.json({ error: "É necessário aceitar o uso dos dados para enviar a avaliação." }, { status: 400 });
    }

    const comment = typeof body.comment === "string" ? body.comment.trim() : "";
    if (comment.length > 2000) {
      return NextResponse.json({ error: "Comentário muito longo." }, { status: 400 });
    }

    const scores = Object.fromEntries(
      scoreFields.map((field) => [field, Number(body[field])]),
    ) as Record<(typeof scoreFields)[number], number>;

    if (scoreFields.some((field) => !Number.isInteger(scores[field]) || scores[field] < 1 || scores[field] > 10)) {
      return NextResponse.json({ error: "Todas as avaliações devem estar entre 1 e 10." }, { status: 400 });
    }

    // Define o acompanhamento inicial pela nota de recomendação (a nota decisiva):
    // 1 a 5  -> CRITICAL (crítico, atenção urgente)
    // 6      -> PENDING  (abre acompanhamento normal)
    // 7 a 10 -> RESOLVED (já resolvido, não precisa de acompanhamento)
    const recommend = scores.recommendScore;
    const initialStatus = recommend <= 5 ? "CRITICAL" : recommend === 6 ? "PENDING" : "RESOLVED";

    const response = await prisma.surveyResponse.create({
      data: {
        fullName,
        phoneNumber: phoneDigits,
        ...scores,
        comment: comment || null,
        privacyConsent: true,
        contactStatus: initialStatus,
        contactedAt: initialStatus === "RESOLVED" ? new Date() : null,
      },
    });

    return NextResponse.json({ id: response.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar sua avaliação." }, { status: 500 });
  }
}