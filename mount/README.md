# Phone pocket

A printed pocket for the ceiling, so a phone can be the camera over the
cutting table for [Lantern](../lantern/)'s camera window. The phone drops
in from the open end, screen towards the ceiling, camera end first, and lies
loose on the floor of the pocket with its camera looking down through the
window. Nothing grips it: a lip at the open end stops it sliding out, and it
comes out by pushing it up through the window and drawing it back.

![the pocket and the plate](preview.png)

Two parts, four screws:

| Part | What it is | Printed |
|---|---|---|
| `plate.stl` | Screws to the ceiling. A C-channel along each side with an end stop. | Flat, channels up |
| `pocket.stl` | The tray. A bead along the top of each wall slides into the plate's channels. | Floor down, open top up |

Neither needs supports. Use **PETG** if it will sit near the projector's
warm air; PLA sags at about 55 °C. The STLs are for a phone of
**76 × 152 × 10 mm in its case** with 2 mm of clearance all round; for a
different phone, change the three numbers at the top of `phone-pocket.scad`
and export again (OpenSCAD, free):

```sh
openscad -o pocket.stl -D 'part="pocket"' phone-pocket.scad
openscad -o plate.stl  -D 'part="plate"'  phone-pocket.scad
```

`part="fitted"` shows the plate on the pocket and `part="cut"` a slice
through the slide, for checking a change. If the slide is tight on your
printer, raise `slide_gap`.

## Putting it up

1. Screw the plate to the ceiling with the end stop towards the wall and the
   channels running the way you will slide the pocket on. The phone's camera
   needs to see the whole table: for a 53 × 35 in table that is about a
   metre above it with the phone's main lens, half that with the wide one.
   It does not need to be directly above or square to the table; Lantern's
   Find corners takes care of the angle.
2. Slide the pocket onto the plate until it meets the stop. It is held by
   the beads in the channels; nothing else.
3. Drop the phone in, camera end first, screen up. It lies on the floor of
   the pocket with the camera over the window. Lock the phone: Continuity
   Camera starts when the Mac picks it, as long as it is locked, landscape,
   still and nearby.

For the default phone the plate is 94 × 164 mm and the pocket hangs 22 mm
below the ceiling. The window is 60 mm long from the closed end and spans
the floor but for a 3 mm rail each side, which clears any phone's camera
island.
