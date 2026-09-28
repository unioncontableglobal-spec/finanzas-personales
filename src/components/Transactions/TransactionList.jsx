import React, { useContext, useState, useMemo } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { ArrowUpRight, ArrowDownRight, Filter, Trash2, Edit2, Printer, TrendingUp, TrendingDown, BarChart3, Calendar, RotateCcw } from 'lucide-react';
import { TransactionFormModal } from './TransactionFormModal';
import './Transactions.css';

export const TransactionList = () => {
  const { transactions, deleteTransaction, categories, appSettings } = useContext(FinanceContext);
  
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Fechas por defecto: inicio y fin del mes actual
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });

  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  });

  const [activePreset, setActivePreset] = useState('this_month');

  const isBs = appSettings?.displayCurrency === 'VES';
  const rate = appSettings?.exchangeRate || 43;

  const renderAmount = (usdAmount, prefix = '$', noSymbol = false) => {
    if (isBs) {
      const v = (parseFloat(usdAmount || 0) * rate).toFixed(2);
      return noSymbol ? v : `Bs ${v}`;
    }
    const v = parseFloat(usdAmount || 0).toFixed(2);
    return noSymbol ? v : `${prefix}${v}`;
  };

  const applyPreset = (preset) => {
    setActivePreset(preset);
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();

    if (preset === 'this_month') {
      const lastDay = new Date(y, m + 1, 0).getDate();
      setDateFrom(`${y}-${String(m + 1).padStart(2, '0')}-01`);
      setDateTo(`${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_month') {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      const lastDay = new Date(ly, lm + 1, 0).getDate();
      setDateFrom(`${ly}-${String(lm + 1).padStart(2, '0')}-01`);
      setDateTo(`${ly}-${String(lm + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_3_months') {
      const d3 = new Date(y, m - 2, 1);
      const lastDay = new Date(y, m + 1, 0).getDate();
      setDateFrom(`${d3.getFullYear()}-${String(d3.getMonth() + 1).padStart(2, '0')}-01`);
      setDateTo(`${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'this_year') {
      setDateFrom(`${y}-01-01`);
      setDateTo(`${y}-12-31`);
    } else if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    }
  };

  const handleDateFromChange = (val) => {
    setDateFrom(val);
    setActivePreset('custom');
  };

  const handleDateToChange = (val) => {
    setDateTo(val);
    setActivePreset('custom');
  };

  // Filtrado de transacciones
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterCategory !== 'Todas' && t.category !== filterCategory) {
        return false;
      }
      if (dateFrom) {
        const tDate = new Date(t.date);
        const from = new Date(`${dateFrom}T00:00:00`);
        if (tDate < from) return false;
      }
      if (dateTo) {
        const tDate = new Date(t.date);
        const to = new Date(`${dateTo}T23:59:59`);
        if (tDate > to) return false;
      }
      return true;
    });
  }, [transactions, filterCategory, dateFrom, dateTo]);

  // Totales de la selección
  const totals = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + (t.amount || 0), 0);

    const totalExpense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + (t.amount || 0), 0);

    const balance = totalIncome - totalExpense;

    const byCategory = {};
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.category || 'Sin categoría';
        byCategory[cat] = (byCategory[cat] || 0) + (t.amount || 0);
      });

    const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    return { totalIncome, totalExpense, balance, sortedCategories };
  }, [filteredTransactions]);

  const getPeriodLabel = () => {
    if (!dateFrom && !dateTo) return 'Todo el Histórico';
    if (dateFrom && dateTo) {
      return `del ${dateFrom} al ${dateTo}`;
    }
    if (dateFrom) return `desde ${dateFrom}`;
    return `hasta ${dateTo}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="transaction-list-container" id="printable-history">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 className="page-title" style={{ margin: '0 0 4px 0' }}>Historial de Movimientos</h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.875rem' }}>
            Saldos y transacciones para: <strong>{getPeriodLabel()}</strong> {filterCategory !== 'Todas' && `| Categoría: ${filterCategory}`}
          </p>
        </div>
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
          <Printer size={16} /> Imprimir / PDF
        </button>
      </div>

      {/* Print header */}
      <div className="print-only-header" style={{ display: 'none' }}>
        <h1 style={{ margin: '0 0 5px 0', fontSize: '1.5rem' }}>Informe de Movimientos e Historial</h1>
        <p style={{ margin: 0, color: '#666' }}>Período: {getPeriodLabel()} | Categoría: {filterCategory}</p>
        <hr style={{ margin: '10px 0' }} />
      </div>
      
      {/* === FILTROS AVANZADOS === */}
      <div className="card no-print" style={{ padding: '16px', marginBottom: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', marginBottom: '12px' }}>
          {/* Categoría */}
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-main)', marginBottom: '6px' }}>
              <Filter size={15} color="var(--color-primary)" /> Categoría:
            </label>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="modern-input"
              style={{ width: '100%', padding: '8px 12px' }}
            >
              <option value="Todas">Todas las Categorías</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
              <option value="Ingreso">Ingreso</option>
            </select>
          </div>

          {/* Fecha Desde */}
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-main)', marginBottom: '6px' }}>
              <Calendar size={15} color="#10b981" /> Fecha Desde:
            </label>
            <input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="modern-input"
              style={{ width: '100%', padding: '8px 12px' }}
            />
          </div>

          {/* Fecha Hasta */}
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-main)', marginBottom: '6px' }}>
              <Calendar size={15} color="#ef4444" /> Fecha Hasta:
            </label>
            <input 
              type="date" 
              value={dateTo} 
              onChange={(e) => handleDateToChange(e.target.value)}
              className="modern-input"
              style={{ width: '100%', padding: '8px 12px' }}
            />
          </div>
        </div>

        {/* Presets Rápidos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px dashed var(--color-border)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>Rangos Rápidos:</span>
          {[
            { id: 'this_month', label: 'Este Mes' },
            { id: 'last_month', label: 'Mes Anterior' },
            { id: 'last_3_months', label: 'Últimos 3 Meses' },
            { id: 'this_year', label: 'Año Actual' },
            { id: 'all', label: 'Ver Todo' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: '600',
                border: activePreset === p.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                backgroundColor: activePreset === p.id ? 'var(--color-primary)' : 'var(--color-bg-surface)',
                color: activePreset === p.id ? '#ffffff' : 'var(--color-text-main)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* === RESUMEN DE TOTALES EN EL RANGO FILTRADO === */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
        marginBottom: '20px'
      }}>
        {/* Total Ingresos */}
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          borderRadius: '12px', padding: '16px', border: '1px solid #a7f3d0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#059669', fontSize: '0.8rem', fontWeight: '600' }}>
            <TrendingUp size={14} /> INGRESOS EN PERÍODO
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#065f46' }}>
            {renderAmount(totals.totalIncome)}
          </div>
        </div>

        {/* Total Gastos */}
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
          borderRadius: '12px', padding: '16px', border: '1px solid #fca5a5'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#dc2626', fontSize: '0.8rem', fontWeight: '600' }}>
            <TrendingDown size={14} /> GASTOS EN PERÍODO
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#991b1b' }}>
            {renderAmount(totals.totalExpense)}
          </div>
        </div>

        {/* Balance */}
        <div style={{
          background: totals.balance >= 0 
            ? 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)' 
            : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '12px', padding: '16px',
          border: totals.balance >= 0 ? '1px solid #93c5fd' : '1px solid #fcd34d'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: totals.balance >= 0 ? '#2563eb' : '#d97706', fontSize: '0.8rem', fontWeight: '600' }}>
            <BarChart3 size={14} /> BALANCE NETO
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: totals.balance >= 0 ? '#1e40af' : '#92400e' }}>
            {totals.balance >= 0 ? '+' : ''}{renderAmount(totals.balance)}
          </div>
        </div>
      </div>

      {/* === DESGLOSE POR CATEGORÍA EN EL RANGO === */}
      {totals.sortedCategories.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-bg-card)', borderRadius: '12px',
          padding: '16px', marginBottom: '20px', border: '1px solid var(--color-border)'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart3 size={16} /> Gastos por Categoría ({getPeriodLabel()})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {totals.sortedCategories.map(([catName, total]) => {
              const pct = totals.totalExpense > 0 ? (total / totals.totalExpense * 100) : 0;
              return (
                <div key={catName}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', fontWeight: '500' }}>{catName}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                      {renderAmount(total)} <span style={{ color: 'var(--color-text-secondary)', fontWeight: 'normal', fontSize: '0.75rem' }}>({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '999px',
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, var(--color-primary), #60a5fa)',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '8px', marginTop: '4px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--color-text-main)', fontSize: '0.9rem' }}>TOTAL GASTOS</span>
              <span style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '0.9rem' }}>{renderAmount(totals.totalExpense)}</span>
            </div>
          </div>
        </div>
      )}

      {/* LISTA DE MOVIMIENTOS */}
      <div className="transactions">
        {filteredTransactions.length === 0 ? (
          <div className="card no-transactions" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div>No hay movimientos para los filtros seleccionados ({getPeriodLabel()}).</div>
            <button 
              onClick={() => { setFilterCategory('Todas'); applyPreset('all'); }}
              style={{
                backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none',
                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem'
              }}
            >
              Mostrar Todo el Historial
            </button>
          </div>
        ) : (
          filteredTransactions.map(t => (
            <div key={t.id} className="card transaction-item">
              <div className="tx-icon">
                {t.type === 'income' ? (
                  <div className="icon-income"><ArrowUpRight size={24} /></div>
                ) : (
                  <div className="icon-expense"><ArrowDownRight size={24} /></div>
                )}
              </div>
              <div className="tx-details">
                <h4 style={{ margin: '0 0 2px 0' }}>{t.category}</h4>
                <span className="tx-date">{new Date(t.date).toLocaleDateString()}</span>
                {t.description && <p className="tx-desc" style={{ margin: '4px 0 0 0' }}>{t.description}</p>}
                {t.contributor && <p className="tx-desc" style={{ color: 'var(--color-primary)', fontWeight: 'bold', margin: '2px 0 0 0' }}>Aportante: {t.contributor}</p>}
              </div>
              <div className="tx-amount" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span className={t.type === 'income' ? 'income' : 'expense'} style={{ fontWeight: 'bold' }}>
                  {t.type === 'income' ? '+ ' : '- '}{renderAmount(t.amount)}
                </span>
                <button 
                  onClick={() => setEditingTransaction(t)} 
                  className="no-print"
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '5px' }}
                  title="Editar movimiento"
                >
                  <Edit2 size={20} />
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de eliminar este movimiento?')) {
                      deleteTransaction(t.id);
                    }
                  }} 
                  className="no-print"
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}
                  title="Eliminar movimiento"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingTransaction && (
        <TransactionFormModal 
          initialData={editingTransaction} 
          onClose={() => setEditingTransaction(null)} 
        />
      )}
    </div>
  );
};
