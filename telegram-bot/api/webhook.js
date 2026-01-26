/**
 * LAKSH Finance Bot - Pro UX Edition 🔥
 * 
 * Features:
 * - Reply keyboard for quick access (always visible)
 * - Inline buttons for selections (vanish after use)
 * - All categories from sheet
 * - Clean message flow
 */

const CONFIG = {
    botToken: process.env.BOT_TOKEN,
    sheetId: process.env.SPREADSHEET_ID,
    credentials: process.env.GOOGLE_CREDENTIALS,
    webhookSecret: process.env.WEBHOOK_SECRET,
    allowedUsers: (process.env.ALLOWED_USER_IDS || '').split(',').filter(Boolean)
};

const TELEGRAM_API = CONFIG.botToken ? `https://api.telegram.org/bot${CONFIG.botToken}` : null;
const SETUP_MODE = CONFIG.allowedUsers.length === 0;

// Pending transactions
const pending = new Map();

// ============ HELPERS ============
function checkRate(uid) {
    return true; // Simplified for now
}

function clean(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/<[^>]*>/g, '').replace(/[<>'"&]/g, '').slice(0, 500).trim();
}

function verifyOrigin(req) {
    if (!CONFIG.webhookSecret) return true;
    return req.headers['x-telegram-bot-api-secret-token'] === CONFIG.webhookSecret;
}

function isAllowed(uid) {
    if (SETUP_MODE) return true;
    return CONFIG.allowedUsers.includes(uid?.toString());
}

function fmt(n) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
}

// ============ TELEGRAM API ============
async function send(cid, txt, keyboard = null) {
    if (!TELEGRAM_API) return;
    const body = { chat_id: cid, text: txt, parse_mode: 'HTML' };
    if (keyboard) body.reply_markup = keyboard;
    try {
        const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return await res.json();
    } catch (e) { return null; }
}

async function deleteMessage(cid, mid) {
    if (!TELEGRAM_API) return;
    try {
        await fetch(`${TELEGRAM_API}/deleteMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: cid, message_id: mid })
        });
    } catch (e) { }
}

async function editMessage(cid, mid, txt, keyboard = null) {
    if (!TELEGRAM_API) return;
    const body = { chat_id: cid, message_id: mid, text: txt, parse_mode: 'HTML' };
    if (keyboard) body.reply_markup = keyboard;
    try {
        await fetch(`${TELEGRAM_API}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (e) { }
}

async function answerCallback(callbackId, text = '') {
    if (!TELEGRAM_API) return;
    try {
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text })
        });
    } catch (e) { }
}

// ============ KEYBOARDS ============

// Reply keyboard - always visible at bottom
const REPLY_KEYBOARD = {
    keyboard: [
        ['💸 Expense', '💚 Income'],
        ['💰 Balance', '📊 Month', '📜 Recent']
    ],
    resize_keyboard: true,
    persistent: true
};

// ============ DATA ACCESS ============
let sheets = null;

async function initData() {
    if (sheets) return sheets;
    if (!CONFIG.credentials) throw new Error('Config');
    const { google } = await import('googleapis');
    const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(CONFIG.credentials),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
    return sheets;
}

const getSheet = () => new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

// Get ALL categories from sheet
async function getCategories(type = 'expense') {
    const s = await initData();
    try {
        const r = await s.spreadsheets.values.get({ spreadsheetId: CONFIG.sheetId, range: "'_Categories'!A:E" });
        const rows = r.data.values || [];
        // Skip header, get all categories
        const cats = rows.slice(1)
            .filter(row => row[0]) // Has name
            .map(row => ({
                name: row[0],
                type: (row[1] || 'expense').toLowerCase(),
                icon: row[3] || '📦'
            }))
            .filter(c => c.type === type || c.type === 'both' || !c.type);

        console.log(`[BOT] Found ${cats.length} categories for ${type}`);

        if (cats.length === 0) {
            // Fallback defaults
            return type === 'income'
                ? [{ name: 'Salary', icon: '💰' }, { name: 'Freelance', icon: '💻' }, { name: 'Other', icon: '📦' }]
                : [{ name: 'Food', icon: '🍕' }, { name: 'Shopping', icon: '🛍️' }, { name: 'Transport', icon: '🚗' },
                { name: 'Bills', icon: '�' }, { name: 'Other', icon: '📦' }];
        }
        return cats;
    } catch (e) {
        console.error('[BOT] Category fetch error:', e);
        return [{ name: 'Other', icon: '📦' }];
    }
}

async function getAccounts() {
    const s = await initData();
    try {
        const r = await s.spreadsheets.values.get({ spreadsheetId: CONFIG.sheetId, range: "'_Accounts'!A:H" });
        return (r.data.values || []).slice(1)
            .filter(row => row[0] && row[7] !== 'true')
            .map(row => ({ id: row[0], name: row[1], type: row[2], balance: parseFloat(row[3]) || 0 }));
    } catch (e) { return []; }
}

