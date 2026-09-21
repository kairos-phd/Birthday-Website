import {firebaseConfig} from './firebase-config.js';
import {normalizeContent, photoIds} from './content.js';
import {birthday as defaults} from './config.js';

const base = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

async function readDocument(path) {
  const response = await fetch(`${base}/${path}`, {signal: AbortSignal.timeout(12000), cache: 'no-store'});
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('The latest celebration could not load. Please refresh to try again.');
  return response.json();
}

export async function loadPublished() {
  if (!firebaseConfig.projectId) return {content: normalizeContent(defaults), assets: {}, revision: 0};
  const document = await readDocument('celebrations/main');
  if (!document) return {content: normalizeContent(defaults), assets: {}, revision: 0};
  const content = normalizeContent(JSON.parse(document.fields.content.stringValue));
  const assets = {};
  const warnings = [];
  await Promise.all(photoIds(content).map(async id => {
    try {
      const photo = await readDocument(`photos/${id}`);
      const dataUrl = photo?.fields?.dataUrl?.stringValue;
      if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl ?? '')) throw new Error('Photo unavailable');
      assets[id] = dataUrl;
    } catch { warnings.push(id); }
  }));
  return {content, assets, warning: warnings.length ? 'Some photos could not load. Refresh to try again.' : '', revision: Number(document.fields.revision.integerValue)};
}

export function photoSource(source, assets) {
  return source.startsWith('photo:') ? assets[source.slice(6)] || 'assets/photo-unavailable.svg' : source;
}

export async function loadPageContent() {
  if (new URLSearchParams(location.search).has('preview')) {
    if (!window.opener) throw new Error('Open the preview from the editor to see your private draft.');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { window.removeEventListener('message', receive); reject(new Error('Preview expired. Open a new preview from the editor.')); }, 10000);
      function receive(event) {
        if (event.origin !== location.origin || event.source !== window.opener || event.data?.type !== 'birthday-preview') return;
        clearTimeout(timer);
        window.removeEventListener('message', receive);
        try { resolve({content: normalizeContent(event.data.content), assets: event.data.assets || {}, preview: true}); } catch (error) { reject(error); }
      }
      window.addEventListener('message', receive);
      window.opener.postMessage({type: 'birthday-preview-ready'}, location.origin);
    });
  }
  return loadPublished();
}
