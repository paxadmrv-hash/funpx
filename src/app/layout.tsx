import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pax Rio Verde | Cuidar também é ouvir",
  description: "Pesquisa de satisfação da Pax Rio Verde.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