async function saveTxn(d) {
    const s = await initData();
    const sheet = getSheet();
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

    try {
        const info = await s.spreadsheets.get({ spreadsheetId: CONFIG.sheetId, fields: 'sheets.properties.title' });
        if (!info.data.sheets.some(x => x.properties.title === sheet)) {
            await s.spreadsheets.batchUpdate({ spreadsheetId: CONFIG.sheetId, resource: { requests: [{ addSheet: { properties: { title: sheet } } }] } });
            await s.spreadsheets.values.update({
                spreadsheetId: CONFIG.sheetId,
                range: `'${sheet}'!A1:I1`,
                valueInputOption: 'RAW',
                resource: { values: [['ID', 'Date', 'Description', 'Amount', 'Category', 'AccountID', 'Type', 'CreatedAt', 'Friend']] }
            });
        }
    } catch (e) { }

    await s.spreadsheets.values.append({
        spreadsheetId: CONFIG.sheetId,
        range: `'${sheet}'!A:I`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [[id, d.date, d.desc, d.amt, d.cat, d.accountId || '', d.type, new Date().toISOString(), d.friend || '']] }
    });

    // Update account balance
    if (d.accountId) {
        try {
            const accts = await s.spreadsheets.values.get({ spreadsheetId: CONFIG.sheetId, range: "'_Accounts'!A:D" });
            const rows = accts.data.values || [];
            const idx = rows.findIndex(r => r[0] === d.accountId);
            if (idx > 0) {
                const oldBal = parseFloat(rows[idx][3]) || 0;
                const amt = d.type === 'income' ? Math.abs(d.amt) : -Math.abs(d.amt);
                await s.spreadsheets.values.update({
                    spreadsheetId: CONFIG.sheetId,
                    range: `'_Accounts'!D${idx + 1}`,
                    valueInputOption: 'RAW',
                    resource: { values: [[oldBal + amt]] }
                });
            }
        } catch (e) { }
    }

    return id;
}

async function getBal() {
    const accts = await getAccounts();
    return { total: accts.reduce((s, a) => s + a.balance, 0), accounts: accts };
}

async function getMonth() {
    const s = await initData();
    try {
        const r = await s.spreadsheets.values.get({ spreadsheetId: CONFIG.sheetId, range: `'${getSheet()}'!A:H` });
        const tx = (r.data.values || []).slice(1).map(x => ({ a: parseFloat(x[3]) || 0, c: x[4], t: x[6] }));
        const cats = {}; tx.filter(x => x.t === 'expense').forEach(x => { cats[x.c] = (cats[x.c] || 0) + Math.abs(x.a); });
        return {
            expense: tx.filter(x => x.t === 'expense').reduce((s, x) => s + Math.abs(x.a), 0),
            income: tx.filter(x => x.t === 'income').reduce((s, x) => s + x.a, 0),
            cats, count: tx.length
        };
    } catch (e) { return { expense: 0, income: 0, cats: {}, count: 0 }; }
}

async function getLast() {
    const s = await initData();
    try {
        const r = await s.spreadsheets.values.get({ spreadsheetId: CONFIG.sheetId, range: `'${getSheet()}'!A:I` });
        return (r.data.values || []).slice(1).map(x => ({
            d: x[2], a: parseFloat(x[3]) || 0, c: x[4], t: x[6], friend: x[8] || ''
        })).slice(-5).reverse();
    } catch (e) { return []; }
}

// ============ KEYBOARD BUILDERS ============
function buildCategoryKeyboard(cats, type) {
    const rows = [];
    // Show up to 10 categories in 2 columns
    for (let i = 0; i < Math.min(cats.length, 10); i += 2) {
        const row = [{ text: `${cats[i].icon} ${cats[i].name}`, callback_data: `cat:${type}:${cats[i].name}` }];
        if (cats[i + 1]) row.push({ text: `${cats[i + 1].icon} ${cats[i + 1].name}`, callback_data: `cat:${type}:${cats[i + 1].name}` });
        rows.push(row);
    }
    rows.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);
    return { inline_keyboard: rows };
}

function buildAccountKeyboard(accounts) {
    const rows = [];
    for (let i = 0; i < Math.min(accounts.length, 6); i += 2) {
        const icon1 = accounts[i].type === 'credit' ? '💳' : accounts[i].type === 'cash' ? '💵' : '🏦';
        const row = [{ text: `${icon1} ${accounts[i].name}`, callback_data: `acc:${accounts[i].id}` }];
        if (accounts[i + 1]) {
            const icon2 = accounts[i + 1].type === 'credit' ? '💳' : accounts[i + 1].type === 'cash' ? '💵' : '🏦';
            row.push({ text: `${icon2} ${accounts[i + 1].name}`, callback_data: `acc:${accounts[i + 1].id}` });
        }
        rows.push(row);
    }
    rows.push([{ text: '⏭️ Skip', callback_data: 'acc:skip' }]);
    return { inline_keyboard: rows };
}

