package com.laksh.finance;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000P\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u0002\n\u0002\b\u0004\n\u0002\u0010\u000b\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\b\n\u0000\n\u0002\u0010\u0011\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\u0015\n\u0002\b\b\u0018\u0000 #2\u00020\u0001:\u0001#B\u0005\u00a2\u0006\u0002\u0010\u0002J\b\u0010\u0007\u001a\u00020\bH\u0002J\b\u0010\t\u001a\u00020\bH\u0002J\b\u0010\n\u001a\u00020\bH\u0002J\b\u0010\u000b\u001a\u00020\bH\u0002J\b\u0010\f\u001a\u00020\rH\u0002J\b\u0010\u000e\u001a\u00020\rH\u0002J\u0012\u0010\u000f\u001a\u00020\b2\b\u0010\u0010\u001a\u0004\u0018\u00010\u0011H\u0014J\u0012\u0010\u0012\u001a\u00020\b2\b\u0010\u0013\u001a\u0004\u0018\u00010\u0014H\u0014J-\u0010\u0015\u001a\u00020\b2\u0006\u0010\u0016\u001a\u00020\u00172\u000e\u0010\u0018\u001a\n\u0012\u0006\b\u0001\u0012\u00020\u001a0\u00192\u0006\u0010\u001b\u001a\u00020\u001cH\u0016\u00a2\u0006\u0002\u0010\u001dJ\b\u0010\u001e\u001a\u00020\bH\u0014J\b\u0010\u001f\u001a\u00020\bH\u0002J\b\u0010 \u001a\u00020\bH\u0003J\u0012\u0010!\u001a\u00020\b2\b\b\u0002\u0010\"\u001a\u00020\u001aH\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082.\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0006X\u0082.\u00a2\u0006\u0002\n\u0000\u00a8\u0006$"}, d2 = {"Lcom/laksh/finance/MainActivity;", "Landroidx/appcompat/app/AppCompatActivity;", "()V", "binding", "Lcom/laksh/finance/databinding/ActivityMainBinding;", "webView", "Landroid/webkit/WebView;", "checkPermissions", "", "handleIntent", "injectPendingTransactions", "injectThemePreference", "isEmulator", "", "isNetworkAvailable", "onCreate", "savedInstanceState", "Landroid/os/Bundle;", "onNewIntent", "intent", "Landroid/content/Intent;", "onRequestPermissionsResult", "requestCode", "", "permissions", "", "", "grantResults", "", "(I[Ljava/lang/String;[I)V", "onResume", "setupBackPress", "setupWebView", "showErrorPage", "errorMsg", "Companion", "app_release"})
public final class MainActivity extends androidx.appcompat.app.AppCompatActivity {
    private com.laksh.finance.databinding.ActivityMainBinding binding;
    private android.webkit.WebView webView;
    private static final int PERMISSION_REQUEST_CODE = 100;
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String WEB_URL = "https://finma-ea199.web.app";
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String[] REQUIRED_PERMISSIONS = {"android.permission.RECEIVE_SMS", "android.permission.READ_SMS"};
    @org.jetbrains.annotations.NotNull()
    public static final com.laksh.finance.MainActivity.Companion Companion = null;
    
    public MainActivity() {
        super();
    }
    
    private final boolean isEmulator() {
        return false;
    }
    
    @java.lang.Override()
    protected void onCreate(@org.jetbrains.annotations.Nullable()
    android.os.Bundle savedInstanceState) {
    }
    
    @android.annotation.SuppressLint(value = {"SetJavaScriptEnabled"})
    private final void setupWebView() {
    }
    
    private final void setupBackPress() {
    }
    
    private final void checkPermissions() {
    }
    
    @java.lang.Override()
    public void onRequestPermissionsResult(int requestCode, @org.jetbrains.annotations.NotNull()
    java.lang.String[] permissions, @org.jetbrains.annotations.NotNull()
    int[] grantResults) {
    }
    
    private final boolean isNetworkAvailable() {
        return false;
    }
    
    private final void handleIntent() {
    }
    
    @java.lang.Override()
    protected void onNewIntent(@org.jetbrains.annotations.Nullable()
    android.content.Intent intent) {
    }
    
    private final void injectThemePreference() {
    }
    
    private final void injectPendingTransactions() {
    }
    
    @java.lang.Override()
    protected void onResume() {
    }
    
    private final void showErrorPage(java.lang.String errorMsg) {
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u001e\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\b\n\u0000\n\u0002\u0010\u0011\n\u0002\u0010\u000e\n\u0002\b\u0003\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u0016\u0010\u0005\u001a\b\u0012\u0004\u0012\u00020\u00070\u0006X\u0082\u0004\u00a2\u0006\u0004\n\u0002\u0010\bR\u000e\u0010\t\u001a\u00020\u0007X\u0086T\u00a2\u0006\u0002\n\u0000\u00a8\u0006\n"}, d2 = {"Lcom/laksh/finance/MainActivity$Companion;", "", "()V", "PERMISSION_REQUEST_CODE", "", "REQUIRED_PERMISSIONS", "", "", "[Ljava/lang/String;", "WEB_URL", "app_release"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
    }
}