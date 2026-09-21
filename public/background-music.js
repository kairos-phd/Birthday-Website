export function setupBackgroundMusic({ music, t = key => key, document = globalThis.document }) {
  const audio = document.getElementById('audio');
  const buttons = ['music-toggle', 'hero-music'].map(id => document.getElementById(id));
  const status = document.getElementById('music-status');
  const volume = document.getElementById('volume');
  const player = document.querySelector('.music-player');
  const messages = {
    musicNoSource: 'Add an audio file in the editor', musicTapToStart: 'Touch the page to start the music',
    musicLoading: 'Loading music…', musicUnavailable: 'Audio unavailable. Tap play to retry.',
    musicIdle: 'A soundtrack for your day', playMusic: 'Play background music', pauseMusic: 'Pause background music'
  };
  const copy = key => { const value = t(key); return value && value !== key ? value : messages[key] || key; };
  let manuallyPaused = false;
  try { manuallyPaused = globalThis.sessionStorage?.getItem('birthday-music-paused') === 'true'; } catch {}
  let waiting = false;
  let pending = false;
  let playing = false;
  function sync() {
    player.classList.toggle('is-playing', playing);
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', copy(playing ? 'pauseMusic' : 'playMusic'));
    }
  }
  function stopWaiting() {
    waiting = false;
    document.removeEventListener('pointerdown', firstInteraction);
    document.removeEventListener('keydown', firstInteraction);
  }
  function firstInteraction(event) {
    if (!event.isTrusted || buttons.some(button => button.contains(event.target))) return;
    if (event.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'Escape'].includes(event.key)) return;
    stopWaiting();
    if (!manuallyPaused) void play();
  }
  async function play() {
    if (!music.src || pending) return;
    pending = true;
    status.textContent = copy('musicLoading');
    try {
      if (audio.error) audio.load();
      await audio.play();
      if (manuallyPaused) audio.pause();
    } catch (error) {
      playing = false;
      sync();
      if (manuallyPaused) status.textContent = copy('musicIdle');
      else if (error.name === 'NotAllowedError') {
        status.textContent = copy('musicTapToStart');
        if (!waiting) {
          waiting = true;
          document.addEventListener('pointerdown', firstInteraction);
          document.addEventListener('keydown', firstInteraction);
        }
      } else status.textContent = copy('musicUnavailable');
    } finally { pending = false; }
  }
  function toggle() {
    if (!music.src) return;
    stopWaiting();
    manuallyPaused = pending || !audio.paused;
    try { globalThis.sessionStorage?.setItem('birthday-music-paused', String(manuallyPaused)); } catch {}
    if (manuallyPaused) {
      audio.pause();
      playing = false;
      sync();
      status.textContent = copy('musicIdle');
    } else void play();
  }
  document.getElementById('track-name').textContent = music.title || 'Background music';
  audio.loop = true;
  audio.volume = Math.min(1, Math.max(0, Number.isFinite(music.volume) ? music.volume : 0.4));
  volume.value = String(audio.volume);
  if (music.src) audio.src = music.src;
  for (const button of buttons) button.addEventListener('click', toggle);
  volume.addEventListener('input', () => { audio.volume = Math.min(1, Math.max(0, Number(volume.value) || 0)); });
  audio.addEventListener('playing', () => {
    playing = !audio.paused;
    sync();
    status.textContent = music.artist || music.title || copy('musicIdle');
  });
  audio.addEventListener('pause', () => { playing = false; sync(); status.textContent = copy('musicIdle'); });
  audio.addEventListener('waiting', () => { playing = false; sync(); status.textContent = copy('musicLoading'); });
  audio.addEventListener('error', () => { playing = false; sync(); status.textContent = copy('musicUnavailable'); });
  sync();
  status.textContent = copy(music.src ? 'musicIdle' : 'musicNoSource');
  if (music.src && music.autoplay !== false && !manuallyPaused) void play();
  return { audio, toggle };
}
