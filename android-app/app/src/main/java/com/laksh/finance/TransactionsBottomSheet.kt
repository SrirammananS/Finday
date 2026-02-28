package com.laksh.finance

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.laksh.finance.db.TransactionEntity
import com.laksh.finance.databinding.BottomSheetTransactionsBinding
import com.laksh.finance.databinding.ItemTransactionBinding
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class TransactionsBottomSheet : BottomSheetDialogFragment() {

    private var _binding: BottomSheetTransactionsBinding? = null
    private val binding get() = _binding!!
    private lateinit var adapter: TransactionAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = BottomSheetTransactionsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupQuickAdd()
        setupRecycler()
        observeTransactions()
    }

    private fun setupQuickAdd() {
        val categoryAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_dropdown_item_1line, SmsParser.CATEGORIES)
        (binding.quickCategoryLayout.editText as? AutoCompleteTextView)?.setAdapter(categoryAdapter)
        (binding.quickCategoryLayout.editText as? AutoCompleteTextView)?.setText("Other", false)

        val bankAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_dropdown_item_1line, SmsParser.BANKS)
        (binding.quickBankLayout.editText as? AutoCompleteTextView)?.setAdapter(bankAdapter)
        (binding.quickBankLayout.editText as? AutoCompleteTextView)?.setText("Unknown", false)

        binding.quickAddButton.setOnClickListener {
            val amountStr = binding.quickAmount.text?.toString()?.trim()
            val amount = amountStr?.toDoubleOrNull()
            if (amount == null || amount == 0.0) {
                Toast.makeText(requireContext(), "Enter a valid amount", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val desc = binding.quickDesc.text?.toString()?.trim() ?: "Manual entry"
            val category = (binding.quickCategoryLayout.editText as? AutoCompleteTextView)?.text?.toString() ?: "Other"
            val bank = (binding.quickBankLayout.editText as? AutoCompleteTextView)?.text?.toString() ?: "Unknown"

            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val date = dateFormat.format(Date())
            val t = ParsedTransaction(
                amount = amount,
                type = "expense",
                description = desc,
                category = category,
                date = date,
                rawText = "Quick add: $desc",
                confidence = 100,
                bank = bank
            )
            TransactionStore.persistToDatabase(requireContext(), t, category, bank)
            binding.quickAmount.text?.clear()
            binding.quickDesc.text?.clear()
            Toast.makeText(requireContext(), "Added", Toast.LENGTH_SHORT).show()
        }
    }

    private fun setupRecycler() {
        adapter = TransactionAdapter { entity ->
            TransactionStore.deleteLoggedTransaction(requireContext(), entity.id)
        }
        binding.transactionsRecycler.layoutManager = LinearLayoutManager(requireContext())
        binding.transactionsRecycler.adapter = adapter
    }

    private fun observeTransactions() {
        viewLifecycleOwner.lifecycleScope.launch {
            TransactionStore.getLoggedTransactionsFlow(requireContext()).collectLatest { list ->
                adapter.submitList(list)
                binding.emptyText.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class TransactionAdapter(
    private val onDelete: (TransactionEntity) -> Unit
) : RecyclerView.Adapter<TransactionAdapter.VH>() {

    private var items: List<TransactionEntity> = emptyList()

    fun submitList(list: List<TransactionEntity>) {
        items = list
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): VH {
        val bind = ItemTransactionBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return VH(bind)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount() = items.size

    inner class VH(private val b: ItemTransactionBinding) : RecyclerView.ViewHolder(b.root) {
        fun bind(entity: TransactionEntity) {
            b.descriptionText.text = entity.description
            b.metaText.text = "${entity.category} • ${entity.bank} • ${entity.date}"
            b.amountText.text = if (entity.amount < 0) {
                "-₹${String.format("%,.0f", kotlin.math.abs(entity.amount))}"
            } else {
                "+₹${String.format("%,.0f", entity.amount)}"
            }
            b.root.setOnLongClickListener {
                android.app.AlertDialog.Builder(b.root.context)
                    .setTitle("Delete transaction?")
                    .setMessage("${entity.description} - ₹${kotlin.math.abs(entity.amount)}")
                    .setPositiveButton("Delete") { _, _ -> onDelete(entity) }
                    .setNegativeButton("Cancel", null)
                    .show()
                true
            }
        }
    }
}
