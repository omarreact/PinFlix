package com.pincodeit.pinflix.bridge

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.IBinder
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.InputStream
import java.io.InputStreamReader
import java.io.OutputStream
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.Locale
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class BridgeService : Service() {
    private var server: LocalBridgeServer? = null

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, buildNotification())
        server = LocalBridgeServer().also { it.start() }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (server == null) {
            server = LocalBridgeServer().also { it.start() }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        server?.stop()
        server = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(): Notification {
        val manager = getSystemService(NotificationManager::class.java)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "PinFlix Bridge",
                    NotificationManager.IMPORTANCE_LOW,
                ).apply {
                    description = "Keeps the local PinFlix media bridge available."
                },
            )
        }

        val openApp = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        return builder
            .setContentTitle("PinFlix Bridge is running")
            .setContentText("Local media bridge: 127.0.0.1:8787")
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentIntent(openApp)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "pinflix_bridge"
        private const val NOTIFICATION_ID = 8787
    }
}

private data class HttpRequest(
    val method: String,
    val target: String,
    val headers: Map<String, String>,
)

private class LocalBridgeServer {
    private val running = AtomicBoolean(false)
    private val acceptExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private val clientExecutor: ExecutorService = Executors.newCachedThreadPool()
    private var serverSocket: ServerSocket? = null

    fun start() {
        if (!running.compareAndSet(false, true)) return

        acceptExecutor.execute {
            try {
                val socket = ServerSocket(
                    PORT,
                    50,
                    InetAddress.getByName("127.0.0.1"),
                )
                serverSocket = socket

                while (running.get()) {
                    val client = socket.accept()
                    clientExecutor.execute {
                        client.use { handleClient(it) }
                    }
                }
            } catch (_: Throwable) {
                running.set(false)
            }
        }
    }

    fun stop() {
        running.set(false)
        try {
            serverSocket?.close()
        } catch (_: Throwable) {
        }
        serverSocket = null
        acceptExecutor.shutdownNow()
        clientExecutor.shutdownNow()
    }

    private fun handleClient(socket: Socket) {
        socket.soTimeout = 30_000
        val request = readRequest(socket.getInputStream()) ?: return
        val output = socket.getOutputStream()
        val origin = request.headers["origin"]

        if (origin != null && origin !in ALLOWED_ORIGINS) {
            sendText(output, 403, "Forbidden", "Origin is not allowed.", null)
            return
        }

        if (request.method == "OPTIONS") {
            sendPreflight(output, origin)
            return
        }

        if (request.method != "GET" && request.method != "HEAD") {
            sendText(output, 405, "Method Not Allowed", "Only GET, HEAD, and OPTIONS are supported.", origin)
            return
        }

        val uri = Uri.parse("http://127.0.0.1" + request.target)
        when (uri.path) {
            "/health" -> sendJson(
                output,
                200,
                """{"ok":true,"service":"pinflix-bridge","version":"1.0.0"}""",
                origin,
                request.method == "HEAD",
            )

            "/proxy" -> {
                val rawTarget = uri.getQueryParameter("url")
                if (rawTarget.isNullOrBlank()) {
                    sendText(output, 400, "Bad Request", "Missing url query parameter.", origin)
                    return
                }

                proxy(
                    output = output,
                    method = request.method,
                    source = rawTarget,
                    range = request.headers["range"],
                    origin = origin,
                )
            }

            else -> sendText(output, 404, "Not Found", "Unknown PinFlix Bridge route.", origin)
        }
    }

