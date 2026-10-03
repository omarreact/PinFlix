# PinFlix Bridge — Termux test

This is the fastest way to validate the local-device bridge before installing the Android APK.

The bridge binds only to `127.0.0.1:8787` and only proxies the approved Cineplex hosts/ports.

## Run

```bash
pkg update
pkg install python git
git clone https://github.com/omarreact/PinFlix.git
cd PinFlix
python termux-bridge/pinflix_bridge.py
```

Then keep Termux running and open:

```text
https://pinflix.pincodeit.com/play
```

Press **Check Bridge**. It should show **Bridge connected**. Paste the Cineplex `.m3u8` URL and press **Load video**.

Playback stays inside the PinFlix web player; Termux is only the local network transport during this test.
