# Joanna Hoang · Solutions Engineer

Personal portfolio for solutions and sales engineering roles, with a Pacific Northwest trail-map
identity: a Mt. Hood dusk scene, generated topographic contours, conifer treelines and ridgelines.

**Stack:** [Astro 7](https://astro.build) · TypeScript · [Tailwind CSS 4](https://tailwindcss.com) ·
content collections with Zod schemas · self-hosted variable fonts · Python terrain generator ·
GitHub Actions · [Vercel](https://vercel.com)

The page ships as static HTML with about 1 KB of JavaScript (the case-study accordion, copy-email
button and scroll reveal). Everything still works with JavaScript off.

---

## Run it locally

Requires Node 22.12 or newer (`nvm use` reads `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:4321, reloads as you edit
npm run build      # type-check, validate content, build to dist/
npm run preview    # serve the production build
```

## Editing content

All text lives in `src/content/`. You shouldn't need to touch a component to change what the page says.

| File | What it controls |
| --- | --- |
| `site.yaml` | Hero, About, By the numbers, section headings, contact, footer, links |
| `experience.yaml` | The experience trail |
| `cases.yaml` | Case studies, including the flow diagrams |
| `live.yaml` | Live & published cards |
| `research.yaml` | Field research cards |
| `skills.yaml` | Skill columns |
| `testimonials.yaml` | Testimonials (the section hides itself when the list is empty) |

**Ordering:** each list item has an `order` number; the page sorts by it.

**Inline formatting:** text fields accept `**bold**`, `*italic*` and `[link text](https://…)`.

**Quoting:** inside `{ … }` one-liners, wrap any value containing a comma in quotes:

```yaml
- { value: "30+", label: "demos, workshops & POC sessions" }   # ✓
- { value: "30+", label: demos, workshops & POC sessions }     # ✗ build fails: unrecognized key
```

Every file is checked against the schemas in `src/content.config.ts` when you build, so a typo or a
missing field stops the build with a message naming the file and field rather than shipping a broken page.

### Common changes

- **Résumé:** put the PDF at `public/resume.pdf` and set `resumeUrl: /resume.pdf` in `site.yaml`.
  The Résumé buttons appear automatically.
- **Portrait:** add the photo under `public/images/` and set `portrait: /images/your-photo.jpg`.
- **Art portfolio:** set `artPortfolioUrl` and the "Off hours" note in About becomes a link.
- **Case study or Live & published images:** add files under `public/images/` and set `image.src`.
  Until then each slot shows a contour placeholder describing what belongs there.
- **Testimonials:** replace the bracketed placeholders, optionally adding `photo:`.

## Project structure

```
src/
  content/            YAML content (edit these)
  content.config.ts   schemas for every content file
  components/         one component per page section, plus ui/ primitives
  layouts/Base.astro  <head>, fonts, shared contour patterns
  styles/global.css   theme tokens (light and dark) and Tailwind setup
  scripts/main.ts     accordion, copy button, scroll reveal
  data/terrain.json   generated terrain art
  lib/                inline formatter, logos, terrain types, sorting
scripts/
  generate_terrain.py contour, ridgeline, treeline and Mt. Hood generator
public/               favicon, images, résumé
```

### Theming

Colors are CSS variables in `src/styles/global.css`, defined once for light and redefined for dark.
Tailwind reads them through `@theme inline`, so `bg-bg` or `text-fg-muted` switches with the visitor's
OS setting without `dark:` variants. The hero is the same dusk scene in both themes.

### Terrain art

The contours, ridgelines, treelines and both Mt. Hood scenes come from `scripts/generate_terrain.py`
(NumPy, SciPy, scikit-image), which writes `src/data/terrain.json`. Output is deterministic, so you
only rerun it to change the art:

```bash
pip install -r scripts/requirements.txt
npm run terrain
```

## Deploying

1. Push this repository to GitHub.
2. In Vercel, **Add New → Project**, import the repo, and accept the detected Astro settings
   (build `npm run build`, output `dist`). No adapter is needed for a static site.
3. Every push to `main` deploys; pull requests get preview URLs.
4. Once a custom domain is connected, update `site` in `astro.config.mjs` so canonical and
   Open Graph URLs use it.

GitHub Actions (`.github/workflows/ci.yml`) runs the same type-check and build on every push and PR.
