package com.laksh.finance

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

class SmsReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "LAKSH_SMS"
        private var lastProcessedTime: Long = 0
        private const val THROTTLE_MS = 500 // Min 500ms between processing logic
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        val now = System.currentTimeMillis()
        if (now - lastProcessedTime < THROTTLE_MS) {
            Log.w(TAG, "SMS burst detected, throttling...")
            return
        }
        lastProcessedTime = now

        if (intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            
            for (sms in messages) {
                val sender = sms.displayOriginatingAddress
                val body = sms.messageBody
                
                Log.d(TAG, "SMS received from: $sender")
                
                // Check if it's a bank SMS (transaction related)
                if (isTransactionSms(body)) {
                    Log.d(TAG, "Transaction SMS detected!")
                    
                    // Parse the SMS
                    val transaction = SmsParser.parse(body)
                    
                    if (transaction != null) {
                        // Store pending transaction
                        TransactionStore.addPending(context, transaction)
                        
                        // Show notification
                        NotificationHelper.showTransactionNotification(
                            context,
                            transaction
                        )
                    }
                }
            }
        }
    }
    
    private fun isTransactionSms(body: String): Boolean {
        val lowerBody = body.lowercase()
        val keywords = listOf(
            "debited", "credited", "spent", "received", "sent",
            "withdrawn", "deposited", "transferred",
            "payment", "transaction", "txn", "upi",
            "a/c", "account", "rs.", "rs ", "inr", "₹"
        )
        return keywords.any { lowerBody.contains(it) }
    }
}
