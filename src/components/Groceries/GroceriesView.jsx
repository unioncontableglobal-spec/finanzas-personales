import React, { useContext, useState, useMemo, useEffect } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Trash2, Plus, CheckCircle, Circle, AlertTriangle, X, Printer } from 'lucide-react';

export const GroceriesView = () => {
  const { groceries, groceriesCategories, budgets, addGroceryItem, toggleGroceryItem, deleteGroceryItem, clearCheckedGroceries, addTransaction, appSettings, cajas, contributors } = useContext(FinanceContext);
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  
  const [category, setCategory] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const [showPayModal, setShowPayModal] = useState(false);
  const availableCajas = Object.keys(cajas);
  const [selectedCaja, setSelectedCaja] = useState(availableCajas[0] || '');
  const [selectedContributor, setSelectedContributor] = useState('Común');
  const [itemContributor, setItemContributor] = useState('Común');
  
  const [singleItemToPay, setSingleItemToPay] = useState(null);

  useEffect(() => {
    if (!selectedCaja && availableCajas.length > 0) {
      setSelectedCaja(availableCajas[0]);
    }
  }, [availableCajas, selectedCaja]);

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

  useEffect(() => {
    if (groceriesCategories.length > 0 && !category) {
      setCategory(groceriesCategories[0].name);
      setActiveCategory(groceriesCategories[0].name);
    }
  }, [groceriesCategories, category]);

  // Clean up phantom items (items whose category was deleted)
  useEffect(() => {
    const validCategories = groceriesCategories.map(c => c.name);
    const phantomItems = groceries.filter(g => !validCategories.includes(g.category));
    if (phantomItems.length > 0) {
      phantomItems.forEach(item => deleteGroceryItem(item.id));
    }
  }, [groceries, groceriesCategories, deleteGroceryItem]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !price || isNaN(price)) return;
    
    const parsedPrice = parseFloat(price);
    const usdPrice = currency === 'VES' ? parsedPrice / rate : parsedPrice;

    addGroceryItem({ 
      name, 
      price: usdPrice, 
      originalPrice: parsedPrice,
      originalCurrency: currency,
      category,
      contributor: itemContributor
    });
    
    setActiveCategory(category); // <--- Switch to the tab where the item was just added!
    setName('');
    setPrice('');
  };

  const groupedGroceries = useMemo(() => {
    const groups = groceriesCategories.reduce((acc, cat) => {
      acc[cat.name] = groceries.filter(g => g.category === cat.name);
      return acc;
    }, {});
    
    groceries.forEach(g => {
      if (!groups[g.category]) {
        groups[g.category] = [g];
      } else if (!groups[g.category].includes(g)) {
        groups[g.category].push(g);
      }
    });

    return groups;
  }, [groceries, groceriesCategories]);

  const calculateTotal = (items) => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + item.price, 0);
  };

  const calculateTotalBought = (items) => {
    if (!items) return 0;
    return items.filter(i => i.checked).reduce((sum, item) => sum + item.price, 0);
  };

  const totalGeneral = calculateTotal(groceries);
  const totalBoughtGeneral = calculateTotalBought(groceries);

  const confirmRegisterPurchase = () => {
    const amount = singleItemToPay ? parseFloat(singleItemToPay.price) : parseFloat(totalBoughtGeneral);
    
    if (amount <= 0) {
      alert("El monto debe ser mayor a 0.");
      return;
    }
    
    const cajaToUse = selectedCaja || availableCajas[0];
    if (!cajaToUse) {
      alert("Por favor selecciona una caja o cuenta válida.");
      return;
    }

    // Registrar como gasto pagado. addTransaction ya descuenta de la caja si isPaid es true
    addTransaction({
      type: 'expense',
      amount: amount,
      originalAmount: amount,
      originalCurrency: 'USD',
      category: 'Comida',
      description: singleItemToPay ? `Compra de Mercado: ${singleItemToPay.name}` : 'Compra de Mercado (Items chequeados)',
      contributor: selectedContributor,
      isPaid: true,
      originCaja: cajaToUse
    });
    
    // Eliminar los items marcados o el item individual
    if (singleItemToPay) {
      deleteGroceryItem(singleItemToPay.id);
    } else {
      clearCheckedGroceries();
    }
    
    setShowPayModal(false);
    setSingleItemToPay(null);
    
    alert(`¡Compra registrada por ${renderAmount(amount)} y descontada de ${cajaToUse}!`);
  };

  const foodBudgetId = `${selectedContributor}_Comida`;
  // Para ver si se pasó de presupuesto, sumamos también si es fondo común
  const foodBudget = budgets[foodBudgetId] || budgets['Comida'] || 0; 
  const isOverBudget = foodBudget > 0 && totalGeneral > foodBudget;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="section-card" id="printable-groceries">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Lista de Mercado</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
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
          {totalBoughtGeneral > 0 && (
            <button 
              onClick={() => setShowPayModal(true)}
              className="no-print"
              style={{ 
                backgroundColor: '#22c55e', color: '#fff', border: 'none', 
                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Pagar y Registrar ({renderAmount(totalBoughtGeneral)})
            </button>
          )}
        </div>
      </div>

      {/* Print header */}
      <div className="print-only-header" style={{ display: 'none' }}>
        <h1 style={{ margin: '0 0 5px 0', fontSize: '1.5rem' }}>Lista de Mercado</h1>
        <p style={{ margin: 0, color: '#666' }}>Total Estimado: {renderAmount(totalGeneral)} | Comprado: {renderAmount(totalBoughtGeneral)}</p>
        <hr style={{ margin: '10px 0' }} />
      </div>

      {/* Pay Modal */}
      {showPayModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: '25px', width: '90%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Registrar Pago de Mercado</h3>
              <button onClick={() => { setShowPayModal(false); setSingleItemToPay(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <p>Monto a pagar: <strong>{renderAmount(singleItemToPay ? singleItemToPay.price : totalBoughtGeneral)}</strong></p>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>¿A qué presupuesto se le asigna?</label>
              <select value={selectedContributor} onChange={(e) => setSelectedContributor(e.target.value)} className="modern-input" style={{ width: '100%' }}>
                <option value="Común">Común / Compartido</option>
                {contributors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>¿De qué caja sale el dinero?</label>
              <select value={selectedCaja} onChange={(e) => setSelectedCaja(e.target.value)} className="modern-input" style={{ width: '100%' }}>
                {availableCajas.length === 0 && <option value="">No hay cajas</option>}
                {availableCajas.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setShowPayModal(false); setSingleItemToPay(null); }} className="btn" style={{ background: 'transparent', color: 'var(--color-text-main)' }}>Cancelar</button>
              <button onClick={confirmRegisterPurchase} className="btn btn-primary" style={{ backgroundColor: '#22c55e', color: 'white' }}>Pagar y Descontar</button>
            </div>
          </div>
        </div>
      )}

      {/* Info Badge de Sincronización con Deudas */}
      <div style={{
        backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px',
        padding: '10px 14px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px',
        color: '#92400e', fontSize: '0.85rem', wordBreak: 'break-word'
      }}>
        <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ flex: 1 }}>
          <strong>Sincronizado con Deudas por Pagar:</strong> Los artículos pendientes por comprar ({renderAmount(totalGeneral - totalBoughtGeneral)}) se suman automáticamente a tus <strong>Deudas Pendientes</strong> en el Dashboard y en Gastos y Deudas.
        </div>
      </div>

      {foodBudget > 0 && (
        <div style={{
          backgroundColor: isOverBudget ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${isOverBudget ? '#f87171' : '#86efac'}`,
          borderRadius: '8px',
          padding: '12px 15px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: isOverBudget ? '#b91c1c' : '#15803d'
        }}>
          {isOverBudget ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
          <div>
            <div style={{ fontWeight: '600' }}>Presupuesto de Comida ({selectedContributor}): {renderAmount(foodBudget)}</div>
            <div style={{ fontSize: '0.875rem' }}>
              {isOverBudget 
                ? `Estás superando tu presupuesto por ${renderAmount(totalGeneral - foodBudget)}` 
                : `Tienes ${renderAmount(foodBudget - totalGeneral)} disponibles para gastar.`}
            </div>
          </div>
        </div>
      )}
      
      {/* Formulario */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', backgroundColor: 'var(--color-bg-surface)', padding: '15px', borderRadius: '8px', maxWidth: '100%', overflow: 'hidden' }}>
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Carne de Res (1kg)" 
          className="form-input" 
          required
        />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)}
            className="form-input"
            style={{ width: '80px', padding: '10px', flexGrow: 0 }}
          >
            <option value="USD">USD</option>
            <option value="VES">Bs</option>
          </select>
          <input 
            type="number" 
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Precio" 
            className="form-input"
            step="0.01"
            min="0"
            required 
            style={{ flex: '1 1 120px', minWidth: '120px' }}
          />
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="form-input"
            style={{ flex: '1 1 200px', minWidth: '200px' }}
          >
            {groceriesCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>

          <select 
            value={itemContributor} 
            onChange={(e) => setItemContributor(e.target.value)}
            className="form-input"
            style={{ flex: '1 1 200px', minWidth: '200px' }}
          >
            <option value="Común">Responsable: Común</option>
            {contributors.map(c => <option key={c.id} value={c.name}>Responsable: {c.name}</option>)}
          </select>
        </div>
        <button type="submit" className="submit-btn" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} /> Añadir a lista
        </button>
      </form>

      {/* Resumen General */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', backgroundColor: 'var(--color-bg-deep)', padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>Total Estimado</p>
          <h3 style={{ margin: 0, color: 'var(--color-text-main)' }}>{renderAmount(totalGeneral)}</h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>Comprado</p>
          <h3 style={{ margin: 0, color: '#22c55e' }}>{renderAmount(totalBoughtGeneral)}</h3>
        </div>
      </div>

      {/* Navegación por Categorías (Tabs) */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingBottom: '10px', marginBottom: '20px' }}>
        {Object.keys(groupedGroceries).map(catName => {
          const count = groupedGroceries[catName].length;
          return (
            <button
              key={catName}
              onClick={() => setActiveCategory(catName)}
              style={{
                padding: '6px 14px',
                fontSize: '0.85rem',
                borderRadius: '999px',
                whiteSpace: 'nowrap',
                backgroundColor: activeCategory === catName ? 'var(--color-primary)' : 'var(--color-bg-surface)',
                color: activeCategory === catName ? '#ffffff' : 'var(--color-text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {catName} {count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      {/* Lista de Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, color: 'var(--color-text-main)' }}>{activeCategory}</h3>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Subtotal: {renderAmount(calculateTotal(groupedGroceries[activeCategory] || []))}
          </span>
        </div>
        
        {(!activeCategory || !groupedGroceries[activeCategory] || groupedGroceries[activeCategory].length === 0) ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px 0' }}>No hay artículos en esta categoría.</p>
        ) : (
          groupedGroceries[activeCategory].map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '8px', borderLeft: item.checked ? '4px solid #22c55e' : '4px solid transparent' }}>
              <button 
                onClick={() => toggleGroceryItem(item.id)}
                className="no-print"
                style={{ background: 'none', border: 'none', color: item.checked ? '#22c55e' : 'var(--color-text-secondary)', cursor: 'pointer', padding: 0 }}
              >
                {item.checked ? <CheckCircle size={24} /> : <Circle size={24} />}
              </button>
              
              <div style={{ flex: 1, textDecoration: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.6 : 1 }}>
                <div style={{ fontWeight: '500', color: 'var(--color-text-main)' }}>{item.name}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                  <span>Ref: {renderAmount(item.price)}</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>👤 {item.contributor || 'Común'}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <button 
                  onClick={() => {
                    setSingleItemToPay(item);
                    setSelectedContributor(item.contributor || 'Común');
                    setShowPayModal(true);
                  }}
                  className="no-print btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#22c55e', borderRadius: '6px' }}
                >
                  Pagar
                </button>
                <button onClick={() => deleteGroceryItem(item.id)} className="no-print" style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
