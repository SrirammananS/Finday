package com.laksh.finance

import android.content.Intent
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.gson.Gson
import com.laksh.finance.databinding.ActivityTransactionEditBinding

/**
 * Activity for categorizing transactions with category and bank selection.
 * Launched from notification "Categorize" action.
 */
class TransactionEditActivity : AppCompatActivity() {

    private lateinit var binding: ActivityTransactionEditBinding
    private var transaction: ParsedTransaction? = null
    private val gson = Gson()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityTransactionEditBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val transactionJson = intent.getStringExtra(NotificationHelper.EXTRA_TRANSACTION_JSON)
        transaction = if (transactionJson != null) {
            try {
                gson.fromJson(transactionJson, ParsedTransaction::class.java)
            } catch (e: Exception) {
                null
            }
        } else null

        if (transaction == null) {
            Toast.makeText(this, "Transaction data not found", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        setupUI()
    }

    private fun setupUI() {
        val t = transaction!!
        val amountStr = if (t.type == "expense") {
            "-₹${String.format("%,.0f", kotlin.math.abs(t.amount))}"
        } else {
            "+₹${String.format("%,.0f", t.amount)}"
        }
        binding.amountText.text = amountStr
        binding.descriptionText.text = t.description

        // Category dropdown
        val categoryAdapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, SmsParser.CATEGORIES)
        (binding.categoryLayout.editText as? AutoCompleteTextView)?.apply {
            setAdapter(categoryAdapter)
            setText(t.category, false)
        }

        // Bank dropdown
        val bankAdapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, SmsParser.BANKS)
        (binding.bankLayout.editText as? AutoCompleteTextView)?.apply {
            setAdapter(bankAdapter)
            setText(t.bank ?: "Unknown", false)
        }

        binding.saveButton.setOnClickListener { saveAndFinish() }
        binding.cancelButton.setOnClickListener { finish() }
    }

    private fun saveAndFinish() {
        val t = transaction ?: return
        val category = (binding.categoryLayout.editText as? AutoCompleteTextView)?.text?.toString() ?: t.category
        val bank = (binding.bankLayout.editText as? AutoCompleteTextView)?.text?.toString() ?: "Unknown"

        // Persist to Room (works even if not in pending)
        TransactionStore.persistToDatabase(this, t, category, bank)
        TransactionStore.removePending(this, t.id)
        NotificationHelper.cancelNotification(this, t.id)
        Toast.makeText(this, "Transaction saved", Toast.LENGTH_SHORT).show()
        finish()
    }
}
