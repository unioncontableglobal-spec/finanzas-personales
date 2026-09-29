import React, { useContext, useState, useMemo } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Trash2, CheckCircle, Clock, Tag, CalendarClock, DollarSign, Printer, AlertCircle, Filter, Calendar, ShoppingCart, Edit2 } from 'lucide-react';
import { TransactionFormModal } from '../Transactions/TransactionFormModal';
import { PaymentModal } from '../Transactions/PaymentModal';
import './Expenses.css';

export const ExpensesView = () => {
  const { transactions, markTransactionAsPaid, deleteTransaction, cajas, appSettings, categories, groceries } = useContext(FinanceContext);
  
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filterCategory, setFilterCategory] = useState('Todas');

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

  const [paymentTransaction, setPaymentTransaction] = useState(null);
  const availableCajas = Object.keys(cajas);

  const isBs = appSettings?.displayCurrency === 'VES';
  const rate = appSettings?.exchangeRate || 43;

  const renderAmount = (usdAmount) => {
    if (isBs) {
      return `Bs ${(parseFloat(usdAmount || 0) * rate).toFixed(2)}`;
    }
    return `$${parseFloat(usdAmount || 0).toFixed(2)}`;
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

  // Mercando pendiente (productos no chequeados)
  const pendingGroceries = useMemo(() => {
    return groceries.filter(g => !g.checked);
  }, [groceries]);

  const pendingGroceriesTotal = useMemo(() => {
    return pendingGroceries.reduce((sum, g) => sum + (g.price || 0), 0);
  }, [pendingGroceries]);

  // Transacciones de gasto filtradas por fecha y categoría
  const filteredExpenseTxs = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'expense') return false;
      if (filterCategory !== 'Todas' && t.category !== filterCategory) return false;

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

  // Deudas pendientes filtradas por categoría y rango de fechas (Desde / Hasta)
  const pendingExpenses = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense' && !t.isPaid)
      .filter(t => filterCategory === 'Todas' || t.category === filterCategory)
      .filter(t => {
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
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [transactions, filterCategory, dateFrom, dateTo]);

  // Gastos pagados en el período filtrado (Flat map de todos los ABONOS / PAGOS)
  const paidExpenses = useMemo(() => {
    const allPayments = [];
    
    // Check ALL transactions, not just filteredExpenseTxs (because a debt from last month could be paid this month)
    const allExpenses = transactions.filter(t => t.type === 'expense' && (filterCategory === 'Todas' ? true : t.category === filterCategory));
    
    allExpenses.forEach(t => {
      if (t.payments && t.payments.length > 0) {
        t.payments.forEach(p => {
          let inRange = true;
          const pDate = new Date(p.date);
          if (dateFrom && pDate < new Date(`${dateFrom}T00:00:00`)) inRange = false;
          if (dateTo && pDate > new Date(`${dateTo}T23:59:59`)) inRange = false;
          
          // Check if the PAYMENT date is in range
          if (inRange) {
            allPayments.push({
              paymentId: p.id,
              txId: t.id,
              date: p.date,
              amount: p.amount,
              cajaName: p.cajaName,
              category: t.category,
              description: t.description,
              contributor: t.contributor,
              parentTx: t // Reference to the parent transaction for editing
            });
          }
        });
      }
    });

    return allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filterCategory, dateFrom, dateTo]);

  // === TOTALES ===
  const totals = useMemo(() => {
    // Si la categoría es 'Todas' o 'Comida', incluimos el mercado pendiente en las deudas
    const includeGroceriesInPending = filterCategory === 'Todas' || filterCategory === 'Comida';
    const totalGroceriesToAdd = includeGroceriesInPending ? pendingGroceriesTotal : 0;

    const basePending = pendingExpenses.reduce((s, t) => {
      const totalPaid = (t.payments || []).reduce((sum, p) => sum + p.amount, 0);
      return s + Math.max(0, t.amount - totalPaid);
    }, 0);
    const totalPending = basePending + totalGroceriesToAdd;

    const totalPaidInPeriod = paidExpenses.reduce((s, p) => s + p.amount, 0);
    const totalPeriodExpenses = filteredExpenseTxs.reduce((s, t) => s + (t.amount || 0), 0);

    const pendingCount = pendingExpenses.length + (includeGroceriesInPending && pendingGroceries.length > 0 ? 1 : 0);
    const paidCount = paidExpenses.length;

    // Desglose de deudas pendientes acumuladas por categoría
    const pendingByCategory = {};
    pendingExpenses.forEach(t => {
      const cat = t.category || 'Sin categoría';
      if (!pendingByCategory[cat]) {
        pendingByCategory[cat] = { total: 0, count: 0, dates: [] };
      }
      const totalPaid = (t.payments || []).reduce((sum, p) => sum + p.amount, 0);
      pendingByCategory[cat].total += Math.max(0, (t.amount || 0) - totalPaid);
      pendingByCategory[cat].count += 1;
      pendingByCategory[cat].dates.push(new Date(t.date));
    });

    if (includeGroceriesInPending && pendingGroceriesTotal > 0) {
      const catKey = 'Comida (Mercando Pendiente)';
      if (!pendingByCategory[catKey]) {
        pendingByCategory[catKey] = { total: 0, count: 0, dates: [] };
      }
      pendingByCategory[catKey].total += pendingGroceriesTotal;
      pendingByCategory[catKey].count += pendingGroceries.length;
      pendingByCategory[catKey].dates.push(new Date());
    }

    const sortedPendingCats = Object.entries(pendingByCategory).sort((a, b) => b[1].total - a[1].total);

    return { totalPending, totalPaidInPeriod, totalPeriodExpenses, pendingCount, paidCount, sortedPendingCats, includeGroceriesInPending };
  }, [pendingExpenses, paidExpenses, filteredExpenseTxs, pendingGroceriesTotal, pendingGroceries, filterCategory]);

  const getPeriodLabel = () => {
    if (!dateFrom && !dateTo) return 'Todo el Histórico';
    if (dateFrom && dateTo) return `del ${dateFrom} al ${dateTo}`;
    if (dateFrom) return `desde ${dateFrom}`;
    return `hasta ${dateTo}`;
  };

  const handleConfirmPay = (txId, cajaName, paymentAmount) => {
    markTransactionAsPaid(txId, cajaName, paymentAmount);
    setPaymentTransaction(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '80px' }} id="printable-expenses">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-text-main)', margin: '0 0 5px 0' }}>Gastos y Deudas</h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            Control de deudas pendientes y gastos registrados ({getPeriodLabel()})
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
          <Printer size={16} /> PDF
        </button>
      </div>

      {/* Print header */}
      <div className="print-only-header" style={{ display: 'none' }}>
        <h1 style={{ margin: '0 0 5px 0', fontSize: '1.5rem' }}>Informe de Gastos y Deudas</h1>
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
              onChange={(e) => { setDateFrom(e.target.value); setActivePreset('custom'); }}
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
              onChange={(e) => { setDateTo(e.target.value); setActivePreset('custom'); }}
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

      {/* === RESUMEN DE TOTALES === */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px',
        marginBottom: '25px'
      }}>
        {/* Total Pendientes */}
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          borderRadius: '12px', padding: '16px', border: '1px solid #fcd34d'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#d97706', fontSize: '0.75rem', fontWeight: '600' }}>
            <AlertCircle size={14} /> DEUDAS PENDIENTES
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#92400e' }}>
            {renderAmount(totals.totalPending)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '4px' }}>
            {totals.pendingCount} deudas / items sin pagar
          </div>
        </div>

        {/* Total Pagados */}
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          borderRadius: '12px', padding: '16px', border: '1px solid #a7f3d0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#059669', fontSize: '0.75rem', fontWeight: '600' }}>
            <CheckCircle size={14} /> PAGADOS EN PERÍODO
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#065f46' }}>
            {renderAmount(totals.totalPaidInPeriod)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '4px' }}>
            {totals.paidCount} gasto{totals.paidCount !== 1 ? 's' : ''} pagado{totals.paidCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Total Gastos Período */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          borderRadius: '12px', padding: '16px', border: '1px solid #93c5fd'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#2563eb', fontSize: '0.75rem', fontWeight: '600' }}>
            <DollarSign size={14} /> TOTAL GASTOS PERÍODO
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1e40af' }}>
            {renderAmount(totals.totalPeriodExpenses)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#1d4ed8', marginTop: '4px' }}>
            Gastos ({getPeriodLabel()})
          </div>
        </div>
      </div>

      {/* === DEUDAS ACUMULADAS POR CATEGORÍA === */}
      {totals.sortedPendingCats.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-bg-card)', borderRadius: '12px',
          padding: '16px', marginBottom: '25px', border: '1px solid var(--color-border)'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={16} color="#f59e0b" /> Deudas Acumuladas por Categoría
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {totals.sortedPendingCats.map(([catName, info]) => {
              const pct = totals.totalPending > 0 ? (info.total / totals.totalPending * 100) : 0;
              const oldestDate = info.dates.length > 0 ? new Date(Math.min(...info.dates)) : new Date();
              const newestDate = info.dates.length > 0 ? new Date(Math.max(...info.dates)) : new Date();
              const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
              const rangeLabel = info.count > 1 && catName !== 'Comida (Mercando Pendiente)'
                ? `${monthNames[oldestDate.getMonth()]} — ${monthNames[newestDate.getMonth()]} (${info.count} ítems)`
                : `${info.count} ítem${info.count !== 1 ? 's' : ''}`;
              return (
                <div key={catName}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', fontWeight: '600' }}>{catName}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>({rangeLabel})</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#d97706' }}>
                      {renderAmount(info.total)} <span style={{ color: 'var(--color-text-secondary)', fontWeight: 'normal', fontSize: '0.75rem' }}>({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '999px',
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '8px', marginTop: '4px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--color-text-main)', fontSize: '0.9rem' }}>TOTAL DEUDAS PENDIENTES</span>
              <span style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '0.9rem' }}>{renderAmount(totals.totalPending)}</span>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN: POR PAGAR (PENDIENTES) */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: 'var(--color-text-main)', marginBottom: '15px' }}>
          <Clock size={20} color="#f59e0b" /> Por Pagar (Pendientes) — {renderAmount(totals.totalPending)}
        </h3>
        
        {pendingExpenses.length === 0 && (!totals.includeGroceriesInPending || pendingGroceriesTotal === 0) ? (
          <div style={{ padding: '30px', textAlign: 'center', backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', color: 'var(--color-text-secondary)', border: '1px dashed var(--color-border)' }}>
            No hay deudas pendientes. 🎉
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* ÍTEM ESPECIAL: MERCADO PENDIENTE */}
            {totals.includeGroceriesInPending && pendingGroceriesTotal > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px',
                backgroundColor: '#fffbeb', padding: '15px 20px', borderRadius: '12px',
                borderLeft: '4px solid #f59e0b', border: '1px solid #fde68a',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <div style={{ flex: '1 1 200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#92400e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShoppingCart size={18} color="#d97706" /> Mercado: Lista de Compras Pendiente
                    </h4>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '999px', fontWeight: '600' }}>
                      Comida
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#78350f' }}>
                    {pendingGroceries.length} producto{pendingGroceries.length !== 1 ? 's' : ''} por comprar en la lista de Mercando
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#b45309' }}>
                    {renderAmount(pendingGroceriesTotal)}
                  </div>
                </div>
              </div>
            )}

            {/* DEUDAS Y GASTOS PENDIENTES TRADICIONALES */}
            {pendingExpenses.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', backgroundColor: 'var(--color-bg-card)', padding: '15px 20px', borderRadius: '12px', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-main)', fontWeight: '600' }}>{p.description || 'Sin descripción'}</h4>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-secondary)', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Tag size={12} /> {p.category}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><CalendarClock size={14} /> Fecha: {new Date(p.date).toLocaleDateString()}</span>
                    <span>👤 {p.contributor || 'Común'}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                      {(() => {
                        const paid = (p.payments || []).reduce((s, px) => s + px.amount, 0);
                        const remaining = Math.max(0, p.amount - paid);
                        return renderAmount(remaining);
                      })()}
                    </div>
                    {p.payments && p.payments.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>
                        Abonado: {renderAmount((p.payments || []).reduce((s, px) => s + px.amount, 0))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }} className="no-print">
                    <button 
                      onClick={() => setEditingTransaction(p)}
                      style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#3b82f6', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => setPaymentTransaction(p)}
                      style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                      title="Abonar / Pagar"
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button 
                      onClick={() => deleteTransaction(p.id)}
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN: GASTOS PAGADOS */}
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: 'var(--color-text-main)', marginBottom: '15px' }}>
          <CheckCircle size={20} color="#10b981" /> Gastos Pagados ({getPeriodLabel()}) — {renderAmount(totals.totalPaidInPeriod)}
        </h3>
        
        {paidExpenses.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', paddingLeft: '10px' }}>
            No hay gastos pagados registrados para el período seleccionado.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {paidExpenses.map(p => (
              <div key={p.paymentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', backgroundColor: 'var(--color-bg-surface)', padding: '12px 20px', borderRadius: '10px', opacity: 0.85, border: '1px solid var(--color-border)' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <h4 style={{ margin: 0, color: 'var(--color-text-main)' }}>{p.description || p.category}</h4>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)', borderRadius: '999px' }}>
                      Categoría: {p.category}
                    </span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)', borderRadius: '999px' }}>
                      Caja: {p.cajaName || 'N/A'}
                    </span>
                  </div>
                  <small style={{ color: 'var(--color-text-secondary)' }}>{new Date(p.date).toLocaleDateString()} | 👤 {p.contributor || 'Común'} | Abono de Deuda</small>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ color: 'var(--color-text-main)', fontWeight: 'bold' }}>{renderAmount(p.amount)}</span>
                  <button onClick={() => setEditingTransaction(p.parentTx)} className="no-print" style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '5px' }} title="Editar Deuda Original">
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm("¿Seguro que deseas eliminar el registro completo de esta deuda y todos sus abonos?")) {
                        deleteTransaction(p.txId);
                      }
                    }} 
                    className="no-print" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }} title="Eliminar Deuda Completa">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Edición */}
      {editingTransaction && (
        <TransactionFormModal 
          initialData={editingTransaction} 
          onClose={() => setEditingTransaction(null)} 
        />
      )}

      {/* Modal de Pago Parcial */}
      {paymentTransaction && (
        <PaymentModal
          transaction={paymentTransaction}
          cajas={cajas}
          appSettings={appSettings}
          onConfirm={handleConfirmPay}
          onClose={() => setPaymentTransaction(null)}
        />
      )}
    </div>
  );
};