// ============ FLOW HANDLERS ============
async function handleAmountInput(cid, uid, txt) {
    const p = pending.get(uid);
    if (!p || p.step !== 'amount') return false;

    const amtMatch = txt.match(/₹?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/);
    if (!amtMatch) {
        await send(cid, `🤔 Enter amount like: <code>500 food</code>`, REPLY_KEYBOARD);
        return true;
    }

    const amt = parseFloat(amtMatch[1].replace(/,/g, ''));
    if (amt <= 0 || amt > 10000000) {
        await send(cid, `❌ Invalid amount`, REPLY_KEYBOARD);
        return true;
    }

    let desc = clean(txt).replace(amtMatch[0], '').replace(/\b(spent|paid|for|on|rs|got|received|from|in|to)\b/gi, '').trim();
    if (desc) desc = desc.charAt(0).toUpperCase() + desc.slice(1);

    p.amt = amt;
    p.desc = desc || (p.type === 'income' ? 'Income' : 'Expense');
    p.date = new Date().toISOString().split('T')[0];
    p.step = 'category';
    pending.set(uid, p);

    const cats = await getCategories(p.type);
    const kb = buildCategoryKeyboard(cats, p.type);

    await send(cid, `<b>${fmt(amt)}</b> • ${p.desc}\n\nSelect category:`, kb);
    return true;
}

async function handleCategorySelect(cid, uid, mid, catName, type) {
    const p = pending.get(uid);
    if (!p || p.step !== 'category') return;

    p.cat = catName;
    p.step = 'account';
    pending.set(uid, p);

    // Delete the category selection message
    await deleteMessage(cid, mid);

    const accounts = await getAccounts();
    if (accounts.length === 0) {
        // No accounts, save directly
        await finishTransaction(cid, uid);
    } else {
        const kb = buildAccountKeyboard(accounts);
        await send(cid, `✓ <b>${catName}</b>\n\nSelect account:`, kb);
    }
}

async function handleAccountSelect(cid, uid, mid, accountId) {
    const p = pending.get(uid);
    if (!p || p.step !== 'account') return;

    if (accountId !== 'skip') {
        p.accountId = accountId;
        const accounts = await getAccounts();
        const acc = accounts.find(a => a.id === accountId);
        if (acc) p.accountName = acc.name;
    }

    pending.set(uid, p);

    // Delete the account selection message
    await deleteMessage(cid, mid);

    // Save transaction
    await finishTransaction(cid, uid);
}

async function finishTransaction(cid, uid) {
    const p = pending.get(uid);
    if (!p) return;

    try {
        await saveTxn(p);
        pending.delete(uid);

        const icon = p.type === 'income' ? '💚' : '✅';
        let m = `${icon} <b>Saved!</b>\n\n`;
        m += `${fmt(p.amt)} • ${p.desc}\n`;
        m += `📁 ${p.cat}`;
        if (p.accountName) m += ` • ${p.accountName}`;
        if (p.friend) m += `\n👤 ${p.friend}`;

        await send(cid, m, REPLY_KEYBOARD);
    } catch (e) {
        console.error('[BOT] Save error:', e);
        await send(cid, `❌ Error saving. Try again.`, REPLY_KEYBOARD);
        pending.delete(uid);
    }
}

async function cancelFlow(cid, uid, mid) {
    pending.delete(uid);
    await deleteMessage(cid, mid);
    await send(cid, `❌ Cancelled`, REPLY_KEYBOARD);
}

// ============ VIEW HANDLERS ============
async function showBalance(cid) {
    const { total, accounts } = await getBal();
    let m = `💰 <b>Balance</b>\n\n`;
    m += `Total: <code>${fmt(total)}</code>\n\n`;
    accounts.forEach(a => {
        const icon = a.type === 'credit' ? '💳' : a.type === 'cash' ? '💵' : '🏦';
        m += `${icon} ${a.name}: <code>${fmt(a.balance)}</code>\n`;
    });
    await send(cid, m, REPLY_KEYBOARD);
}

