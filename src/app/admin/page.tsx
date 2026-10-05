/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import Image from "next/image";
import { useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, Download, MessageCircle, RefreshCw, Star, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Response = { id: string; fullName: string; phoneNumber: string; scores: number[]; comment: string | null; contactStatus: "PENDING" | "CRITICAL" | "CONTACTED" | "RESOLVED"; internalNote: string | null; createdAt: string };
type DashboardData = { summary: { count: number; nps: number; averages: { welcome: number; facilities: number; services: number; overall: number }; previousAverage: number | null; averageChange: number | null }; trend: { date: string; score: number }[]; responses: Response[] };
type Filters = { from: string; to: string; minScore: string; commentOnly: boolean };

function whatsappUrl(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

function csvValue(value: string | number | null) {
  const text = String(value ?? "");
  // Anti CSV-injection: células iniciadas por = + - @ (ou tab/CR) viram fórmula no Excel.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function statusLabel(status: Response["contactStatus"]) {
  return { PENDING: "Pendente", CRITICAL: "Crítico", CONTACTED: "Contatado", RESOLVED: "Resolvido" }[status];
}

export default function AdminPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [filters, setFilters] = useState<Filters>({ from: "", to: "", minScore: "", commentOnly: false });

  async function load(nextFilters = filters) {
    const params = new URLSearchParams();
    if (nextFilters.from) params.set("from", nextFilters.from);
    if (nextFilters.to) params.set("to", nextFilters.to);
    if (nextFilters.minScore) params.set("minScore", nextFilters.minScore);
    if (nextFilters.commentOnly) params.set("commentOnly", "true");
    setLoading(true);
    const response = await fetch(`/api/admin?${params}`);
    if (response.ok) { setData(await response.json()); setAuthorized(true); setAccessError(""); }
    else setAccessError("Sessão expirada. Entre novamente.");
    setLoading(false);
  }

  async function signIn() {
    setLoading(true);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setAccessError(result?.error ?? "Não foi possível entrar.");
      setLoading(false);
      return;
    }
    setPassword("");
    await load();
  }

  function exportCsv() {
    if (!data) return;
    const rows = [
      ["Nome", "Telefone", "Acolhimento", "Ambiente", "Serviços", "Recomendação", "Comentário", "Status", "Observação interna", "Data"],
      ...data.responses.map((item) => [item.fullName, item.phoneNumber, ...item.scores, item.comment, statusLabel(item.contactStatus), item.internalNote, new Date(item.createdAt).toLocaleDateString("pt-BR")]),
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map(csvValue).join(";")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `avaliacoes-pax-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function updateFollowUp(id: string, contactStatus: Response["contactStatus"], internalNote: string) {
    await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, contactStatus, internalNote }) });
    await load();
  }

  if (!authorized) return <main className="flex min-h-screen items-center justify-center bg-[#f6f5ef] px-5"><section className="w-full max-w-md rounded-3xl bg-[#fffefa] p-8 text-center shadow-[0_20px_60px_rgba(49,79,68,.1)]"><Image src="/logo_pax_30_anos.png" alt="Pax Rio Verde 30 anos" width={150} height={105} className="mx-auto h-20 w-auto object-contain" /><h1 className="serif mt-5 text-3xl text-[#203332]">Área administrativa</h1><p className="mt-2 text-sm text-[#6c7f7a]">Informe seu e-mail e senha para acessar as avaliações.</p><form onSubmit={(event) => { event.preventDefault(); signIn(); }} className="mt-7"><input autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="w-full rounded-xl border border-[#dce5df] bg-[#f8faf6] px-4 py-3 outline-none focus:border-[#3c625a]" placeholder="E-mail" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="mt-3 w-full rounded-xl border border-[#dce5df] bg-[#f8faf6] px-4 py-3 outline-none focus:border-[#3c625a]" placeholder="Senha de acesso" /><button disabled={loading} className="mt-3 w-full rounded-xl bg-[#3c625a] px-4 py-3 font-bold text-white transition hover:bg-[#2f504a] disabled:opacity-60">Entrar</button>{accessError && <p className="mt-3 text-sm font-semibold text-[#a6533c]">{accessError}</p>}</form><a href="/" className="mt-6 inline-block text-sm font-semibold text-[#6c7f7a]">Voltar à pesquisa</a></section></main>;
  if (loading || !data) return <main className="flex min-h-screen items-center justify-center bg-[#f6f5ef] text-[#3c625a]"><RefreshCw className="animate-spin" /></main>;

  const lowScoreCount = data.responses.filter((item) => item.scores[3] <= 6).length;
  const metrics = [{ label: "Média geral", value: data.summary.averages.overall.toFixed(1), suffix: "/ 10", icon: Star }, { label: "NPS", value: data.summary.nps > 0 ? `+${data.summary.nps}` : data.summary.nps, suffix: "pontos", icon: BarChart3 }, { label: "Avaliações", value: data.summary.count, suffix: "respostas", icon: Users }];
  const chartData = [{ name: "Acolhimento", score: data.summary.averages.welcome }, { name: "Ambiente", score: data.summary.averages.facilities }, { name: "Serviços", score: data.summary.averages.services }];

  return <main className="min-h-screen bg-[#f6f5ef] px-5 py-7 md:px-9"><div className="mx-auto max-w-[1450px]"><header className="flex flex-wrap items-center justify-between gap-5"><a href="/" className="flex items-center"><Image src="/logo_pax_30_anos.png" alt="Pax Rio Verde 30 anos" width={156} height={108} className="h-[70px] w-auto object-contain object-left" priority /></a><div className="flex gap-2"><button onClick={exportCsv} title="Exportar CSV" className="rounded-xl border border-[#dce5df] bg-[#fffefa] p-2.5 text-[#3c625a] transition hover:bg-[#dcebdd]"><Download size={17} /></button><button onClick={() => load()} title="Atualizar dados" className="rounded-xl border border-[#dce5df] bg-[#fffefa] p-2.5 text-[#3c625a] transition hover:bg-[#dcebdd]"><RefreshCw size={17} /></button></div></header><div className="mt-12"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#d98970]">Dashboard administrativo</p><h1 className="serif mt-2 text-4xl text-[#203332] md:text-5xl">O cuidado em números.</h1><p className="mt-3 text-[#6c7f7a]">Acompanhe o que as famílias estão sentindo e onde podemos evoluir.</p></div>
    <form onSubmit={(event) => { event.preventDefault(); load(filters); }} className="mt-8 flex flex-wrap items-end gap-3 rounded-2xl bg-[#fffefa] p-4 shadow-[0_10px_35px_rgba(49,79,68,.06)]"><label className="text-xs font-bold text-[#6c7f7a]">De<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className="mt-1 block rounded-lg border border-[#dce5df] bg-[#f8faf6] px-3 py-2 text-sm font-normal text-[#203332]" /></label><label className="text-xs font-bold text-[#6c7f7a]">Até<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className="mt-1 block rounded-lg border border-[#dce5df] bg-[#f8faf6] px-3 py-2 text-sm font-normal text-[#203332]" /></label><label className="text-xs font-bold text-[#6c7f7a]">Nota de recomendação até<select value={filters.minScore} onChange={(event) => setFilters({ ...filters, minScore: event.target.value })} className="mt-1 block rounded-lg border border-[#dce5df] bg-[#f8faf6] px-3 py-2 text-sm font-normal text-[#203332]"><option value="">Todas</option><option value="6">6 (clientes insatisfeitos)</option><option value="8">8 ou menos</option></select></label><label className="flex items-center gap-2 pb-2 text-sm font-semibold text-[#3c625a]"><input type="checkbox" checked={filters.commentOnly} onChange={(event) => setFilters({ ...filters, commentOnly: event.target.checked })} />Com comentários</label><button className="rounded-lg bg-[#3c625a] px-4 py-2.5 text-sm font-bold text-white">Aplicar filtros</button><button type="button" onClick={() => { const empty = { from: "", to: "", minScore: "", commentOnly: false }; setFilters(empty); load(empty); }} className="px-2 py-2 text-sm font-semibold text-[#6c7f7a]">Limpar</button></form>
    {lowScoreCount > 0 && <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#f2c5b6] bg-[#fff4ef] px-5 py-4 text-sm text-[#994c38]"><AlertTriangle size={19} /><span><strong>{lowScoreCount} avaliação(ões) precisam de atenção.</strong> Verifique as notas baixas e registre o acompanhamento.</span></div>}
    <div className="mt-5 grid gap-4 md:grid-cols-3">{metrics.map(({ label, value, suffix, icon: Icon }) => <div key={label} className="rounded-2xl bg-[#fffefa] p-5 shadow-[0_10px_35px_rgba(49,79,68,.06)]"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-[#6c7f7a]">{label}</span><Icon size={18} className="text-[#d98970]" /></div><div className="mt-4 flex items-baseline gap-2"><strong className="text-3xl text-[#203332]">{value}</strong><span className="text-xs font-semibold text-[#91a19d]">{suffix}</span></div></div>)}</div>
    {data.summary.averageChange !== null && <p className="mt-4 text-sm font-semibold text-[#6c7f7a]">Comparação com o período anterior: <span className={data.summary.averageChange >= 0 ? "text-[#3c625a]" : "text-[#a6533c]"}>{data.summary.averageChange >= 0 ? "+" : ""}{data.summary.averageChange} ponto(s) na média geral</span></p>}
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.45fr]"><section className="rounded-2xl bg-[#fffefa] p-6 shadow-[0_10px_35px_rgba(49,79,68,.06)]"><h2 className="serif text-2xl text-[#203332]">Pontos de contato</h2><p className="mt-1 text-sm text-[#6c7f7a]">Média das três primeiras perguntas</p><div className="mt-5 h-[250px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}><CartesianGrid horizontal={false} stroke="#e8eee8" /><XAxis type="number" domain={[0, 10]} hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#6c7f7a", fontSize: 12 }} width={78} /><Tooltip formatter={(value) => [`${Number(value).toFixed(1)} / 10`, "Média"]} /><Bar dataKey="score" fill="#8eb49a" radius={[0, 7, 7, 0]} barSize={25} /></BarChart></ResponsiveContainer></div></section><section className="rounded-2xl bg-[#fffefa] p-6 shadow-[0_10px_35px_rgba(49,79,68,.06)]"><h2 className="serif text-2xl text-[#203332]">Evolução da satisfação</h2><p className="mt-1 text-sm text-[#6c7f7a]">Média geral ao longo do tempo</p><div className="mt-5 h-[250px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.trend} margin={{ left: -20, right: 8, top: 10 }}><CartesianGrid stroke="#e8eee8" vertical={false} /><XAxis dataKey="date" tickFormatter={(date) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} axisLine={false} tickLine={false} tick={{ fill: "#91a19d", fontSize: 11 }} /><YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: "#91a19d", fontSize: 11 }} /><Tooltip formatter={(value) => [`${value} / 10`, "Satisfação"]} /><Line type="monotone" dataKey="score" stroke="#d98970" strokeWidth={3} dot={{ fill: "#d98970", r: 4 }} /></LineChart></ResponsiveContainer></div></section></div>
    <section className="mt-5 overflow-hidden rounded-2xl bg-[#fffefa] shadow-[0_10px_35px_rgba(49,79,68,.06)]"><div className="flex items-center justify-between p-6 pb-4"><div><h2 className="serif text-2xl text-[#203332]">Avaliações e acompanhamento</h2><p className="mt-1 text-sm text-[#6c7f7a]">WhatsApp aparece para notas de recomendação de 1 a 6</p></div><span className="rounded-full bg-[#eef3ed] px-3 py-1 text-xs font-bold text-[#3c625a]">{data.responses.length}</span></div><div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="border-y border-[#e8eee8] bg-[#fbfcf9] text-[10px] uppercase tracking-[.12em] text-[#91a19d]"><tr><th className="px-6 py-3">Pessoa</th><th className="px-4 py-3">Telefone</th><th className="px-4 py-3">Notas 1 — 4</th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Acompanhamento</th><th className="px-6 py-3">Observação</th></tr></thead><tbody>{data.responses.map((item) => { const needsAttention = item.scores[3] <= 6; return <tr key={item.id} className={`border-b border-[#eef2ee] last:border-0 ${needsAttention ? "bg-[#fffaf7]" : ""}`}><td className="px-6 py-4 font-semibold text-[#203332]">{item.fullName}{needsAttention && <AlertTriangle size={14} className="ml-2 inline text-[#d98970]" />}</td><td className="px-4 py-4"><div className="flex items-center gap-2 text-[#6c7f7a]"><span>{item.phoneNumber}</span>{item.scores[3] <= 6 && <a href={whatsappUrl(item.phoneNumber)} target="_blank" rel="noreferrer" title="Enviar mensagem pelo WhatsApp" className="transition hover:scale-110"><Image src="/whatsapp.jpg" alt="WhatsApp" width={25} height={25} className="h-6 w-6 rounded-full object-cover" /></a>}</div></td><td className="px-4 py-4"><div className="flex gap-1">{item.scores.map((score, index) => <span key={index} className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${index === 3 ? "bg-[#fbe9e3] text-[#a6533c]" : "bg-[#eef3ed] text-[#3c625a]"}`}>{score}</span>)}</div></td><td className="px-4 py-4 text-xs text-[#91a19d]">{new Date(item.createdAt).toLocaleDateString("pt-BR")}</td><td className="px-4 py-4"><select value={item.contactStatus} onChange={(event) => updateFollowUp(item.id, event.target.value as Response["contactStatus"], item.internalNote || "")} className="rounded-lg border border-[#dce5df] bg-[#f8faf6] px-2 py-1.5 text-xs font-semibold text-[#3c625a]"><option value="CRITICAL">Crítico</option><option value="PENDING">Pendente</option><option value="CONTACTED">Contatado</option><option value="RESOLVED">Resolvido</option></select>{item.contactStatus === "RESOLVED" && <CheckCircle2 size={14} className="ml-2 inline text-[#3c625a]" />}{item.contactStatus === "CRITICAL" && <AlertTriangle size={14} className="ml-2 inline text-[#a6533c]" />}</td><td className="px-6 py-4"><input defaultValue={item.internalNote || ""} onBlur={(event) => updateFollowUp(item.id, item.contactStatus, event.target.value)} placeholder="Adicionar nota..." className="w-40 rounded-lg border border-[#dce5df] bg-[#f8faf6] px-2 py-1.5 text-xs outline-none focus:border-[#3c625a]" /></td></tr>; })}</tbody></table></div></section><section className="mt-5 rounded-2xl bg-[#3c625a] p-6 text-[#f6f5ef] shadow-[0_10px_35px_rgba(49,79,68,.12)]"><div className="flex items-center gap-3"><MessageCircle size={20} className="text-[#e8b09d]" /><h2 className="serif text-2xl">Vozes das famílias</h2></div><p className="mt-1 text-sm text-[#c8d8cd]">Comentários recentes para inspirar o próximo cuidado.</p><div className="mt-6 space-y-4">{data.responses.filter((item) => item.comment).slice(0, 4).map((item) => <blockquote key={item.id} className="border-l-2 border-[#d98970] pl-4 text-sm leading-6 text-[#e6eee7]">“{item.comment}”<cite className="mt-1 block text-xs font-bold not-italic text-[#aac5b2]">{item.fullName}</cite></blockquote>)}{!data.responses.some((item) => item.comment) && <p className="text-sm text-[#c8d8cd]">Os comentários aparecerão aqui conforme forem recebidos.</p>}</div></section></div></main>;
}
