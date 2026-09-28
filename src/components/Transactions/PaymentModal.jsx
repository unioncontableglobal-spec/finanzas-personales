import React, { useState, useEffect } from 'react';
import { X, DollarSign, CheckCircle } from 'lucide-react';

export const PaymentModal = ({ transaction, cajas, appSettings, onConfirm, onClose }) => {
  const [amountToPay, setAmountToPay] = useState('');
  const [selectedCaja, setSelectedCaja] = useState('');

  const isBs = appSettings?.displayCurrency === 'VES';
  const rate = appSettings?.exchangeRate || 43;

  // Calcula el total pagado y el restante
  const totalPaid = (transaction.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, transaction.amount - totalPaid);

  useEffect(() => {
    // Precargar con el monto restante y la primera caja disponible
    const rem = isBs ? (remaining * rate).toFixed(2) : remaining.toFixed(2);
    setAmountToPay(rem);
    
    const availableCajas = Object.keys(cajas || {});
    if (availableCajas.length > 0) {
      setSelectedCaja(availableCajas[0]);
    }
  }, [remaining, cajas, isBs, rate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amountToPay || isNaN(amountToPay) || parseFloat(amountToPay) <= 0) return;
    if (!selectedCaja) return;
    
    // Convertir de VES a USD si están en modo Bs
    let usdAmount = parseFloat(amountToPay);
    if (isBs) {
      usdAmount = usdAmount / rate;
    }

    // No permitir abonar más de lo que debe
    if (usdAmount > remaining) {
      usdAmount = remaining;
    }

    onConfirm(transaction.id, selectedCaja, usdAmount);
  };

  const renderAmount = (usdAmount) => {
    if (isBs) {
      return `Bs ${(parseFloat(usdAmount) * rate).toFixed(2)}`;
    }
    return `$${parseFloat(usdAmount).toFixed(2)}`;
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>{transaction.type === 'income' ? 'Registrar Cobro (Ingreso)' : 'Abonar a Deuda (Egreso)'}</h3>
          <button onClick={onClose} className="close-button" type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '5px' }}>{transaction.type === 'income' ? 'Monto a Cobrar Original:' : 'Deuda Original:'} {renderAmount(transaction.amount)}</div>
            <div style={{ fontSize: '0.9rem', color: '#10b981', marginBottom: '5px' }}>{transaction.type === 'income' ? 'Cobrado:' : 'Abonado:'} {renderAmount(totalPaid)}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: transaction.type === 'income' ? '#0ea5e9' : '#ef4444' }}>Restante: {renderAmount(remaining)}</div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--color-text-main)' }}>
              {transaction.type === 'income' ? '¿A qué cuenta entra el dinero?' : '¿De qué cuenta sale el dinero?'}
            </label>
            <select 
              value={selectedCaja} 
              onChange={(e) => setSelectedCaja(e.target.value)}
              className="modern-input"
              style={{ width: '100%' }}
              required
            >
              <option value="" disabled>Seleccione una cuenta...</option>
              {Object.keys(cajas || {}).map(cName => (
                <option key={cName} value={cName}>{cName}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--color-text-main)' }}>Monto a Abonar</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <DollarSign size={16} />
              </div>
              <input 
                type="number" 
                step="0.01" 
                max={isBs ? (remaining * rate).toFixed(2) : remaining.toFixed(2)}
                value={amountToPay} 
                onChange={(e) => setAmountToPay(e.target.value)} 
                required 
                className="modern-input"
                style={{ width: '100%', paddingLeft: '35px' }}
              />
            </div>
            <small style={{ color: '#64748b', display: 'block', marginTop: '5px' }}>
              Monto máximo: {renderAmount(remaining)}
            </small>
          </div>

          <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: 'none', padding: 0 }}>
            <button type="button" onClick={onClose} className="btn-cancel" style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
              Cancelar
            </button>
            <button type="submit" className="btn-save" style={{ padding: '10px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600' }}>
              <CheckCircle size={18} /> Procesar Abono
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
