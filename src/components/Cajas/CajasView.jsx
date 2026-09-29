import React, { useContext, useState, useMemo } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Plus, Minus, Landmark, Printer, CheckCircle, Edit2, Calendar } from 'lucide-react';
import { MultiSelectDropdown } from '../UI/MultiSelectDropdown';
import { TransactionFormModal } from '../Transactions/TransactionFormModal';
import { PaymentModal } from '../Transactions/PaymentModal';
import './CajasView.css';

export const CajasView = () => {
  const { 
    transactions, 
    cajas, 
    contributors, 
    appSettings, 
    markTransactionAsPaid,
    updateCaja,
    deleteCaja,
    renameCaja,
    savings,
    updateSavings,
    groceries
  } = useContext(FinanceContext);

  const [selectedResponsibles, setSelectedResponsibles] = useState(['Común']);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  // Date Filters
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

  const isDateInRange = (dateStr) => {
    if (!dateFrom && !dateTo) return true;
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

  const getPeriodLabel = () => {
    if (!dateFrom && !dateTo) return 'Todo el Histórico';
    if (dateFrom && dateTo) return `del ${dateFrom} al ${dateTo}`;
    if (dateFrom) return `desde ${dateFrom}`;
    return `hasta ${dateTo}`;
  };

  // For Quick Actions Modal
  const [activeModal, setActiveModal] = useState(null); // 'deposit' | 'withdraw' | 'transfer' | 'manage'
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [targetSavings, setTargetSavings] = useState(Object.keys(savings)[0] || '');
  const [selectedCajaName, setSelectedCajaName] = useState('');

  // For Confirm Payment/Collection Modal
  const [paymentTransaction, setPaymentTransaction] = useState(null);

  const isBs = appSettings?.displayCurrency === 'VES';
  const rate = appSettings?.exchangeRate || 43;

  const renderAmount = (usdAmount, noSymbol = false) => {
    if (isBs) {
      const v = (parseFloat(usdAmount || 0) * rate).toFixed(2);
      return noSymbol ? v : `Bs.S ${v}`;
    }
    const v = parseFloat(usdAmount || 0).toFixed(2);
    return noSymbol ? v : `$${v}`;
  };

  const renderSecondaryAmount = (usdAmount) => {
    if (isBs) {
      return `$${parseFloat(usdAmount || 0).toFixed(2)}`;
    } else {
      return `Bs.S ${(parseFloat(usdAmount || 0) * rate).toFixed(2)}`;
    }
  };

  // Selector Options
  const responsibleOptions = ['Común', ...contributors.map(c => c.name)];
  
  // Identify corresponding Cajas
  const myCajasList = useMemo(() => {
    return Object.entries(cajas).filter(([cajaKey]) => {
      const nameUpper = cajaKey.toUpperCase();
      return selectedResponsibles.some(resp => {
        const respUpper = resp.toUpperCase();
        const respFirstWord = respUpper.split(' ')[0]; // E.g. "LEYDI" from "LEYDI ZERPA"
        
        if (respUpper === 'COMÚN' || respUpper === 'COMUN') {
          return nameUpper.includes('COMÚN') || nameUpper.includes('COMUN');
        }
        return nameUpper.includes(respFirstWord);
      });
    });
  }, [cajas, selectedResponsibles]);

  const disponibilidadActual = myCajasList.reduce((sum, [, balance]) => sum + balance, 0);

  const handleOpenActionModal = (type) => {
    if (myCajasList.length > 0) setSelectedCajaName(myCajasList[0][0]);
    setActiveModal(type);
  };

  // Calculations
  const myTransactions = useMemo(() => {
    return transactions.filter(t => selectedResponsibles.includes(t.contributor) && isDateInRange(t.date));
  }, [transactions, selectedResponsibles, dateFrom, dateTo]);

  const porCobrar = myTransactions.filter(t => t.type === 'income' && !t.isPaid);
  const totalPorCobrar = porCobrar.reduce((sum, t) => {
    const paid = (t.payments || []).reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(0, t.amount - paid);
  }, 0);

  const porPagar = myTransactions.filter(t => t.type === 'expense' && !t.isPaid);
  const totalPorPagar = porPagar.reduce((sum, t) => {
    const paid = (t.payments || []).reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(0, t.amount - paid);
  }, 0);

  const proyeccion = disponibilidadActual + totalPorCobrar - totalPorPagar;

  const myExpensePayments = useMemo(() => {
    const payments = [];
    transactions.forEach(t => {
      if (t.type !== 'expense') return;

      // Filter by Responsible
      const tResp = (t.contributor || '').toUpperCase();
      const matchResp = selectedResponsibles.some(r => {
        const rUpper = r.toUpperCase();
        if (rUpper === 'COMÚN' || rUpper === 'COMUN') {
          return tResp.includes('COMÚN') || tResp.includes('COMUN') || !tResp;
        }
        return tResp.includes(rUpper.split(' ')[0]);
      });
      if (!matchResp) return;

      // Extract matching payments
      if (t.payments && t.payments.length > 0) {
        t.payments.forEach(p => {
          if (isDateInRange(p.date)) {
            payments.push({ ...p, category: t.category });
          }
        });
      }
    });
    return payments;
  }, [transactions, selectedResponsibles, dateFrom, dateTo]);

  const totalEgresos = myExpensePayments.reduce((sum, p) => sum + p.amount, 0);

  // Desglose por categoría
  const categoriasDesglose = useMemo(() => {
    const desglose = {};
    myExpensePayments.forEach(p => {
      desglose[p.category] = (desglose[p.category] || 0) + p.amount;
    });
    return Object.entries(desglose).sort((a, b) => b[1] - a[1]);
  }, [myExpensePayments]);

  const pendingGroceriesByCategory = useMemo(() => {
    if (!groceries) return [];
    const pending = groceries.filter(g => !g.checked);
    const byCategory = pending.reduce((acc, g) => {
      const cat = g.category || 'Otros';
      const p = parseFloat(g.price) || 0;
      const q = parseFloat(g.quantity) || 1;
      acc[cat] = (acc[cat] || 0) + (p * q);
      return acc;
    }, {});
    return Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  }, [groceries]);

  const totalPendingGroceries = pendingGroceriesByCategory.reduce((sum, [, amt]) => sum + amt, 0);

  const handlePrint = () => window.print();

  const handleQuickAction = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || amount <= 0) return;
    if (!selectedCajaName) {
      alert("Seleccione una cuenta válida de donde ajustar.");
      return;
    }
    
    const parsedAmount = parseFloat(amount);
    const usdAmount = currency === 'VES' ? parsedAmount / rate : parsedAmount;
      
    if (activeModal === 'transfer') {
      if (!targetSavings) {
        alert('Debes seleccionar una cuenta de ahorros destino');
        return;
      }
      updateCaja(selectedCajaName, usdAmount, 'withdraw');
      updateSavings(targetSavings, usdAmount, 'deposit');
    } else {
      updateCaja(selectedCajaName, usdAmount, activeModal);
    }
    
    setAmount('');
    setActiveModal(null);
  };

  const handleConfirmPay = (txId, cajaName, paymentAmount) => {
    markTransactionAsPaid(txId, cajaName, paymentAmount);
    setPaymentTransaction(null);
  };

  return (
    <div className="cajas-dashboard" id="printable-cajas">
      {/* Header */}
      <div className="cajas-header">
        <div>
          <h2 className="page-title" style={{ margin: '0 0 5px 0' }}>Flujo de Caja por Responsable</h2>
          <p className="page-subtitle" style={{ margin: 0 }}>Visualización y control de disponibilidades y deudas.</p>
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

      {/* Selector */}
      <div className="responsible-selector no-print" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '15px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ color: 'var(--color-text-secondary)', fontWeight: '600', fontSize: '0.9rem', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            Seleccionar Responsable(s)
          </label>
          <MultiSelectDropdown 
            options={responsibleOptions} 
            selectedOptions={selectedResponsibles} 
            onChange={setSelectedResponsibles} 
            placeholder="Seleccionar..." 
          />
        </div>
        <button 
          onClick={() => setActiveModal('manage')}
          className="btn"
          style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', height: '47px' }}
        >
          Gestionar Cuentas
        </button>
      </div>

      {/* Filtros de Fecha */}
      <div className="card no-print" style={{ padding: '16px', marginBottom: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', marginTop: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', marginBottom: '12px' }}>
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

      {/* Top 4 Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-title">Disponibilidad Actual</div>
          <div className="metric-value primary">{renderAmount(disponibilidadActual)}</div>
          <div className="metric-subvalue">{renderSecondaryAmount(disponibilidadActual)}</div>
          {myCajasList.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {myCajasList.map(([cname, cbal]) => (
                <div key={cname} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }} title={cname}>{cname}</span>
                  <span style={{ fontWeight: '600' }}>{renderAmount(cbal)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="metric-card info">
          <div className="metric-title">Por Cobrar Estimado</div>
          <div className="metric-value info">{renderAmount(totalPorCobrar)}</div>
          <div className="metric-subvalue">{renderSecondaryAmount(totalPorCobrar)}</div>
        </div>

        <div className="metric-card danger">
          <div className="metric-title">Obligaciones (Por Pagar)</div>
          <div className="metric-value danger">{renderAmount(totalPorPagar)}</div>
          <div className="metric-subvalue">{renderSecondaryAmount(totalPorPagar)}</div>
        </div>

        <div className="metric-card success">
          <div className="metric-title">Proyección al Cierre</div>
          <div className="metric-value success">{renderAmount(proyeccion)}</div>
          <div className="metric-subvalue">{renderSecondaryAmount(proyeccion)}</div>
        </div>
      </div>

      {/* NEW: Breakdown of specific Cuentas */}
      {myCajasList.length > 0 && (
        <div className="card no-print" style={{ padding: '20px', marginBottom: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Landmark size={18} color="var(--color-primary)" />
              Saldos de las Cuentas de {selectedResponsibles.length === 1 ? selectedResponsibles[0] : 'los Responsables'}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
              El total de estas cuentas suma tu "Disponibilidad Actual"
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {myCajasList.map(([cname, cbal]) => (
              <div key={cname} style={{ flex: '1 1 200px', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '5px', position: 'relative' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: '600', paddingRight: '20px' }}>{cname}</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: cbal < 0 ? '#ef4444' : 'var(--color-text-main)' }}>{renderAmount(cbal)}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{renderSecondaryAmount(cbal)}</span>
                
                {cbal < 0 && (
                  <div style={{ position: 'absolute', top: '15px', right: '15px', color: '#ef4444' }} title="Esta cuenta tiene saldo negativo">
                    ⚠️
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 2 Columns */}
      <div className="dashboard-columns">
        
        {/* LEFT COLUMN: Pasivos y Cuentas por Cobrar */}
        <div className="dashboard-column left">
          <h3 className="column-title">Pendientes (Por Pagar / Cobrar)</h3>
          
          {/* Ingresos Pendientes */}
          {porCobrar.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>Ingresos Pendientes</div>
              {porCobrar.map(t => (
                <div className="list-item" key={t.id}>
                  <div className="item-info">
                    <h4>{t.category}</h4>
                    <p>{t.description || 'Ingreso'}</p>
                  </div>
                  <div className="item-amounts">
                    <div style={{ textAlign: 'right' }}>
                      <div className="main-amount" style={{ color: '#0ea5e9' }}>
                        {(() => {
                          const paid = (t.payments || []).reduce((s, p) => s + p.amount, 0);
                          return renderAmount(Math.max(0, t.amount - paid));
                        })()}
                      </div>
                      <div className="sub-amount">
                        {(() => {
                          const paid = (t.payments || []).reduce((s, p) => s + p.amount, 0);
                          return renderSecondaryAmount(Math.max(0, t.amount - paid));
                        })()}
                      </div>
                      {t.payments && t.payments.length > 0 && (
                        <div className="sub-amount" style={{ color: '#10b981' }}>Cobrado: {renderAmount((t.payments || []).reduce((s, p) => s + p.amount, 0))}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button onClick={() => setEditingTransaction(t)} className="no-print" style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '5px' }} title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setPaymentTransaction(t)} className="pay-button" style={{ backgroundColor: '#0ea5e9' }} title="Cobrar (Sumar a Disponibilidad)">
                        <CheckCircle size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Gastos Pendientes */}
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>
            Pasivos por Pagar
          </div>
          {porPagar.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>No hay pasivos registrados.</p>
          ) : (
            porPagar.map(t => (
              <div className="list-item" key={t.id}>
                <div className="item-info">
                  <h4>{t.category}</h4>
                  <p>{t.description || 'Gasto Pendiente'}</p>
                </div>
                <div className="item-amounts">
                  <div style={{ textAlign: 'right' }}>
                    <div className="main-amount">
                      {(() => {
                        const paid = (t.payments || []).reduce((s, p) => s + p.amount, 0);
                        return renderAmount(Math.max(0, t.amount - paid));
                      })()}
                    </div>
                    <div className="sub-amount">
                      {(() => {
                        const paid = (t.payments || []).reduce((s, p) => s + p.amount, 0);
                        return renderSecondaryAmount(Math.max(0, t.amount - paid));
                      })()}
                    </div>
                    {t.payments && t.payments.length > 0 && (
                      <div className="sub-amount" style={{ color: '#10b981' }}>Abonado: {renderAmount((t.payments || []).reduce((s, p) => s + p.amount, 0))}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => setEditingTransaction(t)} className="no-print" style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '5px' }} title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => setPaymentTransaction(t)} className="pay-button" title="Pagar usando Disponibilidad">
                      Abonar / Pagar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="total-row">
            <h3>Total Pasivos</h3>
            <div className="total-amounts">
              <div className="main-amount">{renderAmount(totalPorPagar)}</div>
              <div className="sub-amount" style={{ color: '#ef4444' }}>{renderSecondaryAmount(totalPorPagar)}</div>
            </div>
          </div>

          {/* Mercado Estimado (Por Comprar) */}
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>
              Mercado Estimado (Por Comprar)
            </div>
            {pendingGroceriesByCategory.length > 0 ? (
              pendingGroceriesByCategory.map(([cat, amt]) => (
                <div className="list-item" key={cat}>
                  <div className="item-info">
                    <h4>{cat}</h4>
                  </div>
                  <div className="item-amounts">
                    <div style={{ textAlign: 'right' }}>
                      <div className="main-amount" style={{ color: '#f59e0b' }}>{renderAmount(amt)}</div>
                      <div className="sub-amount">{renderSecondaryAmount(amt)}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', paddingLeft: '5px' }}>
                No hay productos en la lista de mercado.
              </p>
            )}
            <div className="total-row" style={{ marginTop: '10px', backgroundColor: 'transparent', padding: '0', border: 'none' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Total Mercado</h3>
              <div className="total-amounts">
                <div className="main-amount" style={{ fontSize: '1.1rem', color: '#f59e0b' }}>{renderAmount(totalPendingGroceries)}</div>
              </div>
            </div>
          </div>

          {/* Ajustes manuales */}
          <div className="quick-actions no-print">
            <button className="quick-action-btn btn-deposit" onClick={() => handleOpenActionModal('deposit')}>
              <Plus size={18} /> Ajuste (+)
            </button>
            <button className="quick-action-btn btn-withdraw" onClick={() => handleOpenActionModal('withdraw')}>
              <Minus size={18} /> Ajuste (-)
            </button>
            <button className="quick-action-btn btn-transfer" onClick={() => handleOpenActionModal('transfer')}>
              <Landmark size={18} /> Ahorros
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Egresos Ejecutados */}
        <div className="dashboard-column right">
          <h3 className="column-title">Egresos Ejecutados ({getPeriodLabel()})</h3>
          
          <div className="list-item">
            <div className="item-info">
              <h4>Gastos Efectuados</h4>
            </div>
            <div className="item-amounts">
              <div style={{ textAlign: 'right' }}>
                <div className="main-amount">{renderAmount(totalEgresos)}</div>
                <div className="sub-amount">{renderSecondaryAmount(totalEgresos)}</div>
              </div>
            </div>
          </div>

          <div className="total-row">
            <h3>Total Ejecutado</h3>
            <div className="total-amounts">
              <div className="main-amount">{renderAmount(totalEgresos)}</div>
              <div className="sub-amount" style={{ color: 'var(--color-text-secondary)' }}>{renderSecondaryAmount(totalEgresos)}</div>
            </div>
          </div>

          <div className="category-breakdown">
            <h3 className="column-title" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', marginBottom: '10px' }}>
              Desglose por Categoría
            </h3>
            {categoriasDesglose.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>No hay gastos este mes.</p>
            ) : (
              categoriasDesglose.map(([cat, amt]) => (
                <div className="list-item" key={cat}>
                  <div className="item-info">
                    <h4 style={{ fontWeight: '500' }}>{cat}</h4>
                  </div>
                  <div className="item-amounts">
                    <div style={{ textAlign: 'right' }}>
                      <div className="main-amount" style={{ fontSize: '1rem' }}>{renderAmount(amt)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modal para Ajustes Rápidos */}
      {activeModal && activeModal !== 'manage' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ padding: '25px', width: '90%', maxWidth: '400px', backgroundColor: 'var(--color-bg-card)', borderRadius: '12px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-text-main)', marginBottom: '20px' }}>
              {activeModal === 'deposit' && `Añadir fondos a ${selectedResponsibles.length === 1 ? selectedResponsibles[0] : 'Cuentas Seleccionadas'}`}
              {activeModal === 'withdraw' && `Retirar fondos de ${selectedResponsibles.length === 1 ? selectedResponsibles[0] : 'Cuentas Seleccionadas'}`}
              {activeModal === 'transfer' && `Transferir de ${selectedResponsibles.length === 1 ? selectedResponsibles[0] : 'Cuentas Seleccionadas'} a Ahorro`}
            </h3>
            
            <form onSubmit={handleQuickAction} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>¿De qué cuenta/caja?</label>
                <select 
                  value={selectedCajaName} 
                  onChange={e => setSelectedCajaName(e.target.value)} 
                  className="modern-input" 
                  style={{ width: '100%', padding: '12px' }}
                >
                  {myCajasList.length === 0 && <option value="">No tiene cajas registradas</option>}
                  {myCajasList.map(([cname]) => <option key={cname} value={cname}>{cname}</option>)}
                </select>
              </div>

              {activeModal === 'transfer' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Ahorro Destino</label>
                  <select 
                    value={targetSavings} 
                    onChange={e => setTargetSavings(e.target.value)} 
                    className="modern-input" 
                    style={{ width: '100%', padding: '12px' }}
                  >
                    {Object.keys(savings).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Monto</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select 
                    value={currency} 
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-main)' }}
                  >
                    <option value="USD">USD</option>
                    <option value="VES">Bs</option>
                  </select>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    autoFocus
                    required 
                    placeholder="0.00" 
                    className="modern-input"
                    style={{ flex: 1, fontSize: '1.2rem', padding: '12px' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setActiveModal(null)} className="btn" style={{ background: 'transparent', color: 'var(--color-text-main)' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Confirmar Pago / Cobro */}
      {paymentTransaction && (
        <PaymentModal 
          transaction={paymentTransaction} 
          cajas={cajas}
          onConfirm={handleConfirmPay}
          onClose={() => setPaymentTransaction(null)}
          renderAmount={renderAmount}
        />
      )}

      {/* Modal para Gestionar Cuentas */}
      {activeModal === 'manage' && (
        <ManageCajasModal 
          cajas={cajas}
          updateCaja={updateCaja}
          deleteCaja={deleteCaja}
          renameCaja={renameCaja}
          onClose={() => setActiveModal(null)} 
        />
      )}

      {/* Modal de Edición de Transacciones */}
      {editingTransaction && (
        <TransactionFormModal 
          initialData={editingTransaction} 
          onClose={() => setEditingTransaction(null)} 
        />
      )}

    </div>
  );
};

// Componente para Gestionar Cajas
const ManageCajasModal = ({ cajas, updateCaja, deleteCaja, renameCaja, onClose }) => {
  const [newCajaName, setNewCajaName] = useState('');
  const [editingCaja, setEditingCaja] = useState(null);
  const [editName, setEditName] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newCajaName.trim()) return;
    if (cajas[newCajaName.trim()]) {
      alert("Ya existe una cuenta con ese nombre");
      return;
    }
    updateCaja(newCajaName.trim(), 0, 'deposit');
    setNewCajaName('');
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editName.trim() || editName.trim() === editingCaja) {
      setEditingCaja(null);
      return;
    }
    if (cajas[editName.trim()]) {
      alert("Ya existe una cuenta con ese nombre");
      return;
    }
    renameCaja(editingCaja, editName.trim());
    setEditingCaja(null);
  };

  const handleDelete = (cname) => {
    if (window.confirm(`¿Estás seguro de eliminar la cuenta "${cname}"? Esto NO borrará el historial de transacciones, pero la cuenta desaparecerá de los balances.`)) {
      deleteCaja(cname);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ padding: '25px', width: '90%', maxWidth: '500px', backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', maxHeight: '80vh', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0, color: 'var(--color-text-main)', marginBottom: '20px' }}>
          Gestionar Cuentas / Cajas
        </h3>
        
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input 
            type="text" 
            value={newCajaName} 
            onChange={e => setNewCajaName(e.target.value)} 
            placeholder="Nueva cuenta (Ej. ZINLI LEYDI)" 
            className="modern-input"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary">Agregar</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(cajas).map(([cname, cbal]) => (
            <div key={cname} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-bg-surface)' }}>
              {editingCaja === cname ? (
                <form onSubmit={handleSaveEdit} style={{ display: 'flex', gap: '10px', flex: 1 }}>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="modern-input" style={{ flex: 1, padding: '6px' }} autoFocus />
                  <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px' }}>Guardar</button>
                  <button type="button" onClick={() => setEditingCaja(null)} className="btn" style={{ padding: '6px 12px' }}>Cancelar</button>
                </form>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>{cname}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Saldo: ${parseFloat(cbal).toFixed(2)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => { setEditingCaja(cname); setEditName(cname); }} style={{ padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: '#e2e8f0', color: '#475569' }}>Editar</button>
                    <button onClick={() => handleDelete(cname)} style={{ padding: '6px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: '#fee2e2', color: '#b91c1c' }}>Eliminar</button>
                  </div>
                </>
              )}
            </div>
          ))}
          {Object.keys(cajas).length === 0 && (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', fontStyle: 'italic' }}>No hay cuentas registradas</p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
          <button type="button" onClick={onClose} className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
