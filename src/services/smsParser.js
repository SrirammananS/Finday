import { smartAI } from './smartAI';
import { storage, STORAGE_KEYS } from './storage';

// Bank detection patterns
const BANK_IDENTIFIERS = {
    'HDFC': ['hdfc', 'hdfcbank', 'hdfc bank'],
    'ICICI': ['icici', 'icicib', 'icici bank'],
    'SBI': ['sbi', 'state bank', 'sbiin', 'sbin'],
    'Axis': ['axis', 'axisbk', 'axis bank'],
    'Kotak': ['kotak', 'kotak mahindra', 'kotak bank'],
    'IndusInd': ['indusind', 'indus ind'],
    'IDBI': ['idbi', 'idbi bank'],
    'PNB': ['pnb', 'punjab national'],
    'BOB': ['bob', 'bank of baroda'],
    'Canara': ['canara', 'cnrb'],
    'Union': ['union bank', 'uboi'],
    'Federal': ['federal', 'fedbank'],
    'IDFC': ['idfc', 'idfc first', 'idfc bank'],
    'Yes Bank': ['yes bank', 'yesbank'],
    'Standard Chartered': ['scb', 'standard chartered'],
    'Citi': ['citi', 'citibank'],
    'HSBC': ['hsbc'],
    'DBS': ['dbs', 'dbs bank'],
    'Paytm': ['paytm', 'pp_bank', 'paytm bank'],
    'PhonePe': ['phonepe'],
    'GPay': ['gpay', 'google pay'],
    'Amazon': ['amazon', 'amazonpay'],
    'Amex': ['amex', 'american express']
};

export const getCustomRules = () => {
    try {
        return storage.getJSON(STORAGE_KEYS.SMS_RULES) || [];
    } catch {
        return [];
    }
};

export const addCustomRule = (rule) => {
    const rules = getCustomRules();
    // Rule structure: { id: Date.now(), pattern: 'regex string', type: 'expense'/'income', category: 'Food', accountId: 'id', description: 'desc' }
    rules.push({ ...rule, id: Date.now() });
    storage.setJSON(STORAGE_KEYS.SMS_RULES, rules);
};

export const deleteCustomRule = (ruleId) => {
    const rules = getCustomRules();
    const filtered = rules.filter(r => r.id !== ruleId);
    storage.setJSON(STORAGE_KEYS.SMS_RULES, filtered);
};

// ... (Existing helper functions like getBankAccountMappings remain same but let's check parseSMS)

// Get bank-account mappings from localStorage
const getBankAccountMappings = () => {
    try {
        return JSON.parse(localStorage.getItem('bankAccountMappings')) || {};
    } catch {
        return {};
    }
};

const saveBankAccountMapping = (bankName, accountId) => {
    const mappings = getBankAccountMappings();
    mappings[bankName.toLowerCase()] = accountId;
    localStorage.setItem('bankAccountMappings', JSON.stringify(mappings));
};

export const detectBank = (smsText) => {
    const text = smsText.toLowerCase();

    // Check Custom Rules first for implicit bank association
    const customRules = getCustomRules();
    for (const rule of customRules) {
        if (rule.pattern) {
            let isMatch = false;
            if (rule.isRegex) {
                try {
                    const regex = new RegExp(rule.pattern, 'i');
                    if (regex.test(smsText)) isMatch = true;
                } catch (e) { }
            } else {
                if (text.includes(rule.pattern.toLowerCase())) isMatch = true;
            }

            if (isMatch) {
                // If rule has an explicit bank name overriding everything
                if (rule.bankName) return rule.bankName;

                // If rule maps to an account, try to find the bank of that account
                // (Note: We can't access 'accounts' state here easily without passing it, 
                // so we rely on explicit bankName or allow fallthrough)
            }
        }
    }

    for (const [bankName, identifiers] of Object.entries(BANK_IDENTIFIERS)) {
        for (const identifier of identifiers) {
            if (text.includes(identifier.toLowerCase())) {
                return bankName;
            }
        }
    }

    // Check SMS sender patterns
    const senderPatterns = {
        'HDFC': /^(HD|HDFCBK|HDFC)/i,
        'ICICI': /^(IC|ICICI|ICI)/i,
        'SBI': /^(SB|SBI|SBIIN)/i,
        'Axis': /^(AX|AXIS)/i,
        'Kotak': /^(KT|KOTAK)/i,
        'IDFC': /^(ID|IDFC)/i
    };

    for (const [bankName, pattern] of Object.entries(senderPatterns)) {
        if (pattern.test(text)) {
            return bankName;
        }
    }

    return null;
};

export const getSuggestedAccount = (bankName, accounts) => {
    if (!bankName) return null;

    const mappings = getBankAccountMappings();
    const mappedAccountId = mappings[bankName.toLowerCase()];

    if (mappedAccountId) {
        return accounts.find(acc => acc.id === mappedAccountId);
    }

    return accounts.find(acc =>
        acc.name.toLowerCase().includes(bankName.toLowerCase())
    );
};

