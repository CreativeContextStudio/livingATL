import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MAPLIBRE_WORKER_URL } from "./maplibre-worker";

// The Map's 3D view loads MapLibre's worker from a copy under public/vendor
// (a bundled chunk can't resolve the package's own relative worker URL).
// After upgrading maplibre-gl, copy the new worker:
//   cp node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs public/vendor/maplibre-gl-worker-<version>.mjs
describe("MapLibre worker copy", () => {
  it("matches the installed maplibre-gl version", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "node_modules/maplibre-gl/package.json"), "utf8"));
    expect(MAPLIBRE_WORKER_URL).toBe(`/vendor/maplibre-gl-worker-${pkg.version}.mjs`);
    const copy = join(process.cwd(), "public", MAPLIBRE_WORKER_URL);
    expect(existsSync(copy)).toBe(true);
    const original = readFileSync(join(process.cwd(), "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs"));
    expect(readFileSync(copy).equals(original)).toBe(true);
  });
});
