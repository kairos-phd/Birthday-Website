import {birthday as defaults} from './config.js';
import {defaultCopy} from './copy.js';

export function safeImageSource(value) {
  if (typeof value !== 'string') return false;
  if (/^photo:[A-Za-z0-9-]{1,80}$/.test(value) || /^assets\/[A-Za-z0-9_./-]+$/.test(value) && !value.includes('..')) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}

export function normalizeContent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Please choose a valid celebration backup.');
  const data = structuredClone(defaults);
  for (const key of ['recipient', 'fullName', 'birthDate', 'sender', 'date', 'dateLabel', 'timeZone', 'giftTitle', 'giftMessage']) {
    const value = input[key] ?? defaults[key];
    if (typeof value !== 'string' || value.length > 20000) throw new Error(`Invalid text in ${key}.`);
    data[key] = value;
  }
  if (!data.recipient.trim()) throw new Error('Add a name for the birthday person.');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(data.date) || !Number.isFinite(Date.parse(data.date))) throw new Error('The countdown date needs a valid date, time and timezone offset.');
  try { new Intl.DateTimeFormat('en', {timeZone: data.timeZone}); } catch { throw new Error('Choose a valid timezone, for example Asia/Ho_Chi_Minh.'); }
  data.demo = input.demo ?? defaults.demo;
  if (typeof data.demo !== 'boolean') throw new Error('The preview notice must be on or off.');
  data.theme = input.theme ?? 'cream';
  if (!['cream', 'rose', 'midnight'].includes(data.theme)) throw new Error('Choose a supported theme.');
  data.language = input.language ?? defaults.language ?? 'en';
  if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(data.language)) throw new Error('Use a language code such as en or vi.');
  data.copy = {...defaultCopy};
  for (const key of Object.keys(defaultCopy)) {
    const value = input.copy?.[key] ?? defaultCopy[key];
    if (typeof value !== 'string' || value.length > 5000) throw new Error(`Invalid text in ${key}.`);
    data.copy[key] = value;
  }
  data.message = input.message ?? defaults.message;
  if (!Array.isArray(data.message) || data.message.length > 50 || data.message.some(value => typeof value !== 'string' || value.length > 20000)) throw new Error('The letter supports up to 50 text paragraphs.');
  data.photos = input.photos ?? defaults.photos;
  if (!Array.isArray(data.photos) || data.photos.length > 30) throw new Error('Use up to 30 photos.');
  data.photos = data.photos.map((photo, index) => {
    if (!photo || !safeImageSource(photo.src)) throw new Error(`Photo ${index + 1} needs an uploaded image or an HTTPS image URL.`);
    for (const key of ['alt', 'caption']) if (typeof photo[key] !== 'string' || photo[key].length > 1000) throw new Error(`Photo ${index + 1} needs valid ${key} text.`);
    if (!['people', 'places', 'little-things'].includes(photo.category)) throw new Error(`Photo ${index + 1} has an invalid category.`);
    return {src: photo.src, alt: photo.alt, caption: photo.caption, category: photo.category};
  });
  data.memories = input.memories ?? defaults.memories;
  if (!Array.isArray(data.memories) || data.memories.length > 50) throw new Error('Use up to 50 timeline entries.');
  data.memories = data.memories.map(memory => {
    if (!memory || ['date', 'title', 'text'].some(key => typeof memory[key] !== 'string' || memory[key].length > 10000)) throw new Error('Each timeline entry needs a date label, title, and description.');
    const photos = memory.photos ?? [];
    if (!Array.isArray(photos) || photos.length > 12 || photos.some(photo => !photo || !safeImageSource(photo.src) || typeof photo.alt !== 'string' || typeof photo.caption !== 'string' || photo.alt.length > 1000 || photo.caption.length > 1000)) throw new Error('Each memory supports up to 12 photos with captions and descriptions.');
    return {date: memory.date, title: memory.title, text: memory.text, photos: photos.map(photo => ({src: photo.src, alt: photo.alt, caption: photo.caption}))};
  });
  data.relationshipStart = input.relationshipStart ?? defaults.relationshipStart;
  data.timelineEnd = input.timelineEnd ?? '';
  const validDay = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDay(data.relationshipStart) || data.timelineEnd && (!validDay(data.timelineEnd) || data.timelineEnd < data.relationshipStart)) throw new Error('The relationship dates must be valid, with the end on or after the beginning.');
  data.timelineSpacing = input.timelineSpacing ?? 'relaxed';
  if (!['comfortable', 'relaxed'].includes(data.timelineSpacing)) throw new Error('Choose a supported timeline spacing.');
  if (photoIds(data).length > 30) throw new Error('Use up to 30 uploaded photos across the gallery and timeline.');
  const music = input.music ?? defaults.music;
  if (!music || ['src', 'youtubeId', 'title', 'artist'].some(key => typeof music[key] !== 'string')) throw new Error('Check the music details.');
  if (music.src && (!safeImageSource(music.src) || music.src.startsWith('photo:'))) throw new Error('Music needs a local assets path or an HTTPS audio URL.');
  data.music = {src: music.src, youtubeId: music.youtubeId, title: music.title.slice(0, 300), artist: music.artist.slice(0, 300), autoplay: music.autoplay ?? true, volume: music.volume ?? 0.35};
  if (typeof data.music.autoplay !== 'boolean' || typeof data.music.volume !== 'number' || !Number.isFinite(data.music.volume) || data.music.volume < 0 || data.music.volume > 1) throw new Error('Music volume must be between 0 and 1 and autoplay must be on or off.');
  data.textSizes = {};
  if (input.textSizes != null) {
    if (typeof input.textSizes !== 'object' || Array.isArray(input.textSizes) || Object.keys(input.textSizes).length > 3000) throw new Error('Invalid text size settings.');
    for (const [key, value] of Object.entries(input.textSizes)) {
      if (!/^[a-zA-Z0-9.]+$/.test(key) || key.length > 120 || !value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid text size entry.');
      const clean = {};
      for (const device of ['desktop', 'mobile']) if (value[device] != null) {
        if (typeof value[device] !== 'number' || !Number.isFinite(value[device]) || value[device] < 8 || value[device] > 160) throw new Error('Text sizes must be between 8 and 160 pixels.');
        clean[device] = value[device];
      }
      data.textSizes[key] = clean;
    }
  }
  if (new TextEncoder().encode(JSON.stringify(data)).length > 240000) throw new Error('The text is too long. Keep the celebration under 240 KB of text.');
  return structuredClone(data);
}

export function photoIds(data) {
  return [...new Set(allPhotos(data).filter(photo => photo.src.startsWith('photo:')).map(photo => photo.src.slice(6)))];
}

export function allPhotos(data) { return [...data.photos, ...data.memories.flatMap(memory => memory.photos ?? [])]; }
