/**
 * Natural Language Message Parser for LAKSH Finance Bot
 * Parses user messages to extract transaction data
 */

// Category keywords for auto-categorization
const CATEGORY_KEYWORDS = {
    'Groceries': ['grocery', 'groceries', 'vegetables', 'fruits', 'supermarket', 'walmart', 'dmart', 'bigbasket', 'zepto', 'blinkit', 'instamart'],
    'Dining': ['food', 'restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'snack', 'zomato', 'swiggy', 'pizza', 'burger', 'biryani', 'tea', 'eat', 'ate'],
    'Transportation': ['uber', 'ola', 'rapido', 'auto', 'cab', 'taxi', 'petrol', 'diesel', 'fuel', 'gas', 'parking', 'metro', 'bus', 'train', 'travel'],
    'Entertainment': ['movie', 'netflix', 'prime', 'hotstar', 'spotify', 'game', 'gaming', 'concert', 'show', 'theatre'],
    'Utilities': ['electricity', 'electric', 'water', 'internet', 'wifi', 'phone', 'mobile', 'recharge', 'bill', 'gas'],
    'Healthcare': ['medicine', 'doctor', 'hospital', 'pharmacy', 'medical', 'health', 'clinic', 'lab', 'test'],
    'Shopping': ['amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'shopping', 'mall', 'store', 'buy'],
    'Subscriptions': ['subscription', 'monthly', 'annual', 'premium', 'plan'],
    'Income': ['salary', 'income', 'payment', 'received', 'got', 'credited', 'earning', 'freelance', 'bonus']
};

// Command patterns
const COMMANDS = {
    BALANCE: /^(balance|bal|total|money|how much|kitna|paisa)$/i,
    TODAY: /^(today|aaj|today's|todays)$/i,
    THIS_MONTH: /^(this month|month|monthly|is mahine|mahina)$/i,
    HELP: /^(help|help me|commands|what can you do|\?)$/i,
    LAST: /^(last|recent|latest|history)$/i
};

/**
 * Parse a message and extract transaction data or command
 */
function parseMessage(text) {
    if (!text || typeof text !== 'string') {
        return { type: 'error', message: 'Empty message' };
    }

    const cleanText = text.trim().toLowerCase();

    // Check for commands first
    if (COMMANDS.BALANCE.test(cleanText)) {
        return { type: 'query', command: 'balance' };
    }
    if (COMMANDS.TODAY.test(cleanText)) {
        return { type: 'query', command: 'today' };
    }
    if (COMMANDS.THIS_MONTH.test(cleanText)) {
        return { type: 'query', command: 'month' };
    }
    if (COMMANDS.HELP.test(cleanText)) {
        return { type: 'query', command: 'help' };
    }
    if (COMMANDS.LAST.test(cleanText)) {
        return { type: 'query', command: 'last' };
    }

    // Try to parse as a transaction
    return parseTransaction(text);
}

/**
 * Parse transaction from natural language
 */
function parseTransaction(text) {
    const cleanText = text.trim();

    // Extract amount
    const amountMatch = cleanText.match(/₹?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/);

    if (!amountMatch) {
        return {
            type: 'error',
            message: 'Could not find an amount. Try: "spent 500 on groceries" or "500 food"'
        };
    }

    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

    if (amount <= 0 || amount > 10000000) {
        return { type: 'error', message: 'Amount should be between ₹1 and ₹1,00,00,000' };
    }

    // Determine if it's income or expense
    const isIncome = /\b(got|received|earned|salary|income|credited|bonus|freelance|payment received)\b/i.test(cleanText);

    // Extract description
    let description = cleanText
        .replace(amountMatch[0], '')
        .replace(/\b(spent|paid|for|on|rs|rupees|inr|got|received|earned)\b/gi, '')
        .trim();

    if (description) {
        description = description.charAt(0).toUpperCase() + description.slice(1);
    }

    // Auto-categorize
    const category = autoCategorizе(cleanText, isIncome);

    return {
        type: 'transaction',
        data: {
            amount,
            description: description || category,
            category,
            transactionType: isIncome ? 'income' : 'expense',
            date: new Date().toISOString().split('T')[0]
        }
    };
}

/**
 * Auto-categorize based on keywords
 */
function autoCategorizе(text, isIncome) {
    if (isIncome) return 'Income';

    const lowerText = text.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerText.includes(keyword)) {
                return category;
            }
        }
    }

    return 'Other';
}

/**
 * Format currency for display
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Get help message
 */
function getHelpMessage() {
    return `🤖 *LAKSH Finance Bot*

*Add Expenses:*
• \`spent 500 on groceries\`
• \`500 food\`
• \`paid 1200 electricity\`
• \`uber 150\`

*Add Income:*
• \`got 50000 salary\`
• \`received 5000 freelance\`

*Check Balance:*
• \`balance\` or \`bal\`

*View Expenses:*
• \`today\` - Today's expenses
• \`this month\` - Monthly summary
• \`last\` - Last 5 transactions

Just send a message with an amount and I'll understand! 💰`;
}

module.exports = {
    parseMessage,
    parseTransaction,
    formatCurrency,
    getHelpMessage,
    CATEGORY_KEYWORDS
};
