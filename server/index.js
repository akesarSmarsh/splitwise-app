import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dataPath = process.env.DATA_PATH || join(__dirname, 'data.json');

const initialData = {
  users: [
    { id: 1, name: 'You', avatar: '👤', color: '#6366F1' },
    { id: 2, name: 'Alex', avatar: '🧑', color: '#EC4899' },
    { id: 3, name: 'Sam', avatar: '👩', color: '#10B981' },
    { id: 4, name: 'Jordan', avatar: '🧔', color: '#F59E0B' }
  ],
  expenses: [],
  settlements: [],
  nextId: { user: 5, expense: 1, settlement: 1 }
};

let data;
if (existsSync(dataPath)) {
  data = JSON.parse(readFileSync(dataPath, 'utf-8'));
} else {
  data = initialData;
  saveData();
}

function saveData() {
  writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

app.get('/api/users', (req, res) => {
  res.json(data.users);
});

app.post('/api/users', (req, res) => {
  const { name } = req.body;
  const avatars = ['😀', '😎', '🤓', '🧑‍💼', '👨‍🎨', '👩‍🔬', '🧑‍🚀', '👨‍🍳'];
  const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];
  
  const newUser = {
    id: data.nextId.user++,
    name,
    avatar: avatars[data.users.length % avatars.length],
    color: colors[data.users.length % colors.length]
  };
  
  data.users.push(newUser);
  saveData();
  res.json(newUser);
});

app.delete('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const hasExpenses = data.expenses.some(e => e.paidBy === id || e.splitWith.includes(id));
  if (hasExpenses) {
    return res.status(400).json({ error: 'Cannot delete user with existing expenses.' });
  }
  data.users = data.users.filter(u => u.id !== id);
  saveData();
  res.json({ success: true });
});

app.get('/api/expenses', (req, res) => {
  res.json(data.expenses);
});

app.post('/api/expenses', (req, res) => {
  const { description, amount, paidBy, category, splitWith, isSettlement, date } = req.body;
  const newExpense = {
    id: data.nextId.expense++,
    description,
    amount,
    paidBy,
    category: category || 'other',
    splitWith,
    isSettlement: isSettlement || false,
    date: date || new Date().toISOString()
  };
  data.expenses.unshift(newExpense);
  saveData();
  res.json(newExpense);
});

app.put('/api/expenses/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { description, amount, paidBy, category, splitWith, date } = req.body;
  const index = data.expenses.findIndex(e => e.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  data.expenses[index] = { ...data.expenses[index], description, amount, paidBy, category, splitWith, date };
  saveData();
  res.json(data.expenses[index]);
});

app.delete('/api/expenses/:id', (req, res) => {
  const id = parseInt(req.params.id);
  data.expenses = data.expenses.filter(e => e.id !== id);
  saveData();
  res.json({ success: true });
});

app.get('/api/settlements', (req, res) => {
  res.json(data.settlements);
});

app.post('/api/settlements', (req, res) => {
  const { from, to, amount } = req.body;
  const fromUser = data.users.find(u => u.id === from);
  const toUser = data.users.find(u => u.id === to);
  const newSettlement = {
    id: data.nextId.settlement++,
    from, to, amount,
    date: new Date().toISOString(),
    fromName: fromUser?.name,
    toName: toUser?.name
  };
  data.settlements.unshift(newSettlement);
  saveData();
  res.json(newSettlement);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
