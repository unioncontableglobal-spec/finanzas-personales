import React, { useContext, useMemo } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Label } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Shield, Printer } from 'lucide-react';
import './Dashboard.css';

const COLORS = ['#e81cff', '#facc15', '#38bdf8', '#4ade80', '#f97316', '#a855f7', '#64748b'];

const getAccountStyle = (id) => {
  if (id.includes('Efectivo')) return 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
  if (id.includes('BINANCE')) return 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)';
  return 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'; // Kontigo
};

export const Chart = ({ transactions, filterMonth, filterYear, totalExpense, renderAmount, pendingGroceriesTotal = 0 }) => {
  const expensesThisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return t.type === 'expense' && d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const data = expensesThisMonth.reduce((acc, curr) => {
    const totalAmt = parseFloat(curr.amount || 0);
    const paidAmt = curr.isPaid ? totalAmt : (curr.payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const pendingAmt = Math.max(0, totalAmt - paidAmt);

    if (pendingAmt > 0) {
      const existing = acc.find(item => item.name === curr.category);
      if (existing) {
        existing.value += pendingAmt;
      } else {
        acc.push({ name: curr.category, value: pendingAmt });
      }
    }
    return acc;
  }, []);

  const pendingSalud = pendingGroceriesTotal.salud || 0;
  const pendingRest = pendingGroceriesTotal.rest || 0;

  if (pendingSalud > 0) {
    data.push({ name: 'Mercado Estimado (Salud/Medicinas)', value: pendingSalud });
  }
  if (pendingRest > 0) {
    data.push({ name: 'Mercado Estimado (General)', value: pendingRest });
  }

  const totalPendingInCategories = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0) {
    return <div className="no-data-chart">No hay deudas pendientes por categoría este mes</div>;
  }

  // Sort data descending by value
  data.sort((a, b) => b.value - a.value);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {data.map((entry, index) => {
        const pct = totalPendingInCategories > 0 ? (entry.value / totalPendingInCategories) * 100 : 0;
        const color = COLORS[index % COLORS.length];
        
        return (
          <div key={`cat-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }}></div>
                <span style={{ fontWeight: '600', color: 'var(--color-text-main)', fontSize: '0.95rem' }}>{entry.name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--color-text-main)', fontWeight: '700', fontSize: '0.95rem' }}>
                  {renderAmount(entry.value)}
                </span>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginLeft: '6px' }}>
                  ({pct.toFixed(0)}%)
                </span>
              </div>
            </div>
            
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                backgroundColor: color,
                borderRadius: '999px',
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
              }}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Dashboard = () => {
  const { transactions, savings, cajas, appSettings, groceries } = useContext(FinanceContext);

  const isBs = appSettings?.displayCurrency === 'VES';
  const rate = appSettings?.exchangeRate || 43;
  const rateUSDT = appSettings?.usdtRate || 44;
  const savingsCurrencies = appSettings?.savingsCurrencies || {};

  const renderAmount = (usdAmount, prefix = '$', noSymbol = false) => {
    if (isBs) {
      const v = (parseFloat(usdAmount || 0) * rate).toFixed(2);
      return noSymbol ? v : `Bs ${v}`;
    }
    const v = parseFloat(usdAmount || 0).toFixed(2);
    return noSymbol ? v : `${prefix}${v}`;
  };

  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${yyyy}-${mm}`;
  });

  const [yearStr, monthStr] = selectedMonth.split('-');
  const filterYear = parseInt(yearStr, 10);
  const filterMonth = parseInt(monthStr, 10) - 1;

  let prevMonth = filterMonth - 1;
  let prevYear = filterYear;
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear -= 1;
  }

  const getStatsForMonth = (m, y) => {
    const monthlyTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    
    const income = monthlyTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expense = monthlyTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    return { income, expense, balance: income - expense };
  };

  const currentStats = getStatsForMonth(filterMonth, filterYear);
  const prevStats = getStatsForMonth(prevMonth, prevYear);

  // === NEW KPIs ===
  const pendingGroceriesTotal = useMemo(() => {
    return (groceries || []).filter(g => !g.checked).reduce((acc, g) => {
      const p = parseFloat(g.price) || 0;
      const q = parseFloat(g.quantity) || 1;
      const amount = p * q;
      acc.total += amount;
      if (g.category === 'Salud' || g.category === 'Medicinas') {
        acc.salud += amount;
      } else {
        acc.rest += amount;
      }
      return acc;
    }, { total: 0, salud: 0, rest: 0 });
  }, [groceries]);

  const totalPendingDebts = useMemo(() => {
    const basePending = transactions
      .filter(t => t.type === 'expense' && !t.isPaid)
      .reduce((s, t) => s + (t.amount || 0), 0);
    return basePending + pendingGroceriesTotal.total;
  }, [transactions, pendingGroceriesTotal]);

  const totalPatrimony = useMemo(() => {
    const totalSavings = Object.entries(savings).reduce((sum, [key, val]) => {
      const curr = savingsCurrencies[key] || 'USD';
      let usdVal = val;
      if (curr === 'USDT') usdVal = val * (rateUSDT / rate);
      else if (curr === 'VES') usdVal = val / rate;
      return sum + usdVal;
    }, 0);
    const totalCajas = Object.values(cajas).reduce((s, v) => s + v, 0);
    return totalSavings + totalCajas;
  }, [savings, cajas, savingsCurrencies, rate, rateUSDT]);

  const calcChange = (current, prev) => {
    if (prev === 0 && current === 0) return { val: 0, text: '0%', type: 'neutral', icon: <Minus size={14}/> };
    if (prev === 0) return { val: 100, text: '+100%', type: 'positive', icon: <TrendingUp size={14}/> };
    
    const diff = current - prev;
    const percent = (diff / prev) * 100;
    
    if (percent > 0) return { val: percent, text: `+${percent.toFixed(0)}%`, type: 'positive', icon: <TrendingUp size={14}/> };
    if (percent < 0) return { val: percent, text: `${percent.toFixed(0)}%`, type: 'negative', icon: <TrendingDown size={14}/> };
    return { val: 0, text: '0%', type: 'neutral', icon: <Minus size={14}/> };
  };

  const incomeChange = calcChange(currentStats.income, prevStats.income);
  const expenseChange = calcChange(currentStats.expense, prevStats.expense);

  const expensesByContributor = transactions
    .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === filterMonth && new Date(t.date).getFullYear() === filterYear)
    .reduce((acc, t) => {
      const person = t.contributor || 'Sin asignar / Común';
      if (!acc[person]) acc[person] = { total: 0, paid: 0, pending: 0 };
      
      const totalAmt = parseFloat(t.amount || 0);
      const paidAmt = t.isPaid ? totalAmt : (t.payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
      const pendingAmt = Math.max(0, totalAmt - paidAmt);

      acc[person].total += totalAmt;
      acc[person].paid += paidAmt;
      acc[person].pending += pendingAmt;
      return acc;
    }, {});

  const totalExpensePaid = Object.values(expensesByContributor).reduce((s, v) => s + v.paid, 0);
  const totalExpensePending = Object.values(expensesByContributor).reduce((s, v) => s + v.pending, 0);

  const handlePrint = () => window.print();

  return (
    <div className="dashboard" id="printable-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Inicio</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="modern-input no-print"
            style={{ width: 'auto', padding: '0.4rem 0.8rem' }}
          />
          <button 
            onClick={handlePrint}
            className="no-print"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: 'var(--color-primary)', color: '#fff',
              border: 'none', padding: '8px 16px', borderRadius: '8px',
              cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem'
            }}
          >
            <Printer size={16} /> PDF
          </button>
        </div>
      </div>


      
      {/* KPI Grid — 5 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {/* Balance Neto */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Balance Neto</p>
          <p style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: '800', margin: 0, color: currentStats.balance >= 0 ? '#0f172a' : '#ef4444' }}>
            {renderAmount(currentStats.balance)}
          </p>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Disponible tras gastos</div>
        </div>

        {/* Ingresos */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ingresos</p>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 8px', borderRadius: '999px', background: incomeChange.type === 'positive' ? '#dcfce7' : '#f1f5f9', color: incomeChange.type === 'positive' ? '#16a34a' : '#64748b' }}>
              {incomeChange.text}
            </span>
          </div>
          <p style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: '800', margin: 0, color: '#10b981' }}>{renderAmount(currentStats.income)}</p>
        </div>

        {/* Gastos */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gastos</p>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 8px', borderRadius: '999px', background: expenseChange.type === 'positive' ? '#fee2e2' : '#dcfce7', color: expenseChange.type === 'positive' ? '#ef4444' : '#16a34a' }}>
              {expenseChange.text}
            </span>
          </div>
          <p style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: '800', margin: 0, color: '#f43f5e' }}>{renderAmount(currentStats.expense)}</p>
        </div>

        {/* Deudas Pendientes */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} color="#d97706" />
            <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#d97706', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Por Pagar</p>
          </div>
          <p style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: '800', margin: 0, color: '#b45309' }}>{renderAmount(totalPendingDebts)}</p>
          <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: '600' }}>
            Incluye {renderAmount(pendingGroceriesTotal.total)} de mercado estimado
          </div>
        </div>


      </div>

      <div className="dashboard-grid" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="card contributor-card" style={{ flex: '1 1 300px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: 'var(--color-text-main)' }}>Gastos por Responsable (Pagado vs Deuda)</h3>
          {Object.keys(expensesByContributor).length === 0 ? (
            <p className="empty-msg">No hay gastos asignados a responsables este mes.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(expensesByContributor).map(([person, data]) => {
                const { total, paid, pending } = data;
                const paidPct = total > 0 ? (paid / total * 100) : 0;
                
                return (
                  <li key={person}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', color: 'var(--color-text-main)', fontSize: '0.95rem' }}>{person}</span>
                      <span style={{ color: 'var(--color-text-main)', fontWeight: 'bold', fontSize: '0.95rem' }}>
                        {renderAmount(total)}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                      <span style={{ color: '#10b981' }}>Pagado: {renderAmount(paid)}</span>
                      <span style={{ color: '#ef4444' }}>Deuda: {renderAmount(pending)}</span>
                    </div>

                    <div style={{ height: '8px', backgroundColor: '#fee2e2', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                      <div style={{
                        height: '100%',
                        width: `${paidPct}%`,
                        backgroundColor: '#10b981',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </li>
                );
              })}
              
              <li style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 0 0 0', marginTop: '8px', borderTop: '2px dashed var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Total Gastos del Mes</span>
                  <span style={{ color: 'var(--color-text-main)', fontWeight: 'bold' }}>{renderAmount(currentStats.expense)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#10b981', fontWeight: '600' }}>Total Pagado: {renderAmount(totalExpensePaid)} ({(currentStats.expense > 0 ? (totalExpensePaid/currentStats.expense*100) : 0).toFixed(0)}%)</span>
                  <span style={{ color: '#ef4444', fontWeight: '600' }}>Total Deuda: {renderAmount(totalExpensePending)}</span>
                </div>
                <div style={{ height: '12px', backgroundColor: '#fee2e2', borderRadius: '999px', overflow: 'hidden', display: 'flex', marginTop: '4px' }}>
                  <div style={{
                    height: '100%',
                    width: `${currentStats.expense > 0 ? (totalExpensePaid/currentStats.expense*100) : 0}%`,
                    backgroundColor: '#10b981',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </li>
            </ul>
          )}
        </div>

        <div className="card chart-card" style={{ flex: '1 1 400px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: 'var(--color-text-main)' }}>Deuda por Categoría</h3>
          </div>
          <Chart transactions={transactions} filterMonth={filterMonth} filterYear={filterYear} totalExpense={currentStats.expense} renderAmount={renderAmount} pendingGroceriesTotal={pendingGroceriesTotal} />
        </div>
      </div>
    </div>
  );
};
