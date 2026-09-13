/* Generates demo "customer photo" placeholders as PNGs (real image files,
   readable by Gemini vision). Flat, clearly-labelled product sketches. */
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const OUT = path.join(process.cwd(), "public", "demo");
fs.mkdirSync(OUT, { recursive: true });

const W = 640, H = 480;

function blank(bg) {
  const png = new PNG({ width: W, height: H });
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (W * y + x) * 4;
      png.data[i] = bg[0]; png.data[i + 1] = bg[1]; png.data[i + 2] = bg[2]; png.data[i + 3] = 255;
    }
  return png;
}

function rect(png, x0, y0, x1, y1, color) {
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++)
    for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
      const i = (W * y + x) * 4;
      png.data[i] = color[0]; png.data[i + 1] = color[1]; png.data[i + 2] = color[2];
    }
}

function circle(png, cx, cy, r, color) {
  for (let y = cy - r; y < cy + r; y++)
    for (let x = cx - r; x < cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
        const i = (W * y + x) * 4;
        png.data[i] = color[0]; png.data[i + 1] = color[1]; png.data[i + 2] = color[2];
      }
    }
}

function save(png, name) {
  fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
  console.log("wrote", name);
}

const SLATE = [241, 245, 249], CARD = [255, 255, 255], NAVY = [30, 41, 59],
      BLUE = [37, 99, 235], GREY = [148, 163, 184], STEEL = [100, 116, 139],
      AMBER = [217, 119, 6], RED = [220, 38, 38];

/* tap-1.jpg — basin mixer tap on a vanity (top-down-ish) */
{
  const p = blank(SLATE);
  rect(p, 120, 120, 520, 380, CARD);              // vanity top
  rect(p, 280, 140, 360, 360, CARD);              // tap body
  circle(p, 320, 260, 42, BLUE);                  // mixer spout joint
  rect(p, 300, 230, 340, 240, BLUE);              // spout
  circle(p, 250, 260, 18, STEEL);                 // handle L
  circle(p, 390, 260, 18, STEEL);                 // handle R
  circle(p, 320, 350, 8, BLUE);                   // drip
  rect(p, 312, 350, 328, 365, BLUE);
  save(p, "tap-1.jpg");
}

/* tap-2.jpg — under-sink cabinet, slightly damp base (visual hint) */
{
  const p = blank(SLATE);
  rect(p, 80, 90, 560, 420, CARD);                // cabinet body
  rect(p, 80, 90, 560, 160, NAVY);                // benchtop
  rect(p, 220, 200, 300, 400, GREY);              // door gap → dark interior
  rect(p, 240, 240, 280, 300, STEEL);             // pipes
  rect(p, 180, 330, 460, 350, AMBER);             // damp stain line
  circle(p, 300, 360, 30, AMBER);
  save(p, "tap-2.jpg");
}

/* toilet-1.jpg — close-coupled toilet, side view */
{
  const p = blank(SLATE);
  rect(p, 60, 120, 580, 400, CARD);               // floor
  rect(p, 180, 140, 340, 280, CARD);              // cistern
  rect(p, 160, 280, 360, 320, CARD);              // tank base
  rect(p, 260, 320, 380, 410, CARD);              // bowl
  rect(p, 380, 330, 480, 380, STEEL);             // pedestal
  rect(p, 100, 140, 160, 200, GREY);              // supply pipe
  save(p, "toilet-1.jpg");
}

/* toilet-2.jpg — toilet, front view with visible connections */
{
  const p = blank(SLATE);
  rect(p, 60, 100, 580, 400, CARD);               // floor
  rect(p, 220, 130, 420, 260, CARD);              // cistern front
  rect(p, 240, 260, 400, 340, CARD);              // pan
  rect(p, 200, 340, 440, 410, CARD);              // base
  rect(p, 120, 180, 200, 240, GREY);              // supply
  rect(p, 440, 190, 500, 260, GREY);              // waste
  save(p, "toilet-2.jpg");
}

/* toilet-3.jpg — connection close-up */
{
  const p = blank(SLATE);
  rect(p, 60, 60, 580, 440, CARD);
  rect(p, 200, 220, 420, 380, GREY);              // pan base
  rect(p, 160, 300, 240, 340, STEEL);             // supply valve
  circle(p, 200, 320, 22, BLUE);                  // isolation valve
  rect(p, 420, 240, 520, 300, STEEL);             // waste pipe
  save(p, "toilet-3.jpg");
}

/* hotwater-1.jpg — storage tank on external wall */
{
  const p = blank(SLATE);
  rect(p, 60, 100, 580, 440, CARD);               // wall
  rect(p, 240, 140, 400, 420, STEEL);             // tank body
  circle(p, 320, 260, 60, NAVY);                  // tank dome
  rect(p, 300, 380, 340, 430, GREY);              // base feet
  rect(p, 200, 200, 240, 240, AMBER);             // leak stain
  rect(p, 160, 300, 240, 330, BLUE);              // inlet pipe
  save(p, "hotwater-1.jpg");
}

console.log("done");