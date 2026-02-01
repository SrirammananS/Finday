package com.laksh.finance

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import kotlin.math.abs

object NotificationHelper {
    
    private const val CHANNEL_ID = "laksh_transactions"
    private const val CHANNEL_NAME = "Transaction Alerts"
    const val ACTION_APPROVE = "com.laksh.finance.ACTION_APPROVE"
    const val ACTION_DISMISS = "com.laksh.finance.ACTION_DISMISS"
    const val EXTRA_TRANSACTION_ID = "transaction_id"
    
    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = "Alerts for detected bank transactions"
            }
            
            val notificationManager = context.getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    fun showTransactionNotification(context: Context, transaction: ParsedTransaction) {
        createNotificationChannel(context)
        
        // Open app intent
        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("sms_data", transaction.rawText)
            putExtra("transaction_id", transaction.id)
        }
        
        val openPendingIntent = PendingIntent.getActivity(
            context,
            transaction.id.hashCode(),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Quick Approve action
        val approveIntent = Intent(context, NotificationActionReceiver::class.java).apply {
            action = ACTION_APPROVE
            putExtra(EXTRA_TRANSACTION_ID, transaction.id)
        }
        val approvePendingIntent = PendingIntent.getBroadcast(
            context,
            transaction.id.hashCode() + 1,
            approveIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Quick Dismiss action
        val dismissIntent = Intent(context, NotificationActionReceiver::class.java).apply {
            action = ACTION_DISMISS
            putExtra(EXTRA_TRANSACTION_ID, transaction.id)
        }
        val dismissPendingIntent = PendingIntent.getBroadcast(
            context,
            transaction.id.hashCode() + 2,
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val amountText = if (transaction.type == "expense") {
            "Spent ₹${String.format("%,.0f", abs(transaction.amount))}"
        } else {
            "Received ₹${String.format("%,.0f", transaction.amount)}"
        }
        
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(amountText)
            .setContentText("${transaction.description} • ${transaction.category}")
            .setStyle(NotificationCompat.BigTextStyle()
                .bigText("${transaction.description}\nCategory: ${transaction.category}\nTap to review or use quick actions below"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(openPendingIntent)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .addAction(android.R.drawable.ic_menu_send, "✓ Save", approvePendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "✗ Ignore", dismissPendingIntent)
            .build()
        
        try {
            NotificationManagerCompat.from(context).notify(
                transaction.id.hashCode(),
                notification
            )
        } catch (e: SecurityException) {
            // Notification permission not granted
        }
    }
    
    fun cancelNotification(context: Context, transactionId: String) {
        NotificationManagerCompat.from(context).cancel(transactionId.hashCode())
    }
}

class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val transactionId = intent.getStringExtra(NotificationHelper.EXTRA_TRANSACTION_ID) ?: return
        
        when (intent.action) {
            NotificationHelper.ACTION_APPROVE -> {
                // Mark as approved - will be synced when app opens
                TransactionStore.markApproved(context, transactionId)
                NotificationHelper.cancelNotification(context, transactionId)
            }
            NotificationHelper.ACTION_DISMISS -> {
                // Remove from pending
                TransactionStore.removePending(context, transactionId)
                NotificationHelper.cancelNotification(context, transactionId)
            }
        }
    }
}
