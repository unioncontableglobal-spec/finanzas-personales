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

export const Chart = ({ transactions, filterMonth, filterYear, totalExpense, renderAmount }) => {
  const expensesThisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return t.type === 'expense' && d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const data = expensesThisMonth.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      existing.value += parseFloat(curr.amount);
    } else {
      acc.push({ name: curr.category, value: parseFloat(curr.amount) });
    }
    return acc;
  }, []);

  if (data.length === 0) {
    return <div className="no-data-chart">No hay gastos este mes</div>;
  }

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={110}
            fill="#8884d8"
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
            <Label 
              content={({ viewBox: { cx, cy } }) => (
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                  <tspan x={cx} dy="-0.5em" className="donut-center-subtext">Total</tspan>
                  <tspan x={cx} dy="1.5em" className="donut-center-text">{renderAmount(totalExpense)}</tspan>
                </text>
              )}
            />
          </Pie>
          <Tooltip formatter={(value) => renderAmount(value)} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '8px 16px',
        marginTop: '10px',
        padding: '0 10px'
      }}>
        {data.map((entry, index) => (
          <div key={`legend-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></div>
            <span style={{ color: 'var(--color-text-secondary)' }}>{entry.name}</span>
          </div>
        ))}
      </div>
      
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
    return (groceries || []).filter(g => !g.checked).reduce((sum, g) => sum + (g.price || 0), 0);
  }, [groceries]);

  const totalPendingDebts = useMemo(() => {
    const basePending = transactions
      .filter(t => t.type === 'expense' && !t.isPaid)
      .reduce((s, t) => s + (t.amount || 0), 0);
    return basePending + pendingGroceriesTotal;
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
      acc[person] = (acc[person] || 0) + parseFloat(t.amount);
      return acc;
    }, {});

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

      <div className="accounts-summary-grid">
        {Object.entries(savings).map(([name, balance]) => (
          <div key={name} className="account-mini-card" style={{ background: getAccountStyle(name) }}>
            <h4>{name}</h4>
            <div className="account-balance">{renderAmount(balance)}</div>
          </div>
        ))}
      </div>
      
      {/* KPI Grid — 5 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {/* Balance Neto */}
        <div style={{
          background: currentStats.balance >= 0 
            ? 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)' 
            : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '12px', padding: '14px',
          border: currentStats.balance >= 0 ? '1px solid #93c5fd' : '1px solid #fcd34d'
        }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '600', color: currentStats.balance >= 0 ? '#2563eb' : '#d97706', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Balance Neto</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: currentStats.balance >= 0 ? '#1e40af' : '#92400e' }}>{renderAmount(currentStats.balance)}</p>
        </div>

        {/* Ingresos */}
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          borderRadius: '12px', padding: '14px', border: '1px solid #a7f3d0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', color: '#059669', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Ingresos</p>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '999px', background: incomeChange.type === 'positive' ? '#dcfce7' : '#fef2f2', color: incomeChange.type === 'positive' ? '#16a34a' : '#dc2626' }}>
              {incomeChange.text}
            </span>
          </div>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#065f46' }}>{renderAmount(currentStats.income)}</p>
        </div>

        {/* Gastos */}
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
          borderRadius: '12px', padding: '14px', border: '1px solid #fca5a5'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', color: '#dc2626', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Gastos</p>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '999px', background: expenseChange.type === 'positive' ? '#fef2f2' : '#dcfce7', color: expenseChange.type === 'positive' ? '#dc2626' : '#16a34a' }}>
              {expenseChange.text}
            </span>
          </div>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#991b1b' }}>{renderAmount(currentStats.expense)}</p>
        </div>

        {/* Deudas Pendientes */}
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          borderRadius: '12px', padding: '14px', border: '1px solid #fcd34d'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <AlertCircle size={12} color="#d97706" />
            <p style={{ fontSize: '0.7rem', fontWeight: '600', color: '#d97706', margin: 0, textTransform: 'uppercase' }}>Deudas</p>
          </div>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#92400e' }}>{renderAmount(totalPendingDebts)}</p>
        </div>

        {/* Patrimonio Total */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)',
          borderRadius: '12px', padding: '14px', border: '1px solid #86efac'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <Shield size={12} color="#16a34a" />
            <p style={{ fontSize: '0.7rem', fontWeight: '600', color: '#16a34a', margin: 0, textTransform: 'uppercase' }}>Patrimonio</p>
          </div>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#14532d' }}>{renderAmount(totalPatrimony)}</p>
        </div>
      </div>

      <div className="dashboard-grid" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="card chart-card" style={{ flex: '1 1 400px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: 'var(--color-text-main)' }}>Estructura de Gastos</h3>
          </div>
          <Chart transactions={transactions} filterMonth={filterMonth} filterYear={filterYear} totalExpense={currentStats.expense} renderAmount={renderAmount} />
        </div>

        <div className="card contributor-card" style={{ flex: '1 1 300px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: 'var(--color-text-main)' }}>Gastos por Responsable</h3>
          {Object.keys(expensesByContributor).length === 0 ? (
            <p className="empty-msg">No hay gastos asignados a responsables este mes.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(expensesByContributor).map(([person, total]) => {
                const pct = currentStats.expense > 0 ? (total / currentStats.expense * 100) : 0;
                return (
                  <li key={person}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500', color: 'var(--color-text-main)', fontSize: '0.9rem' }}>{person}</span>
                      <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {renderAmount(total)} <span style={{ color: 'var(--color-text-secondary)', fontWeight: 'normal', fontSize: '0.75rem' }}>({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '999px',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #ef4444, #f97316)',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </li>
                );
              })}
              <li style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0 0', marginTop: '4px', borderTop: '2px dashed var(--color-border)' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Gasto Total</span>
                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{renderAmount(currentStats.expense)}</span>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
