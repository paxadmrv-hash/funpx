/**
 * Reclassifica o acompanhamento das respostas JÁ EXISTENTES conforme a nova regra:
 *   recomendação 1 a 5  -> CRITICAL
 *   recomendação 6      -> PENDING  (acompanhamento normal)
 *   recomendação 7 a 10 -> RESOLVED
 *
 * Só toca nas que ainda estão "PENDING" (as que o admin já atualizou à mão
 * para CONTACTED/RESOLVED/CRITICAL são preservadas).
 *
 * Rodar uma única vez: npx tsx prisma/backfill-status.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pending = await prisma.surveyResponse.findMany({ where: { contactStatus: "PENDING" } });
  let critical = 0;
  let resolved = 0;
  let keptPending = 0;

  for (const item of pending) {
    const r = item.recommendScore;
    const next = r <= 5 ? "CRITICAL" : r === 6 ? "PENDING" : "RESOLVED";
    if (next === "PENDING") {
      keptPending += 1;
      continue;
    }
    await prisma.surveyResponse.update({
      where: { id: item.id },
      data: { contactStatus: next, contactedAt: next === "RESOLVED" ? item.contactedAt ?? new Date() : null },
    });
    if (next === "CRITICAL") critical += 1;
    else resolved += 1;
  }

  console.log(`Reclassificadas: ${critical} crítico(s), ${resolved} resolvido(s); ${keptPending} mantida(s) como pendente (nota 6).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
