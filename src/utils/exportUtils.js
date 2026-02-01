// Export utilities for financial data

export const exportToCSV = (transactions, accounts, categories) => {
    const headers = [
        'Date',
        'Description', 
        'Category',
        'Account',
        'Amount',
        'Type',
        'Notes'
    ];
    
    const rows = transactions.map(transaction => {
        const account = accounts.find(a => a.id === transaction.accountId);
        const category = categories.find(c => c.name === transaction.category);
        
        return [
            transaction.date || '',
            transaction.description || '',
            transaction.category || '',
            account?.name || '',
            transaction.amount || 0,
            transaction.amount >= 0 ? 'Income' : 'Expense',
            transaction.notes || ''
        ];
    });
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    
    return csvContent;
};

export const exportToJSON = (data) => {
    return JSON.stringify(data, null, 2);
};

export const downloadFile = (content, filename, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const exportTransactions = (transactions, accounts, categories, format = 'csv') => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    switch (format) {
        case 'csv':
            const csvContent = exportToCSV(transactions, accounts, categories);
            downloadFile(csvContent, `transactions-${dateStr}.csv`, 'text/csv');
            break;
            
        case 'json':
            const jsonContent = exportToJSON({
                exported_at: now.toISOString(),
                transactions,
                accounts,
                categories
            });
            downloadFile(jsonContent, `financial-data-${dateStr}.json`, 'application/json');
            break;
            
        default:
            throw new Error(`Unsupported export format: ${format}`);
    }
};

export const generateFinancialReport = (transactions, accounts, categories) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // This month's transactions
    const thisMonth = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    // Calculate metrics
    const totalIncome = thisMonth.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = thisMonth.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const netIncome = totalIncome - totalExpense;
    
    // Category breakdown
    const categoryBreakdown = thisMonth.filter(t => t.amount < 0).reduce((acc, t) => {
        const category = t.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + Math.abs(t.amount);
        return acc;
    }, {});
    
    // Account balances
    const accountSummary = accounts.map(account => ({
        name: account.name,
        type: account.type,
        balance: account.balance,
        transactionCount: transactions.filter(t => t.accountId === account.id).length
    }));
    
    const report = {
        generated_at: now.toISOString(),
        period: `${now.toLocaleString('default', { month: 'long' })} ${currentYear}`,
        summary: {
            total_income: totalIncome,
            total_expense: totalExpense,
            net_income: netIncome,
            transaction_count: thisMonth.length
        },
        category_breakdown: categoryBreakdown,
        account_summary: accountSummary,
        top_expenses: Object.entries(categoryBreakdown)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([category, amount]) => ({ category, amount }))
    };
    
    return report;
};