import {firebaseConfig, ownerUid} from './firebase-config.js';
import {normalizeContent, photoIds} from './content.js';

let connection;
export async function connect() {
  if (!connection) connection = (async () => {
    const [appSDK, authSDK, dbSDK] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
    ]);
    const app = appSDK.initializeApp(firebaseConfig);
    const auth = authSDK.getAuth(app);
    const db = dbSDK.getFirestore(app);
    return {auth, db, authSDK, dbSDK};
  })();
  return connection;
}

export function isOwner(user) { return !!user && user.uid === ownerUid; }

export async function watchAuth(callback) {
  const {auth, authSDK} = await connect();
  return authSDK.onAuthStateChanged(auth, callback);
}

export async function login(email, password) {
  const {auth, authSDK} = await connect();
  const result = await authSDK.signInWithEmailAndPassword(auth, email, password);
  if (!isOwner(result.user)) { await authSDK.signOut(auth); throw new Error('This account does not have editing access.'); }
}

export async function logout() {
  const {auth, authSDK} = await connect();
  await authSDK.signOut(auth);
}

export async function resetPassword(email) {
  const {auth, authSDK} = await connect();
  await authSDK.sendPasswordResetEmail(auth, email, {url: `${location.origin}/edit.html`});
}

export async function loadWorkspace() {
  const {db, dbSDK: sdk} = await connect();
  const [live, draft] = await Promise.all([
    sdk.getDocFromServer(sdk.doc(db, 'celebrations', 'main')),
    sdk.getDocFromServer(sdk.doc(db, 'drafts', 'owner'))
  ]);
  return {
    live: live.exists() ? {...live.data(), content: normalizeContent(JSON.parse(live.data().content))} : null,
    draft: draft.exists() ? {...draft.data(), content: normalizeContent(JSON.parse(draft.data().content))} : null
  };
}

export async function loadPhoto(id) {
  const {db, dbSDK: sdk} = await connect();
  const photo = await sdk.getDocFromServer(sdk.doc(db, 'photos', id));
  if (!photo.exists()) throw new Error('A saved photo is missing. Replace it before publishing.');
  return photo.data().dataUrl;
}

export async function uploadPhoto(id, dataUrl) {
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > 780000) throw new Error('Please use a smaller photo.');
  const {db, dbSDK: sdk} = await connect();
  await sdk.setDoc(sdk.doc(db, 'photos', id), {dataUrl, createdAt: sdk.serverTimestamp()});
}

export async function saveDraft(content, baseRevision, draftRevision) {
  const clean = normalizeContent(content);
  const {db, dbSDK: sdk} = await connect();
  await sdk.runTransaction(db, async transaction => {
    const ref = sdk.doc(db, 'drafts', 'owner');
    const current = await transaction.get(ref);
    if ((current.data()?.draftRevision ?? 0) !== draftRevision) throw new Error('The draft changed in another tab. Export your edits, then reload before saving.');
    transaction.set(ref, {content: JSON.stringify(clean), photoIds: photoIds(clean), baseRevision, draftRevision: draftRevision + 1, updatedAt: sdk.serverTimestamp()});
  });
  return draftRevision + 1;
}

export async function publish(content, baseRevision, draftRevision) {
  const clean = normalizeContent(content);
  const {db, dbSDK: sdk} = await connect();
  await sdk.runTransaction(db, async transaction => {
    const liveRef = sdk.doc(db, 'celebrations', 'main');
    const draftRef = sdk.doc(db, 'drafts', 'owner');
    const [live, draft] = await Promise.all([transaction.get(liveRef), transaction.get(draftRef)]);
    if ((live.data()?.revision ?? 0) !== baseRevision || (draft.data()?.draftRevision ?? 0) !== draftRevision) throw new Error('A newer version was saved in another tab. Export your edits, then reload before publishing.');
    const payload = {content: JSON.stringify(clean), photoIds: photoIds(clean), updatedAt: sdk.serverTimestamp()};
    transaction.set(liveRef, {...payload, revision: baseRevision + 1});
    transaction.set(draftRef, {...payload, baseRevision: baseRevision + 1, draftRevision: draftRevision + 1});
  });
  return {revision: baseRevision + 1, draftRevision: draftRevision + 1};
}