const BANK_PATTERNS = [
    // Debit patterns
    {
        type: 'expense',
        patterns: [
            /(?:debited|spent|paid|sent|withdrawn|purchase|txn|transaction|transferred).{0,30}(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)/i,
            /(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*).{0,30}(?:debited|spent|paid|withdrawn|deducted|transferred to|sent)/i,
            /(?:debit|dr)\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)/i,
        ]
    },
    // Credit patterns
    {
        type: 'income',
        patterns: [
            /(?:credited|received|deposited|refund|reversed).{0,30}(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)/i,
            /(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*).{0,30}(?:credited|received|deposited|refunded)/i,
            /(?:credit|cr)\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)/i,
        ]
    }
];

const MERCHANT_PATTERNS = [
    /(?:at|to|from|@)\s+([A-Za-z0-9\s&\-\.]+?)(?:\s+on|\s+ref|\s+upi|\s+thru|\.|$)/i,
    /(?:paid to|sent to|received from)\s+([A-Za-z0-9\s&\-\.]+?)(?:\s+ref|\s+upi|\.|$)/i,
    /upi[:\s]+([A-Za-z0-9\s@\-\.]+?)(?:\s+ref|\.|$)/i,
    /(?:info|txn|transaction)[:\s]+([A-Za-z0-9\s&\-\.]+?)(?:\s+ref|\.|$)/i,
    /(?:vpa)\s+([A-Za-z0-9\s@\-\.]+?)(?:\s+ref|\.|$)/i,
];

const ACCOUNT_PATTERNS = [
    /(?:a\/c|ac|account|acct)[:\s]*(?:no\.?|number)?[:\s]*(?:xx|x+)?(\d{4,})/i,
    /(?:card)[:\s]*(?:ending|xx|x+)?[:\s]*(\d{4})/i,
];

const DATE_PATTERNS = [
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4})/i,
];

const CATEGORY_KEYWORDS = {
    'Food & Dining': ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'dominos', 'pizza', 'burger', 'mcd', 'kfc', 'starbucks', 'dunkin'],
    'Transport/Petrol': ['uber', 'ola', 'rapido', 'petrol', 'fuel', 'hp', 'iocl', 'bpcl', 'shell', 'metro', 'irctc', 'railway'],
    'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'mall', 'store', 'mart', 'retail', 'uniqlo', 'zara'],
    'Groceries': ['bigbasket', 'grofers', 'blinkit', 'zepto', 'dmart', 'more', 'reliance fresh', 'grocery', 'instamart'],
    'Utilities/Bills': ['electricity', 'water', 'gas', 'broadband', 'wifi', 'airtel', 'jio', 'vi', 'bsnl', 'bill', 'bescom'],
    'Entertainment': ['netflix', 'prime', 'hotstar', 'spotify', 'youtube', 'movie', 'pvr', 'inox', 'bookmyshow'],
    'Health': ['pharmacy', 'medical', 'hospital', 'clinic', 'apollo', 'medplus', '1mg', 'pharmeasy', 'doctor'],
    'Transfer': ['upi', 'neft', 'imps', 'transfer', 'sent to', 'received from'],
    'ATM Withdrawal': ['atm', 'withdrawal', 'cash'],
};

export function parseSMS(smsText) {
    if (!smsText || typeof smsText !== 'string') {
        return null;
    }

    const text = smsText.toLowerCase();

    // 1. Check Custom Rules First
    const customRules = getCustomRules();
    for (const rule of customRules) {
        try {
            // Support simple includes or regex (if wrapped in /.../)
            let isMatch = false;
            let capturedAmount = null;

            if (rule.isRegex) {
                const regex = new RegExp(rule.pattern, 'i');
                const match = smsText.match(regex);
                if (match) {
                    isMatch = true;
                    // Try to finding amount group if user regex supports it, else look for any number
                    if (match[1] && !isNaN(parseFloat(match[1]))) {
                        capturedAmount = parseFloat(match[1]);
                    }
                }
            } else {
                if (text.includes(rule.pattern.toLowerCase())) {
                    isMatch = true;
                }
            }

            if (isMatch) {
                // If rule matches, use its definition as base
                // Use captured amount or try to parse
                let amount = capturedAmount;
                if (!amount) {
                    // Try to find amount in text if regex didn't capture or was simple string
                    // Simple number extractor
                    const amtMatch = text.match(/(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)/i);
                    if (amtMatch) amount = parseFloat(amtMatch[1].replace(/,/g, ''));
                }

                return {
                    amount: amount || 0,
                    type: rule.type || 'expense',
                    merchant: rule.merchant || rule.description || 'Custom Rule',
                    description: rule.description || 'Custom Transaction',
                    category: rule.category || 'Other',
                    date: new Date().toISOString().split('T')[0],
                    accountLast4: null, // Could also rule-map this if needed
                    accountId: rule.accountId || null,
                    bankName: rule.bankName || null,
                    rawText: smsText,
                    confidence: 100 // High confidence on rule match
                };
            }
        } catch (e) {
            console.warn('Error processing rule:', rule, e);
        }
    }

    // 2. Default Parsing Logic
    let result = {
        amount: null,
        type: null,
        merchant: null,
        category: 'Other',
        date: new Date().toISOString().split('T')[0],
        accountLast4: null,
        rawText: smsText,
        confidence: 0
    };

    // Detect transaction type and amount
    for (const bankPattern of BANK_PATTERNS) {
        for (const pattern of bankPattern.patterns) {
            const match = smsText.match(pattern);
            if (match && match[1]) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                if (amount > 0 && amount < 10000000) { // Sanity check
                    result.amount = amount;
                    result.type = bankPattern.type;
                    result.confidence += 40;
                    break;
                }
            }
        }
        if (result.amount) break;
    }

    if (!result.amount) {
        return null; // Not a transaction SMS
    }

    // Extract merchant/description
    for (const pattern of MERCHANT_PATTERNS) {
        const match = smsText.match(pattern);
        if (match && match[1]) {
            result.merchant = match[1].trim().replace(/\s+/g, ' ').substring(0, 50);
            result.confidence += 20;
            break;
        }
    }

    // Extract account number
    for (const pattern of ACCOUNT_PATTERNS) {
        const match = smsText.match(pattern);
        if (match && match[1]) {
            result.accountLast4 = match[1].slice(-4);
            result.confidence += 10;
            break;
        }
    }

    // Extract date
    for (const pattern of DATE_PATTERNS) {
        const match = smsText.match(pattern);
        if (match && match[1]) {
            try {
                const parsed = new Date(match[1]);
                if (!isNaN(parsed.getTime())) {
                    result.date = parsed.toISOString().split('T')[0];
                    result.confidence += 10;
                }
            } catch (e) { }
            break;
        }
    }

    // Detect category from keywords
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(kw => text.includes(kw))) {
            result.category = category;
            result.confidence += 20;
            break;
        }
    }

    // Generate description
    if (result.merchant) {
        result.description = result.merchant;
    } else if (result.type === 'expense') {
        result.description = 'Payment';
    } else {
        result.description = 'Credit received';
    }

    return result;
}