async function showMonth(cid) {
    const { expense, income, cats, count } = await getMonth();
    const mn = new Date().toLocaleDateString('en-US', { month: 'long' });
    let m = `📊 <b>${mn}</b>\n\n`;
    m += `📉 Spent: <code>${fmt(expense)}</code>\n`;
    m += `📈 Earned: <code>${fmt(income)}</code>\n`;
    m += `📋 ${count} transactions\n`;
    if (Object.keys(cats).length > 0) {
        m += '\n<b>By Category:</b>\n';
        Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([c, a]) => {
            m += `• ${c}: <code>${fmt(a)}</code>\n`;
        });
    }
    await send(cid, m, REPLY_KEYBOARD);
}

async function showRecent(cid) {
    const tx = await getLast();
    if (tx.length === 0) {
        await send(cid, `📜 No recent transactions`, REPLY_KEYBOARD);
    } else {
        let m = `📜 <b>Recent</b>\n\n`;
        tx.forEach(x => {
            const sign = x.t === 'income' ? '+' : '-';
            m += `• ${x.d}: ${sign}<code>${fmt(Math.abs(x.a))}</code>`;
            if (x.friend) m += ` 👤${x.friend}`;
            m += `\n`;
        });
        await send(cid, m, REPLY_KEYBOARD);
    }
}

// ============ MAIN HANDLER ============
export default async function handler(req, res) {
    if (req.method === 'GET') return res.status(200).json({ status: 'ok' });
    if (req.method !== 'POST') return res.status(405).end();

    if (!CONFIG.botToken || !CONFIG.sheetId || !CONFIG.credentials) {
        return res.status(503).end();
    }

    if (CONFIG.webhookSecret && !verifyOrigin(req)) {
        return res.status(401).end();
    }

    try {
        const u = req.body;

        // Handle inline button presses
        if (u.callback_query) {
            const cq = u.callback_query;
            const cid = cq.message.chat.id;
            const mid = cq.message.message_id;
            const uid = cq.from?.id?.toString();
            const data = cq.data;

            if (!isAllowed(uid)) {
                await answerCallback(cq.id, '⛔ Access denied');
                return res.status(200).end();
            }

            await answerCallback(cq.id);

            if (data.startsWith('cat:')) {
                const [, type, ...nameParts] = data.split(':');
                await handleCategorySelect(cid, uid, mid, nameParts.join(':'), type);
            } else if (data.startsWith('acc:')) {
                const accId = data.replace('acc:', '');
                await handleAccountSelect(cid, uid, mid, accId);
            } else if (data === 'cancel') {
                await cancelFlow(cid, uid, mid);
            }

            return res.status(200).end();
        }

        // Handle text messages
        if (!u?.message?.text) return res.status(200).end();

        const cid = u.message.chat.id;
        const uid = u.message.from?.id?.toString();
        const txt = u.message.text.trim();
        const name = u.message.from?.first_name || '';

        if (!isAllowed(uid)) {
            await send(cid, `⛔ Access denied`);
            return res.status(200).end();
        }

        // Check if user is in a flow
        const p = pending.get(uid);
        if (p && p.step === 'amount') {
            await handleAmountInput(cid, uid, txt);
            return res.status(200).end();
        }

        // Reply keyboard buttons
        if (txt === '💸 Expense') {
            pending.set(uid, { step: 'amount', type: 'expense' });
            await send(cid, `💸 <b>New Expense</b>\n\nType amount and description:\n<code>500 lunch</code>`, REPLY_KEYBOARD);
            return res.status(200).end();
        }

        if (txt === '💚 Income') {
            pending.set(uid, { step: 'amount', type: 'income' });
            await send(cid, `💚 <b>New Income</b>\n\nType amount and source:\n<code>50000 salary</code>`, REPLY_KEYBOARD);
            return res.status(200).end();
        }

        if (txt === '💰 Balance') {
            await showBalance(cid);
            return res.status(200).end();
        }

        if (txt === '📊 Month') {
            await showMonth(cid);
            return res.status(200).end();
        }

        if (txt === '📜 Recent') {
            await showRecent(cid);
            return res.status(200).end();
        }

        // /start
        if (txt === '/start') {
            let m = `� Hey${name ? ' ' + name : ''}!\n\n`;
            m += `Track your money easily.\n\n`;
            m += `Use the buttons below 👇`;
            await send(cid, m, REPLY_KEYBOARD);
            return res.status(200).end();
        }

        // Quick entry - if message has a number, treat as expense
        const amtMatch = txt.match(/₹?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/);
        if (amtMatch) {
            const isIncome = /\b(got|received|salary|income|credited)\b/i.test(txt.toLowerCase());
            pending.set(uid, { step: 'amount', type: isIncome ? 'income' : 'expense' });
            await handleAmountInput(cid, uid, txt);
            return res.status(200).end();
        }

        // Default
        await send(cid, `Use buttons below or type:\n<code>500 food</code>`, REPLY_KEYBOARD);
        return res.status(200).end();

    } catch (e) {
        console.error('[BOT] Error:', e);
        return res.status(200).end();
    }
}
