/* eslint-disable camelcase */
'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const { FieldValue } = admin.firestore;

/* --------------------------- helpers reutilizáveis -------------------------- */

/**
 * Calcula o delta de curtidas com base na mudança do doc:
 * - create: liked=true  => +1 | liked=false => 0
 * - update: true->false => -1 | false->true => +1
 * - delete: if before=true => -1 | else => 0
 */
function computeDelta(change) {
  const beforeLiked = change.before.exists ? !!change.before.data().liked : null;
  const afterLiked  = change.after.exists  ? !!change.after.data().liked  : null;

  if (!change.before.exists && change.after.exists) {
    return afterLiked ? +1 : 0;
  } else if (change.before.exists && change.after.exists) {
    if (beforeLiked === afterLiked) return 0;
    return afterLiked ? +1 : -1;
  } else if (change.before.exists && !change.after.exists) {
    return beforeLiked ? -1 : 0;
  }
  return 0;
}

/**
 * Aplica delta de forma transacional e impede contador negativo.
 */
async function applyDeltaWithClamp(aggRef, delta) {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(aggRef);
    const prev = snap.exists ? (snap.get('count') || 0) : 0;
    const next = Math.max(0, prev + delta);
    tx.set(
      aggRef,
      { count: next, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  });
}

/**
 * Valida a chave do prato (pratoKey) para evitar paths ruins.
 */
function isValidPratoKey(k) {
  return typeof k === 'string' && k.length > 0 && k.length <= 200;
}

/**
 * Valida a data no formato YYYY-MM-DD (se usar a variante diária).
 */
function isValidDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/* ----------------------------- agregados: total ----------------------------- */
/**
 * Agregado por prato:
 * Documentos de voto: likes/{pratoKey}/votes/{uid}
 * Agregado:          likes/{pratoKey}  (count, updatedAt)
 *
 * Use pratoKey fixo do seu menu.json (ou um slug do nome no front).
 */
exports.onVoteWrite = functions.firestore
  .document('likes/{pratoKey}/votes/{uid}')
  .onWrite(async (change, context) => {
    const { pratoKey } = context.params;

    if (!isValidPratoKey(pratoKey)) {
      console.warn('[onVoteWrite] pratoKey inválido:', pratoKey);
      return null;
    }

    const delta = computeDelta(change);
    if (!delta) return null;

    const aggRef = db.collection('likes').doc(pratoKey);
    await applyDeltaWithClamp(aggRef, delta);
    return null;
  });

/* --------------------------- agregados: por dia ----------------------------- */
/**
 * (Opcional) Agregado por dia:
 * Documentos de voto: likes_daily/{date}/{pratoKey}/votes/{uid}
 * Agregado:           likes_daily/{date}/{pratoKey} (count, updatedAt)
 *
 * 'date' pode ser meta.data do seu menu.json no formato YYYY-MM-DD.
 */
exports.onVoteWriteDaily = functions.firestore
  .document('likes_daily/{date}/{pratoKey}/votes/{uid}')
  .onWrite(async (change, context) => {
    const { date, pratoKey } = context.params;

    if (!isValidPratoKey(pratoKey)) {
      console.warn('[onVoteWriteDaily] pratoKey inválido:', pratoKey);
      return null;
    }
    if (!isValidDateStr(date)) {
      console.warn('[onVoteWriteDaily] date inválida (esperado YYYY-MM-DD):', date);
      return null;
    }

    const delta = computeDelta(change);
    if (!delta) return null;

    const aggRef = db.doc(`likes_daily/${date}/${pratoKey}`);
    await applyDeltaWithClamp(aggRef, delta);
    return null;
  });
