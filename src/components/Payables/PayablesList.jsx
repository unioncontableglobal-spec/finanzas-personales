import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Plus, Trash2, CheckCircle, Circle, CalendarClock, Tag, DollarSign, Clock } from 'lucide-react';
import './Payables.css'; 

export const PayablesList = () => {
  const { payables, addPayable, markPayableAsPaid, deletePayable, categories, appSettings } = useContext(FinanceContext);
  
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Otros');

  const isBs = appSettings?.displayCurrency === 'VES';
  const rate = appSettings?.exchangeRate || 43;

  const renderAmount = (usdAmount) => {
    if (isBs) {
      return `Bs ${(parseFloat(usdAmount) * rate).toFixed(2)}`;
    }
    return `$${parseFloat(usdAmount).toFixed(2)}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || !description || !dueDate) return;
    
    const parsedAmount = parseFloat(amount);
    const usdAmount = currency === 'VES' 
      ? parsedAmount / rate
      : parsedAmount;

    addPayable({
      description,
      amount: usdAmount,
      originalAmount: parsedAmount,
      originalCurrency: currency,
      dueDate,
      category
    });
    
    setDescription('');
    setAmount('');
    setDueDate('');
    setShowForm(false);
  };

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${yyyy}-${mm}`; 
  });

  const [yearStr, monthStr] = selectedMonth.split('-');
  const filterYear = parseInt(yearStr, 10);
  const filterMonth = parseInt(monthStr, 10) - 1;

  const monthPayables = payables.filter(p => {
    const [y, m] = p.dueDate.split('-');
    return parseInt(y, 10) === filterYear && parseInt(m, 10) - 1 === filterMonth;
  });

  const pendingPayables = monthPayables.filter(p => !p.isPaid).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const paidPayables = monthPayables.filter(p => p.isPaid);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '30px' }}>
      {/* Encabezado Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-text-main)', margin: '0 0 5px 0' }}>Cuentas por Pagar</h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.9rem' }}>Gestiona y organiza tus compromisos.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="modern-input"
            style={{ width: 'auto', padding: '8px 12px', fontSize: '0.9rem', borderRadius: '10px' }}
          />
          <button 
            onClick={() => setShowForm(!showForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '500', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
          >
            <Plus size={18} /> Nueva Cuenta
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '25px', border: '1px solid var(--color-border)' }}>
          <h4 style={{ margin: '0 0 15px 0', color: 'var(--color-text-main)', fontSize: '1.1rem' }}>Añadir nueva deuda</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Descripción</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} required placeholder="Ej: Alquiler" className="modern-input" style={{ width: '100%' }} />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Monto</label>
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
                  required 
                  placeholder="0.00" 
                  className="modern-input" 
                  style={{ flex: 1 }} 
                />
              </div>
            </div>
          
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Vencimiento</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="modern-input" style={{ width: '100%' }} />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Categoría</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="modern-input" style={{ width: '100%' }}>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
            <button type="submit" style={{ padding: '8px 20px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Guardar</button>
          </div>
        </form>
      )}

      {/* Lista de Pendientes */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: 'var(--color-text-main)', marginBottom: '15px' }}>
          <Clock size={20} color="#f59e0b" /> Pendientes
        </h3>
        
        {pendingPayables.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', color: 'var(--color-text-secondary)', border: '1px dashed var(--color-border)' }}>
            No hay cuentas pendientes para este mes. ¡Todo al día! 🎉
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingPayables.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-card)', padding: '15px 20px', borderRadius: '12px', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-main)', fontWeight: '600' }}>{p.description}</h4>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-secondary)', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Tag size={12} /> {p.category}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CalendarClock size={14} /> Vence: {new Date(p.dueDate + 'T00:00:00').toLocaleDateString()}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                    {renderAmount(p.amount)}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => markPayableAsPaid(p.id)}
                      style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                      title="Marcar como pagado"
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button 
                      onClick={() => deletePayable(p.id)}
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

      {/* Lista de Pagadas */}
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: 'var(--color-text-main)', marginBottom: '15px' }}>
          <CheckCircle size={20} color="#10b981" /> Pagadas Recientemente
        </h3>
        
        {paidPayables.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', paddingLeft: '10px' }}>No hay cuentas pagadas este mes.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {paidPayables.slice(0, 10).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-surface)', padding: '12px 20px', borderRadius: '10px', opacity: 0.7, border: '1px solid var(--color-border)' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, color: 'var(--color-text-secondary)', textDecoration: 'line-through' }}>{p.description}</h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ color: 'var(--color-text-secondary)', textDecoration: 'line-through' }}>{renderAmount(p.amount)}</span>
                  <span style={{ fontSize: '0.8rem', padding: '4px 8px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> Pagado
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
