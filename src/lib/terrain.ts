/**
 * Typed access to the generated terrain art (src/data/terrain.json).
 * Regenerate with `npm run terrain` after changing scripts/generate_terrain.py.
 */
import data from '../data/terrain.json';

type Topo = { w: number; h: number; minor: string; index: string };
type Treeline = { W: number; H: number; back: string; front: string; ground: string };
type Ridge = { W: number; H: number; back: string; front: string };

export const terrain = data as unknown as {
  topo_a: Topo;
  topo_b: Topo;
  topo_c: Topo;
  topo_tall: Topo;
  hero: {
    W: number; H: number;
    hood: string; snow: string; shadow: string; ribs: string;
    r1: string; r2: string; r3: string;
    trees_far: string; trees_near: string; ground: string;
  };
  treeline_a: Treeline;
  treeline_b: Treeline;
  ridge_a: Ridge;
  ridge_b: Ridge;
  footer: { W: number; H: number; hood: string; snow: string; ridge: string; trees: string; ground: string };
};

export type TopoId = 'topo-a' | 'topo-b' | 'topo-c' | 'topo-tall';
