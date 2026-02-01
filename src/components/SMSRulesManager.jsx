import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, X, FlaskConical, CheckCircle2, AlertCircle } from 'lucide-react';
import { getCustomRules, addCustomRule, deleteCustomRule, parseSMS } from '../services/smsParser';
import { useFinance } from '../context/FinanceContext';

const SMSRulesManager = ({ isOpen, onClose }) => {
    const { accounts, categories } = useFinance();
    const [rules, setRules] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [testSMS, setTestSMS] = useState('');
    const [testResult, setTestResult] = useState(null);

    // New Rule Form
    const [newRule, setNewRule] = useState({
        pattern: '',
        isRegex: false,
        type: 'expense',
        category: 'Food & Dining',
        accountId: '',
        bankName: '',
        description: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadRules();
        }
    }, [isOpen]);

    const loadRules = () => {
        setRules(getCustomRules());
    };

    const handleAddRule = () => {
        if (!newRule.pattern) return;

        addCustomRule({
            ...newRule,
            merchant: newRule.description // Map description to merchant for parser compatibility
        });

        loadRules();
        setIsAdding(false);
        setNewRule({
            pattern: '',
            isRegex: false,
            type: 'expense',
            category: 'Food & Dining',
            accountId: '',
            bankName: '',
            description: ''
        });
    };

    const handleDeleteRule = (id) => {
        if (window.confirm('Delete this rule?')) {
            deleteCustomRule(id);
            loadRules();
        }
    };

    const runTest = () => {
        if (!testSMS) return;
        const result = parseSMS(testSMS);
        setTestResult(result);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card w-full max-w-2xl max-h-[90vh] rounded-2xl border border-card-border shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-card-border bg-card flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-text-main">SMS Automation Rules</h2>
                        <p className="text-sm text-text-muted">Teach LAKSH how to read your bank notifications</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-canvas-subtle rounded-full text-text-muted">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Test Area */}
                    <div className="bg-canvas-subtle/50 p-4 rounded-xl border border-card-border">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
                            <FlaskConical size={14} /> Test A Message
                        </h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Paste a bank SMS here to test..."
                                value={testSMS}
                                onChange={(e) => setTestSMS(e.target.value)}
                                className="flex-1 bg-canvas border border-card-border rounded-lg px-3 py-2 text-sm text-text-main"
                            />
                            <button
                                onClick={runTest}
                                className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-bold"
                            >
                                Test
                            </button>
                        </div>
                        {testResult && (
                            <div className="mt-3 p-3 bg-canvas rounded-lg border border-card-border text-xs">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`font-bold ${testResult.confidence === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                                        Match Confidence: {testResult.confidence}%
                                    </span>
                                    {testResult.confidence === 100 && <CheckCircle2 size={14} className="text-green-400" />}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-text-muted">
                                    <div>Type: <span className="text-text-main">{testResult.type}</span></div>
                                    <div>Amount: <span className="text-text-main">{testResult.amount}</span></div>
                                    <div>Category: <span className="text-text-main">{testResult.category}</span></div>
                                    <div>Description: <span className="text-text-main">{testResult.description}</span></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Rules List */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-text-main">Active Rules</h3>
                            <button
                                onClick={() => setIsAdding(true)}
                                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                            >
                                <Plus size={14} /> Add New Rule
                            </button>
                        </div>

                        {/* Add Rule Form */}
                        <AnimatePresence>
                            {isAdding && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-4 overflow-hidden"
                                >
                                    <div>
                                        <label className="text-xs font-bold text-text-muted block mb-1">SMS Pattern (Keyword or Regex)</label>
                                        <input
                                            type="text"
                                            value={newRule.pattern}
                                            onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                                            placeholder="e.g. 'spent on swiggy' or 'debited'"
                                            className="w-full bg-canvas border border-card-border rounded-lg px-3 py-2 text-sm text-text-main"
                                        />
                                        <div className="mt-1 flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="regex"
                                                checked={newRule.isRegex}
                                                onChange={(e) => setNewRule({ ...newRule, isRegex: e.target.checked })}
                                                className="rounded border-card-border bg-canvas"
                                            />
                                            <label htmlFor="regex" className="text-xs text-text-muted">Use Regular Expression (Advanced)</label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-text-muted block mb-1">Type</label>
                                            <select
                                                value={newRule.type}
                                                onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
                                                className="w-full bg-canvas border border-card-border rounded-lg px-3 py-2 text-sm text-text-main"
                                            >
                                                <option value="expense">Expense</option>
                                                <option value="income">Income</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-text-muted block mb-1">Set Category</label>
                                            <select
                                                value={newRule.category}
                                                onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                                                className="w-full bg-canvas border border-card-border rounded-lg px-3 py-2 text-sm text-text-main"
                                            >
                                                {categories.map(c => (
                                                    <option key={c.name} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-text-muted block mb-1">Assign Account (Optional)</label>
                                            <select
                                                value={newRule.accountId}
                                                onChange={(e) => setNewRule({ ...newRule, accountId: e.target.value })}
                                                className="w-full bg-canvas border border-card-border rounded-lg px-3 py-2 text-sm text-text-main"
                                            >
                                                <option value="">-- No Auto Assign --</option>
                                                {accounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-text-muted block mb-1">Map to Bank (Optional)</label>
                                            <input
                                                type="text"
                                                value={newRule.bankName || ''}
                                                onChange={(e) => setNewRule({ ...newRule, bankName: e.target.value })}
                                                placeholder="e.g. HDFC, SBI"
                                                className="w-full bg-canvas border border-card-border rounded-lg px-3 py-2 text-sm text-text-main"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-text-muted block mb-1">Description Label</label>
                                            <input
                                                type="text"
                                                value={newRule.description}
                                                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                                                placeholder="e.g. Swiggy Order"
                                                className="w-full bg-canvas border border-card-border rounded-lg px-3 py-2 text-sm text-text-main"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            onClick={() => setIsAdding(false)}
                                            className="px-4 py-2 text-text-muted text-xs font-bold"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddRule}
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold flex items-center gap-1"
                                        >
                                            <Save size={14} /> Save Rule
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Existing Rules */}
                        {rules.length === 0 && !isAdding ? (
                            <div className="text-center py-8 text-text-muted bg-canvas-subtle/30 rounded-xl border border-dashed border-card-border">
                                <p className="text-sm">No custom rules yet.</p>
                                <p className="text-xs mt-1">Add a rule to automatically categorize specific SMS patterns.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {rules.map(rule => (
                                    <div key={rule.id} className="bg-canvas border border-card-border rounded-xl p-3 flex justify-between items-center group">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-bold text-text-main">"{rule.pattern}"</span>
                                                {rule.isRegex && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">REGEX</span>}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-text-muted">
                                                <span className={rule.type === 'expense' ? 'text-red-400' : 'text-green-400'}>
                                                    {rule.type === 'expense' ? 'Expense' : 'Income'}
                                                </span>
                                                <span>• {rule.category}</span>
                                                {rule.accountId && (
                                                    <span>• {accounts.find(a => a.id === rule.accountId)?.name || 'Unknown Account'}</span>
                                                )}
                                                {rule.bankName && (
                                                    <span>• Bank: {rule.bankName}</span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteRule(rule.id)}
                                            className="p-2 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SMSRulesManager;
