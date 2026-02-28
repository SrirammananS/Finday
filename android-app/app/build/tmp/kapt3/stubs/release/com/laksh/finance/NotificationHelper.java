package com.laksh.finance;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000.\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0002\b\t\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0004\n\u0002\u0018\u0002\n\u0000\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u0016\u0010\u000f\u001a\u00020\u00102\u0006\u0010\u0011\u001a\u00020\u00122\u0006\u0010\u0013\u001a\u00020\u0004J\u000e\u0010\u0014\u001a\u00020\u00102\u0006\u0010\u0011\u001a\u00020\u0012J\u0016\u0010\u0015\u001a\u00020\u00102\u0006\u0010\u0011\u001a\u00020\u00122\u0006\u0010\u0016\u001a\u00020\u0017R\u000e\u0010\u0003\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0006\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0007\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\b\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\t\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\n\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u000b\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\f\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\r\u001a\u00020\u000eX\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0018"}, d2 = {"Lcom/laksh/finance/NotificationHelper;", "", "()V", "ACTION_APPROVE", "", "ACTION_CATEGORIZE", "ACTION_DISMISS", "ACTION_REPLY", "CHANNEL_ID", "CHANNEL_NAME", "EXTRA_TRANSACTION_ID", "EXTRA_TRANSACTION_JSON", "KEY_REPLY_DESCRIPTION", "gson", "Lcom/google/gson/Gson;", "cancelNotification", "", "context", "Landroid/content/Context;", "transactionId", "createNotificationChannel", "showTransactionNotification", "transaction", "Lcom/laksh/finance/ParsedTransaction;", "app_release"})
public final class NotificationHelper {
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String CHANNEL_ID = "laksh_transactions";
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String CHANNEL_NAME = "Transaction Alerts";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String ACTION_APPROVE = "com.laksh.finance.ACTION_APPROVE";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String ACTION_REPLY = "com.laksh.finance.ACTION_REPLY";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String ACTION_DISMISS = "com.laksh.finance.ACTION_DISMISS";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String ACTION_CATEGORIZE = "com.laksh.finance.ACTION_CATEGORIZE";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String EXTRA_TRANSACTION_ID = "transaction_id";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String KEY_REPLY_DESCRIPTION = "key_reply_description";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String EXTRA_TRANSACTION_JSON = "transaction_json";
    @org.jetbrains.annotations.NotNull()
    private static final com.google.gson.Gson gson = null;
    @org.jetbrains.annotations.NotNull()
    public static final com.laksh.finance.NotificationHelper INSTANCE = null;
    
    private NotificationHelper() {
        super();
    }
    
    public final void createNotificationChannel(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
    }
    
    public final void showTransactionNotification(@org.jetbrains.annotations.NotNull()
    android.content.Context context, @org.jetbrains.annotations.NotNull()
    com.laksh.finance.ParsedTransaction transaction) {
    }
    
    public final void cancelNotification(@org.jetbrains.annotations.NotNull()
    android.content.Context context, @org.jetbrains.annotations.NotNull()
    java.lang.String transactionId) {
    }
}