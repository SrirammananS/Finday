package com.laksh.finance

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.laksh.finance.db.AppDatabase
import com.laksh.finance.db.TransactionEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

object TransactionStore {

    private const val PREFS_NAME = "laksh_prefs"
    private const val KEY_PENDING = "pending_transactions"
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO)

    // --- Pending (SharedPreferences) - for notification flow ---

    fun addPending(context: Context, transaction: ParsedTransaction) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val existing = getPendingList(context).toMutableList()

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

    fun getPendingCount(context: Context): Int = getPendingList(context).size

    fun getPendingById(context: Context, id: String): ParsedTransaction? =
        getPendingList(context).find { it.id == id }

    // --- Logged (Room) - durable persistence ---

    /** Persist transaction to Room database. Called when user saves from notification or in-app. */
    fun persistToDatabase(context: Context, transaction: ParsedTransaction, category: String? = null, bank: String? = null) {
        scope.launch {
            val entity = TransactionEntity(
                id = transaction.id,
                amount = transaction.amount,
                type = transaction.type,
                description = transaction.description,
                category = category ?: transaction.category,
                bank = bank ?: transaction.bank ?: "Unknown",
                date = transaction.date,
                rawText = transaction.rawText,
                status = "logged"
            )
            AppDatabase.getInstance(context).transactionDao().insert(entity)
        }
    }

    /** Get all logged transactions from Room as Flow */
    fun getLoggedTransactionsFlow(context: Context): Flow<List<TransactionEntity>> =
        AppDatabase.getInstance(context).transactionDao().getAllTransactions()

    /** Get all logged transactions synchronously */
    fun getLoggedTransactionsSync(context: Context): List<TransactionEntity> = runBlocking {
        AppDatabase.getInstance(context).transactionDao().getAllTransactionsSync()
    }

    /** Save from notification (approve) - persist to Room and remove from pending */
    fun saveAndPersist(context: Context, id: String, category: String? = null, bank: String? = null, descriptionOverride: String? = null) {
        val pending = getPendingById(context, id) ?: return
        val txn = if (descriptionOverride?.isNotBlank() == true) {
            pending.copy(description = descriptionOverride.trim())
        } else {
            pending
        }
        persistToDatabase(context, txn, category, bank)
        removePending(context, id)
    }

    /** Delete a logged transaction from Room */
    fun deleteLoggedTransaction(context: Context, id: String) {
        scope.launch {
            AppDatabase.getInstance(context).transactionDao().deleteById(id)
        }
    }
}
