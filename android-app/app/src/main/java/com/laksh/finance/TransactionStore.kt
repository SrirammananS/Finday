package com.laksh.finance

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

object TransactionStore {
    
    private const val PREFS_NAME = "laksh_prefs"
    private const val KEY_PENDING = "pending_transactions"
    private val gson = Gson()
    
    fun addPending(context: Context, transaction: ParsedTransaction) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val existing = getPendingList(context).toMutableList()
        
        // Check for duplicates (same amount and date)
        val isDuplicate = existing.any { 
            Math.abs(it.amount) == Math.abs(transaction.amount) && 
            it.date == transaction.date 
        }
        
        if (!isDuplicate) {
            existing.add(0, transaction)
            prefs.edit().putString(KEY_PENDING, gson.toJson(existing)).apply()
        }
    }
    
    fun addPendingFromSms(context: Context, smsData: String) {
        val transaction = SmsParser.parse(smsData)
        if (transaction != null) {
            addPending(context, transaction)
        }
    }
    
    private fun getPendingList(context: Context): List<ParsedTransaction> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val json = prefs.getString(KEY_PENDING, "[]")
        val type = object : TypeToken<List<ParsedTransaction>>() {}.type
        return try {
            gson.fromJson(json, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }
    
    fun getPendingTransactions(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_PENDING, "[]") ?: "[]"
    }
    
    fun getPendingCount(context: Context): Int {
        return getPendingList(context).size
    }
    
    fun clearPending(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_PENDING, "[]").apply()
    }
    
    fun removePending(context: Context, id: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val existing = getPendingList(context).toMutableList()
        existing.removeAll { it.id == id }
        prefs.edit().putString(KEY_PENDING, gson.toJson(existing)).apply()
    }
    
    fun markApproved(context: Context, id: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val existing = getPendingList(context).toMutableList()
        val index = existing.indexOfFirst { it.id == id }
        if (index >= 0) {
            existing[index] = existing[index].copy(status = "approved")
            prefs.edit().putString(KEY_PENDING, gson.toJson(existing)).apply()
        }
    }
    
    fun getApprovedTransactions(context: Context): List<ParsedTransaction> {
        return getPendingList(context).filter { it.status == "approved" }
    }
    
    fun clearApproved(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val existing = getPendingList(context).filter { it.status != "approved" }
        prefs.edit().putString(KEY_PENDING, gson.toJson(existing)).apply()
    }
}
