/**
 * Google Sheets Service for LAKSH Telegram Bot (Vercel Version)
 * Uses environment variables for credentials
 */

const { google } = require('googleapis');

// These will be set from environment variables
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1u72ib2OnFZTbt6BeIV7IUjzsuftwJ4m5PJF4-Kl-fHo';

let sheetsClient = null;

/**
 * Initialize the Google Sheets client
 */
async function initSheetsClient() {
    if (sheetsClient) return sheetsClient;

    try {
        // Parse credentials from environment variable
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const authClient = await auth.getClient();
        sheetsClient = google.sheets({ version: 'v4', auth: authClient });

        console.log('[LAKSH Bot] Sheets client initialized');
        return sheetsClient;
    } catch (error) {
        console.error('[LAKSH Bot] Failed to init sheets client:', error);
        throw error;
    }
}

/**
 * Get the sheet name for a given month
 */
function getMonthSheetName(date = new Date()) {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Generate a unique transaction ID
 */
function generateId() {
    return 'txn_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Ensure a sheet exists, create if not
 */
async function ensureSheetExists(sheetName) {
    const sheets = await initSheetsClient();

    try {
        const response = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
            fields: 'sheets.properties.title'
        });

        const sheetExists = response.data.sheets.some(
            s => s.properties.title === sheetName
        );

        if (!sheetExists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: {
                    requests: [{
                        addSheet: { properties: { title: sheetName } }
                    }]
                }
            });

            const headers = ['ID', 'Date', 'Description', 'Amount', 'Category', 'AccountID', 'Type', 'CreatedAt'];
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `'${sheetName}'!A1:H1`,
                valueInputOption: 'RAW',
                resource: { values: [headers] }
            });

            console.log(`[LAKSH Bot] Created sheet: ${sheetName}`);
        }
    } catch (error) {
        console.error('[LAKSH Bot] Error ensuring sheet exists:', error);
        throw error;
    }
}

/**
 * Add a new transaction
 */
async function addTransaction(transaction) {
    const sheets = await initSheetsClient();
    const sheetName = getMonthSheetName(new Date(transaction.date));

    await ensureSheetExists(sheetName);

    const row = [
        generateId(),
        transaction.date,
        transaction.description,
        transaction.amount,
        transaction.category,
        '',
        transaction.transactionType,
        new Date().toISOString()
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A:H`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [row] }
    });

    console.log(`[LAKSH Bot] Added: ${transaction.description} - ₹${transaction.amount}`);
    return { id: row[0], ...transaction };
}

/**
 * Get balance from accounts
 */
async function getBalance() {
    const sheets = await initSheetsClient();

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "'_Accounts'!A:H"
        });

        const rows = response.data.values || [];
        let totalBalance = 0;
        const accounts = [];

        rows.slice(1).forEach(row => {
            if (row[0] && row[7] !== 'true') {
                const balance = parseFloat(row[3]) || 0;
                totalBalance += balance;
                accounts.push({
                    name: row[1],
                    type: row[2],
                    balance
                });
            }
        });

        return { totalBalance, accounts };
    } catch (error) {
        console.error('[LAKSH Bot] Error getting balance:', error);
        return { totalBalance: 0, accounts: [] };
    }
}

/**
 * Get today's transactions
 */
async function getTodayTransactions() {
    const sheets = await initSheetsClient();
    const today = new Date().toISOString().split('T')[0];
    const sheetName = getMonthSheetName();

    try {
        await ensureSheetExists(sheetName);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${sheetName}'!A:H`
        });

        const rows = response.data.values || [];
        const transactions = rows
            .slice(1)
            .filter(row => row[1] === today)
            .map(row => ({
                description: row[2],
                amount: parseFloat(row[3]) || 0,
                category: row[4],
                type: row[6]
            }));

        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        return { transactions, totalExpense, totalIncome };
    } catch (error) {
        console.error('[LAKSH Bot] Error getting today:', error);
        return { transactions: [], totalExpense: 0, totalIncome: 0 };
    }
}

/**
 * Get month summary
 */
async function getMonthSummary() {
    const sheets = await initSheetsClient();
    const sheetName = getMonthSheetName();

    try {
        await ensureSheetExists(sheetName);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${sheetName}'!A:H`
        });

        const rows = response.data.values || [];
        const transactions = rows.slice(1).map(row => ({
            description: row[2],
            amount: parseFloat(row[3]) || 0,
            category: row[4],
            type: row[6]
        }));

        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const categoryTotals = {};
        transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            });

        return { totalExpense, totalIncome, categoryTotals, transactionCount: transactions.length };
    } catch (error) {
        console.error('[LAKSH Bot] Error getting month:', error);
        return { totalExpense: 0, totalIncome: 0, categoryTotals: {}, transactionCount: 0 };
    }
}

/**
 * Get last N transactions
 */
async function getLastTransactions(count = 5) {
    const sheets = await initSheetsClient();
    const sheetName = getMonthSheetName();

    try {
        await ensureSheetExists(sheetName);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${sheetName}'!A:H`
        });

        const rows = response.data.values || [];
        return rows
            .slice(1)
            .map(row => ({
                date: row[1],
                description: row[2],
                amount: parseFloat(row[3]) || 0,
                category: row[4],
                type: row[6]
            }))
            .slice(-count)
            .reverse();
    } catch (error) {
        console.error('[LAKSH Bot] Error getting last:', error);
        return [];
    }
}

module.exports = {
    addTransaction,
    getBalance,
    getTodayTransactions,
    getMonthSummary,
    getLastTransactions,
    SPREADSHEET_ID
};
