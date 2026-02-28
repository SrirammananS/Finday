package com.laksh.finance.db;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u0014\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\b\'\u0018\u0000 \u00052\u00020\u0001:\u0001\u0005B\u0005\u00a2\u0006\u0002\u0010\u0002J\b\u0010\u0003\u001a\u00020\u0004H&\u00a8\u0006\u0006"}, d2 = {"Lcom/laksh/finance/db/AppDatabase;", "Landroidx/room/RoomDatabase;", "()V", "transactionDao", "Lcom/laksh/finance/db/TransactionDao;", "Companion", "app_release"})
@androidx.room.Database(entities = {com.laksh.finance.db.TransactionEntity.class}, version = 1, exportSchema = false)
public abstract class AppDatabase extends androidx.room.RoomDatabase {
    @kotlin.jvm.Volatile()
    @org.jetbrains.annotations.Nullable()
    private static volatile com.laksh.finance.db.AppDatabase INSTANCE;
    @org.jetbrains.annotations.NotNull()
    public static final com.laksh.finance.db.AppDatabase.Companion Companion = null;
    
    public AppDatabase() {
        super();
    }
    
    @org.jetbrains.annotations.NotNull()
    public abstract com.laksh.finance.db.TransactionDao transactionDao();
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u001c\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u0010\u0010\u0005\u001a\u00020\u00042\u0006\u0010\u0006\u001a\u00020\u0007H\u0002J\u000e\u0010\b\u001a\u00020\u00042\u0006\u0010\u0006\u001a\u00020\u0007R\u0010\u0010\u0003\u001a\u0004\u0018\u00010\u0004X\u0082\u000e\u00a2\u0006\u0002\n\u0000\u00a8\u0006\t"}, d2 = {"Lcom/laksh/finance/db/AppDatabase$Companion;", "", "()V", "INSTANCE", "Lcom/laksh/finance/db/AppDatabase;", "buildDatabase", "context", "Landroid/content/Context;", "getInstance", "app_release"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
        
        @org.jetbrains.annotations.NotNull()
        public final com.laksh.finance.db.AppDatabase getInstance(@org.jetbrains.annotations.NotNull()
        android.content.Context context) {
            return null;
        }
        
        private final com.laksh.finance.db.AppDatabase buildDatabase(android.content.Context context) {
            return null;
        }
    }
}