import {applyTextSizes} from './text-sizes.js';
import {birthday as defaults} from './config.js';
import {countdown, daysTogether} from './time.js';
import {textFor} from './copy.js';
import {normalizeContent} from './content.js';
import {loadPageContent, photoSource} from './published.js';
import {setupBackgroundMusic} from './background-music.js';
import {setupLoveEffects, animateNumber} from './love-effects.js';

const $ = id => document.getElementById(id);
let birthday = normalizeContent(defaults);
let assets = {};
let isPreview = false;
try {
  const loaded = await loadPageContent();
  birthday = loaded.content;
  assets = loaded.assets;
  isPreview = !!loaded.preview;
  if (loaded.preview) {
    $('page-status').hidden = false;
    $('page-status').textContent = 'Private preview · your changes are not published yet.';
  } else if (loaded.warning) {
    $('page-status').hidden = false;
    $('page-status').textContent = loaded.warning;
  }
} catch (error) {
  $('page-status').hidden = false;
  $('page-status').textContent = error.message;
}
const t = key => textFor(birthday, key);
document.documentElement.lang = birthday.language;
document.querySelectorAll('[data-copy]').forEach(element => { element.textContent = t(element.dataset.copy); });
for (const [selector, key] of Object.entries({
  '.site-header nav': 'navigationLabel', '.filters': 'filterLabel', '#countdown': 'timerLabel',
  '.music-player': 'musicPlayerLabel', '#lightbox': 'photoViewerLabel', '#close-lightbox': 'closePhoto',
  '#previous-photo': 'previousPhoto', '#next-photo': 'nextPhoto'
})) document.querySelector(selector).setAttribute('aria-label', t(key));
document.querySelector('.volume-control .sr-only').textContent = t('musicVolume');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const themes = ['cream', 'rose', 'midnight'];
let activePhotos = birthday.photos;
let photoIndex = 0;

function setTheme(theme) {
  const value = themes.includes(theme) ? theme : birthday.theme;
  document.documentElement.dataset.theme = value;
  $('theme').value = value;
  document.querySelector('meta[name="theme-color"]').content = {cream: '#f9f5ed', rose: '#faf0f0', midnight: '#242d30'}[value];
  if (!isPreview) try { localStorage.setItem('birthday-theme', value); } catch {}
}
try { setTheme(isPreview ? birthday.theme : localStorage.getItem('birthday-theme')); } catch { setTheme(birthday.theme); }
$('theme').addEventListener('change', event => setTheme(event.target.value));
$('recipient').textContent = `${birthday.recipient}${t('recipientEnding')}`;
$('sender').textContent = birthday.sender;
$('gift-title').textContent = birthday.giftTitle;
$('gift-message').textContent = birthday.giftMessage;
$('timezone-label').textContent = t('timezoneLabel');
document.title = t('pageTitle');
document.querySelector('meta[name="description"]').content = t('pageDescription');
document.querySelectorAll('.date-label').forEach(element => { element.textContent = birthday.dateLabel; });
for (const text of birthday.message) {
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  $('letter-copy').append(paragraph);
}
for (const [index, id] of ['hero-photo-left', 'hero-photo-right'].entries()) {
  const photo = birthday.photos[index];
  if (photo) { $(id).src = photoSource(photo.src, assets); $(id).alt = photo.alt; }
  else $(id).closest('figure').hidden = true;
}
$('relationship-date').textContent = new Intl.DateTimeFormat(birthday.language, {dateStyle: 'long', timeZone: 'UTC'}).format(new Date(birthday.relationshipStart));
$('relationship-date').dateTime = birthday.relationshipStart;
$('together-days').textContent = new Intl.NumberFormat(birthday.language).format(daysTogether(birthday.relationshipStart, birthday.timelineEnd, new Date(), birthday.timeZone));
$('timeline-range').textContent = `${birthday.relationshipStart.split('-').reverse().join('.')} — ${birthday.timelineEnd ? birthday.timelineEnd.split('-').reverse().join('.') : t('timelineToday')}`;
$('timeline').dataset.spacing = birthday.timelineSpacing;
for (const memory of birthday.memories) {
  const article = document.createElement('article');
  article.className = 'memory';
  for (const [tag, text] of [['time', memory.date], ['h3', memory.title], ['p', memory.text]]) {
    const element = document.createElement(tag);
    element.textContent = text;
    article.append(element);
  }
  if (memory.photos.length) {
    const strip = document.createElement('div');
    strip.className = 'memory-photos';
    for (const [index, photo] of memory.photos.entries()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `${t('viewPhoto')}: ${photo.caption || memory.title}`);
      const image = document.createElement('img');
      image.src = photoSource(photo.src, assets); image.alt = photo.alt; image.loading = 'lazy'; image.width = 500; image.height = 350;
      button.append(image);
      button.addEventListener('click', () => { viewerPhotos = memory.photos; showPhoto(index); $('lightbox').showModal(); document.body.style.overflow = 'hidden'; });
      strip.append(button);
    }
    article.insertBefore(strip, article.querySelector('p'));
  }
  const love = document.createElement('button');
  love.type = 'button'; love.className = 'memory-love'; love.setAttribute('aria-label', t('sendLove'));
  const heart = document.querySelector('.letter-heart').cloneNode(true); heart.removeAttribute('class'); heart.classList.add('icon');
  love.append(heart); article.append(love);
  $('timeline').append(article);
}

