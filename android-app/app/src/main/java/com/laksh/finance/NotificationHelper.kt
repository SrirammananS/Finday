package com.laksh.finance

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.RemoteInput
import com.google.gson.Gson
import kotlin.math.abs

object NotificationHelper {

    private const val TAG = "LAKSH_NOTIF"
    private const val CHANNEL_ID = "laksh_transactions"
    private const val CHANNEL_NAME = "Transaction Alerts"
    const val ACTION_APPROVE = "com.laksh.finance.ACTION_APPROVE"
    const val ACTION_REPLY = "com.laksh.finance.ACTION_REPLY"
    const val ACTION_DISMISS = "com.laksh.finance.ACTION_DISMISS"
    const val ACTION_CATEGORIZE = "com.laksh.finance.ACTION_CATEGORIZE"
    const val EXTRA_TRANSACTION_ID = "transaction_id"
    const val KEY_REPLY_DESCRIPTION = "key_reply_description"
    const val EXTRA_TRANSACTION_JSON = "transaction_json"
    private val gson = Gson()

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = "Alerts for detected bank transactions"
                enableVibration(true)
                enableLights(true)
            }

            val notificationManager = context.getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun canShowNotifications(context: Context): Boolean {
        return NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    fun showTransactionNotification(context: Context, transaction: ParsedTransaction) {
        createNotificationChannel(context)

        if (!canShowNotifications(context)) {
            Log.w(TAG, "Notifications disabled - cannot show transaction alert. Enable in Settings.")
            return
        }

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

        // Quick Save action - saves with default category
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

        // Inline reply - user types description in notification
        // FLAG_MUTABLE required for RemoteInput on Android 12+ (system fills in reply)
        val replyRemoteInput = RemoteInput.Builder(KEY_REPLY_DESCRIPTION)
            .setLabel("Type description or note...")
            .build()
        val replyIntent = Intent(context, NotificationActionReceiver::class.java).apply {
            action = ACTION_REPLY
            putExtra(EXTRA_TRANSACTION_ID, transaction.id)
        }
        val replyPendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        }
        val replyAction = NotificationCompat.Action.Builder(
            android.R.drawable.ic_menu_edit,
            "Type & Save",
            PendingIntent.getBroadcast(
                context,
                transaction.id.hashCode() + 4,
                replyIntent,
                replyPendingFlags
            )
        ).addRemoteInput(replyRemoteInput).build()

        // Categorize action - opens TransactionEditActivity with category and bank dropdowns
        val categorizeIntent = Intent(context, TransactionEditActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_TRANSACTION_ID, transaction.id)
            putExtra(EXTRA_TRANSACTION_JSON, gson.toJson(transaction))
        }
        val categorizePendingIntent = PendingIntent.getActivity(
            context,
            transaction.id.hashCode() + 3,
            categorizeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Dismiss action
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

        // Use description as main line; add raw SMS snippet for context (max 120 chars)
        val smsPreview = transaction.rawText.take(120).let { if (it.length >= 120) "$it…" else it }
        val bigText = buildString {
            append(transaction.description)
            append("\n")
            append(transaction.category)
            if (transaction.rawText.isNotBlank()) {
                append("\n\n")
                append(smsPreview.replace("\n", " "))
            }
            append("\n\n• Add = quick save · Edit = category & bank · Ignore = dismiss")
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("$amountText – ${transaction.description}")
            .setContentText("${transaction.description} • ${transaction.category}")
            .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(openPendingIntent)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .addAction(android.R.drawable.ic_menu_send, "✓ Add", approvePendingIntent)
            .addAction(android.R.drawable.ic_menu_edit, "✏ Edit", categorizePendingIntent)
            .addAction(replyAction)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "✗ Ignore", dismissPendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(
                transaction.id.hashCode(),
                notification
            )
            Log.d(TAG, "Transaction notification shown: ${transaction.id}")
        } catch (e: SecurityException) {
            Log.e(TAG, "Cannot show notification - permission denied. Enable in Settings.", e)
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
                // Mark as approved and persist to Room, but KEEP in pending so app can inject
                // and add to Sheets. PWA will call removePendingTransaction after saving.
                val pending = TransactionStore.getPendingById(context, transactionId)
                if (pending != null) {
                    TransactionStore.markApproved(context, transactionId)
                    TransactionStore.persistToDatabase(context, pending)
                    // Launch app so injectPendingTransactions runs and PWA can add to Sheets
                    val openIntent = Intent(context, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    context.startActivity(openIntent)
                }
                NotificationHelper.cancelNotification(context, transactionId)
            }
            NotificationHelper.ACTION_REPLY -> {
                val reply = RemoteInput.getResultsFromIntent(intent)
                    ?.getCharSequence(NotificationHelper.KEY_REPLY_DESCRIPTION)
                    ?.toString()
                val pending = TransactionStore.getPendingById(context, transactionId)
                if (pending != null) {
                    val updated = if (reply?.isNotBlank() == true) pending.copy(description = reply.trim()) else pending
                    TransactionStore.markApproved(context, transactionId, descriptionOverride = reply)
                    TransactionStore.persistToDatabase(context, updated)
                    val openIntent = Intent(context, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    context.startActivity(openIntent)
                }
                NotificationHelper.cancelNotification(context, transactionId)
            }
            NotificationHelper.ACTION_DISMISS -> {
                TransactionStore.removePending(context, transactionId)
                NotificationHelper.cancelNotification(context, transactionId)
            }
        }
    }
}
