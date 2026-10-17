// Needle, thread and stitch suggestions by fabric. A starting point to test
// on a scrap, not a rule.

export interface NeedleEntry {
  fabric: string;
  examples: string;
  needle: string;
  size: string;
  thread: string;
  stitch: string;
  tip: string;
  overlock: string;
  keywords: string[];
}

export const NEEDLE_TABLE: NeedleEntry[] = [
  {
    fabric: 'Sheer wovens', examples: 'chiffon, organza, georgette, voile', needle: 'Microtex or Universal', size: '60/8 – 70/10',
    thread: 'Fine polyester or cotton (60–80 wt)', stitch: '1.5–2 mm', tip: 'Start on a scrap of tissue to stop the fabric sinking into the plate. French seams.',
    overlock: 'Rolled hem or narrow 3-thread; stitch 1–1.5 mm; differential 0.7–1.0 so the edge does not pucker.',
    keywords: ['sheer', 'chiffon', 'organza', 'georgette', 'voile', 'tulle', 'net'],
  },
  {
    fabric: 'Light wovens', examples: 'lawn, batiste, rayon challis, tencel, silk crêpe de chine', needle: 'Microtex or Universal', size: '70/10 – 80/12',
    thread: 'All-purpose polyester', stitch: '2–2.5 mm', tip: 'A new needle every time. Fine pins, and a walking foot tames slippery rayon.',
    overlock: '3-thread to finish edges, stitch 2.5 mm, differential N (1.0); 4-thread at 2.5–3 for seams.',
    keywords: ['lawn', 'batiste', 'rayon', 'challis', 'tencel', 'silk', 'crepe', 'viscose', 'light', 'blouse'],
  },
  {
    fabric: 'Medium wovens', examples: 'poplin, quilting cotton, linen, chambray, shirting, seersucker', needle: 'Universal', size: '80/12',
    thread: 'All-purpose polyester or cotton', stitch: '2.5 mm', tip: 'The everyday setting. Linen frays: finish edges before you sew.',
    overlock: '3-thread edge finish, stitch 2.5–3 mm, differential N.',
    keywords: ['poplin', 'cotton', 'linen', 'chambray', 'shirting', 'seersucker', 'medium', 'woven', 'gingham', 'flannel'],
  },
  {
    fabric: 'Medium-heavy wovens', examples: 'twill, light denim, corduroy, canvas, gabardine', needle: 'Universal or Jeans', size: '90/14',
    thread: 'All-purpose polyester', stitch: '3 mm', tip: 'Go up a needle size for seam crossings. Hammer bulky seams flat before topstitching.',
    overlock: '3-thread wide edge finish, stitch 3 mm, differential N; slow down over seam crossings.',
    keywords: ['twill', 'denim', 'corduroy', 'canvas', 'gabardine', 'chino', 'trousers', 'heavy'],
  },
  {
    fabric: 'Heavy wovens', examples: 'heavy denim (12 oz+), duck, upholstery, waxed cotton', needle: 'Jeans', size: '100/16 – 110/18',
    thread: 'Heavy or topstitch thread (30–40 wt)', stitch: '3–3.5 mm', tip: 'Lengthen the stitch on thick seams and hand-wheel over them. A hump jumper helps the foot stay level.',
    overlock: '3-thread wide, stitch 3.5–4 mm, differential N; hand-wheel the knife over thick crossings.',
    keywords: ['denim', 'duck', 'upholstery', 'waxed', 'heavy', 'bag', 'jeans'],
  },
  {
    fabric: 'Wool', examples: 'suiting, flannel, tweed, coating, boiled wool', needle: 'Universal', size: '80/12 – 90/14 (coating 100/16)',
    thread: 'All-purpose polyester or silk', stitch: '2.5–3 mm', tip: 'Press with steam and a clapper. Tailor tacks instead of chalk on tweed.',
    overlock: '3-thread edge finish, stitch 3 mm; differential 1.0–1.3 on loose tweed to stop it stretching.',
    keywords: ['wool', 'suiting', 'tweed', 'coating', 'flannel', 'boiled', 'melton', 'coat', 'blazer'],
  },
  {
    fabric: 'Satin and silky synthetics', examples: 'satin, charmeuse, microfibre, polyester lining', needle: 'Microtex', size: '60/8 – 70/10',
    thread: 'Fine polyester', stitch: '2 mm', tip: 'Pins only inside the seam allowance. Cut single layer with a rotary cutter if it slides.',
    overlock: '3-thread narrow, stitch 2 mm, differential N; rolled hem on raw edges.',
    keywords: ['satin', 'charmeuse', 'microfibre', 'lining', 'slippery', 'silky', 'polyester'],
  },
  {
    fabric: 'Light knits', examples: 'jersey, ITY, tricot, mesh, bamboo jersey', needle: 'Ballpoint (Jersey) or Stretch', size: '70/10 – 75/11',
    thread: 'All-purpose polyester; woolly nylon in the loopers', stitch: 'Narrow zigzag 0.5 × 2.5 mm, or a 3-thread overlock', tip: 'A walking foot or lower presser-foot pressure stops wavy seams. Never pull the fabric through.',
    overlock: '4-thread seams, stitch 2.5 mm, width 5–6; differential 1.3–1.5, raised until the seam lies flat.',
    keywords: ['jersey', 'ity', 'tricot', 'mesh', 'bamboo', 'knit', 'light', 't-shirt', 'tee'],
  },
  {
    fabric: 'Medium knits', examples: 'interlock, cotton lycra, ponte, French terry, rib', needle: 'Stretch or Jersey', size: '80/12 – 90/14',
    thread: 'All-purpose polyester', stitch: 'Lightning stitch or zigzag 1 × 3 mm; 4-thread overlock', tip: 'Skipped stitches mean the needle: try a Stretch needle before anything else.',
    overlock: '4-thread seams, stitch 2.5–3 mm, differential 1.2–1.5.',
    keywords: ['interlock', 'lycra', 'ponte', 'french terry', 'rib', 'knit', 'medium', 'leggings'],
  },
  {
    fabric: 'Heavy knits', examples: 'sweatshirt fleece, scuba, sweater knit, quilted knit', needle: 'Stretch or Jersey', size: '90/14',
    thread: 'All-purpose polyester', stitch: 'Zigzag 1 × 3.5 mm; 4-thread overlock', tip: 'Stabilise shoulders with clear elastic or stay tape. Twin needle for hems.',
    overlock: '4-thread seams, stitch 3 mm, differential 1.3–1.5; lighten the foot pressure.',
    keywords: ['sweatshirt', 'fleece', 'scuba', 'sweater', 'heavy', 'knit', 'hoodie'],
  },
  {
    fabric: 'Swimwear and activewear', examples: 'nylon-spandex, supplex, power mesh', needle: 'Stretch', size: '75/11',
    thread: 'Polyester; woolly nylon in the loopers', stitch: 'Narrow zigzag or 3-step zigzag; 4-thread overlock', tip: 'Test the stretch percentage first. Swimwear elastic in the legs, cut shorter at the back.',
    overlock: '4-thread (3-thread for the lightest), stitch 2–2.5 mm, differential 1.3–1.5; woolly nylon in both loopers.',
    keywords: ['swim', 'swimwear', 'activewear', 'spandex', 'supplex', 'power mesh', 'lycra', 'leotard'],
  },
  {
    fabric: 'Fleece and minky', examples: 'polar fleece, minky, sherpa, faux fur', needle: 'Universal or Stretch', size: '90/14',
    thread: 'All-purpose polyester', stitch: '3 mm', tip: 'Walking foot. Cut faux fur from the back with the blade tip only, and shake out the fluff.',
    overlock: '4-thread, stitch 3–4 mm, differential 1.2–1.5; brush the fluff out of the loopers often.',
    keywords: ['fleece', 'minky', 'sherpa', 'faux fur', 'fur', 'plush'],
  },
  {
    fabric: 'Leather, vinyl and oilcloth', examples: 'leather, faux leather, vinyl, PUL, oilcloth', needle: 'Leather (real) or Microtex (faux)', size: '90/14 – 100/16',
    thread: 'Polyester, never cotton for leather', stitch: '3–3.5 mm', tip: 'Clips, not pins: holes are forever. Teflon or roller foot, or tape on the foot’s sole.',
    overlock: 'Do not overlock leather or vinyl: bind or leave the edges raw. PUL takes a 4-thread at 3 mm.',
    keywords: ['leather', 'vinyl', 'pul', 'oilcloth', 'pleather', 'faux leather', 'laminated'],
  },
  {
    fabric: 'Topstitching', examples: 'any fabric, with heavier thread', needle: 'Topstitch', size: '90/14 – 100/16',
    thread: 'Topstitch thread on top, all-purpose in the bobbin', stitch: '3–4 mm', tip: 'Lower the top tension a touch. An edge-stitch foot keeps the line straight.',
    overlock: 'Not an overlocker job; a coverstitch with the looper thread showing is the knit equivalent.',
    keywords: ['topstitch', 'topstitching', 'edge', 'jeans'],
  },
  {
    fabric: 'Elastic and fold-over elastic', examples: 'waistband elastic, FOE, lingerie elastic', needle: 'Stretch', size: '75/11',
    thread: 'All-purpose polyester', stitch: 'Zigzag 2 × 3 mm or 3-step zigzag', tip: 'Quarter the elastic and the opening, pin at the marks, stretch only between pins.',
    overlock: '3-thread, stitch 3 mm, differential N, knife disengaged; stretch the elastic between the quarter marks only.',
    keywords: ['elastic', 'foe', 'fold-over', 'lingerie', 'waistband'],
  },
];

export function searchNeedles(query: string): NeedleEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return NEEDLE_TABLE;
  const words = q.split(/\s+/);
  return NEEDLE_TABLE.filter((e) => {
    const hay = [e.fabric, e.examples, e.needle, ...e.keywords].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
