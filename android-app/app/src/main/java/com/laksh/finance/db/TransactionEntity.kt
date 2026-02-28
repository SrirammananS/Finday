package com.laksh.finance.db

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Durable Room entity for logged transactions.
 * Persists all transaction data including category and bank selection from notifications.
 */
@Entity(tableName = "transactions")
data class TransactionEntity(
    @PrimaryKey
    val id: String,
    val amount: Double,
    val type: String, // "expense" or "income"
    val description: String,
    val category: String,
    val bank: String,
    val date: String,
    val rawText: String,
    val status: String, // "logged", "pending", "approved"
    val createdAt: Long = System.currentTimeMillis()
)
