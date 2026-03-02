import { useMemo } from 'react';

/**
 * Computes friend balances from transactions.
 * Formula: Expense (negative) = I paid → Friend owes me (+). Income (positive) = Friend paid me → Balance -= Amount.
 */
export function useFriendsWithBalance(friends, transactions) {
  return useMemo(() => {
    const balances = {};
    friends.forEach((f) => (balances[f.name] = 0));

    transactions
      .filter((t) => !t.hidden && t.friend)
      .forEach((t) => {
        const name = t.friend.trim();
        if (balances[name] === undefined) balances[name] = 0;
        balances[name] -= t.amount;
      });

    return friends.map((f) => ({
      ...f,
      balance: balances[f.name] || 0,
    }));
  }, [friends, transactions]);
}
