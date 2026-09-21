export function textTargets(data) {
  const targets = Object.entries(data.copy).map(([key, text]) => ({key: `copy.${key}`, label: key.replace(/([A-Z])/g, ' $1'), selector: `[data-copy="${key}"]`, text}));
  for (const [key, selector, text] of [
    ['recipient', '#recipient', data.recipient], ['sender', '#sender', data.sender],
    ['dateLabel', '.date-label', data.dateLabel], ['giftTitle', '#gift-title', data.giftTitle], ['giftMessage', '#gift-message', data.giftMessage],
    ['track', '#track-name', data.music.title], ['musicStatus', '#music-status', data.music.artist],
    ['wishStatus', '#wish-status', data.copy.wishResponse], ['relationshipDate', '#relationship-date', data.relationshipStart],
    ['togetherDays', '#together-days', 'Days together'], ['timelineRange', '#timeline-range', 'Timeline date range'],
    ['countdownNumbers', '#countdown>div>span', 'Countdown numbers'], ['countdownSeparators', '#countdown>b', 'Countdown separators'],
    ['theme', '#theme', 'Theme menu'], ['photoPosition', '#photo-position', 'Photo position'], ['lightboxCaption', '#lightbox-caption', 'Opened photo caption'],
    ['pageStatus', '#page-status', 'Page status'], ['galleryEmpty', '#gallery>p', data.copy.galleryEmpty]
  ]) targets.push({key, label: key, selector, text});
  data.message.forEach((text, i) => targets.push({key: `letter.${i}`, label: `Letter paragraph ${i + 1}`, selector: `#letter-copy>p:nth-child(${i + 1})`, text}));
  data.photos.forEach((photo, i) => targets.push({key: `photo.${i}`, label: `Gallery caption ${i + 1}`, selector: `[data-photo-index="${i}"]`, text: photo.caption}));
  data.memories.forEach((memory, i) => {
    for (const [key, tag] of [['date', 'time'], ['title', 'h3'], ['text', 'p']]) targets.push({key: `memory.${i}.${key}`, label: `Memory ${i + 1} · ${key}`, selector: `#timeline>.memory:nth-child(${i + 1})>${tag}`, text: memory[key]});
  });
  return targets;
}

export function applyTextSizes(data) {
  const mobile = matchMedia('(max-width:700px)');
  const targets = textTargets(data);
  const processed = new WeakMap();
  function apply() {
    for (const target of targets) for (const element of document.querySelectorAll(target.selector)) {
      const text = element.textContent;
      const cached = processed.get(element);
      if (!cached || cached.text !== text || cached.key !== target.key) {
        const lines = text.split('\n');
        if (lines.length > 1 && !element.matches('option,select')) {
          element.replaceChildren(...lines.flatMap((line, i) => {
            const span = document.createElement('span'); span.dataset.textLine = String(i); span.textContent = line;
            return i ? [document.createElement('br'), span] : [span];
          }));
        }
        processed.set(element, {text: element.textContent, key: target.key});
      }
      const size = key => { const value = data.textSizes?.[key]; return mobile.matches ? value?.mobile ?? value?.desktop : value?.desktop; };
      const value = size(target.key);
      element.style.fontSize = value ? `${value}px` : '';
      for (const line of element.querySelectorAll(':scope>[data-text-line]')) {
        const value = size(`${target.key}.line.${line.dataset.textLine}`);
        line.style.fontSize = value ? `${value}px` : '';
      }
    }
  }
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.body, {childList: true, characterData: true, subtree: true});
  mobile.addEventListener('change', apply);
}
