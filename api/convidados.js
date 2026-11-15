// Busca de convites (função da Vercel em /api/convidados?nome=...).
// Só devolve convites em que um dos adultos tem TODAS as palavras digitadas como palavras inteiras
// do nome, então ninguém consegue listar os convidados digitando letras soltas.
// Crianças não entram na busca: são confirmadas junto com os pais.
// Convites já confirmados não aparecem mais.
const CONVITES = require('./_convidados');
const { idsConfirmados, juntar } = require('./_confirmacoes');

const IGNORAR = new Set(['tia', 'tio', 'de', 'da', 'do', 'das', 'dos', 'e']);
const palavras = s => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z\s]/g, ' ').split(/\s+/)
  .filter(p => p && !IGNORAR.has(p));

function detalhe({ adultos, criancas }) {
  const tipo = adultos.length === 1 ? 'Convite individual'
    : adultos.length === 2 ? 'Convite para casal'
    : `Convite para família (${adultos.length} pessoas)`;
  if (!criancas.length) return tipo;
  return `${tipo} · com ${criancas.length === 1 ? 'a criança' : 'as crianças'} ${juntar(criancas)}`;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const busca = palavras(req.query.nome).slice(0, 6);
  if (busca.join('').length < 3) return res.status(200).json({ convidados: [] });

  // Aceita tanto um nome ("Pedro Silva") quanto o nome completo do convite ("Patricia ... e Pedro ...").
  const bate = c => c.adultos.some(n => busca.every(p => palavras(n).includes(p)))
    || busca.every(p => palavras(c.adultos.join(' ')).includes(p));
  const encontrados = CONVITES.filter(bate);

  // Se a planilha estiver fora do ar, a busca continua funcionando; a confirmação repetida é barrada depois.
  let confirmados = new Set();
  if (encontrados.length) {
    try { confirmados = await idsConfirmados(); } catch (err) { console.error(err); }
  }

  const convidados = encontrados.filter(c => !confirmados.has(c.id)).slice(0, 5).map(c => ({
    id: c.id,
    nome: juntar(c.adultos),
    adultos: c.adultos.length,
    criancas: c.criancas,
    detalhe: detalhe(c)
  }));
  res.status(200).json({ convidados, jaConfirmados: encontrados.length - convidados.length });
};
