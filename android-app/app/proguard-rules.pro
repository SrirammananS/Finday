# Keep Gson classes
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-keep class com.laksh.finance.** { *; }

# Keep WebView JavaScript interface
-keepclassmembers class com.laksh.finance.WebAppInterface {
    public *;
}

# Keep data classes
-keep class com.laksh.finance.ParsedTransaction { *; }
