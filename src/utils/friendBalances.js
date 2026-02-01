/**
 * Shared utility for calculating friend balances from transactions
 * Used by both Dashboard and Friends page to ensure consistency
 */

export function calculateFriendBalances(transactions) {
    const balances = {};
    
    transactions.forEach(t => {
        if (!t.friend) return;
        
        const friend = t.friend.trim();
        if (!friend) return;
        
        if (!balances[friend]) {
            balances[friend] = {
                name: friend,
                balance: 0,
                totalLent: 0,
                totalReceived: 0,
                transactionCount: 0,
                history: []
            };
        }
        
        const rawAmount = parseFloat(t.amount) || 0;
        const amount = Math.abs(rawAmount);
        
        // Use amount sign: negative = expense (they owe me), positive = income (paid back)
        if (rawAmount < 0) {
            balances[friend].balance += amount;
            balances[friend].totalLent += amount;
        } else {
            balances[friend].balance -= amount;
            balances[friend].totalReceived += amount;
        }
        
        balances[friend].history.push(t);
        balances[friend].transactionCount++;
    });
    
    return balances;
}

export function getFriendSummary(transactions) {
    const balances = calculateFriendBalances(transactions);
    const balanceValues = Object.values(balances);
    
    const totalOwedToYou = balanceValues
        .filter(f => f.balance > 0)
        .reduce((sum, f) => sum + f.balance, 0);
    
    const totalYouOwe = balanceValues
        .filter(f => f.balance < 0)
        .reduce((sum, f) => sum + Math.abs(f.balance), 0);
    
    return {
        balances,
        balancesList: balanceValues,
        totalOwedToYou,
        totalYouOwe,
        netBalance: totalOwedToYou - totalYouOwe,
        friendCount: balanceValues.length
    };
}
