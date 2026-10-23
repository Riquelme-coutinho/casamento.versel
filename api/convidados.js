// Busca de convidados (função da Vercel em /api/convidados?nome=...).
// Só devolve quem tem TODAS as palavras digitadas como palavras inteiras do nome,
// então ninguém consegue listar os convidados digitando letras soltas.
const CONVIDADOS = require('./_convidados');

const IGNORAR = new Set(['tia', 'tio', 'de', 'da', 'do', 'das', 'dos', 'e']);
const palavras = s => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z\s]/g, ' ').split(/\s+/)
  .filter(p => p && !IGNORAR.has(p));

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const busca = palavras(req.query.nome).slice(0, 6);
  if (busca.join('').length < 3) return res.status(200).json({ convidados: [] });

  const convidados = CONVIDADOS
    .filter(g => { const nome = palavras(g.nome); return busca.every(p => nome.includes(p)); })
    .slice(0, 5)
    .map(({ id, nome, detalhe }) => ({ id, nome, detalhe }));
  res.status(200).json({ convidados });
};
