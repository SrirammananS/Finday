/**
 * Friends Service - Manages friend list and balances
 */
import { storage, STORAGE_KEYS } from './storage';

const FRIENDS_KEY = 'laksh_friends';

class FriendsService {
    constructor() {
        this.friends = [];
        this.load();
    }

    load() {
        try {
            const stored = localStorage.getItem(FRIENDS_KEY);
            this.friends = stored ? JSON.parse(stored) : [];
        } catch (e) {
            this.friends = [];
        }
    }

    save() {
        localStorage.setItem(FRIENDS_KEY, JSON.stringify(this.friends));
    }

    getAll() {
        return [...this.friends];
    }

    add(name) {
        const trimmed = name.trim();
        if (!trimmed) return null;
        
        // Check if already exists (case insensitive)
        const exists = this.friends.find(f => f.name.toLowerCase() === trimmed.toLowerCase());
        if (exists) return exists;

        const friend = {
            id: Date.now().toString(),
            name: trimmed,
            createdAt: new Date().toISOString()
        };
        this.friends.push(friend);
        this.save();
        return friend;
    }

    update(id, name) {
        const friend = this.friends.find(f => f.id === id);
        if (friend) {
            friend.name = name.trim();
            this.save();
        }
        return friend;
    }

    delete(id) {
        this.friends = this.friends.filter(f => f.id !== id);
        this.save();
    }

    // Extract unique friends from transactions and sync
    syncFromTransactions(transactions) {
        const uniqueFriends = new Set();
        transactions.forEach(t => {
            if (t.friend && t.friend.trim()) {
                uniqueFriends.add(t.friend.trim());
            }
        });

        // Add any new friends from transactions
        uniqueFriends.forEach(name => {
            const exists = this.friends.find(f => f.name.toLowerCase() === name.toLowerCase());
            if (!exists) {
                this.friends.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name: name,
                    createdAt: new Date().toISOString()
                });
            }
        });
        this.save();
    }
}

export const friendsService = new FriendsService();
export default friendsService;
