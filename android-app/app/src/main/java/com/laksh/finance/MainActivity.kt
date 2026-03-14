package com.laksh.finance

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.view.View
import android.webkit.*
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.laksh.finance.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    
    private fun isEmulator(): Boolean {
        return (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic")
                || Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.HARDWARE.contains("goldfish")
                || Build.HARDWARE.contains("ranchu")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for x86")
                || Build.MANUFACTURER.contains("Genymotion")
                || Build.PRODUCT.contains("sdk_google")
                || Build.PRODUCT.contains("google_sdk")
                || Build.PRODUCT.contains("sdk")
                || Build.PRODUCT.contains("sdk_x86")
                || Build.PRODUCT.contains("vbox86p")
                || Build.PRODUCT.contains("emulator")
                || Build.PRODUCT.contains("simulator"))
    }
    
    private lateinit var binding: ActivityMainBinding
    private lateinit var webView: WebView
    
    companion object {
        private const val PERMISSION_REQUEST_CODE = 100
        const val WEB_URL = "https://finma-ea199.web.app"
        
        private val REQUIRED_PERMISSIONS = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS,
                Manifest.permission.POST_NOTIFICATIONS
            )
        } else {
            arrayOf(
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS
            )
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setSupportActionBar(binding.toolbar)
        setupBackPress()
        setupWebView()
        // Create notification channel early so transaction alerts work when SMS arrives
        NotificationHelper.createNotificationChannel(this)
        checkPermissions()
        
        // Check if opened from SMS notification
        handleIntent()
    }
    
    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView = binding.webView
        
        // Enable WebView debugging
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
        
        Log.d("LAKSH", "Setting up WebView...")
        
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            @Suppress("DEPRECATION")
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = true
            allowContentAccess = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = true
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
            loadsImagesAutomatically = true
            blockNetworkImage = false
            blockNetworkLoads = false
            
            Log.d("LAKSH", "WebView settings configured")
        }
        
        // FIXED: Inject theme preference on page load
        webView.addOnAttachStateChangeListener(object : View.OnAttachStateChangeListener {
            override fun onViewAttachedToWindow(v: View) {
                injectThemePreference()
            }
            override fun onViewDetachedFromWindow(v: View) {}
        })

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d("LAKSH", "Page finished loading: $url")
                // Inject theme preference after page loads
                injectThemePreference()
                // Inject any pending transactions from SMS
                injectPendingTransactions()
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                Log.d("LAKSH", "Loading URL: $url")
                
                // Intercept Google OAuth URLs - must open in external browser
                if (url.contains("accounts.google.com") || 
                    url.contains("googleapis.com/oauth") ||
                    url.contains("myaccount.google.com")) {
                    Log.d("LAKSH", "Opening OAuth URL in external browser: $url")
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(intent)
                        return true // We handled it
                    } catch (e: Exception) {
                        Log.e("LAKSH", "Failed to open external browser: ${e.message}")
                    }
                }
                
                // Handle deep links back to our app
                if (url.startsWith("laksh://")) {
                    Log.d("LAKSH", "Deep link detected: $url")
                    
                    try {
                        val uri = Uri.parse(url)
                        // The fragment (part after #) contains the params due to how Google OAuth redirects
                        val fragment = uri.fragment
                        val params = fragment?.split("&")?.associate { 
                            val parts = it.split("=")
                            if (parts.size == 2) parts[0] to parts[1] else "" to ""
                        }
                        
                        val accessToken = params?.get("access_token")
                        val refreshTokenDL = params?.get("refresh_token")
                        val expiresInStr = params?.get("expires_in")

                        if (accessToken != null) {
                            Log.d("LAKSH", "Extracted access token from deep link. Injecting...")
                            val expiresInSec = expiresInStr?.toLongOrNull() ?: 3600L
                            val expiryMs = System.currentTimeMillis() + (expiresInSec * 1000)
                            val refreshJs = if (refreshTokenDL != null) {
                                "localStorage.setItem('google_refresh_token', '$refreshTokenDL');"
                            } else ""
                            
                            val script = """
                                try {
                                    localStorage.setItem('google_access_token', '$accessToken');
                                    localStorage.setItem('google_token_expiry', '$expiryMs');
                                    $refreshJs
                                    
                                    localStorage.setItem('laksh_access_token', '$accessToken');
                                    localStorage.setItem('laksh_gapi_token', '$accessToken');
                                    localStorage.setItem('laksh_token_expiry', '$expiryMs');
                                    localStorage.setItem('laksh_backup_token_expiry', '$expiryMs');

                                    sessionStorage.setItem('google_access_token', '$accessToken');
                                    sessionStorage.setItem('google_token_expiry', '$expiryMs');
                                    console.log('[LAKSH-NATIVE] Token injected successfully across all keys');
                                    window.location.href = '/'; 
                                    window.location.reload();
                                } catch(e) {
                                    console.error('[LAKSH-NATIVE] Injection failed', e);
                                }
                            """.trimIndent()
                            
                            view?.evaluateJavascript(script, null)
                        }
                    } catch (e: Exception) {
                        Log.e("LAKSH", "Error processing deep link: ${e.message}")
                    }
                    
                    return true
                }
                
                // Let WebView handle everything else
                return false
            }
            
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                Log.d("LAKSH", "Page started loading: $url")
            }
            
            
            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                Log.e("LAKSH", "WebView error: ${error?.description}, code: ${error?.errorCode}, URL: ${request?.url}")
                if (request?.isForMainFrame == true) {
                    Log.e("LAKSH", "Main frame error, showing error page")
                    showErrorPage("Load Failed: ${error?.description}")
                }
            }

            override fun onReceivedSslError(
                view: WebView?,
                handler: SslErrorHandler?,
                error: android.net.http.SslError?
            ) {
                Log.e("LAKSH", "SSL Error: ${error?.primaryError}")
                
                // Root cause is usually device time mismatch in emulators
                // For development/emulator, we allow proceeding
                if (isEmulator()) {
                    Log.d("LAKSH", "Emulator detected - bypassing SSL check")
                    handler?.proceed()
                } else {
                    Log.e("LAKSH", "SSL Error on real device - blocking for safety")
                    showErrorPage("Security Error (SSL): The connection is not private. \n\n" +
                        "This is usually caused by an incorrect date/time on your device. \n" +
                        "Please check Settings > System > Date & Time.")
                    handler?.cancel()
                }
            }
            
            override fun onReceivedHttpError(
                view: WebView?,
                request: WebResourceRequest?,
                errorResponse: WebResourceResponse?
            ) {
                super.onReceivedHttpError(view, request, errorResponse)
                Log.e("LAKSH", "HTTP error: ${errorResponse?.statusCode} for URL: ${request?.url}")
            }
        }
        
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                Log.d("LAKSH", "Loading progress: $newProgress%")
            }
            
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                val msg = "[WEB] ${consoleMessage?.message()} (at ${consoleMessage?.sourceId()}:${consoleMessage?.lineNumber()})"
                Log.d("LAKSH", msg)
                return true
            }
        }
        
        // Add JavaScript interface for communication
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")
        
        // Load URL regardless of network check to see actual WebView behavior
        Log.d("LAKSH", "Loading URL: $WEB_URL")
        
        // Add a timeout mechanism
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            Log.d("LAKSH", "Timeout check - if page didn't load, showing debug info")
        }, 10000)
        
        webView.loadUrl(WEB_URL)
        
        // Handle deep link if app was started via one (using unified handler)
        handleIntent()
    }
    
    private fun setupBackPress() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    override fun onOptionsItemSelected(item: android.view.MenuItem): Boolean {
        if (item.itemId == R.id.action_test_notification) {
            WebAppInterface(this).testTransactionNotification()
            return true
        }
        return super.onOptionsItemSelected(item)
    }

    private fun checkPermissions() {
        val permissionsToRequest = REQUIRED_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        
        if (permissionsToRequest.isNotEmpty()) {
            Log.d("LAKSH", "Requesting permissions: $permissionsToRequest")
            ActivityCompat.requestPermissions(
                this,
                permissionsToRequest.toTypedArray(),
                PERMISSION_REQUEST_CODE
            )
        }
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val allGranted = grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            if (allGranted) {
                Toast.makeText(this, "SMS & notifications enabled! You'll see transaction alerts.", Toast.LENGTH_SHORT).show()
            } else {
                val denied = permissions.filterIndexed { i, _ -> i < grantResults.size && grantResults[i] != PackageManager.PERMISSION_GRANTED }
                if (Manifest.permission.POST_NOTIFICATIONS in denied) {
                    Toast.makeText(this, "Enable notifications in Settings to get transaction alerts", Toast.LENGTH_LONG).show()
                }
                if (Manifest.permission.RECEIVE_SMS in denied || Manifest.permission.READ_SMS in denied) {
                    Toast.makeText(this, "SMS permission needed for auto-detection", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
    
    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        } else {
            @Suppress("DEPRECATION")
            val networkInfo = connectivityManager.activeNetworkInfo
            @Suppress("DEPRECATION")
            networkInfo?.isConnected == true
        }
    }

    private var pendingOpenSheet = false
    private var pendingEditMode = false
    private var pendingTransactionId: String? = null

    private fun handleIntent() {
        val uri = intent?.data
        Log.d("LAKSH", "Checking intent: uri=$uri")

        // Check for notification open flags
        val openPending = intent?.getBooleanExtra("open_pending", false) == true
        val editMode = intent?.getBooleanExtra("edit_mode", false) == true
        val txnId = intent?.getStringExtra("transaction_id")
        if (openPending) {
            pendingOpenSheet = true
            pendingEditMode = editMode
            pendingTransactionId = txnId
        }
        
        if (uri != null && uri.scheme == "laksh" && uri.host == "oauth-callback") {
            Log.d("LAKSH", "OAuth Deep Link detected: $uri")
            val fragment = uri.fragment
            if (fragment != null) {
                // Parse access_token and expires_in from fragment
                val params = fragment.split("&").associate { 
                    val parts = it.split("=")
                    if (parts.size == 2) parts[0] to parts[1] else "" to ""
                }
                
                val token = params["access_token"]
                val refreshToken = params["refresh_token"]
                val expiresInStr = params["expires_in"]
                
                if (token != null) {
                    val expiresInSec = expiresInStr?.toLongOrNull() ?: 3600L
                    val expiryMs = System.currentTimeMillis() + (expiresInSec * 1000)
                    val refreshJs = if (refreshToken != null) {
                        Log.d("LAKSH", "Injecting OAuth token + refresh_token from deep link")
                        "localStorage.setItem('google_refresh_token', '$refreshToken');"
                    } else {
                        Log.d("LAKSH", "Injecting OAuth token from deep link (no refresh_token)")
                        ""
                    }
                    
                    val script = """
                        try {
                            console.log('[LAKSH-NATIVE] Injecting token from Deep Link...');
                            localStorage.setItem('google_access_token', '$token');
                            localStorage.setItem('google_token_expiry', '$expiryMs');
                            $refreshJs
                            
                            localStorage.setItem('laksh_access_token', '$token');
                            localStorage.setItem('laksh_gapi_token', '$token');
                            localStorage.setItem('laksh_token_expiry', '$expiryMs');
                            localStorage.setItem('laksh_backup_token_expiry', '$expiryMs');

                            sessionStorage.setItem('google_access_token', '$token');
                            sessionStorage.setItem('google_token_expiry', '$expiryMs');
                            
                            localStorage.removeItem('laksh_guest_mode');
                            localStorage.removeItem('guest_mode');
                            localStorage.setItem('laksh_ever_connected', 'true');

                            console.log('[LAKSH-NATIVE] Token injected successfully');
                            window.location.href = '/'; 
                            
                        } catch(e) {
                            console.error('[LAKSH-NATIVE] Injection failed', e);
                            window.location.reload();
                        }
                    """.trimIndent()
                    
                    // Execute explicitly on the main thread's WebView
                    webView.post {
                        webView.evaluateJavascript(script, null)
                    }
                }
            }
        } else if (intent?.getBooleanExtra("open_pending", false) != true) {
            // Only add from sms_data when not opening from notification (transaction already in store)
            intent?.getStringExtra("sms_data")?.let { smsData ->
                TransactionStore.addPendingFromSms(this, smsData)
            }
        }
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent()
    }
    
    // FIXED: Inject theme preference to WebView
    private fun injectThemePreference() {
        val theme = getSharedPreferences("laksh_prefs", MODE_PRIVATE)
            .getString("theme", "dark") ?: "dark"
        
        val script = """
            (function() {
                try {
                    const theme = '$theme';
                    const root = document.documentElement;
                    root.classList.remove('light', 'dark');
                    root.classList.add(theme);
                    localStorage.setItem('laksh_theme', theme);
                    console.log('[LAKSH-NATIVE] Theme injected:', theme);
                } catch(e) {
                    console.error('[LAKSH-NATIVE] Theme injection failed:', e);
                }
            })();
        """.trimIndent()
        
        webView.post {
            webView.evaluateJavascript(script, null)
        }
    }

    private fun injectPendingTransactions() {
        val pending = TransactionStore.getPendingTransactions(this)
        val shouldOpenSheet = pendingOpenSheet
        val shouldEditMode = pendingEditMode
        val targetTxnId = (pendingTransactionId ?: "").replace("\\", "\\\\").replace("'", "\\'")

        pendingOpenSheet = false
        pendingEditMode = false
        pendingTransactionId = null

        if (pending != "[]" && pending.isNotEmpty()) {
            val json = pending.replace("'", "\\'").replace("\n", "\\n")
            webView.evaluateJavascript(
                """
                (function() {
                    try {
                        const pending = JSON.parse('$json');
                        if (pending && pending.length > 0) {
                            const stored = localStorage.getItem('laksh_pending_transactions');
                            const existing = stored ? JSON.parse(stored) : [];
                            const ids = new Set(existing.map(t => t.id));
                            const allNew = pending.filter(t => !ids.has(t.id));
                            if (allNew.length > 0) {
                                localStorage.setItem('laksh_pending_transactions', JSON.stringify([...allNew, ...existing]));
                                window.dispatchEvent(new Event('laksh-transactions-updated'));
                            }
                        }
                        if ($shouldOpenSheet) {
                            localStorage.setItem('laksh_open_pending_sheet', JSON.stringify({ editMode: $shouldEditMode, transactionId: '$targetTxnId' }));
                            if (location.pathname === '/welcome') {
                                location.href = '/';
                                return;
                            }
                            window.dispatchEvent(new CustomEvent('laksh-open-pending-sheet', {
                                detail: { editMode: $shouldEditMode, transactionId: '$targetTxnId' }
                            }));
                        }
                    } catch(e) {
                        console.error('[Android] Failed to inject:', e);
                    }
                })();
                """.trimIndent()
            ) {}
        } else if (shouldOpenSheet) {
            webView.evaluateJavascript(
                """
                (function() {
                    try {
                        localStorage.setItem('laksh_open_pending_sheet', JSON.stringify({ editMode: $shouldEditMode, transactionId: '$targetTxnId' }));
                        if (location.pathname === '/welcome') {
                            location.href = '/';
                            return;
                        }
                        window.dispatchEvent(new CustomEvent('laksh-open-pending-sheet', {
                            detail: { editMode: $shouldEditMode, transactionId: '$targetTxnId' }
                        }));
                    } catch(e) {
                        console.error('[Android] Open pending failed:', e);
                    }
                })();
                """.trimIndent()
            ) {}
        }
    }
    
    
    override fun onResume() {
        super.onResume()
        // Check for new pending transactions
        injectPendingTransactions()
    }
    
    
    private fun showErrorPage(errorMsg: String = "Connection test in progress...") {
        Log.d("LAKSH", "Showing error page: $errorMsg")
        webView.loadData(
            """
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body {
                        font-family: -apple-system, sans-serif;
                        background: #0f172a;
                        color: white;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        text-align: center;
                        padding: 20px;
                    }
                    h1 { color: #6366f1; font-size: 24px; margin-bottom: 10px; }
                    p { color: #94a3b8; margin: 16px 0; line-height: 1.5; }
                    .error-box {
                        background: rgba(255, 0, 0, 0.1);
                        border: 1px solid rgba(255, 0, 0, 0.2);
                        padding: 15px;
                        border-radius: 12px;
                        margin: 20px 0;
                        font-family: monospace;
                        font-size: 12px;
                        color: #ff6b6b;
                    }
                    button {
                        background: #6366f1;
                        color: white;
                        border: none;
                        padding: 16px 32px;
                        border-radius: 12px;
                        font-size: 14px;
                        margin: 10px;
                        cursor: pointer;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .status { color: #94a3b8; font-size: 11px; margin-top: 10px; opacity: 0.6; }
                </style>
            </head>
            <body>
                <h1>LAKSH Connection Error</h1>
                <div class="error-box">$errorMsg</div>
                <p>Ensure you have an active internet connection and that the device time is correct.</p>
                <div class="status">Target: ${WEB_URL}</div>
                <div class="status">Network: ${if (isNetworkAvailable()) "Connected" else "Offline"}</div>
                <button onclick="location.reload()">🔄 Retry Connection</button>
            </body>
            </html>
            """.trimIndent(),
            "text/html",
            "UTF-8"
        )
    }
}

class WebAppInterface(private val activity: MainActivity) {
    @JavascriptInterface
    fun showToast(message: String) {
        Toast.makeText(activity, message, Toast.LENGTH_SHORT).show()
    }
    
    @JavascriptInterface
    fun getPendingCount(): Int {
        return TransactionStore.getPendingCount(activity)
    }

    @JavascriptInterface
    fun getPendingTransactions(): String {
        return TransactionStore.getPendingTransactions(activity)
    }
    
    @JavascriptInterface
    fun clearPendingTransactions() {
        TransactionStore.clearPending(activity)
    }
    
    @JavascriptInterface
    fun removePendingTransaction(id: String) {
        TransactionStore.removePending(activity, id)
    }
    
    @JavascriptInterface
    fun isAndroidApp(): Boolean {
        return true
    }
    
    @JavascriptInterface
    fun getAppVersion(): String {
        return try {
            activity.packageManager.getPackageInfo(activity.packageName, 0).versionName ?: "1.0.0"
        } catch (e: Exception) {
            "1.0.0"
        }
    }
    
    @JavascriptInterface
    fun vibrate(pattern: String) {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val mgr = activity.getSystemService(android.content.Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                mgr.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                activity.getSystemService(android.content.Context.VIBRATOR_SERVICE) as Vibrator
            }
            val durations = pattern.split(",").mapNotNull { it.trim().toLongOrNull() }
            if (durations.isEmpty()) return
            if (durations.size == 1) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(durations[0], VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(durations[0])
                }
            } else {
                val timings = LongArray(durations.size) { durations[it] }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(timings, -1))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(timings, -1)
                }
            }
        } catch (e: Exception) {
            Log.w("LAKSH", "Vibrate failed: ${e.message}")
        }
    }

    @JavascriptInterface
    fun openExternalBrowser(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(intent)
        } catch (e: Exception) {
            Log.e("LAKSH", "Failed to open external browser: ${e.message}")
        }
    }

    /**
     * Test transaction notification - shows Add, Edit, inline comment, Cancel without building.
     * Call from Settings or console: AndroidBridge.testTransactionNotification()
     */
    @JavascriptInterface
    fun testTransactionNotification() {
        val sampleSms = "Rs 500 debited from A/c XX1234 on 28-Feb to Swiggy. Avl Bal Rs 15000. UPI ref 123456."
        val transaction = SmsParser.parse(sampleSms)
        if (transaction != null) {
            TransactionStore.addPending(activity, transaction)
            NotificationHelper.showTransactionNotification(activity, transaction)
            Toast.makeText(activity, "Test notification shown", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(activity, "Parse failed - using fallback", Toast.LENGTH_SHORT).show()
            val dateStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
            val fallback = ParsedTransaction(
                amount = -500.0,
                type = "expense",
                description = "Swiggy",
                category = "Food & Dining",
                date = dateStr,
                rawText = sampleSms
            )
            TransactionStore.addPending(activity, fallback)
            NotificationHelper.showTransactionNotification(activity, fallback)
        }
    }
}
