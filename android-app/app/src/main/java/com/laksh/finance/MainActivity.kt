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
import android.util.Log
import android.view.View
import android.webkit.*
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
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
        
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS
        )
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupWebView()
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
            
            // Additional settings for better compatibility
            allowUniversalAccessFromFileURLs = true
            allowFileAccessFromFileURLs = true
            loadsImagesAutomatically = true
            blockNetworkImage = false
            blockNetworkLoads = false
            
            Log.d("LAKSH", "WebView settings configured")
        }
        
        webView.webViewClient = object : WebViewClient() {
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
                        val expiresIn = params?.get("expires_in")
                        
                        if (accessToken != null) {
                            Log.d("LAKSH", "Extracted access token from deep link. Injecting...")
                            val expiryMs = System.currentTimeMillis() + ((expiresIn?.toLongOrNull() ?: 3600L) * 1000)
                            
                            val script = """
                                try {
                            localStorage.setItem('google_access_token', '$accessToken');
                            localStorage.setItem('google_token_expiry', '$expiryMs');
                            
                            // Unify for Laksh services
                            localStorage.setItem('laksh_access_token', '$accessToken');
                            localStorage.setItem('laksh_gapi_token', '$accessToken');
                            localStorage.setItem('laksh_token_expiry', '$expiryMs');
                            localStorage.setItem('laksh_backup_token_expiry', '$expiryMs');

                            sessionStorage.setItem('google_access_token', '$accessToken');
                            sessionStorage.setItem('google_token_expiry', '$expiryMs');
                            console.log('[LAKSH-NATIVE] Token injected successfully across all keys');
                                    // Navigate to home and reload to force context refresh
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
            
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d("LAKSH", "Page finished loading: $url")
                // Inject any pending transactions from SMS
                injectPendingTransactions()
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
    
    private fun checkPermissions() {
        val permissionsToRequest = REQUIRED_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        
        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                permissionsToRequest.toTypedArray(),
                PERMISSION_REQUEST_CODE
            )
        }
        
        // Request notification permission for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) 
                != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    PERMISSION_REQUEST_CODE + 1
                )
            }
        }
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                Toast.makeText(this, "SMS auto-detection enabled!", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "SMS permission needed for auto-detection", Toast.LENGTH_LONG).show()
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
            networkInfo?.isConnected == true
        }
    }

    private fun handleIntent() {
        val uri = intent?.data
        Log.d("LAKSH", "Checking intent: uri=$uri")
        
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
                val expires = params["expires_in"] ?: "3600"
                
                if (token != null) {
                    val expiryMs = System.currentTimeMillis() + (expires.toLong() * 1000)
                    Log.d("LAKSH", "Injecting OAuth token from deep link: $token")
                    
                    val script = """
                        try {
                            console.log('[LAKSH-NATIVE] Injecting token from Deep Link...');
                            localStorage.setItem('google_access_token', '$token');
                            localStorage.setItem('google_token_expiry', '$expiryMs');
                            
                            // Unify for Laksh services
                            localStorage.setItem('laksh_access_token', '$token');
                            localStorage.setItem('laksh_gapi_token', '$token');
                            localStorage.setItem('laksh_token_expiry', '$expiryMs');
                            localStorage.setItem('laksh_backup_token_expiry', '$expiryMs');

                            sessionStorage.setItem('google_access_token', '$token');
                            sessionStorage.setItem('google_token_expiry', '$expiryMs');
                            
                            // FORCE CLEAR GUEST MODE
                            localStorage.removeItem('laksh_guest_mode');
                            localStorage.removeItem('guest_mode');
                            
                            // Set ever connected flag
                            localStorage.setItem('laksh_ever_connected', 'true');

                            console.log('[LAKSH-NATIVE] Token injected successfully');
                            
                            // Force a reload to pick up new state (go to root)
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
        } else {
            intent?.getStringExtra("sms_data")?.let { smsData ->
                // Will be injected after page loads
                TransactionStore.addPendingFromSms(this, smsData)
            }
        }
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent()
    }
    
    private fun injectPendingTransactions() {
        val pending = TransactionStore.getPendingTransactions(this)
        if (pending != "[]" && pending.isNotEmpty()) {
            val json = pending.replace("'", "\\'").replace("\n", "\\n")
            webView.evaluateJavascript(
                """
                (function() {
                    try {
                        const pending = JSON.parse('$json');
                        if (pending && pending.length > 0) {
                            // Get existing pending transactions from PWA storage
                            const stored = localStorage.getItem('laksh_pending_transactions');
                            const existing = stored ? JSON.parse(stored) : [];
                            const ids = new Set(existing.map(t => t.id));
                            
                            // Process approved transactions - add them as pending with autoSave flag
                            // The PWA will auto-process these when it loads
                            const approved = pending.filter(t => t.status === 'approved');
                            const review = pending.filter(t => t.status !== 'approved');
                            
                            // Add new transactions (both approved and review go to pending queue)
                            const allNew = pending.filter(t => !ids.has(t.id));
                            
                            if (allNew.length > 0) {
                                // Transactions with status='approved' will be auto-saved by PWA
                                // Transactions with status='pending' will be shown for review
                                localStorage.setItem('laksh_pending_transactions', JSON.stringify([...allNew, ...existing]));
                                console.log('[Android] Injected transactions:', allNew.length, 'approved:', approved.length, 'review:', review.length);
                                
                                // Dispatch event to trigger PWA update
                                window.dispatchEvent(new Event('laksh-transactions-updated'));
                            }
                        }
                    } catch(e) {
                        console.error('[Android] Failed to inject:', e);
                    }
                })();
                """.trimIndent()
            ) {
                // Clear native store after injection
                TransactionStore.clearPending(this)
            }
        }
    }
    
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
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
                        background: #050505;
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
                    h1 { color: #CCFF00; font-size: 24px; margin-bottom: 10px; }
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
                        background: #CCFF00;
                        color: black;
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
    fun openExternalBrowser(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(intent)
        } catch (e: Exception) {
            Log.e("LAKSH", "Failed to open external browser: ${e.message}")
        }
    }
}
