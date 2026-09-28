import React, { useState, useContext, useMemo, useEffect } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { X } from 'lucide-react';
import './TransactionFormModal.css';

export const TransactionFormModal = ({ onClose, initialData = null }) => {
  const { addTransaction, updateTransaction, categories, appSettings, cajas, contributors } = useContext(FinanceContext);
  
  const [type, setType] = useState(initialData ? initialData.type : 'expense');
  const [amount, setAmount] = useState(initialData ? initialData.originalAmount : '');
  const [currency, setCurrency] = useState(initialData ? initialData.originalCurrency : 'USD');
  const [category, setCategory] = useState(initialData ? initialData.category : (categories[0]?.name || 'Otros'));
  const [description, setDescription] = useState(initialData ? initialData.description : '');
  const [contributor, setContributor] = useState(initialData?.contributor || 'Común'); 
  
  const [isPaid, setIsPaid] = useState(initialData ? initialData.isPaid : true);

  const availableCajas = useMemo(() => {
    const keys = Object.keys(cajas);
    const contributorUpper = contributor.toUpperCase();
    const isComun = contributorUpper === 'COMÚN' || contributorUpper === 'COMUN';

    return keys.sort((a, b) => {
      const aUpper = a.toUpperCase();
      const bUpper = b.toUpperCase();
      
      const aMatch = isComun ? (aUpper.includes('COMÚN') || aUpper.includes('COMUN')) : aUpper.includes(contributorUpper);
      const bMatch = isComun ? (bUpper.includes('COMÚN') || bUpper.includes('COMUN')) : bUpper.includes(contributorUpper);

      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return a.localeCompare(b);
    });
  }, [cajas, contributor]);

  const [cajaName, setCajaName] = useState(initialData?.originCaja || availableCajas[0] || ''); 

  useEffect(() => {
    if (availableCajas.length > 0 && !initialData) {
      const contributorUpper = contributor.toUpperCase();
      const isComun = contributorUpper === 'COMÚN' || contributorUpper === 'COMUN';
      const cajaUpper = cajaName.toUpperCase();
      const currentMatch = isComun 
        ? (cajaUpper.includes('COMÚN') || cajaUpper.includes('COMUN'))
        : cajaUpper.includes(contributorUpper);

      if (!currentMatch) {
        setCajaName(availableCajas[0]);
      }
    }
  }, [contributor, availableCajas, initialData]);

  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(() => initialData ? new Date(initialData.date).toISOString().split('T')[0] : getLocalDateString());

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const normalizedAmount = amount.toString().replace(/,/g, '.');
    if (!normalizedAmount || isNaN(normalizedAmount)) {
      alert("Por favor, ingresa un monto válido (usa punto para los decimales).");
      return;
    }
    
    const parsedAmount = parseFloat(normalizedAmount);
    const usdAmount = currency === 'VES' 
      ? parsedAmount / (appSettings?.exchangeRate || 43)
      : parsedAmount;
      
    const txData = {
      type,
      amount: usdAmount,
      originalAmount: parsedAmount,
      originalCurrency: currency,
      category: type === 'income' ? 'Ingreso' : category,
      description,
      contributor: contributor, 
      isPaid: isPaid,
      originCaja: isPaid ? cajaName : null,
      date: new Date(date + 'T12:00:00Z').toISOString()
    };

    if (initialData) {
      updateTransaction(initialData.id, txData);
    } else {
      addTransaction(txData);
    }
    
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>Nueva Transacción</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="type-toggle">
            <button 
              type="button" 
              className={`toggle-btn ${type === 'expense' ? 'expense-active' : ''}`}
              onClick={() => setType('expense')}
            >
              Gasto
            </button>
            <button 
              type="button" 
              className={`toggle-btn ${type === 'income' ? 'income-active' : ''}`}
              onClick={() => setType('income')}
            >
              Ingreso
            </button>
          </div>

          <div className="form-group">
            <label>Monto</label>
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
                onChange={(e) => setAmount(e.target.value)} 
                placeholder="0.00"
                required 
                autoFocus
                style={{ flex: 1 }}
                className="modern-input"
              />
            </div>
            {currency === 'VES' && appSettings?.exchangeRate && (
              <small style={{ color: 'var(--color-text-secondary)', marginTop: '5px', display: 'block' }}>
                Equivalente a ${(parseFloat(amount || 0) / appSettings.exchangeRate).toFixed(2)}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Fecha</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              required
              className="modern-input"
            />
          </div>

          {type === 'expense' && (
            <div className="form-group">
              <label>Categoría</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="modern-input">
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>{type === 'income' ? '¿A quién le ingresa este dinero?' : '¿A quién se le asigna el Gasto? (Presupuesto)'}</label>
            <select value={contributor} onChange={(e) => setContributor(e.target.value)} className="modern-input">
              <option value="Común">Común / Compartido</option>
              {contributors.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', padding: '10px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '8px' }}>
            <input 
              type="checkbox" 
              id="isPaid" 
              checked={isPaid} 
              onChange={(e) => setIsPaid(e.target.checked)} 
              style={{ width: '20px', height: '20px' }}
            />
            <label htmlFor="isPaid" style={{ margin: 0, cursor: 'pointer', fontWeight: 'bold' }}>
              {type === 'income' ? 'Este ingreso ya fue cobrado' : 'Este gasto ya fue pagado'}
            </label>
          </div>

          {isPaid && (
            <div className="form-group">
              <label>{type === 'income' ? '¿A qué Caja entró el dinero?' : '¿De qué Caja se pagó?'}</label>
              <select value={cajaName} onChange={(e) => setCajaName(e.target.value)} required className="modern-input">
                {availableCajas.length === 0 && <option value="">No hay cajas creadas</option>}
                {availableCajas.map(caja => (
                  <option key={caja} value={caja}>{caja}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Descripción (Opcional)</label>
            <input 
              type="text" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Ej. Supermercado"
              className="modern-input"
            />
          </div>

          <button type="submit" className="btn btn-primary submit-btn">
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
};
