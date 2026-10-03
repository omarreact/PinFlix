import { connect } from "cloudflare:sockets";

const CATALOG_HOST = "cineplexbd.net";
const ORIGIN_IPS = {
  "cineplexbd.net": "103.136.200.66",
  "www.cineplexbd.net": "103.136.200.66",
  "vod.cineplexbd.net": "103.136.200.124",
};

const CATALOG_TIMEOUT_MS = 5000;
const MEDIA_TIMEOUT_MS = 20000;
const CATALOG_FRESH_TTL_SECONDS = 120;
const CATALOG_STALE_TTL_SECONDS = 86_400;

// NOTE: full file restored via local - truncated in this attempt if needed
export default { async fetch() { return new Response('deploy incomplete'); } };
