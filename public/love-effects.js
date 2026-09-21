export function animateNumber(element, value, reducedMotion) {
  if (element.textContent === value) return;
  const previous = element.dataset.initialized;
  element.textContent = value;
  element.dataset.initialized = 'true';
  if (previous && !reducedMotion) {
    element.getAnimations().forEach(animation => animation.cancel());
    element.animate([{transform: 'translateY(-7px)', opacity: .35}, {transform: 'translateY(0)', opacity: 1}], {duration: 420, easing: 'cubic-bezier(.16,1,.3,1)'});
  }
}

export function setupLoveEffects(t) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const layer = document.getElementById('love-particles');
  const hearts = [...document.querySelectorAll('svg use[href="#heart"]')].map(use => use.closest('svg'));
  for (const heart of hearts) {
    let target = heart.closest('a,button');
    if (!target) {
      target = document.createElement('button'); target.type = 'button'; target.className = 'love-button'; target.setAttribute('aria-label', t('sendLove'));
      heart.replaceWith(target); target.append(heart);
      const hiddenParent = target.closest('[aria-hidden="true"]'); if (hiddenParent) hiddenParent.removeAttribute('aria-hidden');
    }
    target.classList.add('love-interaction');
    target.addEventListener('click', () => {
      document.getElementById('love-status').textContent = t('loveSent');
      if (reduced.matches) return;
      const rect = heart.getBoundingClientRect();
      heart.animate([{transform: 'scale(1)'}, {transform: 'scale(1.35)', offset: .35}, {transform: 'scale(1)'}], {duration: 450});
      while (layer.childElementCount > 21) layer.firstElementChild.remove();
      for (let index = 0; index < 7; index++) {
        const particle = heart.cloneNode(true); particle.classList.add('love-particle'); particle.setAttribute('aria-hidden', 'true');
        particle.style.left = `${rect.left + rect.width / 2}px`; particle.style.top = `${rect.top + rect.height / 2}px`;
        layer.append(particle);
        const animation = particle.animate([{transform: 'translate(-50%,-50%) scale(.7)', opacity: .8}, {transform: `translate(${(index - 3) * 19}px,${-65 - Math.random() * 55}px) scale(.3)`, opacity: 0}], {duration: 1200, easing: 'cubic-bezier(.16,1,.3,1)'});
        animation.onfinish = () => particle.remove();
      }
    });
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  }, {threshold: .12});
  document.querySelectorAll('.memory').forEach(item => observer.observe(item));
}
