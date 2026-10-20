// A ceiling pocket for a phone used as Lantern's camera over the cutting table.
//
// Two printed parts and four screws:
//   plate   screws to the ceiling, with a C-channel along each side.
//   pocket  a tray with a solid floor and a window for the camera; a bead
//           along the top of each wall slides into the plate's channels.
// The phone drops into the pocket from its open end, screen towards the
// ceiling, camera end first, and lies on the floor with its camera looking
// down through the window. Nothing clips or grips it: a lip at the open end
// stops it sliding out, and it comes out by pushing it up through the
// window and drawing it back. The fit is loose on purpose; measure the phone
// in its case and put the numbers below, in millimetres.
//
// Both parts print without supports: the pocket floor down, the plate flat
// with its channels up. Use PETG if it will sit near the projector's warm
// air; PLA sags around 55 °C.
//
// Render with OpenSCAD:
//   openscad -o pocket.stl -D 'part="pocket"' phone-pocket.scad
//   openscad -o plate.stl  -D 'part="plate"'  phone-pocket.scad

// ---------- the phone, in its case
phone_w = 76;   // width (the short side)
phone_l = 152;  // length
phone_t = 10;   // thickness, including the camera bump

// ---------- the pocket
clearance = 2;      // each side, so it drops in and out without a fight
headroom = 6;       // above the phone, so it can tilt in over the lip
wall = 2.4;
floor_t = 2.4;
lip = 4;            // height of the lip across the open end, above the floor
window_l = 60;      // the window's length from the closed end: covers any phone's camera island
window_rail = 3;    // floor left either side of the window; a phone camera is at least 5 mm from the edge

// ---------- the slide
bead = 1.3;         // how far the top bead of each wall stands proud, each side
bead_h = 4;
slide_gap = 0.5;    // clearance in the channel; raise it if the slide is tight on your printer
post = 3;           // channel wall thickness
plate_t = 3;
screw_d = 4.5;      // clearance for a 4 mm screw
screw_head = 9;     // countersink

part = "both";      // "pocket", "plate", "both" (side by side), "fitted" (the plate on the pocket) or "cut" (a slice through the slide)

// ---------- derived
inner_w = phone_w + 2 * clearance;
inner_l = phone_l + 2 * clearance;
inner_h = phone_t + headroom;
outer_w = inner_w + 2 * wall;
outer_l = inner_l + 2 * wall;
wall_h = floor_t + inner_h;          // the walls' full height, bead included
channel_in_w = wall + 2 * bead + 2 * slide_gap;   // inside the C, around the bead
channel_in_h = bead_h + slide_gap;
channel_mouth = wall + 2 * slide_gap;             // the C's opening, around the plain wall
channel_h = channel_in_h + post;                  // the C's total height, lips included
plate_w = outer_w + 2 * post + 2 * (bead + slide_gap);
plate_l = outer_l + post;            // one end stop

$fn = 48;

module pocket() {
  difference() {
    // the outer block
    cube([outer_w, outer_l, wall_h]);
    // the inside, open at the top and at the open end (y = 0) above the lip
    translate([wall, wall, floor_t]) cube([inner_w, inner_l, inner_h + 1]);
    translate([wall, -1, floor_t + lip]) cube([inner_w, wall + 2, inner_h + 1]);
    // the camera window, from the closed end
    translate([wall + window_rail, outer_l - wall - window_l, -1]) cube([inner_w - 2 * window_rail, window_l, floor_t + 2]);
  }
  // the bead along the top of each side wall, chamfered underneath so it prints floor down
  for (x = [0, outer_w - wall]) {
    translate([x, 0, wall_h - bead_h]) bead_profile();
  }
}

module bead_profile() {
  // a bead the length of the wall, standing proud by `bead` each side, with a 45° chamfer below
  hull() {
    translate([-bead, 0, bead]) cube([wall + 2 * bead, outer_l, bead_h - bead]);
    translate([0, 0, 0]) cube([wall, outer_l, bead_h]);
  }
}

module plate() {
  difference() {
    union() {
      cube([plate_w, plate_l, plate_t]);
      // a C-channel along each side, lips at the top, chamfered so it prints flat
      for (side = [0, 1]) translate([channel_x(side), 0, plate_t - 0.01]) channel();
      // the end stop
      translate([0, plate_l - post, 0]) cube([plate_w, post, plate_t + channel_h]);
    }
    // four countersunk screw holes down the middle, clear of the channels
    for (y = [18, plate_l - post - 18]) for (x = [plate_w / 2 - 18, plate_w / 2 + 18]) {
      translate([x, y, -1]) cylinder(d = screw_d, h = plate_t + 2);
      translate([x, y, -0.01]) cylinder(d1 = screw_head, d2 = screw_d, h = (screw_head - screw_d) / 2);
    }
  }
}

// the x of the centre of the channel on `side`, matching the pocket's wall centres
function channel_x(side) = (bead + slide_gap + post) + wall / 2 + side * (outer_w - wall);

module channel() {
  // centred on x = 0: two posts with inward lips, leaving a mouth for the wall and room for the bead
  w_out = channel_in_w + 2 * post;
  translate([-w_out / 2, 0, 0]) difference() {
    cube([w_out, plate_l, channel_h]);
    // the room for the bead
    translate([post, -1, 0]) cube([channel_in_w, plate_l + 2, channel_in_h]);
    // the mouth for the wall
    translate([post + (channel_in_w - channel_mouth) / 2, -1, 0]) cube([channel_mouth, plate_l + 2, channel_h + 1]);
    // chamfer the lips' underside so they print without support
    for (s = [0, 1]) {
      lx = s == 0 ? post : post + (channel_in_w + channel_mouth) / 2;
      translate([lx, -1, channel_in_h]) rotate([-90, 0, 0]) linear_extrude(plate_l + 2)
        polygon(s == 0 ? [[0, 0], [(channel_in_w - channel_mouth) / 2, 0], [0, -(channel_in_w - channel_mouth) / 2]]
                       : [[(channel_in_w - channel_mouth) / 2, 0], [0, 0], [(channel_in_w - channel_mouth) / 2, -(channel_in_w - channel_mouth) / 2]]);
    }
  }
}

// The plate turned over and lowered onto the pocket, as on the ceiling: the beads hang on the channel lips,
// the end stop sits just beyond the open end.
module fitted() {
  pocket();
  translate([-(bead + slide_gap + post), -post, wall_h - post - bead_h])
    translate([0, plate_l, 0]) rotate([180, 0, 0]) translate([0, 0, -plate_t - channel_h]) plate();
}

if (part == "pocket") pocket();
else if (part == "plate") plate();
else if (part == "fitted") fitted();
else if (part == "cut") projection(cut = true) rotate([90, 0, 0]) translate([0, -outer_l / 2, 0]) fitted();
else {
  pocket();
  translate([outer_w + 20, 0, 0]) plate();
}
