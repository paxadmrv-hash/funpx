import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.surveyResponse.count();
  if (count > 0) return;
  await prisma.surveyResponse.createMany({
    data: [
      { fullName: "Marina Alves", phoneNumber: "64999990001", welcomeScore: 10, facilitiesScore: 9, servicesScore: 10, recommendScore: 10, comment: "Fomos tratados com muito respeito e acolhimento em todos os momentos.", createdAt: new Date("2026-09-02T10:30:00") },
      { fullName: "Carlos Mendes", phoneNumber: "64999990002", welcomeScore: 9, facilitiesScore: 8, servicesScore: 9, recommendScore: 9, comment: "A equipe foi atenciosa e prestativa. Obrigado por tudo.", createdAt: new Date("2026-09-05T14:15:00") },
      { fullName: "Ana Ferreira", phoneNumber: "64999990003", welcomeScore: 8, facilitiesScore: 9, servicesScore: 8, recommendScore: 8, comment: "Ambiente tranquilo e organizado para um momento difícil.", createdAt: new Date("2026-09-08T09:00:00") },
    ],
  });
}

main().finally(() => prisma.$disconnect());
