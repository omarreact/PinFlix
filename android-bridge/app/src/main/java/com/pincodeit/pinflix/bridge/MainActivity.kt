package com.pincodeit.pinflix.bridge

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var status: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(48, 72, 48, 48)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
            setBackgroundColor(Color.rgb(10, 12, 18))
        }

        val title = TextView(this).apply {
            text = "PinFlix Bridge"
            textSize = 28f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        }

        val description = TextView(this).apply {
            text = "Keeps approved Cineplex HTTP streams on this device network while playback stays inside pinflix.pincodeit.com."
            textSize = 16f
            setTextColor(Color.LTGRAY)
            gravity = Gravity.CENTER
            setPadding(0, 32, 0, 32)
        }

        status = TextView(this).apply {
            text = "Starting local bridge on 127.0.0.1:8787…"
            textSize = 16f
            setTextColor(Color.rgb(120, 220, 160))
            gravity = Gravity.CENTER
            setPadding(0, 16, 0, 32)
        }

        val start = Button(this).apply {
            text = "Start Bridge"
            setOnClickListener {
                startBridge()
                status.text = "Bridge requested. Return to PinFlix and press Check Bridge."
            }
        }

        val stop = Button(this).apply {
            text = "Stop Bridge"
            setOnClickListener {
                stopService(Intent(this@MainActivity, BridgeService::class.java))
                status.text = "Bridge stopped."
            }
        }

        layout.addView(title)
        layout.addView(description)
        layout.addView(status)
        layout.addView(start)
        layout.addView(stop)

        setContentView(layout)
        startBridge()
        status.text = "Bridge is running in the background. Return to PinFlix."
    }

    private fun startBridge() {
        val intent = Intent(this, BridgeService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }
}
