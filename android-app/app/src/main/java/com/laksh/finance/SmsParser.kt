package com.laksh.finance

import java.text.SimpleDateFormat
import java.util.*
import java.util.regex.Pattern

data class ParsedTransaction(
    val id: String = UUID.randomUUID().toString(),
    val amount: Double,
    val type: String, // "expense" or "income"
    val description: String,
    val category: String,
    val date: String,
    val rawText: String,
    val confidence: Int,
    val status: String = "pending",
    val createdAt: String = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
)

object SmsParser {
    
    // Enhanced debit patterns for Indian banks
    private val DEBIT_PATTERNS = listOf(
        // HDFC, ICICI, SBI format
        Pattern.compile("(?:debited|spent|paid|sent|withdrawn|purchase|txn|transaction|used at).{0,40}(?:rs\\.?|inr|₹|rupees)\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:rs\\.?|inr|₹)\\s*([\\d,]+\\.?\\d*).{0,40}(?:debited|spent|paid|sent|withdrawn|deducted|has been)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:debit|dr|deducted)\\s*(?:of)?\\s*(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE),
        // UPI specific
        Pattern.compile("(?:upi|gpay|phonepe|paytm).{0,30}(?:rs\\.?|inr|₹)\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE),
        // Card transaction
        Pattern.compile("(?:card|\\*{4}\\d{4}).{0,30}(?:rs\\.?|inr|₹)\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE),
        // Generic amount with debit context
        Pattern.compile("(?:inr|rs\\.?)\\s*([\\d,]+\\.?\\d*)\\s*(?:is|was|has been)\\s*(?:debited|deducted)", Pattern.CASE_INSENSITIVE)
    )
    
    // Enhanced credit patterns
    private val CREDIT_PATTERNS = listOf(
        Pattern.compile("(?:credited|received|deposited|refund|cashback|reversed).{0,40}(?:rs\\.?|inr|₹)\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:rs\\.?|inr|₹)\\s*([\\d,]+\\.?\\d*).{0,40}(?:credited|received|deposited|added)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:credit|cr|received)\\s*(?:of)?\\s*(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE),
        // Salary/transfer
        Pattern.compile("(?:salary|neft|imps|rtgs).{0,30}(?:rs\\.?|inr|₹)\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
    )
    
    private val MERCHANT_PATTERNS = listOf(
        Pattern.compile("(?:at|to|from|@)\\s+([A-Za-z0-9\\s&\\-\\.]+?)(?:\\s+on|\\s+ref|\\s+upi|\\.|$)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:paid to|sent to|received from)\\s+([A-Za-z0-9\\s&\\-\\.]+?)(?:\\s+ref|\\s+upi|\\.|$)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("upi[:\\s]+([A-Za-z0-9\\s@\\-\\.]+?)(?:\\s+ref|\\.|$)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:vpa|merchant)[:\\s]+([A-Za-z0-9\\s@\\-\\.]+?)(?:\\s|\\.|$)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("info[:\\s]+([A-Za-z0-9\\s&\\-\\.]+?)(?:\\s+ref|\\.|$)", Pattern.CASE_INSENSITIVE)
    )
    
    // Balance extraction pattern
    private val BALANCE_PATTERN = Pattern.compile(
        "(?:bal|balance|avl\\.?\\s*bal)[:\\s]*(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)",
        Pattern.CASE_INSENSITIVE
    )
    
    // Card/Account number pattern
    private val ACCOUNT_PATTERN = Pattern.compile(
        "(?:a/c|ac|account|card)[:\\s]*(?:no\\.?|number|xx|x+)?[:\\s]*(\\d{4,}|xx+\\d{4})",
        Pattern.CASE_INSENSITIVE
    )
    
    private val CATEGORY_KEYWORDS = mapOf(
        "Food & Dining" to listOf("swiggy", "zomato", "restaurant", "cafe", "food", "dominos", "pizza", "burger", "mcd", "kfc", "starbucks", "dunkin", "subway", "baskin", "haldiram", "barbeque", "biryani", "briyani", "chicken curry", "rice", "set dosa", "dosa", "egg briyani", "fk"),
        "Tea/Snacks" to listOf("tea", "coffee", "snacks", "buttermilk", "juice", "lassi", "chaiwala", "biscuit"),
        "Home Needs" to listOf("groceries", "banana", "leaf", "fruit", "vegetables", "mom dress", "needs", "household", "cleaning", "detergent", "soap"),
        "Transport/Petrol" to listOf("uber", "ola", "rapido", "petrol", "fuel", "hp", "iocl", "bpcl", "shell", "metro", "parking", "toll", "apache"),
        "Online Shopping" to listOf("amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "tatacliq", "croma", "reliance digital", "bp machine", "camera", "online"),
        "Offline Shopping" to listOf("mall", "retail", "store", "shop", "mom clip", "lotions", "offline", "market"),
        "Utilities/Bills" to listOf("electricity", "eb bill", "water", "gas", "cylinder", "broadband", "wifi", "internet", "landline", "airtel", "jio", "vi", "bsnl", "bill", "recharge", "postpaid", "prepaid"),
        "CC Bill Payment" to listOf("hdfc bill", "cc bill", "credit card", "card bill", "icici bill", "sbi card", "axis card", "kotak card"),
        "Rent" to listOf("rent", "house rent", "home rent", "flat rent", "pg rent", "landlord", "nobroker", "nestaway", "pg", "hostel"),
        "Friend Expenses" to listOf("sv return", "jrp", "ajay", "lent", "friend", "roommate", "settlement", "return", "gave back", "borrowed", "split"),
        "DAD Transaction" to listOf("dad", "father", "papa", "atta", "kerosene", "dad transaction"),
        "Grooming" to listOf("trimming", "haircut", "salon", "barber", "spa", "parlour", "facial", "grooming"),
        "Misc Fees" to listOf("ippb interest", "interest", "credit cb", "charges", "fees", "fine", "fresh order return", "penalty"),
        "Cashback/Rewards" to listOf("cashback", "cb", "reward", "bonus", "refund", "as cashback"),
        "Income" to listOf("salary", "income", "parents gave", "received", "credited", "bonus", "incentive"),
        "Travel" to listOf("irctc", "railway", "redbus", "makemytrip", "goibibo", "indigo", "spicejet", "hotel", "oyo", "airbnb"),
        "Entertainment" to listOf("netflix", "prime", "hotstar", "spotify", "youtube", "movie", "pvr", "inox", "bookmyshow", "zee5", "sonyliv", "gaana"),
        "Health" to listOf("pharmacy", "medical", "hospital", "clinic", "apollo", "medplus", "1mg", "pharmeasy", "doctor", "diagnostic", "lab", "netmeds"),
        "Transfer" to listOf("neft", "imps", "rtgs", "transfer", "sent to", "received from"),
        "ATM Withdrawal" to listOf("atm", "withdrawal", "cash withdrawal"),
        "Subscription" to listOf("subscription", "membership", "premium", "annual", "monthly plan"),
        "Education" to listOf("school", "college", "university", "course", "udemy", "coursera", "byju", "unacademy"),
        "Rent" to listOf("rent", "housing", "landlord", "nobroker", "nestaway")
    )
    
    fun parse(smsText: String): ParsedTransaction? {
        var amount: Double? = null
        var type: String? = null
        var confidence = 0
        
        // Try debit patterns first
        for (pattern in DEBIT_PATTERNS) {
            val matcher = pattern.matcher(smsText)
            if (matcher.find()) {
                val amountStr = matcher.group(1)?.replace(",", "") ?: continue
                amount = amountStr.toDoubleOrNull()
                if (amount != null && amount > 0 && amount < 10000000) {
                    type = "expense"
                    confidence += 40
                    break
                }
            }
        }
        
        // Try credit patterns if no debit found
        if (amount == null) {
            for (pattern in CREDIT_PATTERNS) {
                val matcher = pattern.matcher(smsText)
                if (matcher.find()) {
                    val amountStr = matcher.group(1)?.replace(",", "") ?: continue
                    amount = amountStr.toDoubleOrNull()
                    if (amount != null && amount > 0 && amount < 10000000) {
                        type = "income"
                        confidence += 40
                        break
                    }
                }
            }
        }
        
        // No amount found, not a transaction SMS
        if (amount == null || type == null) return null
        
        // Extract merchant
        var merchant: String? = null
        for (pattern in MERCHANT_PATTERNS) {
            val matcher = pattern.matcher(smsText)
            if (matcher.find()) {
                merchant = matcher.group(1)?.trim()?.take(50)
                confidence += 20
                break
            }
        }
        
        // Detect category
        val lowerText = smsText.lowercase()
        var category = "Other"
        for ((cat, keywords) in CATEGORY_KEYWORDS) {
            if (keywords.any { lowerText.contains(it) }) {
                category = cat
                confidence += 20
                break
            }
        }
        
        // Generate description
        val description = merchant ?: if (type == "expense") "Payment" else "Credit received"
        
        // Get today's date
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val date = dateFormat.format(Date())
        
        return ParsedTransaction(
            amount = if (type == "expense") -amount else amount,
            type = type,
            description = description,
            category = category,
            date = date,
            rawText = smsText,
            confidence = confidence
        )
    }
}
