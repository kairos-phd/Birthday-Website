import {textTargets} from './text-sizes.js';
import {birthday as defaults} from './config.js';
import {copyGroups} from './copy.js';
import {normalizeContent, photoIds, safeImageSource, allPhotos} from './content.js';
import {authReady} from './firebase-config.js';
import * as cloud from './editor-cloud.js';

const $ = id => document.getElementById(id);
let content = normalizeContent(defaults);
let liveContent = structuredClone(content);
let assets = {};
let baseRevision = 0;
let draftRevision = 0;
let dirty = false;
let busy = false;
let previewWindow;
let previewPayload;
let fieldCount = 0;

function status(message, error = false) {
  $('editor-status').textContent = message;
  $('editor-status').classList.toggle('error', error);
}
function changed() {
  dirty = true;
  $('save-state').textContent = 'Unsaved changes';
}
function setBusy(value) {
  busy = value;
  $('workspace').querySelectorAll('button, input, textarea, select').forEach(element => { element.disabled = value; });
  $('sign-out').disabled = value;
}
function friendly(error) {
  const messages = {
    'auth/invalid-credential': 'The email or password is incorrect. Try again or send a password setup link.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Could not connect. Check your internet connection and try again.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/operation-not-allowed': 'Email/password sign-in is not enabled yet. Finish Firebase Authentication setup.',
    'permission-denied': 'This account cannot save here. Sign in with the website owner’s account.',
    'unavailable': 'Firebase is temporarily unavailable. Your edits are still here; try saving again.'
  };
  return messages[error.code] || error.message || 'Something went wrong. Your edits are still here. Please try again.';
}
async function run(action) {
  if (busy) return;
  setBusy(true);
  try { await action(); } catch (error) { status(friendly(error), true); }
  finally { setBusy(false); }
}
function confirmAction(title, message, accept) {
  $('confirm-title').textContent = title;
  $('confirm-message').textContent = message;
  $('confirm-accept').textContent = accept;
  const dialog = $('confirm-dialog');
  dialog.returnValue = 'cancel';
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), {once: true}));
}
function field(labelText, value, onChange, options = {}) {
  const label = document.createElement('label');
  const name = document.createElement('span');
  name.id = `field-label-${++fieldCount}`;
  name.textContent = labelText;
  label.append(name);
  const input = document.createElement(options.options ? 'select' : options.rows ? 'textarea' : 'input');
  input.setAttribute('aria-labelledby', name.id);
  if (options.options) {
    for (const [key, text] of options.options) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = text;
      input.append(option);
    }
  } else if (options.rows) input.rows = options.rows;
  else input.type = options.type || 'text';
  input.value = value ?? '';
  if (options.type === 'checkbox') input.checked = value;
  if (options.id) input.id = options.id;
  if (options.maxLength) input.maxLength = options.maxLength;
  input.addEventListener('input', () => { onChange(options.type === 'checkbox' ? input.checked : input.value); changed(); });
  label.append(input);
  if (options.wide) label.classList.add('field-wide');
  if (options.hint) { const hint = document.createElement('span'); hint.className = 'help'; hint.textContent = options.hint; label.append(hint); }
  return label;
}
function topField(parent, label, key, options) {
  $(parent).append(field(label, content[key], value => { content[key] = value; }, options));
}
function renderForm() {
  $('details-fields').replaceChildren();
  for (const [label, key, options] of [
    ['Display name', 'recipient', {id: 'edit-recipient', maxLength: 200}], ['Full name', 'fullName', {maxLength: 300}],
    ['Date of birth', 'birthDate', {type: 'date'}], ['Date shown on the page', 'dateLabel', {id: 'edit-date-label'}],
    ['Countdown date & time', 'date', {hint: 'Include the timezone: 2030-01-01T00:00:00+00:00', id: 'edit-date'}],
    ['Timezone label', 'timeZone', {hint: 'For Vietnam use Asia/Ho_Chi_Minh.'}],
    ['Default theme', 'theme', {options: [['cream', 'Warm cream'], ['rose', 'Soft rose'], ['midnight', 'Midnight']]}],
    ['Page language', 'language', {options: [['en', 'English'], ['vi', 'Tiếng Việt']]}],
    ['Show the sample-content notice', 'demo', {type: 'checkbox'}]
  ]) topField('details-fields', label, key, options);
  $('letter-fields').replaceChildren(
    field('Birthday message', content.message.join('\n\n'), value => { content.message = value.split(/\n\s*\n/); }, {rows: 13, id: 'edit-message'}),
    field('Signed by', content.sender, value => { content.sender = value; }, {id: 'edit-sender'})
  );
  $('gift-fields').replaceChildren();
  topField('gift-fields', 'Gift title', 'giftTitle', {wide: true});
  topField('gift-fields', 'Gift message', 'giftMessage', {rows: 5, wide: true});
  for (const [label, key, hint] of [['Song title', 'title'], ['Artist', 'artist'], ['Background audio URL', 'src', 'Paste a direct HTTPS MP3/M4A/OGG file URL. Add your own audio file under assets/ or enter its URL. YouTube page links do not work as audio files.']]) {
    $('gift-fields').append(field(label, content.music[key], value => { content.music[key] = value; }, {hint}));
  }
  $('gift-fields').append(field('Start music automatically when allowed', content.music.autoplay, value => { content.music.autoplay = value; }, {type: 'checkbox', hint: 'If the browser blocks sound, it begins on the first tap on the page.'}));
  $('gift-fields').append(field('Starting volume (0 to 1)', content.music.volume, value => { content.music.volume = Number(value); }, {type: 'number'}));
  const sample = document.createElement('button'); sample.type = 'button'; sample.textContent = 'Reset music settings';
  sample.addEventListener('click', () => { content.music = structuredClone(defaults.music); changed(); renderForm(); }); $('gift-fields').append(sample);
  $('timeline-settings').replaceChildren();
  topField('timeline-settings', 'Our first day', 'relationshipStart', {type: 'date'});
  topField('timeline-settings', 'Timeline end (blank means today)', 'timelineEnd', {type: 'date'});
  topField('timeline-settings', 'Space between memories', 'timelineSpacing', {options: [['relaxed', 'Spacious — take your time'], ['comfortable', 'Comfortable — a shorter page']]});
  renderPhotos();
  renderMemories();
  renderCopy();
  renderTextSizes();
}
function reorderButtons(container, items, index, render, noun) {
  const actions = document.createElement('div');
  actions.className = 'repeat-actions';
  for (const [label, delta] of [['Move up', -1], ['Move down', 1]]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = delta < 0 ? '↑' : '↓';
    button.setAttribute('aria-label', `${label}: ${noun} ${index + 1}`);
    button.disabled = index + delta < 0 || index + delta >= items.length;
    button.addEventListener('click', () => {
      const to = index + delta;
      if (to < 0 || to >= items.length) return;
      [items[index], items[to]] = [items[to], items[index]];
      changed(); render();
    });
    actions.append(button);
  }
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Remove';
  remove.setAttribute('aria-label', `Remove ${noun} ${index + 1}`);
  remove.addEventListener('click', async () => {
    if (!await confirmAction(`Remove this ${noun}?`, 'This removes it from your draft. Your published page stays the same until you publish.', 'Remove')) return;
    items.splice(index, 1); changed(); render();
  });
  actions.append(remove);
  container.append(actions);
}
function imageURL(source) { return source.startsWith('photo:') ? assets[source.slice(6)] || '' : safeImageSource(source) ? source : ''; }
function renderPhotos() {
  $('photo-fields').replaceChildren();
  if (!content.photos.length) $('photo-fields').append(empty('Add your first photo to start your album.'));
  content.photos.forEach((photo, index) => {
    const item = document.createElement('div'); item.className = 'repeat-item';
    const heading = document.createElement('div'); heading.className = 'repeat-heading';
    const title = document.createElement('h3'); title.textContent = `Photo ${index + 1}${index < 2 ? ' · also on the landing page' : ''}`;
    heading.append(title); reorderButtons(heading, content.photos, index, renderPhotos, 'photo');
    const grid = document.createElement('div'); grid.className = 'photo-edit-grid';
    const image = document.createElement('img'); image.alt = photo.alt || 'Photo preview';
    const source = imageURL(photo.src); if (source) image.src = source; else image.hidden = true;
    const fields = document.createElement('div'); fields.className = 'field-grid';
    const uploadLabel = document.createElement('label'); uploadLabel.textContent = 'Upload from your device'; uploadLabel.className = 'field-wide';
    const upload = document.createElement('input'); upload.type = 'file'; upload.accept = 'image/jpeg,image/png,image/webp';
    upload.addEventListener('change', () => run(async () => {
      if (!upload.files[0]) return;
      status('Preparing and uploading your photo…');
      const dataUrl = await compressPhoto(upload.files[0]);
      const id = crypto.randomUUID();
      await cloud.uploadPhoto(id, dataUrl);
      assets[id] = dataUrl;
      photo.src = `photo:${id}`;
      changed(); renderPhotos(); renderMemories();
      status('Photo uploaded privately. Save your draft to keep this photo in your album.');
    }));
    uploadLabel.append(upload); fields.append(uploadLabel);
    fields.append(field('Or use an HTTPS image URL', photo.src.startsWith('photo:') ? '' : photo.src, value => {
      photo.src = value;
      if (safeImageSource(value)) { image.src = value; image.hidden = false; }
    }, {wide: true}));
    fields.append(field('Caption', photo.caption, value => { photo.caption = value; }, {maxLength: 1000}));
    fields.append(field('Photo description (accessibility)', photo.alt, value => { photo.alt = value; image.alt = value; }, {maxLength: 1000}));
    fields.append(field('Photo group', photo.category, value => { photo.category = value; }, {options: [['people', content.copy.filterPeople], ['places', content.copy.filterPlaces], ['little-things', content.copy.filterThings]]}));
    grid.append(image, fields); item.append(heading, grid); $('photo-fields').append(item);
  });
}
function renderMemories() {
  $('memory-fields').replaceChildren();
  if (!content.memories.length) $('memory-fields').append(empty('Add the first chapter of your story.'));
  content.memories.forEach((memory, index) => {
    memory.photos ??= [];
    const item = document.createElement('div'); item.className = 'repeat-item';
    const heading = document.createElement('div'); heading.className = 'repeat-heading';
    const title = document.createElement('h3'); title.textContent = `Memory ${index + 1}`; heading.append(title);
    reorderButtons(heading, content.memories, index, renderMemories, 'memory');
    const fields = document.createElement('div'); fields.className = 'field-grid';
    for (const [label, key, options] of [['Date or chapter label', 'date', {}], ['Memory title', 'title', {}], ['What happened', 'text', {rows: 4, wide: true}]]) fields.append(field(label, memory[key], value => { memory[key] = value; }, options));
    const choices = document.createElement('fieldset'); choices.className = 'memory-photo-choices';
    const legend = document.createElement('legend'); legend.textContent = 'Photos for this date (up to 12)'; choices.append(legend);
    const available = [...new Map([...content.photos, ...memory.photos].map(photo => [photo.src, photo])).values()].filter(photo => safeImageSource(photo.src));
    for (const photo of available) {
      const label = document.createElement('label');
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = memory.photos.some(value => value.src === photo.src);
      const image = document.createElement('img'); image.src = imageURL(photo.src); image.alt = ''; image.loading = 'lazy';
      const text = document.createElement('span'); text.textContent = photo.caption || photo.alt || 'Photo';
      check.addEventListener('change', () => {
        if (check.checked && memory.photos.length >= 12) { check.checked = false; status('Choose up to 12 photos for this date.', true); return; }
        if (check.checked) memory.photos.push({src: photo.src, caption: photo.caption, alt: photo.alt});
        else memory.photos = memory.photos.filter(value => value.src !== photo.src);
        changed(); renderMemories();
      });
      label.append(check, image, text); choices.append(label);
    }
    const photoDetails = document.createElement('div'); photoDetails.className = 'field-grid';
    memory.photos.forEach((photo, photoIndex) => {
      photoDetails.append(field(`Photo ${photoIndex + 1} caption`, photo.caption, value => { photo.caption = value; }, {maxLength: 1000}));
      photoDetails.append(field(`Photo ${photoIndex + 1} description`, photo.alt, value => { photo.alt = value; }, {maxLength: 1000}));
    });
    const uploadLabel = document.createElement('label'); uploadLabel.className = 'memory-upload'; uploadLabel.textContent = 'Add photos from your device to this date';
    const upload = document.createElement('input'); upload.type = 'file'; upload.accept = 'image/jpeg,image/png,image/webp'; upload.multiple = true;
    upload.addEventListener('change', () => run(async () => {
      const files = [...upload.files];
      if (files.length + memory.photos.length > 12 || files.length + photoIds(content).length > 30) throw new Error('Keep up to 12 photos per memory and 30 uploaded photos in the celebration.');
      let added = 0;
      try { for (const file of files) {
        const dataUrl = await compressPhoto(file); const id = crypto.randomUUID();
        await cloud.uploadPhoto(id, dataUrl); assets[id] = dataUrl;
        memory.photos.push({src: `photo:${id}`, caption: file.name.replace(/\.[^.]+$/, ''), alt: memory.title || 'Our memory'});
        changed();
        added++;
      } } catch (error) { throw new Error(`${added} photo(s) added and kept. ${error.message}`); }
      finally { renderMemories(); }
      renderMemories(); status('Photos added privately to this date. Save your draft to keep them.');
    }));
    uploadLabel.append(upload);
    item.append(heading, fields, choices, photoDetails, uploadLabel); $('memory-fields').append(item);
  });
}
function empty(text) { const element = document.createElement('p'); element.className = 'empty-message'; element.textContent = text; return element; }
function renderCopy() {
  $('copy-fields').replaceChildren();
  for (const [group, entries] of Object.entries(copyGroups)) {
    const details = document.createElement('details'); details.className = 'copy-group';
    const summary = document.createElement('summary'); summary.textContent = group;
    const fields = document.createElement('div'); fields.className = 'field-grid';
    for (const key of Object.keys(entries)) {
      const name = key.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase());
      const label = field(name, content.copy[key], value => { content.copy[key] = value; }, {rows: 3, id: `copy-${key}`, maxLength: 5000});
      label.dataset.copyKey = key; fields.append(label);
    }
    details.append(summary, fields); $('copy-fields').append(details);
  }
  filterCopy();
}
function filterCopy() {
  const query = $('copy-search').value.toLowerCase().trim();
  let matches = 0;
  document.querySelectorAll('.copy-group').forEach(group => {
    let count = 0;
    group.querySelectorAll('[data-copy-key]').forEach(label => {
      const match = `${label.textContent} ${content.copy[label.dataset.copyKey]}`.toLowerCase().includes(query);
      label.hidden = !match; if (match) count++;
    });
    group.hidden = count === 0;
    if (query && count) group.open = true;
    matches += count;
  });
  $('copy-empty').hidden = matches > 0;
}
async function compressPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error('Choose a JPEG, PNG or WebP photo under 20 MB.');
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('This photo could not be opened. Try another JPEG, PNG or WebP file.'); }
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [.86, .76, .64, .5, .35]) {
      const result = canvas.toDataURL('image/webp', quality);
      if (result.length <= 780000) return result;
    }
    throw new Error('This photo is still too large. Try a smaller image.');
  } finally { bitmap.close(); }
}
async function ensureAssets(data) {
  await Promise.all(photoIds(data).map(async id => { if (!assets[id]) assets[id] = await cloud.loadPhoto(id); }));
}
async function load() {
  const workspace = await cloud.loadWorkspace();
  liveContent = workspace.live?.content ?? normalizeContent(defaults);
  content = structuredClone(workspace.draft?.content ?? liveContent);
  baseRevision = workspace.draft?.baseRevision ?? workspace.live?.revision ?? 0;
  draftRevision = workspace.draft?.draftRevision ?? 0;
  await ensureAssets(content);
  renderForm(); dirty = false;
  $('version-label').textContent = `Published version ${workspace.live?.revision ?? 0}`;
  $('save-state').textContent = workspace.draft ? 'Private draft loaded' : 'Published version loaded';
  status('Only you can see this workspace. Your recipient sees the published page.');
}
$('content-form').addEventListener('submit', event => event.preventDefault());
$('copy-search').addEventListener('input', filterCopy);
$('add-photo').addEventListener('click', () => {
  if (content.photos.length >= 30) { status('Your album can hold up to 30 photos.', true); return; }
  content.photos.push({src: '', caption: '', alt: '', category: 'people'}); changed(); renderPhotos();
  $('photo-fields').lastElementChild?.scrollIntoView({block: 'nearest'});
});
$('add-memory').addEventListener('click', () => {
  if (content.memories.length >= 50) { status('The timeline can hold up to 50 memories.', true); return; }
  content.memories.push({date: '', title: '', text: '', photos: []}); changed(); renderMemories();
  $('memory-fields').lastElementChild?.scrollIntoView({block: 'nearest'});
});
$('save-draft').addEventListener('click', () => run(async () => {
  const clean = normalizeContent(content); await ensureAssets(clean);
  status('Saving your private draft…');
  draftRevision = await cloud.saveDraft(clean, baseRevision, draftRevision);
  dirty = false; $('save-state').textContent = 'Draft saved privately';
  status('Saved. The page your recipient sees has not changed.');
}));
$('publish').addEventListener('click', async () => {
  if (!await confirmAction('Publish this celebration?', 'Everyone with your website link will see this version, including its photos and messages.', 'Publish changes')) return;
  run(async () => {
    const clean = normalizeContent(content); await ensureAssets(clean);
    status('Publishing your celebration…');
    const result = await cloud.publish(clean, baseRevision, draftRevision);
    baseRevision = result.revision; draftRevision = result.draftRevision;
    liveContent = structuredClone(clean); dirty = false;
    $('version-label').textContent = `Published version ${baseRevision}`;
    $('save-state').textContent = 'Published & saved';
    status('Published. Your existing website link now opens this celebration.');
  });
});
$('preview').addEventListener('click', () => {
  try {
    const clean = normalizeContent(content);
    previewPayload = {type: 'birthday-preview', content: clean, assets};
    previewWindow = window.open('/?preview=1', '_blank');
    if (!previewWindow) throw new Error('Allow pop-ups for this site to open a private preview.');
    status('Private preview opened in a new tab. Nothing has been published.');
  } catch (error) { status(friendly(error), true); }
});
window.addEventListener('message', event => {
  if (event.origin === location.origin && event.source === previewWindow && event.data?.type === 'birthday-preview-ready') previewWindow.postMessage(previewPayload, location.origin);
});
$('restore-live').addEventListener('click', async () => {
  if (!await confirmAction('Restore the published version?', 'This replaces the edits currently in this editor. Download a backup first if you want to keep them.', 'Restore')) return;
  run(async () => {
    const workspace = await cloud.loadWorkspace();
    liveContent = workspace.live?.content ?? normalizeContent(defaults);
    content = structuredClone(liveContent); baseRevision = workspace.live?.revision ?? 0; draftRevision = workspace.draft?.draftRevision ?? 0;
    await ensureAssets(content); renderForm(); changed();
    status('Published version restored in the editor. Save draft to keep this change.');
  });
});
function downloadJSON(data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = `celebration-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('export').addEventListener('click', () => run(async () => {
  const clean = normalizeContent(content); await ensureAssets(clean);
  downloadJSON({version: 1, content: clean, assets: Object.fromEntries(photoIds(clean).map(id => [id, assets[id]]))});
  status('Backup downloaded with your text and uploaded photos.');
}));
$('import').addEventListener('change', async () => {
  const file = $('import').files[0]; if (!file) return;
  if (!await confirmAction('Import this backup?', 'This replaces your current editor content. Your published page will stay unchanged.', 'Import')) { $('import').value = ''; return; }
  run(async () => {
    if (file.size > 35 * 1024 * 1024) throw new Error('Choose a backup under 35 MB.');
    const backup = JSON.parse(await file.text());
    if (backup.version !== 1) throw new Error('This is not a supported celebration backup.');
    const next = normalizeContent(backup.content);
    const replacements = {};
    for (const id of photoIds(next)) {
      const dataUrl = backup.assets?.[id];
      if (typeof dataUrl !== 'string' || dataUrl.length > 780000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) throw new Error('The backup contains a missing or invalid photo. Your current edits are unchanged.');
    }
    status('Restoring your photos privately…');
    for (const id of photoIds(next)) {
      const newId = crypto.randomUUID();
      await cloud.uploadPhoto(newId, backup.assets[id]);
      assets[newId] = backup.assets[id]; replacements[id] = newId;
    }
    allPhotos(next).forEach(photo => { if (photo.src.startsWith('photo:')) photo.src = `photo:${replacements[photo.src.slice(6)]}`; });
    content = next; renderForm(); changed();
    $('import').value = ''; status('Backup imported into the editor. Save your draft or preview before publishing.');
  });
});
window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); $('login-button').disabled = true;
  $('auth-status').textContent = 'Signing in…'; $('auth-status').classList.remove('error');
  try { await cloud.login($('email').value.trim(), $('password').value); $('password').value = ''; }
  catch (error) { $('auth-status').textContent = friendly(error); $('auth-status').classList.add('error'); }
  finally { $('login-button').disabled = false; }
});
$('reset-password').addEventListener('click', async () => {
  if (!$('email').value || !$('email').reportValidity()) { $('email').focus(); return; }
  $('reset-password').disabled = true;
  try { await cloud.resetPassword($('email').value.trim()); $('auth-status').textContent = 'If this is the owner’s email, a password setup link is on its way. Check your inbox and spam folder, then return here to sign in.'; $('auth-status').classList.remove('error'); }
  catch (error) { $('auth-status').textContent = friendly(error); $('auth-status').classList.add('error'); }
  finally { $('reset-password').disabled = false; }
});
$('sign-out').addEventListener('click', async () => {
  if (dirty && !await confirmAction('Sign out with unsaved edits?', 'Save your draft first to keep these changes.', 'Sign out')) return;
  try { await cloud.logout(); dirty = false; content = normalizeContent(defaults); assets = {}; $('content-form').reset(); }
  catch (error) { status(friendly(error), true); }
});
if (!authReady) {
  $('auth-status').textContent = 'Owner setup: enable Authentication with “Get started” in Firebase Console, then complete the project setup. Editing will unlock after setup.';
  $('login-button').disabled = true; $('reset-password').disabled = true;
} else {
  try {
    await cloud.watchAuth(async user => {
      const allowed = cloud.isOwner(user);
      $('auth-panel').hidden = allowed; $('workspace').hidden = !allowed; $('sign-out').hidden = !allowed;
      if (allowed) await run(load);
      else $('auth-status').textContent = user ? 'This account does not have editing access.' : 'First visit? Enter the owner email above, then send yourself a password setup link.';
    });
  } catch (error) { $('auth-status').textContent = friendly(error); $('auth-status').classList.add('error'); }
}

function renderTextSizes() {
  const container = $('text-size-fields'); container.replaceChildren();
  for (const target of textTargets(content)) {
    const group = document.createElement('details');
    const heading = document.createElement('summary'); heading.textContent = `${target.label} — ${String(target.text).slice(0, 90)}`; group.append(heading);
    const entries = [[target.key, 'Whole text']];
    const lines = String(target.text).split('\n');
    if (lines.length > 1) lines.forEach((line, i) => entries.push([`${target.key}.line.${i}`, `Line ${i + 1}: ${line.slice(0, 60)}`]));
    for (const [key, label] of entries) {
      const row = document.createElement('div'); row.className = 'field-grid';
      for (const device of ['desktop', 'mobile']) {
        const control = field(`${label} · ${device} size (px)`, content.textSizes?.[key]?.[device] ?? '', value => {
          content.textSizes ??= {}; content.textSizes[key] ??= {};
          if (value === '') delete content.textSizes[key][device]; else content.textSizes[key][device] = Number(value);
        }, {type: 'number'});
        const input = control.querySelector('input'); input.min = 8; input.max = 160; input.step = 1; input.dataset.sizeKey = key; input.dataset.device = device; row.append(control);
      }
      group.append(row);
    }
    container.append(group);
  }
}
$('refresh-text-sizes').addEventListener('click', renderTextSizes);
$('text-size-search').addEventListener('input', event => {
  const query = event.target.value.toLowerCase();
  for (const group of $('text-size-fields').children) group.hidden = !group.textContent.toLowerCase().includes(query);
});
