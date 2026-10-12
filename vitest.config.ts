import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests must not load the Cloudflare/vinext dev plugins: their type
// generation overwrites Next.js's .next/types/routes.d.ts during next build.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { environment: "node" },
});
