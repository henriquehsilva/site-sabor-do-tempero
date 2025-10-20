const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

/**
 * Incrementa/decrementa o agregado em likes/{pratoId} quando o usuário curte/descurte.
 */
exports.onVoteWrite = functions.firestore
  .document("likes/{pratoId}/votes/{uid}")
  .onWrite(async (change, context) => {
    const { pratoId } = context.params;

    let delta = 0;
    const beforeLiked = change.before.exists ? !!change.before.data().liked : null;
    const afterLiked  = change.after.exists  ? !!change.after.data().liked  : null;

    // create: null -> true/false
    if (!change.before.exists && change.after.exists) {
      delta = afterLiked ? +1 : 0;
    }
    // update: true<->false
    else if (change.before.exists && change.after.exists) {
      if (beforeLiked !== afterLiked) delta = afterLiked ? +1 : -1;
    }
    // delete
    else if (change.before.exists && !change.after.exists) {
      delta = beforeLiked ? -1 : 0;
    }

    if (delta === 0) return null;

    const likeRef = db.collection("likes").doc(pratoId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(likeRef);
      const prev = snap.exists ? (snap.get("count") || 0) : 0;
      tx.set(likeRef, {
        count: Math.max(0, prev + delta),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    return null;
  });
