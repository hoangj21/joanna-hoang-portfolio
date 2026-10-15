/**
 * Page behavior: theme toggle, case-study accordion, copy-to-clipboard, scroll reveal and
 * the count-up. Everything works without JavaScript; this only adds the interactions.
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canObserve = 'IntersectionObserver' in window;

/*
 * Theme. Three states: no data-theme (follow the OS, the default), or a chosen light/dark
 * saved in localStorage. The head script in Base.astro applies a saved choice before first
 * paint; this keeps the toggle's label, the "Auto" reset and theme-color in step.
 */
type Theme = 'light' | 'dark';
const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const themeMetas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
const themeToggles = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');
const themeResets = document.querySelectorAll<HTMLButtonElement>('[data-theme-reset]');

// Scroll-aware navigation and a slim progress line make the long portfolio easier to explore.
const nav = document.querySelector<HTMLElement>('nav[aria-label="Primary"]');
const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]')];
const progressBar = document.querySelector<HTMLElement>('[data-scroll-progress]');
const navSections = navLinks
  .map((link) => ({ link, section: document.querySelector<HTMLElement>(link.getAttribute('href') ?? '') }))
  .filter((item): item is { link: HTMLAnchorElement; section: HTMLElement } => !!item.section);
let navFrame = 0;
function updateScrollNavigation() {
  if (navFrame) return;
  navFrame = requestAnimationFrame(() => {
    navFrame = 0;
    const maxScroll = root.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
    progressBar?.style.setProperty('--scroll-progress', String(progress));

    const activationLine = (nav?.getBoundingClientRect().bottom ?? 0) + 48;
    let active: HTMLAnchorElement | undefined;
    for (const { link, section } of navSections) {
      if (section.getBoundingClientRect().top <= activationLine) active = link;
    }
    for (const { link } of navSections) {
      if (link === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  });
}
window.addEventListener('scroll', updateScrollNavigation, { passive: true });
window.addEventListener('resize', updateScrollNavigation, { passive: true });
updateScrollNavigation();

const chosenTheme = (): Theme | undefined =>
  root.dataset.theme === 'light' || root.dataset.theme === 'dark' ? root.dataset.theme : undefined;
const activeTheme = (): Theme => chosenTheme() ?? (systemDark.matches ? 'dark' : 'light');

function syncThemeControls() {
  const chosen = chosenTheme();
  // A choice points every theme-color meta at its colour; no choice restores each one's own
  const chosenColor = themeMetas.find((m) => m.dataset.scheme === chosen)?.dataset.color;
  for (const meta of themeMetas) meta.content = chosenColor ?? meta.dataset.color ?? meta.content;
  const label = `Switch to ${activeTheme() === 'dark' ? 'light' : 'dark'} mode`;
  for (const button of themeToggles) {
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  for (const button of themeResets) button.hidden = !chosen;
}

function setTheme(theme: Theme | undefined) {
  if (theme) root.dataset.theme = theme;
  else delete root.dataset.theme;
  try {
    if (theme) localStorage.setItem('portfolio-theme', theme);
    else localStorage.removeItem('portfolio-theme');
  } catch {}
  syncThemeControls();
}

for (const button of themeToggles) {
  button.addEventListener('click', () => setTheme(activeTheme() === 'dark' ? 'light' : 'dark'));
}
for (const button of themeResets) {
  button.addEventListener('click', () => {
    setTheme(undefined);
    // The reset hides itself, so hand focus to the toggle beside it
    button.parentElement?.querySelector<HTMLButtonElement>('[data-theme-toggle]')?.focus();
  });
}
systemDark.addEventListener('change', syncThemeControls);
syncThemeControls();
for (const el of document.querySelectorAll<HTMLElement>('[data-theme-switch]')) el.hidden = false;

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

// Let visitors replay a case-study flow after opening it, without closing the case.
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-flow-replay]')) {
  if (reduceMotion) continue;
  button.hidden = false;
  button.setAttribute('aria-label', 'Replay this case study flow');
  button.addEventListener('click', () => {
    const card = button.closest<HTMLElement>('[data-case]');
    if (!card?.hasAttribute('data-open')) return;
    // Reset immediately: reversing a transition for only one frame barely changes its
    // opacity, so toggling data-play alone can look like nothing happened.
    button.disabled = true;
    card.setAttribute('data-flow-reset', '');
    card.removeAttribute('data-play');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.removeAttribute('data-flow-reset');
        if (card.hasAttribute('data-open')) card.setAttribute('data-play', '');
        button.disabled = false;
      });
    });
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

// Live-site previews play only while at least 35% on screen. With reduced motion or data
// saver on they never load, and the poster stays up.
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
if (!reduceMotion && !saveData && canObserve) {
  const videos = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting } of entries) {
        const video = target as HTMLVideoElement;
        if (isIntersecting) {
          video.preload = 'auto';
          video.play().catch(() => {});
        } else video.pause();
      }
    },
    { threshold: 0.35 },
  );
  document.querySelectorAll('video[data-preview]').forEach((v) => videos.observe(v));
}

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
