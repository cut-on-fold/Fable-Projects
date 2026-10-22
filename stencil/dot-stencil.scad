// A stencil for painting the orange dots that Lantern's Auto looks for, one
// at each crossing of the mat's lines.
//
// A flat plate with a round hole in the middle, the size of a dot, and a
// V-notch in the middle of each edge: set the plate on a crossing so the
// line runs into the notch on both sides, each way, and the hole is centred
// on the crossing. A shallow groove on top runs from each notch towards
// the hole, to sight along. A tab on one corner lifts it off without
// dragging it through the wet paint. Colour the hole in with a paint marker
// or dab paint through it with a sponge, lift straight up, move on.
//
// Prints flat, hole up, without supports. PETG wipes clean; PLA does too.
// 0.2 mm layers, four walls.
//
// Render with OpenSCAD:
//   openscad -o dot-stencil.stl -D 'part="stencil"' dot-stencil.scad

/* [Dot] */
dot = 8;            // the hole, which is the dot's diameter, mm

/* [Plate] */
plate = 40;         // the plate is this square, mm
thick = 1.6;        // thick enough to stay flat, thin enough to paint through
notch = 2.4;        // width of the V-notch at each edge's middle, mm
notch_depth = 2.5;  // how far the notch cuts in from the edge
groove = 0.6;       // width of the sighting groove on top, mm (0 for none)
groove_depth = 0.4; // its depth

/* [Tab] */
tab = 8;            // the lifting tab on one corner, mm each way (0 for none)
tab_height = 4;     // how far it stands up above the plate

/* [Render] */
part = "stencil"; // [stencil]

$fn = 96;

module stencil() {
  difference() {
    union() {
      cube([plate, plate, thick]);
      if (tab > 0) translate([plate - tab, plate - tab, 0]) cube([tab, tab, thick + tab_height]);
    }
    // the hole
    translate([plate / 2, plate / 2, -1]) cylinder(d = dot, h = thick + 2);
    // a V-notch in the middle of each edge
    for (a = [0, 90, 180, 270]) {
      translate([plate / 2, plate / 2, 0]) rotate([0, 0, a]) translate([plate / 2, 0, -1])
        linear_extrude(thick + tab_height + 2)
          polygon([[0.01, -notch / 2], [0.01, notch / 2], [-notch_depth, 0]]);
    }
    // a sighting groove from each notch towards the hole, stopping well short of it
    if (groove > 0) {
      for (a = [0, 90, 180, 270]) {
        translate([plate / 2, plate / 2, thick - groove_depth]) rotate([0, 0, a])
          translate([dot / 2 + 4, -groove / 2, 0]) cube([plate / 2 - notch_depth - dot / 2 - 3, groove, groove_depth + 1]); // runs on into the notch
      }
    }
  }
}

if (part == "stencil") stencil();
