/**
 * Page behavior: case-study accordion, copy-to-clipboard and scroll reveal.
 * Everything works without JavaScript; this only adds the interactions.
 */

// Case-study accordion. Collapsed bodies are `inert` so their links aren't tabbable.
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-case-toggle]')) {
  button.addEventListener('click', () => {
    const card = button.closest<HTMLElement>('[data-case]');
    const body = card?.querySelector<HTMLElement>('[data-case-body]');
    if (!card || !body) return;
    const open = !card.hasAttribute('data-open');
    card.toggleAttribute('data-open', open);
    button.setAttribute('aria-expanded', String(open));
    body.inert = !open;
  });
}

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
const revealables = document.querySelectorAll<HTMLElement>('.reveal');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion || !('IntersectionObserver' in window)) {
  revealables.forEach((el) => el.classList.add('in'));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.06 },
  );
  revealables.forEach((el) => observer.observe(el));
}
