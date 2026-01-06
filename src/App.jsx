import React, { useState, useEffect } from 'react';
import { 
  Plus, Users, Receipt, TrendingUp, PieChart, ArrowUpRight, 
  ArrowDownRight, Wallet, DollarSign, Calendar, Tag, Trash2, 
  Edit2, Check, X, Sparkles, Brain, Target, AlertTriangle,
  ChevronDown, User, CreditCard, Home, Utensils, Car, Film,
  ShoppingBag, Plane, Heart, MoreHorizontal
} from 'lucide-react';
import { 
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line,
  CartesianGrid, Legend, Area, AreaChart
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const CATEGORIES = [
  { id: 'food', name: 'Food & Dining', icon: Utensils, color: '#FF6B6B' },
  { id: 'transport', name: 'Transport', icon: Car, color: '#4ECDC4' },
  { id: 'entertainment', name: 'Entertainment', icon: Film, color: '#45B7D1' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: '#96CEB4' },
  { id: 'travel', name: 'Travel', icon: Plane, color: '#FFEAA7' },
  { id: 'utilities', name: 'Utilities', icon: Home, color: '#DDA0DD' },
  { id: 'health', name: 'Health', icon: Heart, color: '#FF69B4' },
  { id: 'other', name: 'Other', icon: MoreHorizontal, color: '#95A5A6' },
];

const API_URL = import.meta.env.VITE_API_URL || '/api';

function App() {
  const [expenses, setExpenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [settlementHistory, setSettlementHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, expensesRes, settlementsRes] = await Promise.all([
          fetch(`${API_URL}/users`),
          fetch(`${API_URL}/expenses`),
          fetch(`${API_URL}/settlements`)
        ]);
        setUsers(await usersRes.json());
        setExpenses(await expensesRes.json());
        setSettlementHistory(await settlementsRes.json());
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (expenses.length > 0) generateAIInsights();
  }, [expenses]);

  const generateAIInsights = () => {
    const insights = [];
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const categoryTotals = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      const categoryInfo = CATEGORIES.find(c => c.id === topCategory[0]);
      insights.push({
        type: 'spending', icon: TrendingUp,
        title: 'Top Spending Category',
        message: `${categoryInfo?.name || topCategory[0]} accounts for ${((topCategory[1] / totalSpent) * 100).toFixed(1)}% of your expenses`,
        color: 'blue'
      });
    }

    const recentExpenses = expenses.filter(e => new Date(e.date) > subDays(new Date(), 7));
    const recentTotal = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const avgWeekly = totalSpent / 4;
    
    if (recentTotal > avgWeekly * 1.2) {
      insights.push({
        type: 'warning', icon: AlertTriangle,
        title: 'Spending Alert',
        message: `You've spent ₹${recentTotal.toLocaleString('en-IN')} this week, above average`,
        color: 'orange'
      });
    }
    setAiInsights(insights);
  };

  const calculateBalances = () => {
    const balances = {};
    users.forEach(u => balances[u.id] = 0);
    expenses.forEach(expense => {
      const splitAmount = expense.amount / expense.splitWith.length;
      balances[expense.paidBy] += expense.amount;
      expense.splitWith.forEach(userId => {
        balances[userId] -= splitAmount;
      });
    });
    return balances;
  };

  const getSettlements = () => {
    const balances = calculateBalances();
    const debtors = Object.entries(balances)
      .filter(([_, balance]) => balance < -1)
      .map(([id, balance]) => ({ id: parseInt(id), amount: Math.abs(balance) }))
      .sort((a, b) => b.amount - a.amount);
    const creditors = Object.entries(balances)
      .filter(([_, balance]) => balance > 1)
      .map(([id, balance]) => ({ id: parseInt(id), amount: balance }))
      .sort((a, b) => b.amount - a.amount);

    const settlements = [];
    while (debtors.length > 0 && creditors.length > 0) {
      debtors.sort((a, b) => b.amount - a.amount);
      creditors.sort((a, b) => b.amount - a.amount);
      const debtor = debtors[0];
      const creditor = creditors[0];
      const amount = Math.min(debtor.amount, creditor.amount);
      if (amount > 1) {
        settlements.push({ from: debtor.id, to: creditor.id, amount: Math.round(amount) });
      }
      debtor.amount -= amount;
      creditor.amount -= amount;
      if (debtor.amount < 1) debtors.shift();
      if (creditor.amount < 1) creditors.shift();
    }
    return settlements;
  };

  const getCategoryData = () => {
    const categoryTotals = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
    return Object.entries(categoryTotals).map(([category, amount]) => {
      const cat = CATEGORIES.find(c => c.id === category);
      return { name: cat?.name || category, value: amount, color: cat?.color || '#95A5A6' };
    });
  };

  const getMonthlyTrend = () => {
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayExpenses = expenses.filter(e => 
        format(new Date(e.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      last30Days.push({
        date: format(date, 'MMM dd'),
        amount: dayExpenses.reduce((sum, e) => sum + e.amount, 0)
      });
    }
    return last30Days;
  };

  const addExpense = async (expense) => {
    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
      const newExpense = await response.json();
      setExpenses([newExpense, ...expenses]);
      setShowAddExpense(false);
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const updateExpense = async (updatedExpense) => {
    try {
      const response = await fetch(`${API_URL}/expenses/${updatedExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedExpense)
      });
      const updated = await response.json();
      setExpenses(expenses.map(e => e.id === updated.id ? updated : e));
      setEditingExpense(null);
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  const deleteExpense = async (id) => {
    try {
      await fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const settleUp = async (settlement) => {
    const fromUser = users.find(u => u.id === settlement.from);
    const toUser = users.find(u => u.id === settlement.to);
    try {
      const expenseResponse = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Settlement: ${fromUser?.name} paid ${toUser?.name}`,
          amount: settlement.amount,
          paidBy: settlement.from,
          splitWith: [settlement.to],
          category: 'other',
          isSettlement: true
        })
      });
      const settlementExpense = await expenseResponse.json();
      const settlementResponse = await fetch(`${API_URL}/settlements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settlement)
      });
      const newSettlement = await settlementResponse.json();
      setExpenses([settlementExpense, ...expenses]);
      setSettlementHistory([newSettlement, ...settlementHistory]);
    } catch (error) {
      console.error('Error settling up:', error);
    }
  };

  const addUser = async (name) => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const newUser = await response.json();
      setUsers([...users, newUser]);
      setShowAddUser(false);
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const deleteUser = async (id) => {
    try {
      const response = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        const error = await response.json();
        alert(error.error || 'Cannot delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const balances = calculateBalances();
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const myBalance = users.length > 0 ? (balances[users[0]?.id] || 0) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">SplitWise AI</h1>
                <p className="text-xs text-gray-400">Smart Expense Tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAddUser(true)} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />Add Member
              </button>
              <button onClick={() => setShowAddExpense(true)} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white text-sm font-medium flex items-center gap-2">
                <Plus className="w-4 h-4" />Add Expense
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-black/10 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: PieChart },
              { id: 'expenses', label: 'Expenses', icon: Receipt },
              { id: 'balances', label: 'Balances', icon: Users },
              { id: 'analytics', label: 'AI Analytics', icon: Brain },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === tab.id ? 'text-purple-400 border-purple-400' : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView expenses={expenses} users={users} balances={balances} totalExpenses={totalExpenses} myBalance={myBalance} categoryData={getCategoryData()} monthlyTrend={getMonthlyTrend()} aiInsights={aiInsights} />
        )}
        {activeTab === 'expenses' && (
          <ExpensesView expenses={expenses} users={users} onEdit={setEditingExpense} onDelete={deleteExpense} />
        )}
        {activeTab === 'balances' && (
          <BalancesView users={users} balances={balances} settlements={getSettlements()} onSettle={settleUp} settlementHistory={settlementHistory} onDeleteUser={deleteUser} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsView expenses={expenses} users={users} categoryData={getCategoryData()} monthlyTrend={getMonthlyTrend()} aiInsights={aiInsights} />
        )}
      </main>

      {showAddExpense && <ExpenseModal users={users} onSave={addExpense} onClose={() => setShowAddExpense(false)} />}
      {editingExpense && <ExpenseModal expense={editingExpense} users={users} onSave={updateExpense} onClose={() => setEditingExpense(null)} />}
      {showAddUser && <AddUserModal onSave={addUser} onClose={() => setShowAddUser(false)} />}
    </div>
  );
}

function DashboardView({ expenses, users, balances, totalExpenses, myBalance, categoryData, monthlyTrend, aiInsights }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-5 border border-purple-500/30">
          <p className="text-gray-400 text-sm">Total Expenses</p>
          <p className="text-2xl font-bold text-white mt-1">₹{totalExpenses.toLocaleString('en-IN')}</p>
        </div>
        <div className={`bg-gradient-to-br ${myBalance >= 0 ? 'from-green-500/20 to-green-600/20 border-green-500/30' : 'from-red-500/20 to-red-600/20 border-red-500/30'} backdrop-blur-sm rounded-2xl p-5 border`}>
          <p className="text-gray-400 text-sm">Your Balance</p>
          <p className="text-2xl font-bold text-white mt-1">{myBalance >= 0 ? '+' : ''}₹{Math.abs(myBalance).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/30">
          <p className="text-gray-400 text-sm">This Month</p>
          <p className="text-2xl font-bold text-white mt-1">₹{expenses.filter(e => isWithinInterval(new Date(e.date), { start: startOfMonth(new Date()), end: endOfMonth(new Date()) })).reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 backdrop-blur-sm rounded-2xl p-5 border border-pink-500/30">
          <p className="text-gray-400 text-sm">Group Members</p>
          <p className="text-2xl font-bold text-white mt-1">{users.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <h3 className="text-white font-semibold mb-4">Spending by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                  {categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <h3 className="text-white font-semibold mb-4">30-Day Spending Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
                <YAxis stroke="#9CA3AF" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Spent']} />
                <Area type="monotone" dataKey="amount" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpensesView({ expenses, users, onEdit, onDelete }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 text-gray-400 text-sm font-medium">
        <div className="col-span-4">Description</div>
        <div className="col-span-2">Category</div>
        <div className="col-span-2">Paid By</div>
        <div className="col-span-2">Date</div>
        <div className="col-span-1 text-right">Amount</div>
        <div className="col-span-1"></div>
      </div>
      {expenses.map(expense => {
        const category = CATEGORIES.find(c => c.id === expense.category);
        const paidByUser = users.find(u => u.id === expense.paidBy);
        return (
          <div key={expense.id} className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 hover:bg-white/5 items-center">
            <div className="col-span-4">
              <p className="text-white font-medium">{expense.description}</p>
              <p className="text-gray-400 text-xs">Split with {expense.splitWith.length} people</p>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${category?.color}20` }}>
                {category && <category.icon className="w-4 h-4" style={{ color: category.color }} />}
              </div>
              <span className="text-gray-300 text-sm">{category?.name}</span>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <span className="text-lg">{paidByUser?.avatar}</span>
              <span className="text-gray-300 text-sm">{paidByUser?.name}</span>
            </div>
            <div className="col-span-2 text-gray-400 text-sm">{format(new Date(expense.date), 'MMM dd, yyyy')}</div>
            <div className="col-span-1 text-right text-white font-semibold">₹{expense.amount.toLocaleString('en-IN')}</div>
            <div className="col-span-1 flex justify-end gap-2">
              <button onClick={() => onEdit(expense)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => onDelete(expense.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BalancesView({ users, balances, settlements, onSettle, settlementHistory, onDeleteUser }) {
  const [confirmSettle, setConfirmSettle] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {users.map(user => {
          const balance = balances[user.id] || 0;
          return (
            <div key={user.id} className={`bg-gradient-to-br ${balance >= 0 ? 'from-green-500/20 to-green-600/20 border-green-500/30' : 'from-red-500/20 to-red-600/20 border-red-500/30'} backdrop-blur-sm rounded-2xl p-5 border relative group`}>
              {confirmDeleteUser !== user.id && (
                <button onClick={() => setConfirmDeleteUser(user.id)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/20 opacity-0 group-hover:opacity-100 hover:bg-red-500/30">
                  <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                </button>
              )}
              {confirmDeleteUser === user.id && (
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => { onDeleteUser(user.id); setConfirmDeleteUser(null); }} className="p-1.5 rounded-lg bg-red-500"><Check className="w-4 h-4 text-white" /></button>
                  <button onClick={() => setConfirmDeleteUser(null)} className="p-1.5 rounded-lg bg-gray-600"><X className="w-4 h-4 text-white" /></button>
                </div>
              )}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: `${user.color}30` }}>{user.avatar}</div>
                <div>
                  <p className="text-white font-semibold">{user.name}</p>
                  <p className="text-gray-400 text-xs">{balance >= 0 ? 'Gets back' : 'Owes'}</p>
                </div>
              </div>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{balance >= 0 ? '+' : '-'}₹{Math.abs(balance).toLocaleString('en-IN')}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-purple-400" />Pending Settlements</h3>
        {settlements.length === 0 ? (
          <div className="text-center py-8">
            <Check className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-white font-medium">All settled up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {settlements.map((settlement, idx) => {
              const fromUser = users.find(u => u.id === settlement.from);
              const toUser = users.find(u => u.id === settlement.to);
              return (
                <div key={idx} className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{fromUser?.avatar}</span>
                    <span className="text-white">{fromUser?.name}</span>
                    <ArrowUpRight className="w-5 h-5 text-purple-400" />
                    <span className="text-2xl">{toUser?.avatar}</span>
                    <span className="text-white">{toUser?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-white">₹{settlement.amount.toLocaleString('en-IN')}</span>
                    {confirmSettle === idx ? (
                      <div className="flex gap-2">
                        <button onClick={() => { onSettle(settlement); setConfirmSettle(null); }} className="px-4 py-2 bg-green-500 rounded-lg text-white text-sm">Confirm</button>
                        <button onClick={() => setConfirmSettle(null)} className="px-3 py-2 bg-gray-600 rounded-lg text-white text-sm"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmSettle(idx)} className="px-4 py-2 bg-purple-500 rounded-lg text-white text-sm">Settle</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {settlementHistory.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <h3 className="text-white font-semibold mb-4">Settlement History</h3>
          <div className="space-y-3">
            {settlementHistory.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                <div className="flex items-center gap-4">
                  <Check className="w-5 h-5 text-green-400" />
                  <span className="text-white">{s.fromName} paid {s.toName}</span>
                  <span className="text-gray-400 text-sm">{format(new Date(s.date), 'MMM dd, yyyy')}</span>
                </div>
                <span className="text-lg font-bold text-green-400">₹{s.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsView({ expenses, users, categoryData, monthlyTrend, aiInsights }) {
  const getMonthlyData = () => {
    const monthlyTotals = {};
    expenses.forEach(e => {
      const monthKey = format(new Date(e.date), 'MMM yyyy');
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + e.amount;
    });
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = format(date, 'MMM yyyy');
      months.push({ month: format(date, 'MMM'), total: monthlyTotals[monthKey] || 0 });
    }
    return months;
  };

  const monthlyData = getMonthlyData();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">AI-Powered Insights</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiInsights.map((insight, idx) => (
            <div key={idx} className="bg-black/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${insight.color === 'blue' ? 'bg-blue-500/20' : insight.color === 'orange' ? 'bg-orange-500/20' : 'bg-green-500/20'}`}>
                  <insight.icon className={`w-5 h-5 ${insight.color === 'blue' ? 'text-blue-400' : insight.color === 'orange' ? 'text-orange-400' : 'text-green-400'}`} />
                </div>
                <div>
                  <p className="text-white font-semibold">{insight.title}</p>
                  <p className="text-gray-400 text-sm mt-1">{insight.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h3 className="text-white font-semibold mb-4">Monthly Expense Totals</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={10} tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Total']} />
              <Bar dataKey="total" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h3 className="text-white font-semibold mb-4">Category Breakdown</h3>
        <div className="space-y-3">
          {categoryData.sort((a, b) => b.value - a.value).map((cat, idx) => {
            const total = categoryData.reduce((sum, c) => sum + c.value, 0);
            const percentage = total > 0 ? (cat.value / total * 100).toFixed(1) : 0;
            return (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-300 text-sm">{cat.name}</span>
                  <span className="text-white font-medium">₹{cat.value.toLocaleString('en-IN')} ({percentage}%)</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: cat.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ExpenseModal({ expense, users, onSave, onClose }) {
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [paidBy, setPaidBy] = useState(expense?.paidBy || users[0]?.id);
  const [splitWith, setSplitWith] = useState(expense?.splitWith || users.map(u => u.id));
  const [category, setCategory] = useState(expense?.category || 'food');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !amount) return;
    onSave({ ...(expense || {}), description, amount: parseFloat(amount), paidBy, splitWith, category, date: expense?.date || new Date().toISOString() });
  };

  const toggleSplitWith = (userId) => {
    if (splitWith.includes(userId)) {
      if (splitWith.length > 1) setSplitWith(splitWith.filter(id => id !== userId));
    } else {
      setSplitWith([...splitWith, userId]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg border border-white/10">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{expense ? 'Edit Expense' : 'Add New Expense'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this expense for?" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" required />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">Amount (₹)</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" required />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${category === cat.id ? 'bg-purple-500/30 border-purple-500' : 'bg-white/5 border-transparent hover:bg-white/10'} border`}>
                  <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                  <span className="text-xs text-gray-300">{cat.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">Paid By</label>
            <div className="flex gap-2 flex-wrap">
              {users.map(user => (
                <button key={user.id} type="button" onClick={() => setPaidBy(user.id)} className={`px-4 py-2 rounded-xl flex items-center gap-2 ${paidBy === user.id ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
                  <span>{user.avatar}</span><span className="text-sm">{user.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">Split With</label>
            <div className="flex gap-2 flex-wrap">
              {users.map(user => (
                <button key={user.id} type="button" onClick={() => toggleSplitWith(user.id)} className={`px-4 py-2 rounded-xl flex items-center gap-2 ${splitWith.includes(user.id) ? 'bg-green-500/30 border-green-500 text-white' : 'bg-white/5 border-transparent text-gray-300 hover:bg-white/10'} border`}>
                  {splitWith.includes(user.id) && <Check className="w-4 h-4" />}
                  <span>{user.avatar}</span><span className="text-sm">{user.name}</span>
                </button>
              ))}
            </div>
            {splitWith.length > 0 && amount && <p className="text-gray-400 text-sm mt-2">Each person pays: ₹{(parseFloat(amount) / splitWith.length).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-medium">{expense ? 'Update' : 'Add'} Expense</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddUserModal({ onSave, onClose }) {
  const [name, setName] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); if (name.trim()) onSave(name.trim()); };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-white/10">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add Group Member</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter member name" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" autoFocus required />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-medium">Add Member</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
