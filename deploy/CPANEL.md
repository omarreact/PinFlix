# PinFlix on BDIX cPanel hosting

The hosting account can run the whole application if it supports persistent Node.js processes (usually **Setup Node.js App**, powered by CloudLinux/Passenger), has enough build memory, allows server-side HTTP requests to the media origin, and permits streaming responses within its bandwidth and process limits. PHP-only hosting cannot execute Next.js server routes or Prisma.

A BDIX-connected account can also act as a media origin for a separate frontend, but that needs a real reachable Node backend and additional routing. A cPanel control-panel URL is not an application URL and does not connect the GitHub repository or Vercel project automatically.

## Check these cPanel features

- Setup Node.js App: Node 24, production application mode, application root and application URL.
- Terminal/SSH: dependency installation, builds, Prisma database setup and troubleshooting.
- Cron Jobs: periodic directory ingestion.
- SSL/TLS or AutoSSL: HTTPS for the application domain.
- Domains: map `pinflix.pincodeit.com` to the Node application.
- Resource Usage: CPU/RAM, concurrent process and I/O limits. Every proxied video uses hosting bandwidth and holds a request open.
- Git Version Control: optional source checkout; uploading the repository through File Manager also works.

Ask the host whether server-side connections to `http://cds3.cineplexbd.net/index.php` work and whether long-running video proxy responses are allowed. The development environment could not reach that origin.

## Node application setup

1. Create a Node 24 application in cPanel, in production mode, with startup file `server.cjs`. Point its application URL at the desired domain.
2. Upload/clone the repository into its application root. Keep `.env`, SQLite files and the repository outside any publicly served static directory.
3. Activate the environment shown by cPanel, then run:

   ```bash
   npm ci
   cp .env.example .env
   npm run db:setup
   npm run build
   ```

Set the environment variables in step 4 before database setup and the production build.

4. Set `PINFLIX_DEPLOY_TARGET=cpanel`, a unique random `AUTH_SECRET`, `NODE_ENV=production`, `NEXT_PUBLIC_APP_URL=https://pinflix.pincodeit.com`, and an absolute database URL such as `DATABASE_URL=file:/home/ACCOUNT/pinflix-data/pinflix.db`. Create that private writable directory before running database setup. Set `CATALOG_PROVIDER=demo` to read the persisted library, including imported titles; this does not require seeded demo content.
5. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` temporarily, run `npm run admin:setup`, then remove the bootstrap password. Do not run the destructive demo seed on the production library.
6. Run `npm run ingest` and inspect the summary. A failed scan does not mean the deployment is connected to BDIX.
7. Restart the application in cPanel, enable AutoSSL, and verify `/api/health`, a detail page, video playback, seeking and subtitles.
8. Add a Cron Job using the exact Node/npm path from cPanel's activated environment, for example:

   ```cron
   0 */6 * * * cd /home/ACCOUNT/pinflix && /path/from/cpanel/npm run ingest >> /home/ACCOUNT/pinflix-ingest.log 2>&1
   ```

This uses the full installed app with its custom Passenger entry point, not Docker or the generated standalone server. The cPanel environment may supply its own `PORT`; Passenger can intercept Node's `listen` call. If the host does not support this integration, use the host's documented Node startup mechanism or a VPS.

Do not change the production domain until the Node runtime, database, media connectivity and playback have been verified. Shared-hosting resource limits may make a BDIX VPS necessary for multiple concurrent streams.
