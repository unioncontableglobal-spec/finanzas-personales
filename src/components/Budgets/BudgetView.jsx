import React, { useContext, useState, useMemo } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Filter, Calendar, Printer, Clock, CheckCircle, ShoppingCart, DollarSign, UserCheck, AlertCircle } from 'lucide-react';
import './BudgetView.css';

export const BudgetView = () => {
  const { transactions, categories, appSettings, contributors, groceries, markTransactionAsPaid, cajas } = useContext(FinanceContext);
  
  const [filterContributor, setFilterContributor] = useState('Todos');

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
  const [payingTxId, setPayingTxId] = useState(null);
  const availableCajas = Object.keys(cajas);
  const [selectedCaja, setSelectedCaja] = useState(availableCajas[0] || '');

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

  // Lista de responsables a evaluar
  const personList = useMemo(() => {
    const list = ['Común', ...contributors.map(c => c.name)];
    if (filterContributor === 'Todos') return list;
    return list.filter(p => p === filterContributor);
  }, [contributors, filterContributor]);

  // Función helper para coincidencia de responsable
  const matchesPerson = (contributorValue, personName) => {
    if (personName === 'Común') {
      return !contributorValue || contributorValue === 'Sin asignar / Común' || contributorValue === 'Común';
    }
    return contributorValue === personName;
  };

  // Helper para verificar fecha dentro del rango
  const isInDateRange = (dateStr) => {
    if (!dateStr) return true;
    const tDate = new Date(dateStr);
    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00`);
      if (tDate < from) return false;
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59`);
      if (tDate > to) return false;
    }
    return true;
  };

  // Obtener datos detallados por persona
  const personData = useMemo(() => {
    const result = {};

    personList.forEach(person => {
      // 1. Deudas/Gastos pendientes asignados a esta persona (filtrados por fecha)
      const pendingExpenses = transactions.filter(t => {
        return t.type === 'expense' && !t.isPaid && matchesPerson(t.contributor, person) && isInDateRange(t.date);
      }).sort((a, b) => new Date(a.date) - new Date(b.date));

      // 2. Mercado pendiente asignado a esta persona
      const pendingGroceries = groceries.filter(g => {
        return !g.checked && matchesPerson(g.contributor, person);
      });

      // 3. Gastos pagados por esta persona en el período
      const paidExpenses = transactions.filter(t => {
        return t.type === 'expense' && t.isPaid && matchesPerson(t.contributor, person) && isInDateRange(t.date);
      }).sort((a, b) => new Date(b.date) - new Date(a.date));

      const paidGroceries = paidExpenses.filter(p => p.description && p.description.startsWith('Compra de Mercado'));
      const paidRegularExpenses = paidExpenses.filter(p => !(p.description && p.description.startsWith('Compra de Mercado')));

      // Totales
      const totalPendingExpenses = pendingExpenses.reduce((s, t) => s + (t.amount || 0), 0);
      const totalPendingGroceries = pendingGroceries.reduce((s, g) => s + (g.price || 0), 0);
      const totalPending = totalPendingExpenses + totalPendingGroceries;

      const totalPaidGroceries = paidGroceries.reduce((s, t) => s + (t.amount || 0), 0);
      const totalPaidRegular = paidRegularExpenses.reduce((s, t) => s + (t.amount || 0), 0);
      const totalPaid = paidExpenses.reduce((s, t) => s + (t.amount || 0), 0);
      
      const totalCommitments = totalPending + totalPaid;

      result[person] = {
        pendingExpenses,
        pendingGroceries,
        paidExpenses,
        paidGroceries,
        paidRegularExpenses,
        totalPendingExpenses,
        totalPendingGroceries,
        totalPending,
        totalPaidGroceries,
        totalPaidRegular,
        totalPaid,
        totalCommitments
      };
    });

    return result;
  }, [personList, transactions, groceries, dateFrom, dateTo]);

  // Totales Globales del Período
  const globalKPIs = useMemo(() => {
    let totalPending = 0;
    let totalPaid = 0;
    let totalCommitments = 0;

    Object.values(personData).forEach(data => {
      totalPending += data.totalPending;
      totalPaid += data.totalPaid;
      totalCommitments += data.totalCommitments;
    });

    return { totalPending, totalPaid, totalCommitments };
  }, [personData]);

  const getPeriodLabel = () => {
    if (!dateFrom && !dateTo) return 'Todo el Histórico';
    if (dateFrom && dateTo) return `del ${dateFrom} al ${dateTo}`;
    if (dateFrom) return `desde ${dateFrom}`;
    return `hasta ${dateTo}`;
  };

  const handleConfirmPay = () => {
    if (payingTxId && selectedCaja) {
      markTransactionAsPaid(payingTxId, selectedCaja);
      setPayingTxId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const [printScale, setPrintScale] = useState('80');

  const getCurrentMonthName = () => {
    if (dateFrom) {
      const parts = dateFrom.split('-');
      const mIdx = parseInt(parts[1], 10) - 1;
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${months[mIdx]} ${parts[0]}`;
    }
    const d = new Date();
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div className="budget-container" id="printable-budget" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '30px' }}>
      {/* Regla CSS Dinámica de Escala para Impresión en 1 Hoja */}
      <style>{`
        @media print {
          #printable-budget {
            zoom: ${printScale}% !important;
            transform: scale(${parseFloat(printScale) / 100}) !important;
            transform-origin: top left !important;
            width: ${100 / (parseFloat(printScale) / 100)}% !important;
          }
        }
      `}</style>

      {/* Screen Header - Hidden on Print */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 className="page-title" style={{ margin: '0 0 5px 0' }}>Reporte de Pagos por Responsable</h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            Desglose de deudas, compras de mercado y gastos pagados por responsable ({getPeriodLabel()})
          </p>
        </div>

        {/* Controles de Escala PDF y Botón Imprimir */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
            <span>Escala PDF:</span>
            <select 
              value={printScale} 
              onChange={(e) => setPrintScale(e.target.value)}
              className="modern-input"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.85rem', borderRadius: '8px', cursor: 'pointer' }}
              title="Ajusta la dimensión para que todo quepa en 1 sola hoja"
            >
              <option value="80">80% (1 Hoja Exacta)</option>
              <option value="75">75% (Ultra Compacto)</option>
              <option value="85">85% (Mediano)</option>
              <option value="90">90% (Grande)</option>
              <option value="100">100% (Normal)</option>
            </select>
          </div>

          <button 
            onClick={handlePrint}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: 'var(--color-primary)', color: '#fff',
              border: 'none', padding: '8px 16px', borderRadius: '8px',
              cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem'
            }}
          >
            <Printer size={16} /> PDF / Imprimir
          </button>
        </div>
      </div>

      {/* Print Compact Single Header - Only visible on PDF/Print */}
      <div className="print-only-header" style={{ display: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #2563eb', paddingBottom: '4px', marginBottom: '8px' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e3a8a' }}>
            Reporte de Pagos por Responsable — {getCurrentMonthName()}
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Período: {getPeriodLabel()} {filterContributor !== 'Todos' && `| ${filterContributor}`}
          </span>
        </div>
      </div>

      {/* === BARRA DE FILTROS: RESPONSABLE & FECHAS === */}
      <div className="card no-print" style={{ padding: '16px', marginBottom: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', marginBottom: '12px' }}>
          {/* Responsable */}
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-main)', marginBottom: '6px' }}>
              <Filter size={15} color="var(--color-primary)" /> Filtrar por Responsable:
            </label>
            <select 
              value={filterContributor} 
              onChange={(e) => setFilterContributor(e.target.value)}
              className="modern-input"
              style={{ width: '100%', padding: '8px 12px' }}
            >
              <option value="Todos">Todos los Responsables</option>
              <option value="Común">Fondo Común / Compartido</option>
              {contributors.map(c => (
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

      {/* === KPIS GENERALES DEL REPORTE === */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
        marginBottom: '25px'
      }}>
        {/* Total Por Pagar (Pendientes + Mercado) */}
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          borderRadius: '12px', padding: '16px', border: '1px solid #fcd34d'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#d97706', fontSize: '0.75rem', fontWeight: '600' }}>
            <AlertCircle size={14} /> POR PAGAR EN PERÍODO
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#92400e' }}>
            {renderAmount(globalKPIs.totalPending)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '4px' }}>
            Deudas y mercado sin pagar
          </div>
        </div>

        {/* Total Pagados */}
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          borderRadius: '12px', padding: '16px', border: '1px solid #a7f3d0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#059669', fontSize: '0.75rem', fontWeight: '600' }}>
            <CheckCircle size={14} /> PAGADO EN PERÍODO
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#065f46' }}>
            {renderAmount(globalKPIs.totalPaid)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '4px' }}>
            Gastos ya procesados
          </div>
        </div>

        {/* Total Compromisos */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          borderRadius: '12px', padding: '16px', border: '1px solid #93c5fd'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#2563eb', fontSize: '0.75rem', fontWeight: '600' }}>
            <DollarSign size={14} /> TOTAL COMPROMISOS
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1e40af' }}>
            {renderAmount(globalKPIs.totalCommitments)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#1d4ed8', marginTop: '4px' }}>
            Sumatoria total (Pagado + Pendiente)
          </div>
        </div>
      </div>

      {/* Mini Modal para Pagar Gasto */}
      {payingTxId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: '25px', width: '90%', maxWidth: '400px' }}>
            <h3>Confirmar Pago</h3>
            <p>¿De qué caja vas a pagar este gasto?</p>
            <select value={selectedCaja} onChange={(e) => setSelectedCaja(e.target.value)} className="modern-input" style={{ width: '100%', marginBottom: '20px' }}>
              {availableCajas.length === 0 && <option value="">No hay cajas</option>}
              {availableCajas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setPayingTxId(null)} className="btn" style={{ background: 'transparent', color: 'var(--color-text-main)' }}>Cancelar</button>
              <button onClick={handleConfirmPay} className="btn btn-primary">Pagar Gasto</button>
            </div>
          </div>
        </div>
      )}

      {/* === DESGLOSE DETALLADO POR RESPONSABLE === */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {personList.map(person => {
          const data = personData[person];
          if (!data) return null;

          const titleLabel = person === 'Común' ? 'Fondo Común / Gastos Compartidos' : `Responsable: ${person}`;

          return (
            <div key={person} className="card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
              {/* Header de la Persona con Totales */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '2px solid var(--color-primary)', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={20} color="var(--color-primary)" /> {titleLabel}
                </h3>
                <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  <span style={{ color: '#d97706' }}>Por Pagar: {renderAmount(data.totalPending)}</span>
                  <span style={{ color: '#16a34a' }}>Pagado: {renderAmount(data.totalPaid)}</span>
                  <span style={{ color: '#2563eb' }}>Total: {renderAmount(data.totalCommitments)}</span>
                </div>
              </div>

              {/* SECCIÓN A: DEUDAS Y GASTOS PENDIENTES */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', color: '#b45309', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} /> Deudas por Pagar ({renderAmount(data.totalPendingExpenses)})
                </h4>
                {data.pendingExpenses.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: 0, paddingLeft: '10px' }}>
                    Sin deudas de gastos pendientes para este período.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.pendingExpenses.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffbeb', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                        <div>
                          <strong style={{ color: '#92400e', fontSize: '0.9rem' }}>{p.description || p.category}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#b45309', marginLeft: '10px' }}>
                            Categoría: {p.category} | Fecha: {new Date(p.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 'bold', color: '#b45309', fontSize: '0.95rem' }}>{renderAmount(p.amount)}</span>
                          <button 
                            onClick={() => { setPayingTxId(p.id); setSelectedCaja(availableCajas[0] || ''); }}
                            className="no-print"
                            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Pagar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECCIÓN B: MERCADO PENDIENTE */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', color: '#d97706', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingCart size={16} /> Compras de Mercado Pendientes ({renderAmount(data.totalPendingGroceries)})
                </h4>
                {data.pendingGroceries.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: 0, paddingLeft: '10px' }}>
                    Sin compras de mercado pendientes asignadas.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {data.pendingGroceries.map(g => (
                      <div key={g.id} style={{ backgroundColor: 'var(--color-bg-surface)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{g.name} ({g.category})</span>
                        <strong style={{ color: 'var(--color-text-main)' }}>{renderAmount(g.price)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECCIÓN C: GASTOS PAGADOS (REGULARES) */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', color: '#059669', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} /> Gastos Pagados ({renderAmount(data.totalPaidRegular)})
                </h4>
                {data.paidRegularExpenses.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: 0, paddingLeft: '10px' }}>
                    Sin gastos pagados registrados para este período.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {data.paidRegularExpenses.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-surface)', padding: '8px 14px', borderRadius: '8px', opacity: 0.85 }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--color-text-main)' }}>{p.description || p.category}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '10px' }}>
                            {new Date(p.date).toLocaleDateString()} | Caja: {p.originCaja || 'N/A'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#065f46' }}>{renderAmount(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECCIÓN D: COMPRAS DE MERCADO PAGADAS */}
              <div>
                <h4 style={{ fontSize: '0.95rem', color: '#059669', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingCart size={16} /> Compras de Mercado Pagadas ({renderAmount(data.totalPaidGroceries)})
                </h4>
                {data.paidGroceries.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: 0, paddingLeft: '10px' }}>
                    Sin compras de mercado pagadas para este período.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {data.paidGroceries.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ecfdf5', padding: '8px 14px', borderRadius: '8px', borderLeft: '3px solid #34d399', opacity: 0.85 }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#065f46' }}>{p.description || p.category}</span>
                          <span style={{ fontSize: '0.75rem', color: '#047857', marginLeft: '10px' }}>
                            {new Date(p.date).toLocaleDateString()} | Caja: {p.originCaja || 'N/A'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#065f46' }}>{renderAmount(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