let viewerPhotos = activePhotos;
function showPhoto(index) {
  if (!viewerPhotos.length) return;
  photoIndex = (index + viewerPhotos.length) % viewerPhotos.length;
  const photo = viewerPhotos[photoIndex];
  $('lightbox-image').src = photoSource(photo.src, assets);
  $('lightbox-image').alt = photo.alt;
  $('lightbox-caption').textContent = photo.caption;
  $('photo-position').textContent = t('photoPosition').replace('{current}', photoIndex + 1).replace('{total}', viewerPhotos.length);
}
function renderGallery(filter = 'all') {
  activePhotos = birthday.photos.filter(photo => filter === 'all' || photo.category === filter);
  $('gallery').replaceChildren();
  if (!activePhotos.length) {
    const empty = document.createElement('p');
    empty.textContent = t('galleryEmpty');
    $('gallery').append(empty);
  }
  activePhotos.forEach((photo, index) => {
    const button = document.createElement('button');
    button.className = 'print';
    button.setAttribute('aria-label', `${t('viewPhoto')}: ${photo.caption}`);
    const image = document.createElement('img');
    image.src = photoSource(photo.src, assets);
    image.alt = photo.alt;
    image.loading = 'lazy';
    image.width = 600;
    image.height = 600;
    const caption = document.createElement('span');
    caption.className = 'handwritten';
    caption.dataset.photoIndex = String(birthday.photos.indexOf(photo));
    caption.textContent = photo.caption;
    button.append(image, caption);
    button.addEventListener('click', () => {
      viewerPhotos = activePhotos;
      showPhoto(index);
      $('lightbox').showModal();
      document.body.style.overflow = 'hidden';
    });
    $('gallery').append(button);
  });
}
renderGallery();
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(other => {
    other.classList.toggle('active', other === button);
    other.setAttribute('aria-pressed', String(other === button));
  });
  renderGallery(button.dataset.filter);
}));
$('close-lightbox').addEventListener('click', () => $('lightbox').close());
$('lightbox').addEventListener('close', () => { document.body.style.overflow = ''; });
$('lightbox').addEventListener('click', event => {
  if (event.target !== $('lightbox')) return;
  const bounds = $('lightbox').getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) $('lightbox').close();
});
$('previous-photo').addEventListener('click', () => showPhoto(photoIndex - 1));
$('next-photo').addEventListener('click', () => showPhoto(photoIndex + 1));
$('lightbox').addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(photoIndex + 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(photoIndex - 1); }
});
document.addEventListener('error', event => {
  if (event.target instanceof HTMLImageElement) {
    event.target.classList.add('image-error');
    event.target.alt = t('imageUnavailable');
  }
}, true);

function updateCountdown() {
  const remaining = countdown(birthday.date);
  if (!remaining) {
    $('countdown').hidden = true;
    $('countdown-description').textContent = t('countdownMissing');
    return;
  }
  for (const part of ['days', 'hours', 'minutes', 'seconds']) animateNumber($(part), String(remaining[part]).padStart(2, '0'), motion.matches);
  if (remaining.reached) {
    $('countdown-heading').textContent = t('countdownReachedTitle');
    $('countdown-description').textContent = t('countdownReachedDescription');
  }
}
updateCountdown();
setInterval(updateCountdown, 1000);

function celebrate() {
  const layer = $('romantic-bloom');
  layer.replaceChildren();
  if (motion.matches) return;
  for (let index = 0; index < 44; index++) {
    const heart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    heart.setAttribute('viewBox', '0 0 24 24');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#heart'); heart.append(use);
    const size = 18 + Math.random() * 36;
    heart.style.width = `${size}px`; heart.style.height = `${size}px`;
    heart.style.left = `${Math.random() * 100}%`;
    heart.style.color = ['#cf788e', '#e5a3ab', 'var(--ink)'][index % 3];
    layer.append(heart);
    const drift = Math.random() * 160 - 80;
    const animation = heart.animate([
      {transform: 'translate(0, 110vh) rotate(-20deg) scale(.6)', opacity: 0},
      {transform: `translate(${drift}px, 65vh) rotate(10deg) scale(1)`, opacity: .65, offset: .3},
      {transform: `translate(${-drift}px, 20vh) rotate(-10deg) scale(.85)`, opacity: .5, offset: .7},
      {transform: `translate(${drift}px, -15vh) rotate(20deg) scale(.6)`, opacity: 0}
    ], {duration: 4800 + Math.random() * 1800, delay: Math.random() * 800, fill: 'both', easing: 'ease-in-out'});
    animation.onfinish = () => heart.remove();
  }
}
motion.addEventListener('change', () => { if (motion.matches) $('romantic-bloom').replaceChildren(); });
$('wish-button').addEventListener('click', () => {
  celebrate();
  $('wish-status').textContent = t('wishResponse');
});
$('gift-button').addEventListener('click', () => {
  const open = $('gift-content').hidden;
  $('gift-content').hidden = !open;
  $('gift-button').setAttribute('aria-expanded', String(open));
  $('gift-button').querySelector('[data-copy]').textContent = t(open ? 'giftOpened' : 'giftOpen');
  if (open) { celebrate(); $('gift-content').scrollIntoView({behavior: motion.matches ? 'instant' : 'smooth', block: 'nearest'}); }
});
$('download-gift').addEventListener('click', () => {
  const content = `${t('giftDownloadGreeting')}\n\n${birthday.giftTitle}\n\n${birthday.giftMessage}\n\n${t('giftDownloadSignoff')}\n${birthday.sender}`;
  const url = URL.createObjectURL(new Blob([content], {type: 'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'a-little-birthday-promise.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

setupBackgroundMusic({music: birthday.music, t});
setupLoveEffects(t);

applyTextSizes(birthday);
