package com.laksh.finance;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000N\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0007\n\u0002\u0010 \n\u0000\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0010\b\n\u0002\b\n\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u0016\u0010\n\u001a\u00020\u000b2\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\u000e\u001a\u00020\u000fJ\u0016\u0010\u0010\u001a\u00020\u000b2\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\u0011\u001a\u00020\u0004J\u000e\u0010\u0012\u001a\u00020\u000b2\u0006\u0010\f\u001a\u00020\rJ\u000e\u0010\u0013\u001a\u00020\u000b2\u0006\u0010\f\u001a\u00020\rJ\u0016\u0010\u0014\u001a\u00020\u000b2\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\u0015\u001a\u00020\u0004J\u0014\u0010\u0016\u001a\b\u0012\u0004\u0012\u00020\u000f0\u00172\u0006\u0010\f\u001a\u00020\rJ\u001a\u0010\u0018\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u001a0\u00170\u00192\u0006\u0010\f\u001a\u00020\rJ\u0014\u0010\u001b\u001a\b\u0012\u0004\u0012\u00020\u001a0\u00172\u0006\u0010\f\u001a\u00020\rJ\u0018\u0010\u001c\u001a\u0004\u0018\u00010\u000f2\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\u0015\u001a\u00020\u0004J\u000e\u0010\u001d\u001a\u00020\u001e2\u0006\u0010\f\u001a\u00020\rJ\u0016\u0010\u001f\u001a\b\u0012\u0004\u0012\u00020\u000f0\u00172\u0006\u0010\f\u001a\u00020\rH\u0002J\u000e\u0010 \u001a\u00020\u00042\u0006\u0010\f\u001a\u00020\rJ\"\u0010!\u001a\u00020\u000b2\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\u0015\u001a\u00020\u00042\n\b\u0002\u0010\"\u001a\u0004\u0018\u00010\u0004J.\u0010#\u001a\u00020\u000b2\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\u000e\u001a\u00020\u000f2\n\b\u0002\u0010$\u001a\u0004\u0018\u00010\u00042\n\b\u0002\u0010%\u001a\u0004\u0018\u00010\u0004J\u0016\u0010&\u001a\u00020\u000b2\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\u0015\u001a\u00020\u0004J:\u0010\'\u001a\u00020\u000b2\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\u0015\u001a\u00020\u00042\n\b\u0002\u0010$\u001a\u0004\u0018\u00010\u00042\n\b\u0002\u0010%\u001a\u0004\u0018\u00010\u00042\n\b\u0002\u0010\"\u001a\u0004\u0018\u00010\u0004R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0006\u001a\u00020\u0007X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u000e\u0010\b\u001a\u00020\tX\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006("}, d2 = {"Lcom/laksh/finance/TransactionStore;", "", "()V", "KEY_PENDING", "", "PREFS_NAME", "gson", "Lcom/google/gson/Gson;", "scope", "Lkotlinx/coroutines/CoroutineScope;", "addPending", "", "context", "Landroid/content/Context;", "transaction", "Lcom/laksh/finance/ParsedTransaction;", "addPendingFromSms", "smsData", "clearApproved", "clearPending", "deleteLoggedTransaction", "id", "getApprovedTransactions", "", "getLoggedTransactionsFlow", "Lkotlinx/coroutines/flow/Flow;", "Lcom/laksh/finance/db/TransactionEntity;", "getLoggedTransactionsSync", "getPendingById", "getPendingCount", "", "getPendingList", "getPendingTransactions", "markApproved", "descriptionOverride", "persistToDatabase", "category", "bank", "removePending", "saveAndPersist", "app_debug"})
public final class TransactionStore {
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String PREFS_NAME = "laksh_prefs";
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String KEY_PENDING = "pending_transactions";
    @org.jetbrains.annotations.NotNull()
    private static final com.google.gson.Gson gson = null;
    @org.jetbrains.annotations.NotNull()
    private static final kotlinx.coroutines.CoroutineScope scope = null;
    @org.jetbrains.annotations.NotNull()
    public static final com.laksh.finance.TransactionStore INSTANCE = null;
    
    private TransactionStore() {
        super();
    }
    
    public final void addPending(@org.jetbrains.annotations.NotNull()
    android.content.Context context, @org.jetbrains.annotations.NotNull()
    com.laksh.finance.ParsedTransaction transaction) {
    }
    
    public final void addPendingFromSms(@org.jetbrains.annotations.NotNull()
    android.content.Context context, @org.jetbrains.annotations.NotNull()
    java.lang.String smsData) {
    }
    
    private final java.util.List<com.laksh.finance.ParsedTransaction> getPendingList(android.content.Context context) {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getPendingTransactions(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
        return null;
    }
    
    public final void clearPending(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
    }
    
    public final void removePending(@org.jetbrains.annotations.NotNull()
    android.content.Context context, @org.jetbrains.annotations.NotNull()
    java.lang.String id) {
    }
    
    public final void markApproved(@org.jetbrains.annotations.NotNull()
    android.content.Context context, @org.jetbrains.annotations.NotNull()
    java.lang.String id, @org.jetbrains.annotations.Nullable()
    java.lang.String descriptionOverride) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.util.List<com.laksh.finance.ParsedTransaction> getApprovedTransactions(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
        return null;
    }
    
    public final void clearApproved(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
    }
    
    public final int getPendingCount(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
        return 0;
    }
    
    @org.jetbrains.annotations.Nullable()
    public final com.laksh.finance.ParsedTransaction getPendingById(@org.jetbrains.annotations.NotNull()
    android.content.Context context, @org.jetbrains.annotations.NotNull()
    java.lang.String id) {
        return null;
    }
    
    /**
     * Persist transaction to Room database. Called when user saves from notification or in-app.
     */
    public final void persistToDatabase(@org.jetbrains.annotations.NotNull()
    android.content.Context context, @org.jetbrains.annotations.NotNull()
    com.laksh.finance.ParsedTransaction transaction, @org.jetbrains.annotations.Nullable()
    java.lang.String category, @org.jetbrains.annotations.Nullable()
    java.lang.String bank) {
    }
    
    /**
     * Get all logged transactions from Room as Flow
     */
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.Flow<java.util.List<com.laksh.finance.db.TransactionEntity>> getLoggedTransactionsFlow(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
        return null;
    }
    
    /**
     * Get all logged transactions synchronously
     */
    @org.jetbrains.annotations.NotNull()
    public final java.util.List<com.laksh.finance.db.TransactionEntity> getLoggedTransactionsSync(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
        return null;
    }
    
    /**
     * Save from notification (approve) - persist to Room and remove from pending
     */
    public final void saveAndPersist(@org.jetbrains.annotations.NotNull()
    android.content.Context context, @org.jetbrains.annotations.NotNull()
    java.lang.String id, @org.jetbrains.annotations.Nullable()
    java.lang.String category, @org.jetbrains.annotations.Nullable()
    java.lang.String bank, @org.jetbrains.annotations.Nullable()
    java.lang.String descriptionOverride) {
    }
    
    /**
     * Delete a logged transaction from Room
     */
    public final void deleteLoggedTransaction(@org.jetbrains.annotations.NotNull()
    android.content.Context context, @org.jetbrains.annotations.NotNull()
    java.lang.String id) {
    }
}