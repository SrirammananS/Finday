/**
 * Smart AI Service
 * Handles category prediction and learning from user behavior
 */

class SmartAIService {
    constructor() {
        this.MODEL_KEY = 'laksh_ai_model';
        this.model = this.loadModel();
    }

    loadModel() {
        try {
            const stored = localStorage.getItem(this.MODEL_KEY);
            return stored ? JSON.parse(stored) : {
                mappings: {},
                frequencies: {}
            };
        } catch (e) {
            return { mappings: {}, frequencies: {} };
        }
    }

    saveModel() {
        localStorage.setItem(this.MODEL_KEY, JSON.stringify(this.model));
    }

    /**
     * Predict category for a transaction
     */
    predictCategory(description, amount) {
        if (!description) return { category: 'Other', confidence: 0 };

        const desc = description.toLowerCase();

        // Simple keyword matching for common merchants
        const mappings = {
            'swiggy': 'Food & Dining',
            'zomato': 'Food & Dining',
            'uber': 'Transport',
            'ola': 'Transport',
            'amazon': 'Shopping',
            'flipkart': 'Shopping',
            'netflix': 'Entertainment',
            'jio': 'Bills & Utilities',
            'airtel': 'Bills & Utilities'
        };

        for (const [key, cat] of Object.entries(mappings)) {
            if (desc.includes(key)) return { category: cat, confidence: 0.9 };
        }

        // Return learned mapping if exists
        if (this.model.mappings[desc]) {
            return { category: this.model.mappings[desc], confidence: 0.8 };
        }

        return { category: 'Other', confidence: 0.1 };
    }

    /**
     * Learn from user's manual categorization
     */
    learn(description, category) {
        if (!description || !category) return;
        const desc = description.toLowerCase();
        this.model.mappings[desc] = category;
        this.saveModel();
    }
}

export const smartAI = new SmartAIService();
export default smartAI;
