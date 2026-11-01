import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { BASEMAP_TILES } from "./basemap-tiles";

// basemap-tiles.ts and public/tiles/<version>/ are written together by
// livingatl-pipeline/scripts/build_basemap.py; commit both or neither.
describe("3D map tiles", () => {
  const dir = join(process.cwd(), "public", BASEMAP_TILES.path);

  it("exist for the version the map asks for, and only that version", () => {
    expect(existsSync(dir)).toBe(true);
    expect(readdirSync(join(process.cwd(), "public", "tiles"))).toEqual([BASEMAP_TILES.path.split("/").pop()]);
  });

  it("cover every zoom from min to max", () => {
    for (let z = BASEMAP_TILES.minzoom; z <= BASEMAP_TILES.maxzoom; z++) {
      expect(existsSync(join(dir, String(z)))).toBe(true);
    }
  });

  it("are gzipped (the map's tile protocol unzips them)", () => {
    const z = String(BASEMAP_TILES.minzoom);
    const x = readdirSync(join(dir, z))[0];
    const y = readdirSync(join(dir, z, x))[0];
    const head = readFileSync(join(dir, z, x, y)).subarray(0, 2);
    expect([head[0], head[1]]).toEqual([0x1f, 0x8b]);
  });
});
