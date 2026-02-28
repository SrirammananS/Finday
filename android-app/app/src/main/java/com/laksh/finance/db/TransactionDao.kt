package com.laksh.finance.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface TransactionDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(transaction: TransactionEntity)

    @Query("SELECT * FROM transactions ORDER BY createdAt DESC")
    fun getAllTransactions(): Flow<List<TransactionEntity>>

    @Query("SELECT * FROM transactions ORDER BY createdAt DESC")
    suspend fun getAllTransactionsSync(): List<TransactionEntity>

    @Query("SELECT * FROM transactions WHERE id = :id")
    suspend fun getById(id: String): TransactionEntity?

    @Query("DELETE FROM transactions WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM transactions")
    suspend fun deleteAll()
}
