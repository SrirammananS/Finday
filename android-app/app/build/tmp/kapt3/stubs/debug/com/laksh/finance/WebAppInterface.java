package com.laksh.finance;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000.\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0000\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\b\n\u0002\b\u0002\n\u0002\u0010\u000b\n\u0002\b\u0007\u0018\u00002\u00020\u0001B\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\b\u0010\u0005\u001a\u00020\u0006H\u0007J\b\u0010\u0007\u001a\u00020\bH\u0007J\b\u0010\t\u001a\u00020\nH\u0007J\b\u0010\u000b\u001a\u00020\bH\u0007J\b\u0010\f\u001a\u00020\rH\u0007J\u0010\u0010\u000e\u001a\u00020\u00062\u0006\u0010\u000f\u001a\u00020\bH\u0007J\u0010\u0010\u0010\u001a\u00020\u00062\u0006\u0010\u0011\u001a\u00020\bH\u0007J\u0010\u0010\u0012\u001a\u00020\u00062\u0006\u0010\u0013\u001a\u00020\bH\u0007R\u000e\u0010\u0002\u001a\u00020\u0003X\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0014"}, d2 = {"Lcom/laksh/finance/WebAppInterface;", "", "activity", "Lcom/laksh/finance/MainActivity;", "(Lcom/laksh/finance/MainActivity;)V", "clearPendingTransactions", "", "getAppVersion", "", "getPendingCount", "", "getPendingTransactions", "isAndroidApp", "", "openExternalBrowser", "url", "removePendingTransaction", "id", "showToast", "message", "app_debug"})
public final class WebAppInterface {
    @org.jetbrains.annotations.NotNull()
    private final com.laksh.finance.MainActivity activity = null;
    
    public WebAppInterface(@org.jetbrains.annotations.NotNull()
    com.laksh.finance.MainActivity activity) {
        super();
    }
    
    @android.webkit.JavascriptInterface()
    public final void showToast(@org.jetbrains.annotations.NotNull()
    java.lang.String message) {
    }
    
    @android.webkit.JavascriptInterface()
    public final int getPendingCount() {
        return 0;
    }
    
    @android.webkit.JavascriptInterface()
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getPendingTransactions() {
        return null;
    }
    
    @android.webkit.JavascriptInterface()
    public final void clearPendingTransactions() {
    }
    
    @android.webkit.JavascriptInterface()
    public final void removePendingTransaction(@org.jetbrains.annotations.NotNull()
    java.lang.String id) {
    }
    
    @android.webkit.JavascriptInterface()
    public final boolean isAndroidApp() {
        return false;
    }
    
    @android.webkit.JavascriptInterface()
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getAppVersion() {
        return null;
    }
    
    @android.webkit.JavascriptInterface()
    public final void openExternalBrowser(@org.jetbrains.annotations.NotNull()
    java.lang.String url) {
    }
}