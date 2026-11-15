// Confirmação de presença (função da Vercel em POST /api/confirmar).
// O navegador só manda o id do convite; nomes e crianças vêm da lista do servidor.
const CONVITES = require('./_convidados');
const { registrar } = require('./_confirmacoes');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const convite = CONVITES.find(c => c.id === String((body && body.convidadoId) || ''));
  if (!convite) return res.status(400).json({ ok: false, motivo: 'convite_invalido' });

  try {
    res.status(200).json(await registrar(convite, body.mensagem));
  } catch (err) {
    console.error(err);
    res.status(502).json({ ok: false, motivo: 'erro' });
  }
};
