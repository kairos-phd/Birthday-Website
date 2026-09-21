import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import {birthday} from '../public/config.js';
import {normalizeContent} from '../public/content.js';
import {firebaseConfig, ownerUid, authReady} from '../public/firebase-config.js';
test('template has placeholder content, no connected project and no bundled personal media', async () => {
 const data = normalizeContent(birthday);
 assert.equal(data.recipient, 'Your Name');
 assert.equal(data.music.src, '');
 assert.equal(firebaseConfig.projectId, '');
 assert.equal(firebaseConfig.apiKey, '');
 assert.equal(ownerUid, '');
 assert.equal(authReady, false);
 assert.ok(data.photos.every(photo => photo.src === 'assets/placeholder.svg'));
 const assets = await readdir(new URL('../public/assets/', import.meta.url));
 assert.ok(!assets.some(name => /\.(jpg|jpeg|png|mp3|wav|m4a)$/i.test(name)));
 assert.ok((await readFile(new URL('../firestore.rules', import.meta.url), 'utf8')).includes('REPLACE_WITH_OWNER_UID'));
});
test('text size customization survives normalization', () => {
 const sizes = {'copy.heroTitle.line.0': {desktop: 72, mobile: 48}};
 assert.deepEqual(normalizeContent({...birthday, textSizes: sizes}).textSizes, sizes);
 assert.throws(() => normalizeContent({...birthday, textSizes: {recipient: {desktop: 900}}}));
});
