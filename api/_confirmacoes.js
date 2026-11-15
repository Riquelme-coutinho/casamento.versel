// Onde as confirmações ficam guardadas.
// - Na Vercel: na planilha do Google (variáveis GOOGLE_SCRIPT_URL e PLANILHA_TOKEN; veja planilha/LEIA-ME.txt).
// - No computador, sem essas variáveis: no arquivo confirmacoes-local.json (só para teste).
const fs = require('fs');
const path = require('path');
const CONVITES = require('./_convidados');

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || '';
const TOKEN = process.env.PLANILHA_TOKEN || '';
const ARQUIVO_LOCAL = path.join(__dirname, '..', 'confirmacoes-local.json');

const juntar = nomes => nomes.length < 2 ? (nomes[0] || '')
  : nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
const pessoas = c => c.adultos.length + c.criancas.length;
// Lista completa enviada à planilha para ela incluir convites novos na "Lista de Convidados".
const todos = () => CONVITES.map(c => ({ id: c.id, nome: juntar(c.adultos), pessoas: pessoas(c) }));

function semPlanilha() {
  if (process.env.VERCEL) throw Error('Planilha não configurada: defina GOOGLE_SCRIPT_URL e PLANILHA_TOKEN na Vercel.');
}
const lerLocal = () => { try { return JSON.parse(fs.readFileSync(ARQUIVO_LOCAL, 'utf8')); } catch (e) { return []; } };

async function planilha(dados) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: TOKEN, todos: todos(), ...dados })
  });
  const texto = await res.text();
  try { return JSON.parse(texto); }
  catch (e) { throw Error('Resposta inesperada da planilha (confira a URL e a implantação): ' + texto.slice(0, 200)); }
}

// Guarda por alguns segundos para a busca não consultar a planilha a cada letra digitada.
let cache = { ids: null, ate: 0 };

async function idsConfirmados() {
  if (!SCRIPT_URL) { semPlanilha(); return new Set(lerLocal().map(c => c.id)); }
  if (cache.ids && Date.now() < cache.ate) return cache.ids;
  const data = await planilha({ acao: 'status' });
  if (!data.ok) throw Error('Planilha recusou a consulta: ' + data.erro);
  cache = { ids: new Set(data.ids.map(String)), ate: Date.now() + 15000 };
  return cache.ids;
}

// Registra um convite. Devolve {ok:true} ou {ok:false, motivo:'ja_confirmado'}.
async function registrar(convite, mensagem) {
  const registro = {
    id: convite.id,
    nome: juntar(convite.adultos),
    adultos: convite.adultos.length,
    criancas: convite.criancas,
    pessoas: pessoas(convite),
    mensagem: String(mensagem || '').trim().slice(0, 500)
  };

  if (!SCRIPT_URL) {
    semPlanilha();
    const lista = lerLocal();
    if (lista.some(c => c.id === convite.id)) return { ok: false, motivo: 'ja_confirmado' };
    lista.push({ data: new Date().toLocaleString('pt-BR'), ...registro });
    fs.writeFileSync(ARQUIVO_LOCAL, JSON.stringify(lista, null, 2));
    return { ok: true };
  }

  const data = await planilha({ acao: 'confirmar', ...registro });
  if (data.ok) { if (cache.ids) cache.ids.add(convite.id); return { ok: true }; }
  if (data.motivo === 'ja_confirmado') return data;
  throw Error('Planilha recusou a confirmação: ' + data.erro);
}

module.exports = { idsConfirmados, registrar, juntar };
