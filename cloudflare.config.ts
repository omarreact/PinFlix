import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "pinflix",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-02",
    compatibilityFlags: ["nodejs_compat"],
    placement: { mode: "smart" },
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      CINEPLEX_CATALOG_RELAY_URL: bindings.text("https://pinflix-media-edge.farukkhanone.workers.dev/catalog"),
    },
  }),
});
