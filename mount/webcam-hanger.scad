// A hanger for a webcam on the same ceiling plate as the phone pocket, for
// Lantern's camera over the cutting table.
//
// Two printed parts, two screws and the camera's own tripod bolt:
//   slider  a deck with a beaded rail along each side; slides into the
//           plate's channels in place of the pocket (plate.stl from
//           phone-pocket.scad, unchanged).
//   hanger  a slab that screws to the deck's underside and hangs down one
//           side of the camera; the camera's tripod thread bolts to it, lens
//           down, and a ridge along its foot and at each end keep the camera
//           square and stop it swinging on the bolt. A slot through the slab
//           above the camera's back lets the cable pass through it rather
//           than round its end.
// The camera's cable socket is on its back, so with the lens looking down
// the plug points up at the ceiling: the hanger drops the camera far enough
// for the plug and the cable's turn into the slot. If a right-angle plug is
// used later, shorten `plug_room`.
//
// Drawn for a Logitech Brio 4K: a 103 × 28 × 28 mm bar, lens on the front,
// USB-C socket on the back, 1/4 in thread in the middle of one long side.
// For another camera, change the numbers at the top.
//
// Both parts print without supports: the slider deck down with its rails
// up, the hanger flat on its outer face. PETG, 0.2 mm layers, 4 walls.
//
// Render with OpenSCAD:
//   openscad -o webcam-slider.stl -D 'part="slider"' webcam-hanger.scad
//   openscad -o webcam-hanger.stl -D 'part="hanger"' webcam-hanger.scad

// ---------- the camera
cam_l = 103;        // length, along the slide (the picture is wide this way)
cam_h = 28;         // height, lens face to back (the socket's face)
cam_w = 28;         // width, thread face to the other side
thread_from_end = 51.5;   // the tripod thread's distance from one end of the camera
thread_from_lens = 14;    // ... and from the lens face
plug_room = 52;     // how far the plug and its strain relief stand out of the back
cable_bend = 30;    // room above the plug for the cable to turn and pass through the hanger's slot
bolt_d = 6.6;       // clearance for a 1/4 in bolt
cheek_t = 8;        // the hanger's thickness; the camera bolt must have more thread than this

// ---------- the hanger
ridge = 4;          // how far the ridges stand proud of the cheek, under the camera's edge and at its ends
ridge_t = 3;        // the ridges' thickness
end_gap = 0.5;      // clearance between the camera and each end ridge
hanger_l = cam_l + 2 * end_gap + 2 * ridge_t;
screw_pilot = 3.4;  // for a 4 mm screw cut into the hanger's top edge
screw_depth = 12;
screws = [18, hanger_l - 18];   // along the length, clear of the cable slot in the middle
slot_w = 12;        // the cable slot through the hanger, above the camera's back: the cable passes through
slot_h = 20;        // it rather than round the hanger's end
slot_top = 15;      // below the deck, clear of the screws' pilot holes

// ---------- the slider: the same slide as the pocket, so it fits the same plate
wall = 2.4;         // the rail's thickness, matching the pocket's wall
bead = 1.3;         // the bead stands proud this much each side
bead_h = 4;
slide_gap = 0.5;
post = 3;           // the plate's channel lip thickness; the rail's plain part passes through it
outer_w = 76 + 2 * 2 + 2 * wall;   // the pocket's outer width: phone 76 + clearance 2 each side + walls
deck_t = 4;
slider_l = hanger_l + 10;
rail_h = post + slide_gap + bead_h;  // above the deck
cheek_from_edge = 6;    // the hanger's outer face sits this far in from the deck's edge, clear of the rail
screw_d = 4.5;      // clearance for a 4 mm screw through the deck
screw_head = 9;     // countersink

part = "both";      // "slider", "hanger", "both" (side by side), "fitted" (as hung, with the camera)

