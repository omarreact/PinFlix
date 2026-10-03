# PinFlix Bridge for Android

PinFlix Bridge is a small local companion service for HTTP-only Cineplex media.

It binds only to `127.0.0.1:8787`.

The PinFlix website remains the player UI. The Bridge only fetches approved Cineplex media over the Android device's own network and returns it to the browser on loopback.

## Supported upstreams

- `http://vod.cineplexbd.net:8081`
- `http(s)://vod.cineplexbd.net`
- `http(s)://cineplexbd.net`
- `http(s)://www.cineplexbd.net`

No arbitrary proxy hosts are accepted.

## Browser endpoints

- `GET /health`
- `GET /proxy?url=<encoded-url>`
- `HEAD /proxy?url=<encoded-url>`
- `OPTIONS` for CORS and local-network preflight

The service rewrites HLS segment, child-playlist, key, map, subtitle, and media URIs back through the loopback bridge. Byte Range requests are forwarded for media seeking.

## First run

1. Install the APK on Android.
2. Open PinFlix Bridge once.
3. Leave the foreground service running.
4. Open `https://pinflix.pincodeit.com/play`.
5. Paste a supported Cineplex HLS URL and press Load video.

Playback remains in the PinFlix web player. The Android app is not opened for each video.

Modern browsers may ask once for local-network access. That browser permission cannot be bypassed by the website.

## Build artifact

GitHub Actions builds `app-debug.apk` as the `pinflix-bridge-debug` artifact after bridge changes on `main`.
