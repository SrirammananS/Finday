package com.laksh.finance;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000.\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u000b\n\u0000\n\u0002\u0010\u000e\n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0003\u0018\u0000 \u000f2\u00020\u0001:\u0001\u000fB\u0005\u00a2\u0006\u0002\u0010\u0002J\u0010\u0010\u0003\u001a\u00020\u00042\u0006\u0010\u0005\u001a\u00020\u0006H\u0002J\u0010\u0010\u0007\u001a\u00020\u00042\u0006\u0010\u0005\u001a\u00020\u0006H\u0002J\u0018\u0010\b\u001a\u00020\t2\u0006\u0010\n\u001a\u00020\u000b2\u0006\u0010\f\u001a\u00020\rH\u0016J\u0018\u0010\u000e\u001a\u00020\t2\u0006\u0010\n\u001a\u00020\u000b2\u0006\u0010\f\u001a\u00020\rH\u0002\u00a8\u0006\u0010"}, d2 = {"Lcom/laksh/finance/SmsReceiver;", "Landroid/content/BroadcastReceiver;", "()V", "isTransactionSms", "", "body", "", "looksLikeAmount", "onReceive", "", "context", "Landroid/content/Context;", "intent", "Landroid/content/Intent;", "processSms", "Companion", "app_debug"})
public final class SmsReceiver extends android.content.BroadcastReceiver {
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String TAG = "LAKSH_SMS";
    private static long lastProcessedTime = 0L;
    private static final int THROTTLE_MS = 500;
    private static final java.util.concurrent.ExecutorService bg = null;
    @org.jetbrains.annotations.NotNull()
    public static final com.laksh.finance.SmsReceiver.Companion Companion = null;
    
    public SmsReceiver() {
        super();
    }
    
    @java.lang.Override()
    public void onReceive(@org.jetbrains.annotations.NotNull()
    android.content.Context context, @org.jetbrains.annotations.NotNull()
    android.content.Intent intent) {
    }
    
    private final void processSms(android.content.Context context, android.content.Intent intent) {
    }
    
    private final boolean isTransactionSms(java.lang.String body) {
        return false;
    }
    
    /**
     * Heuristic: body contains something that looks like currency amount (digits + rs/inr)
     */
    private final boolean looksLikeAmount(java.lang.String body) {
        return false;
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000&\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\b\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\t\n\u0000\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0006X\u0082T\u00a2\u0006\u0002\n\u0000R\u0016\u0010\u0007\u001a\n \t*\u0004\u0018\u00010\b0\bX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u000e\u0010\n\u001a\u00020\u000bX\u0082\u000e\u00a2\u0006\u0002\n\u0000\u00a8\u0006\f"}, d2 = {"Lcom/laksh/finance/SmsReceiver$Companion;", "", "()V", "TAG", "", "THROTTLE_MS", "", "bg", "Ljava/util/concurrent/ExecutorService;", "kotlin.jvm.PlatformType", "lastProcessedTime", "", "app_debug"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
    }
}