// ---------- derived
drop = plug_room + cable_bend;         // the camera's back below the deck
cheek_h = drop + cam_h + ridge_t;      // the hanger's height below the deck
bolt_y = drop + cam_h - thread_from_lens;   // the bolt's centre below the deck
screw_x = cheek_from_edge + cheek_t / 2;

$fn = 48;

module bead_profile(len) {
  // a rail the length `len`: a plain wall with a bead at the top, chamfered below so it prints deck down
  hull() {
    translate([-bead, 0, bead]) cube([wall + 2 * bead, len, bead_h - bead]);
    cube([wall, len, bead_h]);
  }
}

module slider() {
  difference() {
    union() {
      cube([outer_w, slider_l, deck_t]);
      for (x = [0, outer_w - wall]) {
        translate([x, 0, deck_t]) cube([wall, slider_l, rail_h - bead_h]);
        translate([x, 0, deck_t + rail_h - bead_h]) bead_profile(slider_l);
      }
    }
    // countersunk screws down into the hanger's top edge
    for (y = screws) translate([screw_x, y + (slider_l - hanger_l) / 2, 0]) {
      translate([0, 0, -1]) cylinder(d = screw_d, h = deck_t + 2);
      translate([0, 0, deck_t - (screw_head - screw_d) / 2]) cylinder(d1 = screw_d, d2 = screw_head, h = (screw_head - screw_d) / 2 + 0.01);
    }
  }
}

// The hanger as it hangs: x across the camera (0 at the outer face), y along the slide, z down from the deck.
module hanger() {
  difference() {
    union() {
      cube([cheek_t, hanger_l, cheek_h]);
      // the ridge under the camera's lower edge, and one at each end
      translate([cheek_t, 0, cheek_h - ridge_t]) cube([ridge, hanger_l, ridge_t]);
      for (y = [0, hanger_l - ridge_t]) translate([cheek_t, y, drop]) cube([ridge, ridge_t, cam_h + ridge_t]);
    }
    // the camera bolt
    translate([-1, ridge_t + end_gap + thread_from_end, bolt_y]) rotate([0, 90, 0]) cylinder(d = bolt_d, h = cheek_t + 2);
    // the cable slot, a rounded slot through the slab above the plug
    hull() for (z = [slot_top + slot_w / 2, slot_top + slot_h - slot_w / 2])
      translate([-1, ridge_t + end_gap + cam_l / 2, z]) rotate([0, 90, 0]) cylinder(d = slot_w, h = cheek_t + 2);
    // pilot holes for the screws from the deck
    for (y = screws) translate([cheek_t / 2, y, -1]) cylinder(d = screw_pilot, h = screw_depth + 1);
  }
}

// The hanger laid flat on its outer face, ridges up, for printing: its height runs along x.
module hanger_flat() {
  translate([cheek_h, 0, 0]) rotate([0, -90, 0]) hanger();
}

module camera() {
  // the camera as held: thread face on the cheek, lens down, back up, the plug rising from it
  color("dimgray") translate([cheek_t, ridge_t + end_gap, drop]) hull() {
    for (x = [8, cam_w - 8], z = [8, cam_h - 8]) translate([x, 0, z]) rotate([-90, 0, 0]) cylinder(r = 8, h = cam_l);
  }
  color("black") translate([cheek_t + cam_w / 2, ridge_t + end_gap + cam_l / 2, drop - plug_room]) cylinder(d = 11, h = plug_room);
}

module fitted() {
  // the deck above, the hanger below, as hung from the plate (z up on screen)
  mirror([0, 0, 1]) {
    translate([-cheek_from_edge, -(slider_l - hanger_l) / 2, 0]) mirror([0, 0, 1]) slider();
    hanger();
    camera();
  }
}

if (part == "slider") slider();
else if (part == "hanger") hanger_flat();
else if (part == "fitted") fitted();
else {
  slider();
  translate([outer_w + 20, 0, 0]) hanger_flat();
}
