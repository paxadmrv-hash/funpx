/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { ArrowRight, Check, LoaderCircle, ShieldCheck } from "lucide-react";

const questions = [
  { key: "welcomeScore", label: "O quanto você se sentiu confortável e acolhido(a) pela nossa equipe durante o atendimento?" },
  { key: "facilitiesScore", label: "O quanto as instalações, incluindo as salas de cerimônia, e os alimentos servidos estavam adequados e bem preparados?" },
  { key: "servicesScore", label: "Qual seu nível de satisfação com os serviços contratados?" },
  { key: "recommendScore", label: "O quanto você recomendaria a Pax Rio Verde para familiares e amigos, em caso de necessidade?" },
] as const;

type Scores = Record<(typeof questions)[number]["key"], number>;
type FormData = { fullName: string; phoneNumber: string; comment: string };

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

export default function Home() {
  const [form, setFormState] = useState({ fullName: "", phoneNumber: "", comment: "" });
  const setForm = (next: FormData) => setFormState({ ...next, phoneNumber: formatPhone(next.phoneNumber) });
  const [scores, setScores] = useState<Scores>({ welcomeScore: 0, facilitiesScore: 0, servicesScore: 0, recommendScore: 0 });
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.fullName.trim() || !form.phoneNumber.trim()) {
      setError("Preencha seu nome e telefone para continuar.");
      return;
    }
    if (form.phoneNumber.replace(/\D/g, "").length < 10) {
      setError("Informe um telefone válido com DDD.");
      return;
    }
    if (!privacyConsent) {
      setError("Aceite o uso dos dados para enviar sua avaliação.");
      return;
    }
    if (Object.values(scores).some((value) => !value)) {
      setError("Escolha uma nota para cada pergunta antes de enviar.");
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...scores, privacyConsent }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível enviar sua avaliação.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return <main className="min-h-screen px-5 py-10 md:px-10"><div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center"><section className="w-full rounded-[28px] bg-[#fffefa] px-7 py-16 text-center shadow-[0_22px_70px_rgba(49,79,68,.10)] md:px-20"><div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-[#dcebdd] text-[#3c625a]"><Check size={30} strokeWidth={2.5} /></div><p className="mb-3 text-xs font-bold uppercase tracking-[.22em] text-[#d98970]">Muito obrigado</p><h1 className="serif text-4xl text-[#203332] md:text-5xl">Sua voz fica com a gente.</h1><p className="mx-auto mt-5 max-w-md leading-7 text-[#6c7f7a]">Sua avaliação foi registrada com carinho. Ela nos ajuda a cuidar ainda melhor de cada família.</p></section></div></main>;
  }

  return <main className="min-h-screen px-5 py-8 md:px-10 md:py-12"><div className="mx-auto max-w-6xl"><header className="mb-9 flex items-center"><a href="/" className="flex items-center gap-3"><Image src="/logo_pax_30_anos.png" alt="Pax Rio Verde 30 anos" width={156} height={108} className="h-[70px] w-auto object-contain object-left" priority /></a></header>
    <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-start"><aside className="rise pt-2 lg:sticky lg:top-10"><p className="mb-5 text-xs font-bold uppercase tracking-[.22em] text-[#d98970]">Pesquisa de satisfação</p><h1 className="serif max-w-xl text-5xl leading-[1.08] tracking-[-.02em] text-[#203332] md:text-6xl">Sua experiência importa para nós.</h1><p className="mt-6 max-w-md text-base leading-7 text-[#6c7f7a]">Em um momento tão delicado, cada detalhe faz diferença. Conte como foi ser acolhido pela Pax Rio Verde.</p><div className="mt-10 flex items-center gap-3 border-t border-[#dce5df] pt-5 text-sm text-[#6c7f7a]"><ShieldCheck size={19} className="text-[#3c625a]" />Leva menos de 3 minutos</div></aside>
      <form onSubmit={submit} className="rise delay-1 rounded-[28px] bg-[#fffefa] p-6 shadow-[0_22px_70px_rgba(49,79,68,.10)] md:p-10"><div className="mb-9 border-b border-[#dce5df] pb-7"><span className="text-xs font-bold uppercase tracking-[.18em] text-[#6c7f7a]">01 — Sobre você</span><h2 className="serif mt-3 text-3xl text-[#203332]">Começamos por aqui</h2><p className="mt-2 text-sm text-[#6c7f7a]">Esses dados são usados apenas para identificar sua avaliação.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">Nome completo<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="mt-2 w-full border-b-2 border-[#dce5df] bg-transparent px-0 py-3 text-base font-normal outline-none transition focus:border-[#3c625a]" placeholder="Como podemos chamar você?" /></label><label className="text-sm font-semibold">Número de telefone<input required type="tel" value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} className="mt-2 w-full border-b-2 border-[#dce5df] bg-transparent px-0 py-3 text-base font-normal outline-none transition focus:border-[#3c625a]" placeholder="(64) 99999-9999" /></label></div></div>
        <div><span className="text-xs font-bold uppercase tracking-[.18em] text-[#6c7f7a]">02 — Sua percepção</span><h2 className="serif mt-3 text-3xl text-[#203332]">Pode nos contar com sinceridade</h2><div className="mt-7 space-y-8">{questions.map((question, index) => <fieldset key={question.key}><legend className="text-[15px] font-semibold leading-6 text-[#203332]"><span className="mr-2 text-[#d98970]">0{index + 1}</span>{question.label}</legend><div className="mt-4 grid grid-cols-10 gap-1.5 sm:gap-2">{Array.from({ length: 10 }, (_, note) => note + 1).map((note) => <button type="button" key={note} onClick={() => setScores({ ...scores, [question.key]: note })} className={`flex aspect-square items-center justify-center rounded-xl text-sm font-bold transition sm:text-base ${scores[question.key] === note ? "bg-[#3c625a] text-white shadow-[0_5px_14px_rgba(60,98,90,.25)]" : "bg-[#eef3ed] text-[#6c7f7a] hover:bg-[#dcebdd]"}`}>{note}</button>)}</div><div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-[.08em] text-[#91a19d]"><span>Pouco satisfeito</span><span>Muito satisfeito</span></div></fieldset>)}</div></div>
        <label className="mt-9 block border-t border-[#dce5df] pt-8 text-sm font-semibold">05 <span className="ml-2">Quer deixar um comentário?</span><span className="font-normal text-[#91a19d]"> (opcional)</span><textarea value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} className="mt-3 min-h-28 w-full resize-y rounded-2xl border border-[#dce5df] bg-[#f8faf6] p-4 text-base font-normal outline-none transition focus:border-[#3c625a]" placeholder="Sugestões, elogios ou pontos de melhoria..." /></label>
        <label className="mt-6 flex items-start gap-3 text-xs leading-5 text-[#6c7f7a]"><input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#3c625a]" />Autorizo o uso do meu nome e telefone para atendimento, retorno e gestão desta avaliação, conforme a LGPD.</label>{error && <p className="mt-5 rounded-xl bg-[#fbe9e3] px-4 py-3 text-sm font-semibold text-[#a6533c]">{error}</p>}<button disabled={sending} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d98970] px-6 py-4 font-bold text-white transition hover:bg-[#c87259] disabled:cursor-wait disabled:opacity-70">{sending ? <LoaderCircle className="animate-spin" size={19} /> : <>Enviar minha avaliação <ArrowRight size={18} /></>}</button><p className="mt-4 text-center text-xs text-[#91a19d]">Agradecemos por reservar um momento para compartilhar.</p></form></div></div></main>;
}
