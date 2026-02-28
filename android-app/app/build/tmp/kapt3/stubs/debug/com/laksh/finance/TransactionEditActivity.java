package com.laksh.finance;

/**
 * Activity for categorizing transactions with category and bank selection.
 * Launched from notification "Categorize" action.
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000,\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0003\u0018\u00002\u00020\u0001B\u0005\u00a2\u0006\u0002\u0010\u0002J\u0012\u0010\t\u001a\u00020\n2\b\u0010\u000b\u001a\u0004\u0018\u00010\fH\u0014J\b\u0010\r\u001a\u00020\nH\u0002J\b\u0010\u000e\u001a\u00020\nH\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082.\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0006X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0010\u0010\u0007\u001a\u0004\u0018\u00010\bX\u0082\u000e\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u000f"}, d2 = {"Lcom/laksh/finance/TransactionEditActivity;", "Landroidx/appcompat/app/AppCompatActivity;", "()V", "binding", "Lcom/laksh/finance/databinding/ActivityTransactionEditBinding;", "gson", "Lcom/google/gson/Gson;", "transaction", "Lcom/laksh/finance/ParsedTransaction;", "onCreate", "", "savedInstanceState", "Landroid/os/Bundle;", "saveAndFinish", "setupUI", "app_debug"})
public final class TransactionEditActivity extends androidx.appcompat.app.AppCompatActivity {
    private com.laksh.finance.databinding.ActivityTransactionEditBinding binding;
    @org.jetbrains.annotations.Nullable()
    private com.laksh.finance.ParsedTransaction transaction;
    @org.jetbrains.annotations.NotNull()
    private final com.google.gson.Gson gson = null;
    
    public TransactionEditActivity() {
        super();
    }
    
    @java.lang.Override()
    protected void onCreate(@org.jetbrains.annotations.Nullable()
    android.os.Bundle savedInstanceState) {
    }
    
    private final void setupUI() {
    }
    
    private final void saveAndFinish() {
    }
}