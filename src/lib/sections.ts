// Known sections and their stable anchors; display order lives only in site.yaml.
export const sectionKeys = ['about', 'cases', 'contact', 'experience', 'live', 'research', 'skills', 'testimonials'] as const;
export type SectionKey = (typeof sectionKeys)[number];

export const sectionIds: Record<SectionKey, string> = {
  about: 'about',
  cases: 'work',
  contact: 'contact',
  experience: 'experience',
  live: 'live',
  research: 'research',
  skills: 'skills',
  testimonials: 'testimonials',
};

export type SectionBackground = 'bg' | 'bg-alt';
// Surfaces adjoining the research band, used to blend its ridgeline edges.
export const sectionBackgrounds: Partial<Record<SectionKey, SectionBackground>> = {
  about: 'bg',
  cases: 'bg',
  contact: 'bg',
  experience: 'bg-alt',
  live: 'bg-alt',
  skills: 'bg',
  testimonials: 'bg-alt',
};
