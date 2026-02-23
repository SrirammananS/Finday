package com.laksh.finance

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
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
        if (action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            Log.d(TAG, "Ignoring action: $action")
            return
        }

        val pendingResult = goAsync()
        bg.execute {
            try {
                processSms(context, intent)
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

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        for (sms in messages) {
            val sender = sms.displayOriginatingAddress ?: ""
            val body = sms.messageBody
            if (body.isNullOrBlank()) {
                Log.d(TAG, "SMS from $sender: empty body, skip")
                continue
            }

            Log.d(TAG, "SMS from: $sender, len=${body.length}")

            // Only try to parse if SMS looks transaction-related (reduces false positives)
            if (!isTransactionSms(body) && !looksLikeAmount(body)) continue

            val transaction = SmsParser.parse(body)
            if (transaction != null) {
                Log.d(TAG, "Transaction SMS detected: ${transaction.description} ${transaction.amount}")
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
            "neft", "imps", "rtgs", "transfer", "withdrawal", "atm"
        )
        return keywords.any { lowerBody.contains(it) }
    }

    /** Heuristic: body contains something that looks like currency amount (digits + rs/inr) */
    private fun looksLikeAmount(body: String): Boolean {
        val lower = body.lowercase()
        if (!lower.contains("rs") && !lower.contains("inr") && !body.contains("₹")) return false
        return body.any { it.isDigit() }
    }
}