    private fun proxy(
        output: OutputStream,
        method: String,
        source: String,
        range: String?,
        origin: String?,
    ) {
        val sourceUrl = try {
            URL(source)
        } catch (_: Throwable) {
            sendText(output, 400, "Bad Request", "Invalid source URL.", origin)
            return
        }

        if (!isAllowedSource(sourceUrl)) {
            sendText(output, 403, "Forbidden", "Source host or port is not allowed.", origin)
            return
        }

        val connection = try {
            openAllowedConnection(sourceUrl, method, range)
        } catch (error: Throwable) {
            sendText(
                output,
                502,
                "Bad Gateway",
                "Upstream connection failed: " + error.javaClass.simpleName,
                origin,
            )
            return
        }

        try {
            val status = connection.responseCode
            val contentType = connection.contentType ?: guessContentType(connection.url.path)
            val isManifest =
                method == "GET" &&
                    (connection.url.path.lowercase(Locale.US).endsWith(".m3u8") ||
                        contentType.lowercase(Locale.US).contains("mpegurl"))

            val upstreamStream = if (status >= 400) {
                connection.errorStream
            } else {
                connection.inputStream
            }

            if (isManifest && upstreamStream != null && status in 200..299) {
                val text = upstreamStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
                val rewritten = rewriteManifest(text, connection.url)
                val bytes = rewritten.toByteArray(Charsets.UTF_8)

                val headers = baseCorsHeaders(origin).toMutableMap().apply {
                    put("Content-Type", "application/vnd.apple.mpegurl")
                    put("Content-Length", bytes.size.toString())
                    put("Cache-Control", "no-store")
                }

                writeStatusAndHeaders(output, status, reason(status), headers)
                if (method != "HEAD") output.write(bytes)
                output.flush()
                return
            }

            val headers = baseCorsHeaders(origin).toMutableMap()
            copyHeader(connection, headers, "Content-Type")
            copyHeader(connection, headers, "Content-Length")
            copyHeader(connection, headers, "Content-Range")
            copyHeader(connection, headers, "Accept-Ranges")
            copyHeader(connection, headers, "ETag")
            copyHeader(connection, headers, "Last-Modified")
            copyHeader(connection, headers, "Cache-Control")

            if (!headers.containsKey("Content-Type")) {
                headers["Content-Type"] = contentType
            }

            writeStatusAndHeaders(output, status, reason(status), headers)

            if (method != "HEAD" && upstreamStream != null) {
                upstreamStream.use { stream ->
                    stream.copyTo(output, DEFAULT_BUFFER_SIZE)
                }
            }
            output.flush()
        } catch (_: Throwable) {
            // The browser will surface a network error if the upstream ends unexpectedly.
        } finally {
            connection.disconnect()
        }
    }

    private fun openAllowedConnection(
        initialUrl: URL,
        method: String,
        range: String?,
    ): HttpURLConnection {
        var current = initialUrl

        repeat(MAX_REDIRECTS + 1) { redirectCount ->
            if (!isAllowedSource(current)) {
                throw IllegalArgumentException("Redirected source is not allowed")
            }

            val connection = (current.openConnection() as HttpURLConnection).apply {
                instanceFollowRedirects = false
                connectTimeout = 8_000
                readTimeout = 25_000
                requestMethod = method
                setRequestProperty("User-Agent", "PinFlixBridge/1.0 Android")
                setRequestProperty("Accept", "*/*")
                setRequestProperty("Accept-Encoding", "identity")
                if (!range.isNullOrBlank()) {
                    setRequestProperty("Range", range)
                }
            }

            val status = connection.responseCode
            if (status !in REDIRECT_CODES) {
                return connection
            }

            if (redirectCount >= MAX_REDIRECTS) {
                connection.disconnect()
                throw IllegalStateException("Too many redirects")
            }

            val location = connection.getHeaderField("Location")
                ?: run {
                    connection.disconnect()
                    throw IllegalStateException("Redirect without Location header")
                }

            val next = URL(current, location)
            connection.disconnect()
            current = next
        }

        throw IllegalStateException("Could not open upstream")
    }

    private fun rewriteManifest(manifest: String, baseUrl: URL): String {
        return manifest
            .lineSequence()
            .map { line ->
                val trimmed = line.trim()

                if (trimmed.isEmpty()) {
                    line
                } else if (!trimmed.startsWith("#")) {
                    bridgeUrl(URL(baseUrl, trimmed).toString())
                } else {
                    line.replace(URI_ATTRIBUTE) { match ->
                        val value = match.groupValues[1]
                        val resolved = URL(baseUrl, value).toString()
                        "URI=\"" + bridgeUrl(resolved) + "\""
                    }
                }
            }
            .joinToString("\n")
    }

    private fun bridgeUrl(source: String): String {
        val encoded = URLEncoder
            .encode(source, StandardCharsets.UTF_8.toString())
            .replace("+", "%20")

        return "http://127.0.0.1:" + PORT + "/proxy?url=" + encoded
    }

    private fun isAllowedSource(url: URL): Boolean {
        val protocol = url.protocol.lowercase(Locale.US)
        if (protocol != "http" && protocol != "https") return false
        if (!url.userInfo.isNullOrEmpty()) return false

        val host = url.host.lowercase(Locale.US)
        val port = if (url.port >= 0) {
            url.port
        } else if (protocol == "https") {
            443
        } else {
            80
        }

        return when (host) {
            "vod.cineplexbd.net" -> port == 80 || port == 443 || port == 8081
            "cineplexbd.net", "www.cineplexbd.net" -> port == 80 || port == 443
            else -> false
        }
    }

    private fun readRequest(input: InputStream): HttpRequest? {
        val reader = BufferedReader(InputStreamReader(input, StandardCharsets.ISO_8859_1))
        val requestLine = reader.readLine()?.trim().orEmpty()
        if (requestLine.isEmpty()) return null

        val pieces = requestLine.split(" ")
        if (pieces.size < 2) return null

        val headers = linkedMapOf<String, String>()
        while (true) {
            val line = reader.readLine() ?: break
            if (line.isEmpty()) break

            val split = line.indexOf(':')
            if (split <= 0) continue

            val name = line.substring(0, split).trim().lowercase(Locale.US)
            val value = line.substring(split + 1).trim()
            headers[name] = value
        }

        return HttpRequest(
            method = pieces[0].uppercase(Locale.US),
            target = pieces[1],
            headers = headers,
        )
    }

