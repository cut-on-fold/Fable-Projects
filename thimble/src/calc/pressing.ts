// Pressing and interfacing by fibre. Iron settings are the dial dots and the
// usual plate temperature; always test on a scrap, and on blends go by the
// most delicate fibre.

export interface PressEntry {
  fibre: string;
  examples: string;
  iron: string;
  steam: string;
  cloth: string;
  interfacing: string;
  tip: string;
  keywords: string[];
}

export const PRESS_TABLE: PressEntry[] = [
  { fibre: 'Cotton', examples: 'poplin, lawn, quilting cotton, chambray, denim, cotton jersey', iron: '••• hot (200 °C)', steam: 'Yes, plenty', cloth: 'Only on dark colours, which shine', interfacing: 'Woven or weft-insertion fusible, light to medium; knit fusible on jersey', tip: 'Press from the wrong side; a damp press cloth takes out set creases. Lift and press on jersey, never slide.', keywords: ['cotton', 'poplin', 'lawn', 'chambray', 'denim', 'jersey', 'quilting', 'flannel'] },
  { fibre: 'Linen', examples: 'linen, linen-cotton, hemp', iron: '••• hot (230 °C)', steam: 'Yes, or press damp', cloth: 'On dark colours', interfacing: 'Woven fusible or sew-in; weft-insertion on jackets', tip: 'Linen creases as it dries: press while damp, from the wrong side, and press seams open over a seam roll.', keywords: ['linen', 'hemp', 'ramie'] },
  { fibre: 'Silk', examples: 'crêpe de chine, charmeuse, habotai, dupion, organza', iron: '•• medium (150 °C), lower for charmeuse', steam: 'Little or none: water spots', cloth: 'Always, silk organza is ideal', interfacing: 'Silk organza sew-in; the very lightest weft fusible, tested first', tip: 'Press from the wrong side with a dry iron; test for water marks on a scrap before any steam.', keywords: ['silk', 'charmeuse', 'crepe de chine', 'habotai', 'dupion', 'organza', 'satin'] },
  { fibre: 'Wool', examples: 'suiting, flannel, tweed, coating, boiled wool, wool crêpe', iron: '•• medium (150 °C)', steam: 'Yes, through a cloth', cloth: 'Always: wool shines', interfacing: 'Weft-insertion fusible; hair canvas or sew-in for tailoring', tip: 'Steam, then hold with a clapper until cool: that is what sets a crisp edge. Never let the iron touch the right side.', keywords: ['wool', 'suiting', 'tweed', 'coating', 'flannel', 'boiled', 'melton', 'crepe', 'cashmere', 'merino'] },
  { fibre: 'Viscose and rayon', examples: 'viscose challis, rayon twill, ecovero, modal', iron: '•• medium (150 °C)', steam: 'Yes, gently', cloth: 'On the right side', interfacing: 'Light weft-insertion or knit fusible', tip: 'Weak when wet: no pulling or stretching while pressing. Press from the wrong side and let it cool flat.', keywords: ['viscose', 'rayon', 'challis', 'modal', 'ecovero', 'bamboo'] },
  { fibre: 'Lyocell (Tencel)', examples: 'tencel twill, lyocell jersey', iron: '•• medium (150 °C)', steam: 'Yes', cloth: 'On dark colours', interfacing: 'Light weft-insertion fusible', tip: 'Takes a press well; shines if the iron is too hot.', keywords: ['tencel', 'lyocell'] },
  { fibre: 'Polyester', examples: 'polyester crêpe, satin, chiffon, microfibre, polyester lining', iron: '• low to medium (110–150 °C)', steam: 'Yes, light', cloth: 'Always', interfacing: 'Low-temperature fusible or sew-in', tip: 'Melts and glazes at cotton heat. Creases set permanently if pressed too hot, so get it right the first time.', keywords: ['polyester', 'poly', 'crepe', 'satin', 'chiffon', 'microfibre', 'lining', 'georgette'] },
  { fibre: 'Nylon', examples: 'ripstop, swimwear, activewear, tulle', iron: '• low (110 °C)', steam: 'Little', cloth: 'Always', interfacing: 'Sew-in, or low-temperature fusible tested first', tip: 'Melts fast; tulle vanishes. Finger press and use the iron only where you must, with a cloth.', keywords: ['nylon', 'ripstop', 'swim', 'tulle', 'activewear', 'supplex'] },
  { fibre: 'Elastane blends', examples: 'cotton lycra, ponte, scuba, swim lycra, stretch denim', iron: '• low (110 °C) or the fibre it is blended with, carefully', steam: 'Yes, held just above', cloth: 'Yes', interfacing: 'Knit (tricot) fusible on low, or none', tip: 'Heat kills the stretch. Press, lift, move; never slide, never stretch. Hems with a twin needle need no pressing beyond a light steam.', keywords: ['elastane', 'spandex', 'lycra', 'ponte', 'scuba', 'stretch', 'swim', 'leggings'] },
  { fibre: 'Acrylic', examples: 'acrylic sweater knit, fleece blends', iron: '• low (110 °C)', steam: 'Held above the fabric', cloth: 'Always', interfacing: 'Knit fusible on low, or none', tip: 'Glazes and stretches when hot. Steam from above and pat flat with your hand.', keywords: ['acrylic', 'sweater', 'knit'] },
  { fibre: 'Acetate', examples: 'acetate lining, taffeta', iron: '• low (110 °C)', steam: 'None: water spots', cloth: 'Always', interfacing: 'Sew-in', tip: 'Press dry on the wrong side; it melts and water marks it.', keywords: ['acetate', 'taffeta', 'lining'] },
  { fibre: 'Fleece and minky', examples: 'polar fleece, minky, sherpa', iron: 'None, or • low with a cloth', steam: 'Held above', cloth: 'Always', interfacing: 'None', tip: 'The pile melts flat under an iron. Finger press seams and topstitch them instead.', keywords: ['fleece', 'minky', 'sherpa', 'plush'] },
  { fibre: 'Leather, vinyl and laminates', examples: 'leather, faux leather, vinyl, PUL, oilcloth', iron: 'None on vinyl and PUL; • low with a cloth and brown paper on leather', steam: 'None', cloth: 'Always', interfacing: 'None, or sew-in behind closures', tip: 'Finger press, then flatten seams with a mallet or a wallpaper roller; hold with leather glue or topstitching.', keywords: ['leather', 'vinyl', 'pul', 'oilcloth', 'laminated', 'pleather'] },
  { fibre: 'Cotton-polyester blends', examples: 'poly-cotton poplin, sheeting, shirting', iron: '•• medium (150 °C)', steam: 'Yes', cloth: 'On dark colours', interfacing: 'Weft-insertion or woven fusible', tip: 'Go by the polyester: medium heat, and the creases it takes are the creases it keeps.', keywords: ['polycotton', 'poly-cotton', 'blend', 'sheeting', 'shirting'] },
];

export function searchPressing(query: string): PressEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return PRESS_TABLE;
  const words = q.split(/\s+/);
  return PRESS_TABLE.filter((e) => {
    const hay = [e.fibre, e.examples, ...e.keywords].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
