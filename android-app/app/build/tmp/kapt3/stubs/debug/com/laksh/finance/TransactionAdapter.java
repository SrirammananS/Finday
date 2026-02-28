package com.laksh.finance;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u00004\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\u0010\u0002\n\u0002\b\u0002\n\u0002\u0010 \n\u0000\n\u0002\u0010\b\n\u0002\b\u0005\n\u0002\u0018\u0002\n\u0002\b\u0005\u0018\u00002\f\u0012\b\u0012\u00060\u0002R\u00020\u00000\u0001:\u0001\u0015B\u0019\u0012\u0012\u0010\u0003\u001a\u000e\u0012\u0004\u0012\u00020\u0005\u0012\u0004\u0012\u00020\u00060\u0004\u00a2\u0006\u0002\u0010\u0007J\b\u0010\n\u001a\u00020\u000bH\u0016J\u001c\u0010\f\u001a\u00020\u00062\n\u0010\r\u001a\u00060\u0002R\u00020\u00002\u0006\u0010\u000e\u001a\u00020\u000bH\u0016J\u001c\u0010\u000f\u001a\u00060\u0002R\u00020\u00002\u0006\u0010\u0010\u001a\u00020\u00112\u0006\u0010\u0012\u001a\u00020\u000bH\u0016J\u0014\u0010\u0013\u001a\u00020\u00062\f\u0010\u0014\u001a\b\u0012\u0004\u0012\u00020\u00050\tR\u0014\u0010\b\u001a\b\u0012\u0004\u0012\u00020\u00050\tX\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u001a\u0010\u0003\u001a\u000e\u0012\u0004\u0012\u00020\u0005\u0012\u0004\u0012\u00020\u00060\u0004X\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0016"}, d2 = {"Lcom/laksh/finance/TransactionAdapter;", "Landroidx/recyclerview/widget/RecyclerView$Adapter;", "Lcom/laksh/finance/TransactionAdapter$VH;", "onDelete", "Lkotlin/Function1;", "Lcom/laksh/finance/db/TransactionEntity;", "", "(Lkotlin/jvm/functions/Function1;)V", "items", "", "getItemCount", "", "onBindViewHolder", "holder", "position", "onCreateViewHolder", "parent", "Landroid/view/ViewGroup;", "viewType", "submitList", "list", "VH", "app_debug"})
public final class TransactionAdapter extends androidx.recyclerview.widget.RecyclerView.Adapter<com.laksh.finance.TransactionAdapter.VH> {
    @org.jetbrains.annotations.NotNull()
    private final kotlin.jvm.functions.Function1<com.laksh.finance.db.TransactionEntity, kotlin.Unit> onDelete = null;
    @org.jetbrains.annotations.NotNull()
    private java.util.List<com.laksh.finance.db.TransactionEntity> items;
    
    public TransactionAdapter(@org.jetbrains.annotations.NotNull()
    kotlin.jvm.functions.Function1<? super com.laksh.finance.db.TransactionEntity, kotlin.Unit> onDelete) {
        super();
    }
    
    public final void submitList(@org.jetbrains.annotations.NotNull()
    java.util.List<com.laksh.finance.db.TransactionEntity> list) {
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.NotNull()
    public com.laksh.finance.TransactionAdapter.VH onCreateViewHolder(@org.jetbrains.annotations.NotNull()
    android.view.ViewGroup parent, int viewType) {
        return null;
    }
    
    @java.lang.Override()
    public void onBindViewHolder(@org.jetbrains.annotations.NotNull()
    com.laksh.finance.TransactionAdapter.VH holder, int position) {
    }
    
    @java.lang.Override()
    public int getItemCount() {
        return 0;
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u001e\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\b\u0086\u0004\u0018\u00002\u00020\u0001B\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\u000e\u0010\u0005\u001a\u00020\u00062\u0006\u0010\u0007\u001a\u00020\bR\u000e\u0010\u0002\u001a\u00020\u0003X\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006\t"}, d2 = {"Lcom/laksh/finance/TransactionAdapter$VH;", "Landroidx/recyclerview/widget/RecyclerView$ViewHolder;", "b", "Lcom/laksh/finance/databinding/ItemTransactionBinding;", "(Lcom/laksh/finance/TransactionAdapter;Lcom/laksh/finance/databinding/ItemTransactionBinding;)V", "bind", "", "entity", "Lcom/laksh/finance/db/TransactionEntity;", "app_debug"})
    public final class VH extends androidx.recyclerview.widget.RecyclerView.ViewHolder {
        @org.jetbrains.annotations.NotNull()
        private final com.laksh.finance.databinding.ItemTransactionBinding b = null;
        
        public VH(@org.jetbrains.annotations.NotNull()
        com.laksh.finance.databinding.ItemTransactionBinding b) {
            super(null);
        }
        
        public final void bind(@org.jetbrains.annotations.NotNull()
        com.laksh.finance.db.TransactionEntity entity) {
        }
    }
}