import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const scoreFields = ["welcomeScore", "facilitiesScore", "servicesScore", "recommendScore"] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    const phoneDigits = phoneNumber.replace(/\D/g, "");

    if (!fullName || !phoneNumber) {
      return NextResponse.json({ error: "Nome e telefone são obrigatórios." }, { status: 400 });
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      return NextResponse.json({ error: "Informe um telefone válido com DDD." }, { status: 400 });
    }
    if (body.privacyConsent !== true) {
      return NextResponse.json({ error: "É necessário aceitar o uso dos dados para enviar a avaliação." }, { status: 400 });
    }

    const scores = Object.fromEntries(
      scoreFields.map((field) => [field, Number(body[field])]),
    ) as Record<(typeof scoreFields)[number], number>;

    if (scoreFields.some((field) => !Number.isInteger(scores[field]) || scores[field] < 1 || scores[field] > 10)) {
      return NextResponse.json({ error: "Todas as avaliações devem estar entre 1 e 10." }, { status: 400 });
    }

    const response = await prisma.surveyResponse.create({
      data: {
        fullName,
        phoneNumber: phoneDigits,
        ...scores,
        comment: typeof body.comment === "string" ? body.comment.trim() || null : null,
        privacyConsent: true,
      },
    });

    return NextResponse.json({ id: response.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar sua avaliação." }, { status: 500 });
  }
}