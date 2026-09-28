import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Plus, Minus, Wallet, CreditCard, PiggyBank, Trash2, Edit2, Printer } from 'lucide-react';
import './Savings.css';

const getAccountStyle = (id) => {
  if (id.includes('Efectivo')) {
    return { background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', icon: <Wallet size={24} color="white" /> };
  } else if (id.includes('BINANCE')) {
    return { background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', icon: <PiggyBank size={24} color="white" /> };
  } else {
    return { background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', icon: <CreditCard size={24} color="white" /> };
  }
};

export const SavingsView = () => {
  const { savings, updateSavings, deleteSavings, renameSavings, appSettings, updateAppSettings, cajas, updateCaja } = useContext(FinanceContext);
  
  const isBs = appSettings?.displayCurrency === 'VES';
  const rateBCV = appSettings?.exchangeRate || 43;
  const rateUSDT = appSettings?.usdtRate || 44;
  const savingsCurrencies = appSettings?.savingsCurrencies || {};

  const renderAmount = (usdAmount, prefix = '$', noSymbol = false) => {
    if (isBs) {
      const v = (parseFloat(usdAmount || 0) * rateBCV).toFixed(2);
      return `Bs ${v}`;
    }
    return `$${parseFloat(usdAmount || 0).toFixed(2)}`;
  };

  const renderSavingsAmount = (accountName, balance) => {
    const currency = savingsCurrencies[accountName] || 'USD';
    const val = parseFloat(balance || 0).toFixed(2);
    if (currency === 'USDT') return `${val} USDT`;
    if (currency === 'VES') return `Bs ${val}`;
    return renderAmount(balance);
  };

  const [activeModal, setActiveModal] = useState(null); // { account, type: 'deposit' | 'withdraw' }
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [selectedCaja, setSelectedCaja] = useState('');
  
  const [newSavingsName, setNewSavingsName] = useState('');
  const [newSavingsCurrency, setNewSavingsCurrency] = useState('USD');

  const handleTransaction = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || amount <= 0) return;
    if (!selectedCaja) {
      alert('Debes seleccionar una Caja de origen/destino');
      return;
    }
    
    const parsedAmount = parseFloat(amount);
    let baseUsdAmount = currency === 'VES' 
      ? parsedAmount / rateBCV
      : parsedAmount;
      
    const accountCurrency = savingsCurrencies[activeModal.account] || 'USD';
    
    // Cálculo para saber cuánto llega al Ahorro (en la moneda del Ahorro)
    let savingsAmount = baseUsdAmount;
    if (accountCurrency === 'USDT') {
      savingsAmount = baseUsdAmount * (rateBCV / rateUSDT);
    } else if (accountCurrency === 'VES') {
      savingsAmount = baseUsdAmount * rateBCV;
    }

    if (activeModal.type === 'deposit') {
      updateCaja(selectedCaja, baseUsdAmount, 'withdraw');
      updateSavings(activeModal.account, savingsAmount, 'deposit');
    } else {
      // Si estamos retirando, el usuario está ingresando la cantidad de la moneda del Ahorro que quiere retirar.
      // Así que tenemos que convertir de vuelta a USD para sumarlo a la caja.
      let withdrawUsdAmount = parsedAmount;
      if (accountCurrency === 'USDT') {
        withdrawUsdAmount = parsedAmount * (rateUSDT / rateBCV);
      } else if (accountCurrency === 'VES') {
        withdrawUsdAmount = parsedAmount / rateBCV;
      }
      
      updateSavings(activeModal.account, parsedAmount, 'withdraw');
      updateCaja(selectedCaja, withdrawUsdAmount, 'deposit');
    }
    
    setAmount('');
    setActiveModal(null);
  };

  const handleCreateSavings = (e) => {
    e.preventDefault();
    if (!newSavingsName.trim()) return;
    
    const accountName = newSavingsName.trim();
    updateSavings(accountName, 0, 'deposit');
    
    if (newSavingsCurrency !== 'USD') {
      updateAppSettings({
        savingsCurrencies: {
          ...savingsCurrencies,
          [accountName]: newSavingsCurrency
        }
      });
    }
    
    setNewSavingsName('');
    setNewSavingsCurrency('USD');
  };

  const totalSavings = Object.entries(savings).reduce((sum, [key, val]) => {
    const currency = savingsCurrencies[key] || 'USD';
    let usdVal = val;
    if (currency === 'USDT') usdVal = val * (rateUSDT / rateBCV);
    else if (currency === 'VES') usdVal = val / rateBCV;
    return sum + usdVal;
  }, 0);

  const handlePrint = () => window.print();

  return (
    <div className="savings-container" id="printable-savings">
      <div className="savings-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 className="page-title" style={{ margin: '0 0 5px 0' }}>Cuentas de Ahorro</h2>
          <p className="page-subtitle" style={{ margin: 0 }}>Gestiona y protege tu liquidez.</p>
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

      <form onSubmit={handleCreateSavings} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <input 
          type="text" 
          value={newSavingsName}
          onChange={(e) => setNewSavingsName(e.target.value)}
          placeholder="Nombre de la nueva Cuenta (Ej. Binance)"
          className="modern-input"
          style={{ flex: 2, padding: '12px' }}
        />
        <select
          value={newSavingsCurrency}
          onChange={(e) => setNewSavingsCurrency(e.target.value)}
          className="modern-input"
          style={{ flex: 1, padding: '12px' }}
        >
          <option value="USD">Moneda: USD (Dólares)</option>
          <option value="USDT">Moneda: USDT</option>
          <option value="VES">Moneda: Bs (Bolívares)</option>
        </select>
        <button type="submit" className="btn btn-primary" style={{ padding: '0 20px', borderRadius: '8px' }}>
          <Plus size={20} style={{ marginRight: '8px' }} /> Añadir Cuenta
        </button>
      </form>

      <div className="card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'var(--color-bg-card)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '1rem', fontWeight: '500' }}>Patrimonio Total</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{renderAmount(totalSavings)}</div>
        </div>
        <PiggyBank size={48} color="var(--color-primary)" style={{ opacity: 0.2 }} />
      </div>

      {/* Distribución del Patrimonio */}
      {Object.keys(savings).length > 1 && (
        <div style={{
          backgroundColor: 'var(--color-bg-card)', borderRadius: '12px',
          padding: '16px', marginBottom: '30px', border: '1px solid var(--color-border)'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
            📊 Distribución del Patrimonio
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(savings).map(([name, balance]) => {
              const curr = savingsCurrencies[name] || 'USD';
              let usdVal = balance;
              if (curr === 'USDT') usdVal = balance * (rateUSDT / rateBCV);
              else if (curr === 'VES') usdVal = balance / rateBCV;
              const pct = totalSavings > 0 ? (usdVal / totalSavings * 100) : 0;
              return (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', fontWeight: '500' }}>{name}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                      {renderSavingsAmount(name, balance)} <span style={{ color: 'var(--color-text-secondary)', fontWeight: 'normal', fontSize: '0.75rem' }}>({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '999px',
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="savings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {Object.entries(savings).map(([accountName, balance]) => {
          const style = getAccountStyle(accountName);
          return (
            <div key={accountName} style={{ 
              background: style.background, 
              borderRadius: '16px', 
              padding: '20px', 
              color: 'white',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decoración tipo tarjeta bancaria */}
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>
              <div style={{ position: 'absolute', bottom: '-40px', left: '-20px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500', opacity: 0.9 }}>{accountName}</h4>
                    <button 
                      onClick={() => {
                        const newName = window.prompt(`Nuevo nombre para ${accountName}:`, accountName);
                        if (newName && newName !== accountName) {
                          renameSavings(accountName, newName);
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '2px' }}
                      title="Editar Cuenta"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm(`¿Seguro que deseas eliminar el ahorro ${accountName}?`)) {
                          deleteSavings(accountName);
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '2px' }}
                      title="Eliminar Cuenta"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '10px' }}>
                    {renderSavingsAmount(accountName, balance)}
                  </div>
                </div>
                <div>{style.icon}</div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '25px', position: 'relative', zIndex: 1 }}>
                <button 
                  onClick={() => setActiveModal({ account: accountName, type: 'deposit' })}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: '500', transition: 'background 0.2s' }}
                >
                  <Plus size={18} /> Ingresar
                </button>
                <button 
                  onClick={() => setActiveModal({ account: accountName, type: 'withdraw' })}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(0,0,0,0.15)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: '500', transition: 'background 0.2s' }}
                >
                  <Minus size={18} /> Retirar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: 'var(--color-text-main)' }}>
              {activeModal.type === 'deposit' ? 'Añadir fondos a' : 'Retirar fondos de'} {activeModal.account}
            </h3>
            <form onSubmit={handleTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
                  {activeModal.type === 'deposit' ? '¿De qué Caja sale el dinero?' : '¿A qué Caja entra el dinero?'}
                </label>
                <select 
                  value={selectedCaja} 
                  onChange={e => setSelectedCaja(e.target.value)} 
                  required
                  className="modern-input" 
                  style={{ width: '100%' }}
                >
                  <option value="">Selecciona una caja...</option>
                  {Object.keys(cajas).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
                  Monto a {activeModal.type === 'deposit' ? 'Ingresar (Desde la Caja)' : `Retirar (Desde ${activeModal.account})`}
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {activeModal.type === 'deposit' ? (
                    <select 
                      value={currency} 
                      onChange={(e) => setCurrency(e.target.value)}
                      style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-main)' }}
                    >
                      <option value="USD">USD</option>
                      <option value="VES">Bs</option>
                    </select>
                  ) : (
                    <div style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center' }}>
                      {savingsCurrencies[activeModal.account] || 'USD'}
                    </div>
                  )}
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
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setActiveModal(null)} style={{ padding: '10px 20px', border: 'none', background: 'var(--color-bg-deep)', color: 'var(--color-text-main)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '10px 20px', border: 'none', background: 'var(--color-primary)', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
