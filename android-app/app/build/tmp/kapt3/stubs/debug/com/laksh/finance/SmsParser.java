package com.laksh.finance;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u00000\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0010 \n\u0002\u0010\u000e\n\u0002\b\u0005\n\u0002\u0010$\n\u0002\b\u0004\n\u0002\u0018\u0002\n\u0002\b\u0002\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u0010\u0010\u0013\u001a\u0004\u0018\u00010\u00142\u0006\u0010\u0015\u001a\u00020\tR\u0016\u0010\u0003\u001a\n \u0005*\u0004\u0018\u00010\u00040\u0004X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0016\u0010\u0006\u001a\n \u0005*\u0004\u0018\u00010\u00040\u0004X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0017\u0010\u0007\u001a\b\u0012\u0004\u0012\u00020\t0\b\u00a2\u0006\b\n\u0000\u001a\u0004\b\n\u0010\u000bR\u0017\u0010\f\u001a\b\u0012\u0004\u0012\u00020\t0\b\u00a2\u0006\b\n\u0000\u001a\u0004\b\r\u0010\u000bR \u0010\u000e\u001a\u0014\u0012\u0004\u0012\u00020\t\u0012\n\u0012\b\u0012\u0004\u0012\u00020\t0\b0\u000fX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u001c\u0010\u0010\u001a\u0010\u0012\f\u0012\n \u0005*\u0004\u0018\u00010\u00040\u00040\bX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u001c\u0010\u0011\u001a\u0010\u0012\f\u0012\n \u0005*\u0004\u0018\u00010\u00040\u00040\bX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u001c\u0010\u0012\u001a\u0010\u0012\f\u0012\n \u0005*\u0004\u0018\u00010\u00040\u00040\bX\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0016"}, d2 = {"Lcom/laksh/finance/SmsParser;", "", "()V", "ACCOUNT_PATTERN", "Ljava/util/regex/Pattern;", "kotlin.jvm.PlatformType", "BALANCE_PATTERN", "BANKS", "", "", "getBANKS", "()Ljava/util/List;", "CATEGORIES", "getCATEGORIES", "CATEGORY_KEYWORDS", "", "CREDIT_PATTERNS", "DEBIT_PATTERNS", "MERCHANT_PATTERNS", "parse", "Lcom/laksh/finance/ParsedTransaction;", "smsText", "app_debug"})
public final class SmsParser {
    
    /**
     * Categories for dropdown selection (category + bank)
     */
    @org.jetbrains.annotations.NotNull()
    private static final java.util.List<java.lang.String> CATEGORIES = null;
    @org.jetbrains.annotations.NotNull()
    private static final java.util.List<java.lang.String> BANKS = null;
    @org.jetbrains.annotations.NotNull()
    private static final java.util.List<java.util.regex.Pattern> DEBIT_PATTERNS = null;
    @org.jetbrains.annotations.NotNull()
    private static final java.util.List<java.util.regex.Pattern> CREDIT_PATTERNS = null;
    @org.jetbrains.annotations.NotNull()
    private static final java.util.List<java.util.regex.Pattern> MERCHANT_PATTERNS = null;
    private static final java.util.regex.Pattern BALANCE_PATTERN = null;
    private static final java.util.regex.Pattern ACCOUNT_PATTERN = null;
    @org.jetbrains.annotations.NotNull()
    private static final java.util.Map<java.lang.String, java.util.List<java.lang.String>> CATEGORY_KEYWORDS = null;
    @org.jetbrains.annotations.NotNull()
    public static final com.laksh.finance.SmsParser INSTANCE = null;
    
    private SmsParser() {
        super();
    }
    
    /**
     * Categories for dropdown selection (category + bank)
     */
    @org.jetbrains.annotations.NotNull()
    public final java.util.List<java.lang.String> getCATEGORIES() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.util.List<java.lang.String> getBANKS() {
        return null;
    }
    
    @org.jetbrains.annotations.Nullable()
    public final com.laksh.finance.ParsedTransaction parse(@org.jetbrains.annotations.NotNull()
    java.lang.String smsText) {
        return null;
    }
}