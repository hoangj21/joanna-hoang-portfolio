/**
 * Page behavior: case-study accordion, copy-to-clipboard, scroll reveal and the count-up.
 * Everything works without JavaScript; this only adds the interactions.
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canObserve = 'IntersectionObserver' in window;

/** Calls `fn` once for each element the first time `threshold` of it is on screen. */
function onFirstView(elements: Iterable<Element>, threshold: number, fn: (el: Element) => void) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          fn(entry.target);
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold },
  );
  for (const el of elements) observer.observe(el);
}

// Case-study accordion. Collapsed bodies are `inert` so their links aren't tabbable.
// `data-play` starts the flow diagram's play-in; the case that starts open plays when it's first seen.
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-case-toggle]')) {
  button.addEventListener('click', () => {
    const card = button.closest<HTMLElement>('[data-case]');
    const body = card?.querySelector<HTMLElement>('[data-case-body]');
    if (!card || !body) return;
    const open = !card.hasAttribute('data-open');
    card.toggleAttribute('data-open', open);
    card.toggleAttribute('data-play', open);
    button.setAttribute('aria-expanded', String(open));
    body.inert = !open;
  });
}
const openCases = document.querySelectorAll('[data-case][data-open]');
if (reduceMotion || !canObserve) openCases.forEach((el) => el.setAttribute('data-play', ''));
else onFirstView(openCases, 0.35, (el) => el.setAttribute('data-play', ''));

// Copy email address
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
  const label = button.querySelector<HTMLElement>('[data-copy-label]') ?? button;
  const original = label.textContent ?? '';
  button.addEventListener('click', async () => {
    const text = button.dataset.copy ?? '';
    try {
      await navigator.clipboard.writeText(text);
      label.textContent = 'Copied';
      setTimeout(() => (label.textContent = original), 1600);
    } catch {
      // Clipboard unavailable: select the address so it can be copied by hand
      const target = document.querySelector<HTMLElement>('[data-copy-target]');
      if (!target) return;
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  });
}

// Reveal sections as they scroll into view
const revealables = document.querySelectorAll('.reveal');
if (reduceMotion || !canObserve) revealables.forEach((el) => el.classList.add('in'));
else onFirstView(revealables, 0.06, (el) => el.classList.add('in'));

// Count numeric stats up from zero on first view. The real value stays in the HTML;
// only values shaped like "100+", ">40%" or "5" animate.
if (!reduceMotion && canObserve) {
  const counters: [Element, string, number, string][] = [];
  for (const el of document.querySelectorAll('[data-count]')) {
    const match = el.textContent?.trim().match(/^(\D*)(\d+)(\D*)$/);
    if (!match) continue;
    counters.push([el, match[1], Number(match[2]), match[3]]);
    el.textContent = `${match[1]}0${match[3]}`;
  }
  onFirstView(
    counters.map(([el]) => el),
    0.6,
    (el) => {
      const [, prefix, target, suffix] = counters.find(([c]) => c === el)!;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / 1200, 1);
        el.textContent = `${prefix}${Math.round(target * (1 - (1 - t) ** 3))}${suffix}`;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
  );
}
