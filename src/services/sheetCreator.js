/**
 * Creates a new Google Sheets finance ledger.
 * Uses gapi.client.sheets - requires Google API to be loaded.
 */
import { storage, STORAGE_KEYS } from './storage';

export async function createFinanceSheet({ setConfig, setIsLoading }) {
  setIsLoading(true);
  try {
    if (!globalThis.gapi?.client?.sheets) {
      throw new Error('Google Sheets API not loaded');
    }

    const createResponse = await globalThis.gapi.client.sheets.spreadsheets.create({
      resource: {
        properties: { title: 'Finday Ledger' },
        sheets: [
          { properties: { title: 'Transactions' } },
          { properties: { title: '_Accounts' } },
          { properties: { title: '_Categories' } },
          { properties: { title: '_Bills' } },
          { properties: { title: '_BillPayments' } },
          { properties: { title: '_Config' } },
        ],
      },
    });

    const newSpreadsheetId = createResponse.result.spreadsheetId;
    setConfig((prev) => ({ ...prev, spreadsheetId: newSpreadsheetId }));
    storage.set(STORAGE_KEYS.SPREADSHEET_ID, newSpreadsheetId);
    storage.set(STORAGE_KEYS.SPREADSHEET_NAME, 'LAKSH Finance');
    storage.set(STORAGE_KEYS.EVER_CONNECTED, 'true');

    await globalThis.gapi.client.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: newSpreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: 'Transactions!A1:J1',
            values: [
              ['ID', 'Date', 'Description', 'Amount', 'Category', 'AccountID', 'Type', 'CreatedAt', 'Friend', 'Source'],
            ],
          },
          {
            range: '_Accounts!A1:H1',
            values: [
              ['ID', 'Name', 'Type', 'Balance', 'BillingDay', 'DueDay', 'CreatedAt', 'IsSecret'],
            ],
          },
          {
            range: '_Categories!A1:D11',
            values: [
              ['Name', 'Keywords', 'Color', 'Icon'],
              ['Groceries', 'walmart,kroger,grocery,supermarket', '#22c55e', '🛒'],
              ['Dining', 'restaurant,cafe,mcdonalds,starbucks,pizza', '#f59e0b', '🍕'],
              ['Transportation', 'uber,lyft,gas,petrol,shell,parking', '#3b82f6', '🚗'],
              ['Entertainment', 'netflix,spotify,movie,cinema,game', '#8b5cf6', '🎬'],
              ['Utilities', 'electric,water,internet,phone,bill', '#64748b', '💡'],
              ['Healthcare', 'pharmacy,doctor,hospital,medical', '#ef4444', '🏥'],
              ['Shopping', 'amazon,target,mall,store', '#ec4899', '🛍️'],
              ['Subscriptions', 'subscription,monthly,annual', '#06b6d4', '📱'],
              ['Income', 'salary,payment,deposit,transfer in', '#10b981', '💰'],
              ['Other', '', '#94a3b8', '📦'],
            ],
          },
          {
            range: '_Bills!A1:K1',
            values: [
              ['ID', 'Name', 'Amount', 'DueDay', 'BillingDay', 'Category', 'Status', 'BillType', 'Cycle', 'CreatedAt', 'AccountID'],
            ],
          },
          {
            range: '_BillPayments!A1:J1',
            values: [
              ['ID', 'BillID', 'Name', 'Cycle', 'Amount', 'DueDate', 'Status', 'PaidDate', 'TransactionID', 'AccountID'],
            ],
          },
        ],
      },
    });

    window.location.reload();
  } catch (error) {
    console.error('Error creating sheet:', error);
    alert('Failed to create spreadsheet. See console.');
    throw error;
  } finally {
    setIsLoading(false);
  }
}