    private fun sendPreflight(output: OutputStream, origin: String?) {
        val headers = baseCorsHeaders(origin).toMutableMap().apply {
            put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
            put("Access-Control-Allow-Headers", "Range, Content-Type")
            put("Access-Control-Allow-Private-Network", "true")
            put("Access-Control-Max-Age", "600")
            put("Content-Length", "0")
        }

        writeStatusAndHeaders(output, 204, "No Content", headers)
        output.flush()
    }

    private fun sendJson(
        output: OutputStream,
        status: Int,
        body: String,
        origin: String?,
        headOnly: Boolean,
    ) {
        val bytes = body.toByteArray(Charsets.UTF_8)
        val headers = baseCorsHeaders(origin).toMutableMap().apply {
            put("Content-Type", "application/json; charset=utf-8")
            put("Content-Length", bytes.size.toString())
            put("Cache-Control", "no-store")
        }

        writeStatusAndHeaders(output, status, reason(status), headers)
        if (!headOnly) output.write(bytes)
        output.flush()
    }

    private fun sendText(
        output: OutputStream,
        status: Int,
        statusText: String,
        body: String,
        origin: String?,
    ) {
        val bytes = body.toByteArray(Charsets.UTF_8)
        val headers = baseCorsHeaders(origin).toMutableMap().apply {
            put("Content-Type", "text/plain; charset=utf-8")
            put("Content-Length", bytes.size.toString())
            put("Cache-Control", "no-store")
        }

        writeStatusAndHeaders(output, status, statusText, headers)
        output.write(bytes)
        output.flush()
    }

    private fun baseCorsHeaders(origin: String?): Map<String, String> {
        return linkedMapOf(
            "Access-Control-Allow-Origin" to (origin ?: "*"),
            "Access-Control-Expose-Headers" to
                "Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag, Last-Modified",
            "Access-Control-Allow-Private-Network" to "true",
            "Cross-Origin-Resource-Policy" to "cross-origin",
            "Vary" to "Origin",
            "Connection" to "close",
        )
    }

    private fun copyHeader(
        connection: HttpURLConnection,
        destination: MutableMap<String, String>,
        name: String,
    ) {
        connection.getHeaderField(name)?.let { destination[name] = it }
    }

    private fun writeStatusAndHeaders(
        output: OutputStream,
        status: Int,
        statusText: String,
        headers: Map<String, String>,
    ) {
        val writer = BufferedWriter(OutputStreamWriter(output, StandardCharsets.ISO_8859_1))
        writer.write("HTTP/1.1 " + status + " " + statusText + "\r\n")
        for ((name, value) in headers) {
            writer.write(name + ": " + value + "\r\n")
        }
        writer.write("\r\n")
        writer.flush()
    }

    private fun guessContentType(path: String): String {
        val lower = path.lowercase(Locale.US)
        return when {
            lower.endsWith(".m3u8") -> "application/vnd.apple.mpegurl"
            lower.endsWith(".ts") -> "video/mp2t"
            lower.endsWith(".m4s") -> "video/iso.segment"
            lower.endsWith(".mp4") -> "video/mp4"
            lower.endsWith(".aac") -> "audio/aac"
            lower.endsWith(".vtt") -> "text/vtt"
            else -> "application/octet-stream"
        }
    }

    private fun reason(status: Int): String {
        return when (status) {
            200 -> "OK"
            204 -> "No Content"
            206 -> "Partial Content"
            301 -> "Moved Permanently"
            302 -> "Found"
            303 -> "See Other"
            304 -> "Not Modified"
            307 -> "Temporary Redirect"
            308 -> "Permanent Redirect"
            400 -> "Bad Request"
            401 -> "Unauthorized"
            403 -> "Forbidden"
            404 -> "Not Found"
            405 -> "Method Not Allowed"
            416 -> "Range Not Satisfiable"
            429 -> "Too Many Requests"
            500 -> "Internal Server Error"
            502 -> "Bad Gateway"
            503 -> "Service Unavailable"
            else -> "Upstream"
        }
    }

    companion object {
        private const val PORT = 8787
        private const val MAX_REDIRECTS = 5

        private val ALLOWED_ORIGINS = setOf(
            "https://pinflix.pincodeit.com",
            "https://pinflix-staging.pincodeit.com",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        )

        private val REDIRECT_CODES = setOf(301, 302, 303, 307, 308)
        private val URI_ATTRIBUTE = Regex("""URI="([^"]+)"""")
    }
}