export function enrichTransaction(transaction) {
    if (!transaction || !transaction.rawText) return transaction;

    // Check if any custom rule matches the raw text
    const customRules = getCustomRules();
    for (const rule of customRules) {
        let isMatch = false;
        if (rule.isRegex) {
            try {
                const regex = new RegExp(rule.pattern, 'i');
                if (regex.test(transaction.rawText)) isMatch = true;
            } catch (e) { }
        } else {
            if (transaction.rawText.toLowerCase().includes(rule.pattern.toLowerCase())) isMatch = true;
        }

        if (isMatch) {
            console.log(`[Rule Match] Enriched transaction with rule: ${rule.pattern}`);
            return {
                ...transaction,
                category: rule.category || transaction.category,
                accountId: rule.accountId || transaction.accountId,
                description: rule.description || transaction.description,
                // If rule is expense/income, override type? Maybe, but be careful.
                type: rule.type || transaction.type,
                bankName: rule.bankName || transaction.bankName,
                confidence: 100
            };
        }
    }
    return transaction;
}

export function formatParsedTransaction(parsed, accounts = []) {
    if (!parsed) return null;

    // Try to match account by last 4 digits
    let matchedAccount = null;

    // Explicit account ID from custom rule
    if (parsed.accountId) {
        matchedAccount = accounts.find(a => a.id === parsed.accountId);
    }

    if (!matchedAccount && parsed.accountLast4 && accounts.length > 0) {
        matchedAccount = accounts.find(a =>
            a.accountNumber?.endsWith(parsed.accountLast4) ||
            a.name?.includes(parsed.accountLast4)
        );
    }

    // Use Smart AI for better category prediction if confidence is low
    let category = parsed.category;
    let categoryConfidence = parsed.confidence >= 100 ? 100 : 0; // If custom rule, 100%

    // Only try AI if not a high-confidence custom rule match
    if (parsed.confidence < 90) {
        try {
            const aiPrediction = smartAI.predictCategory(
                parsed.merchant || parsed.description,
                parsed.amount
            );
            if (aiPrediction.confidence > 0.5) {
                category = aiPrediction.category;
                categoryConfidence = aiPrediction.confidence;
            }
        } catch (e) {
            // Fall back to parsed category
        }
    }

    return {
        date: parsed.date,
        description: parsed.description || (parsed.type === 'expense' ? 'Payment' : 'Credit'),
        amount: parsed.type === 'expense' ? -Math.abs(parsed.amount) : Math.abs(parsed.amount),
        category: category,
        accountId: matchedAccount?.id || accounts[0]?.id || '',
        type: parsed.type,
        friend: '',
        confidence: parsed.confidence,
        categoryConfidence: categoryConfidence,
        categoryId: parsed.categoryId || null, // If available
        bankName: parsed.bankName || null,
        rawText: parsed.rawText
    };
}

// Learn from user's category selection
export function learnFromTransaction(description, category) {
    try {
        smartAI.learn(description, category);
    } catch (e) {
        console.warn('Failed to learn from transaction:', e);
    }
}

export default { parseSMS, formatParsedTransaction, detectBank, getSuggestedAccount, saveBankAccountMapping, getBankAccountMappings, getCustomRules, addCustomRule, deleteCustomRule };
