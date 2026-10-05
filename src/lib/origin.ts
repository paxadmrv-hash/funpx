import { NextResponse } from "next/server";

/**
 * Barra requisições de escrita vindas de outra origem (anti-CSRF).
 * Compara o header Origin com o host da própria requisição.
 * Retorna uma resposta 403 quando a origem é estrangeira, ou null quando está ok.
 */
export function blockCrossOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  // Requisições same-origin de navegador podem não enviar Origin em alguns casos (GET/navegação),
  // mas toda chamada fetch de escrita no app envia. Sem Origin, não bloqueamos aqui.
  if (!origin) return null;
  try {
    if (new URL(origin).host !== new URL(request.url).host) {
      return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }
  return null;
}
