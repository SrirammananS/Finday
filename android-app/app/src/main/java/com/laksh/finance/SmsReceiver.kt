package com.laksh.finance

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Telephony
import android.util.Log
import androidx.core.content.ContextCompat
import android.Manifest
import java.util.concurrent.Executors

class SmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "LAKSH_SMS"
        private var lastProcessedTime: Long = 0
        private const val THROTTLE_MS = 500
        private val bg = Executors.newSingleThreadExecutor()
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "onReceive: action=$action")

        if (action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            Log.d(TAG, "Ignoring action: $action")
            return
        }

        // Verify we have SMS permission (system only delivers if granted, but double-check for edge cases)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "RECEIVE_SMS permission not granted - cannot process SMS")
                return
            }
        }

        val pendingResult = goAsync()
        bg.execute {
            try {
                processSms(context, intent)
            } catch (e: Exception) {
                Log.e(TAG, "Error processing SMS", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun processSms(context: Context, intent: Intent) {
        val now = System.currentTimeMillis()
        if (now - lastProcessedTime < THROTTLE_MS) {
            Log.w(TAG, "SMS burst detected, throttling...")
            return
        }
        lastProcessedTime = now

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages == null || messages.isEmpty()) {
            Log.w(TAG, "No SMS messages in intent")
            return
        }

        Log.d(TAG, "Processing ${messages.size} SMS message(s)")
        for (sms in messages) {
            val sender = sms.displayOriginatingAddress ?: ""
            val body = sms.messageBody ?: ""
            if (body.isBlank()) {
                Log.d(TAG, "SMS from $sender: empty body, skip")
                continue
            }

            Log.d(TAG, "SMS from: $sender, len=${body.length}, preview: ${body.take(60)}...")

            // Only try to parse if SMS looks transaction-related (reduces false positives)
            if (!isTransactionSms(body) && !looksLikeAmount(body)) {
                Log.d(TAG, "SMS does not look transaction-related, skip")
                continue
            }

            val transaction = SmsParser.parse(body)
            if (transaction != null) {
                Log.d(TAG, "Transaction SMS detected: ${transaction.description} ₹${transaction.amount}")
                TransactionStore.addPending(context, transaction)
                NotificationHelper.showTransactionNotification(context, transaction)
            } else if (isTransactionSms(body)) {
                Log.w(TAG, "SMS looked like transaction but parse failed: ${body.take(80)}...")
            }
        }
    }

    private fun isTransactionSms(body: String): Boolean {
        val lowerBody = body.lowercase()
        val keywords = listOf(
            "debited", "credited", "spent", "received", "sent",
            "withdrawn", "deposited", "transferred", "deducted",
            "payment", "transaction", "txn", "upi", "gpay", "phonepe", "paytm",
            "a/c", "ac ", "account", "rs.", "rs ", "inr", "₹", "rupees",
            "purchase", "payment", "paid", "refund", "cashback",
            "neft", "imps", "rtgs", "transfer", "withdrawal", "atm",
            // Additional Indian bank patterns
            "avail bal", "avl bal", "available balance", "balance",
            "hdfc", "icici", "sbi", "axis", "kotak", "yes bank",
            "debit", "credit", "dr.", "cr.", "withdrawn from",
            "credited to", "debited from", "purchase of", "payment of",
            "vpa", "merchant", "info:", "ref no", "ref:", "upi ref"
        )
        return keywords.any { lowerBody.contains(it) }
    }

    /** Heuristic: body contains something that looks like currency amount (digits + rs/inr) */
    private fun looksLikeAmount(body: String): Boolean {
        val lower = body.lowercase()
        if (!lower.contains("rs") && !lower.contains("inr") && !body.contains("₹")) return false
        // Must have digits (amount)
        if (!body.any { it.isDigit() }) return false
        // Avoid OTP, verification codes
        if (lower.contains("otp") || lower.contains("verification") || lower.contains("one time")) return false
        return true
    }
}
