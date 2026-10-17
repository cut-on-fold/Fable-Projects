// The burn test for a mystery fabric: hold a small snippet in tweezers over a
// sink, bring a flame to it, and watch, smell and touch what is left.

export interface BurnEntry {
  fibre: string;
  approach: string;
  burning: string;
  smell: string;
  residue: string;
  keywords: string[];
}

export const BURN_TABLE: BurnEntry[] = [
  { fibre: 'Cotton', approach: 'Does not shrink from the flame; catches at once', burning: 'Burns fast with a yellow flame, keeps burning when the flame is taken away, afterglow', smell: 'Burning paper or leaves', residue: 'Soft, fine grey ash that crumbles', keywords: ['paper', 'ash', 'soft', 'grey', 'fast', 'afterglow', 'cellulose'] },
  { fibre: 'Linen', approach: 'Like cotton; takes a moment longer to catch', burning: 'Burns steadily, a little slower than cotton', smell: 'Burning paper or rope', residue: 'Soft grey ash, slightly heavier than cotton', keywords: ['paper', 'rope', 'ash', 'soft', 'grey', 'cellulose'] },
  { fibre: 'Viscose, rayon, modal, lyocell', approach: 'Like cotton; does not shrink away', burning: 'Burns fast without melting', smell: 'Burning paper', residue: 'Very little soft ash', keywords: ['paper', 'ash', 'soft', 'fast', 'cellulose', 'viscose', 'rayon', 'tencel'] },
  { fibre: 'Silk', approach: 'Curls away from the flame', burning: 'Burns slowly, sputters, goes out by itself when the flame is removed', smell: 'Burning hair or feathers', residue: 'Small brittle black bead that crushes to powder', keywords: ['hair', 'feathers', 'curls', 'slow', 'bead', 'crush', 'brittle', 'protein'] },
  { fibre: 'Wool', approach: 'Curls away from the flame', burning: 'Burns slowly, sizzles, goes out by itself', smell: 'Burning hair, strongly', residue: 'Brittle, irregular black bead that crushes', keywords: ['hair', 'sizzle', 'curls', 'slow', 'self-extinguishing', 'bead', 'crush', 'brittle', 'protein'] },
  { fibre: 'Polyester', approach: 'Shrinks and melts away from the flame', burning: 'Melts, then burns with black smoke and dripping; may go out when the flame is removed', smell: 'Sweet, chemical, like burning plastic', residue: 'Hard, round black or brown bead that will not crush', keywords: ['melts', 'shrinks', 'smoke', 'sweet', 'chemical', 'plastic', 'hard', 'bead', 'drips'] },
  { fibre: 'Nylon', approach: 'Shrinks and melts away from the flame', burning: 'Melts, burns slowly with difficulty, drips', smell: 'Celery, or cooked vegetables', residue: 'Hard, grey or tan bead', keywords: ['melts', 'shrinks', 'celery', 'vegetable', 'hard', 'bead', 'drips', 'grey'] },
  { fibre: 'Acrylic', approach: 'Shrinks and melts away from the flame', burning: 'Melts and burns fast, flares and sputters, drips', smell: 'Acrid, fishy, chemical', residue: 'Hard, irregular black bead', keywords: ['melts', 'flares', 'sputters', 'acrid', 'fishy', 'hard', 'bead', 'drips'] },
  { fibre: 'Acetate', approach: 'Shrinks and melts away from the flame', burning: 'Melts and burns fast, drips', smell: 'Vinegar', residue: 'Hard, brittle black bead', keywords: ['melts', 'vinegar', 'acetic', 'hard', 'bead', 'drips'] },
  { fibre: 'Elastane (spandex, lycra)', approach: 'Shrinks from the flame', burning: 'Melts and burns', smell: 'Chemical', residue: 'Soft, sticky, gummy black residue rather than a hard bead', keywords: ['melts', 'sticky', 'gummy', 'soft', 'chemical', 'stretch'] },
  { fibre: 'A blend', approach: 'Two behaviours at once', burning: 'Burns like the natural fibre but with melting at the edge', smell: 'Paper or hair with a chemical note', residue: 'Ash with hard beads in it: cotton or wool with polyester', keywords: ['both', 'ash', 'bead', 'mixed', 'blend', 'paper', 'chemical'] },
];

export function searchBurn(query: string): BurnEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return BURN_TABLE;
  const words = q.split(/\s+/);
  return BURN_TABLE.filter((e) => {
    const hay = [e.fibre, e.approach, e.burning, e.smell, e.residue, ...e.keywords].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
