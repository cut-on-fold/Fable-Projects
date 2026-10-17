// Seam finishes and hems by fabric.

export interface FinishEntry {
  fabric: string;
  examples: string;
  best: string;
  also: string;
  hem: string;
  tip: string;
  keywords: string[];
}

export const FINISH_TABLE: FinishEntry[] = [
  { fabric: 'Sheers', examples: 'chiffon, georgette, organza, voile', best: 'French seam (sew 1 cm wrong sides together, trim to 3 mm, press, sew 6 mm right sides together)', also: 'Narrow overlock with fine thread; hairline seam', hem: 'Rolled hem, by overlocker or a narrow machine hem; baby hem', tip: 'Cut the seam allowance to suit the French seam before you start, or use 1.5 cm and trim.', keywords: ['sheer', 'chiffon', 'georgette', 'organza', 'voile', 'tulle'] },
  { fabric: 'Light wovens', examples: 'lawn, batiste, rayon challis, tencel, silk crêpe', best: 'French seam on straight seams; overlock on curves', also: 'Flat-felled on shirts; bound on an unlined jacket', hem: 'Narrow double-fold hem, 6 mm + 6 mm; blind hem by hand on silk', tip: 'Rayon frays: overlock or French seam straight after cutting the pieces that will wait.', keywords: ['lawn', 'batiste', 'rayon', 'challis', 'tencel', 'silk', 'light', 'blouse', 'viscose'] },
  { fabric: 'Medium wovens', examples: 'poplin, linen, chambray, quilting cotton, shirting', best: '3-thread overlock, seams pressed open or to one side', also: 'Flat-felled on shirts and trousers; pinked on stable cottons; Hong Kong bound where seen', hem: 'Double-fold 1 cm + 2 cm, topstitched or blind hemmed', tip: 'Linen frays badly: finish every edge before it goes near the machine for anything else.', keywords: ['poplin', 'linen', 'chambray', 'cotton', 'shirting', 'medium', 'woven', 'gingham'] },
  { fabric: 'Heavy wovens', examples: 'denim, twill, canvas, corduroy', best: 'Flat-felled or mock flat-felled seam, topstitched', also: 'Overlocked and topstitched; bound on an unlined coat', hem: 'Double-fold 1 cm + 2.5 cm, topstitched with topstitch thread; hammer the seam crossings first', tip: 'Grade the allowances at crossings so the bulk steps down. Lengthen the stitch for topstitching.', keywords: ['denim', 'twill', 'canvas', 'corduroy', 'heavy', 'jeans', 'chino'] },
  { fabric: 'Wool and tailoring', examples: 'suiting, tweed, flannel, coating', best: 'Pressed open and bound (Hong Kong) in an unlined jacket; overlocked where lined', also: 'Catch-stitched open on coating; welt seams', hem: 'Catch-stitched by hand over a bias strip; 4 cm on a coat', tip: 'Press with steam and a clapper at every seam before the next crosses it. Tailor tacks instead of chalk on tweed.', keywords: ['wool', 'suiting', 'tweed', 'coating', 'flannel', 'jacket', 'coat', 'blazer', 'tailoring'] },
  { fabric: 'Knits', examples: 'jersey, interlock, cotton lycra, ponte, French terry', best: '4-thread overlock (seam and finish in one)', also: 'Narrow zigzag or lightning stitch, allowance trimmed; clear elastic in the shoulders', hem: 'Twin needle or coverstitch over a 2.5 cm single fold; knit stay tape on heavy knits', tip: 'Knits do not fray: the finish is for stretch, not fraying. A plain zigzag with the allowance left on is fine inside a T-shirt.', keywords: ['knit', 'jersey', 'interlock', 'lycra', 'ponte', 'terry', 'tee', 't-shirt', 'leggings', 'sweatshirt'] },
  { fabric: 'Swimwear and activewear', examples: 'nylon-spandex, supplex', best: '4-thread overlock with woolly nylon in the loopers', also: '3-step zigzag; flatlock for a flat seam against the skin', hem: 'Coverstitch or twin needle over swimwear elastic; fold-over elastic on edges', tip: 'Every seam gets stretched hard: test the stitch for recovery and popped threads on a scrap first.', keywords: ['swim', 'swimwear', 'activewear', 'lycra', 'spandex', 'supplex', 'leotard'] },
  { fabric: 'Lined garments', examples: 'lined skirts, dresses, jackets', best: 'Pressed open, no finish needed where the lining covers it', also: 'Pinked; overlocked on fabrics that fray in wear', hem: 'Catch-stitched or blind hemmed; lining hemmed 2–3 cm shorter and free', tip: 'The lining does the finishing. Spend the time on pressing instead.', keywords: ['lined', 'lining', 'dress', 'skirt', 'jacket'] },
  { fabric: 'Leather, vinyl and oilcloth', examples: 'leather, faux leather, vinyl, PUL, oilcloth', best: 'None: the edges do not fray. Seams topstitched open or to one side', also: 'Glued open; lapped seams', hem: 'Glued and topstitched; or left raw', tip: 'Clips, not pins. Longer stitch (3–3.5 mm), and no unpicking: the holes stay.', keywords: ['leather', 'vinyl', 'pul', 'oilcloth', 'pleather', 'faux leather', 'laminated'] },
  { fabric: 'Fleece and minky', examples: 'polar fleece, minky, sherpa', best: 'Plain seam, no finish; or 4-thread overlock to cut the bulk', also: 'Topstitched flat', hem: 'Single-fold hem, zigzag or twin needle; or left raw on fleece', tip: 'Trim the allowance to 6 mm inside to lose bulk; fleece does not fray at all.', keywords: ['fleece', 'minky', 'sherpa', 'plush'] },
];

export function searchFinishes(query: string): FinishEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return FINISH_TABLE;
  const words = q.split(/\s+/);
  return FINISH_TABLE.filter((e) => {
    const hay = [e.fabric, e.examples, ...e.keywords].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
