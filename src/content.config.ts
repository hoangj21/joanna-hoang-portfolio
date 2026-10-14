/**
 * Content collections. Every piece of text on the site lives in src/content/*.yaml;
 * these schemas validate it at build time, so a typo in a field name fails `npm run build`
 * with a clear message instead of silently dropping content.
 *
 * Lists are shown in ascending `order` (the file loader doesn't preserve file order).
 * Text fields accept light inline formatting: **bold**, *italic* and [link text](https://…).
 */
import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

// Strict objects: an unexpected key (often an unquoted comma in YAML's { } syntax) fails the build
// instead of silently dropping text.
const fact = z.strictObject({ value: z.string(), label: z.string() });
const link = z.strictObject({ label: z.string(), href: z.string() });
const logoKey = z.enum(['intel', 'nec', 'pge', 'seeq', 'kgh']);

const site = defineCollection({
  loader: file('src/content/site.yaml'),
  schema: z.object({
    name: z.string(),
    title: z.string(),
    description: z.string(),
    role: z.string(),
    email: z.string(),
    linkedin: z.string(),
    resumeUrl: z.string().optional(),
    portrait: z.string().optional(),
    artPortfolioUrl: z.string().optional(),
    heroIntro: z.string(),
    employers: z.array(z.strictObject({ name: z.string(), logo: logoKey })),
    agencies: z.array(z.string()),
    about: z.object({
      lead: z.string(),
      paragraphs: z.array(z.string()),
      fieldNotes: z.array(z.strictObject({ label: z.string(), value: z.string(), href: z.string().optional() })),
    }),
    numbers: z.array(fact),
    sections: z.record(z.string(), z.object({ label: z.string(), title: z.string(), intro: z.string().optional() })),
    contact: z.object({ headline: z.string(), emphasis: z.string(), body: z.string() }),
    footer: z.object({ builtWith: z.string() }),
  }),
});

const experience = defineCollection({
  loader: file('src/content/experience.yaml'),
  schema: z.object({
    order: z.number(),
    dates: z.string(),
    role: z.string(),
    org: z.string(),
    orgNote: z.string().optional(),
    logo: logoKey,
    current: z.boolean().default(false),
    description: z.string(),
    facts: z.array(fact).default([]),
    tags: z.array(z.string()).default([]),
  }),
});

const cases = defineCollection({
  loader: file('src/content/cases.yaml'),
  schema: z.object({
    order: z.number(),
    title: z.string(),
    subtitle: z.string(),
    status: z.string(),
    open: z.boolean().default(false),
    diagram: z
      .object({
        steps: z.array(z.strictObject({ label: z.string(), mine: z.boolean().default(false) })),
        note: z.string().optional(),
      })
      .optional(),
    image: z
      .object({
        src: z.string().optional(),
        alt: z.string().optional(),
        caption: z.string(),
        side: z.object({ src: z.string(), alt: z.string() }).optional(),
      })
      .optional(),
    situation: z.string(),
    role: z.string(),
    approach: z.string(),
    outcome: z.string(),
    outcomeLink: link.optional(),
    facts: z.array(fact).default([]),
    tags: z.array(z.string()).default([]),
  }),
});

const live = defineCollection({
  loader: file('src/content/live.yaml'),
  schema: z.object({
    order: z.number(),
    host: z.string(),
    href: z.string(),
    linkLabel: z.string(),
    kicker: z.string(),
    title: z.string(),
    description: z.string(),
    image: z.object({ src: z.string().optional(), alt: z.string().optional(), caption: z.string() }),
    // Looped preview recorded with `npm run record`; the image stays as the fallback
    video: z.strictObject({ mp4: z.string(), webm: z.string(), poster: z.string() }).optional(),
    tags: z.array(z.string()).default([]),
  }),
});

const research = defineCollection({
  loader: file('src/content/research.yaml'),
  schema: z.object({
    order: z.number(),
    note: z.string(),
    dates: z.string(),
    org: z.string(),
    icon: z.enum(['pylon', 'fluke', 'helix']),
    title: z.string(),
    body: z.string(),
    figure: z.object({ src: z.string(), alt: z.string(), caption: z.string(), width: z.number(), height: z.number() }).optional(),
    facts: z.array(fact).default([]),
    tags: z.array(z.string()).default([]),
    link: link.optional(),
  }),
});

const skills = defineCollection({
  loader: file('src/content/skills.yaml'),
  schema: z.object({
    order: z.number(), group: z.string(), items: z.array(z.string()) }),
});

const testimonials = defineCollection({
  loader: file('src/content/testimonials.yaml'),
  schema: z.object({
    order: z.number(),
    quote: z.string(),
    name: z.string(),
    title: z.string(),
    photo: z.string().optional(),
  }),
});

export const collections = { site, experience, cases, live, research, skills, testimonials };
