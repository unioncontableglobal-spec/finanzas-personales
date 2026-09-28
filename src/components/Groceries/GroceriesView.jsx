import React, { useContext, useState, useMemo, useEffect } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Trash2, Plus, CheckCircle, Circle, AlertTriangle, X, Printer, Package } from 'lucide-react';

export const GroceriesView = () => {
  const { groceries, groceriesCategories, budgets, addGroceryItem, toggleGroceryItem, deleteGroceryItem, clearCheckedGroceries, addTransaction, appSettings, cajas, contributors, inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useContext(FinanceContext);
  
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
  const [quantity, setQuantity] = useState(1);
  const [viewMode, setViewMode] = useState('mercado'); // 'mercado' or 'inventario'

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
      setActiveCategory('Todas');
    }
  }, [groceriesCategories, category]);



  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !price || isNaN(price)) return;
    
    const parsedPrice = parseFloat(price);
    const parsedQuantity = parseInt(quantity, 10) || 1;
    const usdPrice = currency === 'VES' ? parsedPrice / rate : parsedPrice;

    addGroceryItem({ 
      name, 
      price: usdPrice, 
      originalPrice: parsedPrice,
      originalCurrency: currency,
      category,
      contributor: itemContributor,
      quantity: parsedQuantity
    });
    
    setActiveCategory(category); // <--- Switch to the tab where the item was just added!
    setName('');
    setPrice('');
    setQuantity(1);
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
    return items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  };

  const calculateTotalBought = (items) => {
    if (!items) return 0;
    return items.filter(i => i.checked).reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  };

  const totalGeneral = calculateTotal(groceries);
  const totalBoughtGeneral = calculateTotalBought(groceries);

  const confirmRegisterPurchase = () => {
    const amount = singleItemToPay ? parseFloat(singleItemToPay.price * (singleItemToPay.quantity || 1)) : parseFloat(totalBoughtGeneral);
    
    if (amount <= 0) {
      alert("El monto debe ser mayor a 0.");
      return;
    }
    
    const cajaToUse = selectedCaja || availableCajas[0];
    if (!cajaToUse) {
      alert("Por favor selecciona una caja o cuenta válida.");
      return;
    }

    // Identificar los items comprados para agregarlos al inventario
    const boughtItems = singleItemToPay ? [singleItemToPay] : groceries.filter(i => i.checked);
    boughtItems.forEach(item => {
      // Ignorar impuestos o fees
      if (item.name.includes("IMPUESTO") || item.name.includes("FEE")) return;
      
      const existing = (inventory || []).find(inv => inv.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        updateInventoryItem(existing.id, { quantity: (existing.quantity || 1) + (item.quantity || 1) });
      } else {
        addInventoryItem({
          name: item.name,
          category: item.category,
          quantity: item.quantity || 1
        });
      }
    });

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
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
        <button 
          onClick={() => setViewMode('mercado')}
          style={{ 
            background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: viewMode === 'mercado' ? 'bold' : 'normal', 
            color: viewMode === 'mercado' ? 'var(--color-primary)' : 'var(--color-text-secondary)', cursor: 'pointer', padding: '10px' 
          }}>
          Lista de Compras
        </button>
        <button 
          onClick={() => setViewMode('inventario')}
          style={{ 
            background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: viewMode === 'inventario' ? 'bold' : 'normal', 
            color: viewMode === 'inventario' ? 'var(--color-primary)' : 'var(--color-text-secondary)', cursor: 'pointer', padding: '10px' 
          }}>
          Inventario de Despensa
        </button>
      </div>

      {viewMode === 'mercado' && (
        <>
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
            <p>Monto a pagar: <strong>{renderAmount(singleItemToPay ? (singleItemToPay.price * (singleItemToPay.quantity || 1)) : totalBoughtGeneral)}</strong></p>
            
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
            placeholder="Precio Unitario" 
            className="form-input"
            step="0.01"
            min="0"
            required 
            style={{ flex: '1 1 120px', minWidth: '120px' }}
          />
          <input 
            type="number" 
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Cant." 
            className="form-input"
            min="1"
            required 
            style={{ width: '80px', padding: '10px', flexGrow: 0 }}
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
        <button
          onClick={() => setActiveCategory('Todas')}
          style={{
            padding: '6px 14px',
            fontSize: '0.85rem',
            borderRadius: '999px',
            whiteSpace: 'nowrap',
            backgroundColor: activeCategory === 'Todas' ? 'var(--color-primary)' : 'var(--color-bg-surface)',
            color: activeCategory === 'Todas' ? '#ffffff' : 'var(--color-text-secondary)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Todas ({groceries.length})
        </button>
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
            Subtotal: {renderAmount(calculateTotal(activeCategory === 'Todas' ? groceries : (groupedGroceries[activeCategory] || [])))}
          </span>
        </div>
        
        {(() => {
          const itemsToRender = activeCategory === 'Todas' ? groceries : (groupedGroceries[activeCategory] || []);
          
          if (!itemsToRender || itemsToRender.length === 0) {
            return <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px 0' }}>No hay artículos para mostrar.</p>;
          }
          
          return itemsToRender.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '8px', borderLeft: item.checked ? '4px solid #22c55e' : '4px solid transparent' }}>
              <button 
                onClick={() => toggleGroceryItem(item.id)}
                className="no-print"
                style={{ background: 'none', border: 'none', color: item.checked ? '#22c55e' : 'var(--color-text-secondary)', cursor: 'pointer', padding: 0 }}
              >
                {item.checked ? <CheckCircle size={24} /> : <Circle size={24} />}
              </button>
              
              <div style={{ flex: 1, textDecoration: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.6 : 1 }}>
                <div style={{ fontWeight: '500', color: 'var(--color-text-main)' }}>{item.name} <span style={{fontSize: '0.75rem', backgroundColor: 'var(--color-bg-deep)', padding: '2px 6px', borderRadius: '4px', color: 'var(--color-text-secondary)', marginLeft: '6px'}}>{item.category}</span></div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span>Ref: {renderAmount(item.price)} c/u</span>
                  <span>| Cant: {item.quantity || 1}</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>| Total: {renderAmount(item.price * (item.quantity || 1))}</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>| 👤 {item.contributor || 'Común'}</span>
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
          ));
        })()}
      </div>
        </>
      )}

      {viewMode === 'inventario' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="section-title" style={{ margin: 0 }}>Inventario de Despensa</h2>
            <div style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
              {(inventory || []).reduce((acc, curr) => acc + (curr.quantity || 0), 0)} Items en total
            </div>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '25px', fontSize: '0.95rem' }}>Los artículos que pagues en la "Lista de Compras" se sumarán automáticamente aquí. Mantén tu stock al día sumando o restando cantidades.</p>
          
          {(!inventory || inventory.length === 0) ? (
            <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px dashed var(--color-border)', borderRadius: '12px', padding: '40px 20px', textAlign: 'center' }}>
              <Package size={40} color="var(--color-text-secondary)" style={{ marginBottom: '15px', opacity: 0.5 }} />
              <h3 style={{ color: 'var(--color-text-main)', margin: '0 0 10px 0' }}>Tu inventario está vacío</h3>
              <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Paga artículos en tu Lista de Mercado para sumarlos aquí automáticamente.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px', alignItems: 'start' }}>
              {Object.entries((inventory || []).reduce((acc, item) => {
                const cat = item.category || 'Otros';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
              }, {})).sort(([a], [b]) => a.localeCompare(b)).map(([catName, items]) => (
                <div key={catName} style={{ backgroundColor: 'var(--color-bg-surface)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid var(--color-border)' }}>
                  <div style={{ backgroundColor: 'var(--color-bg-deep)', padding: '12px 15px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {catName === 'Comida' ? '🛒' : catName === 'Proteína' ? '🥩' : catName === 'Limpieza' ? '🧼' : catName === 'Salud' ? '💊' : catName === 'Cosmética' ? '🧴' : '📦'} {catName}
                    </h3>
                    <span style={{ backgroundColor: 'var(--color-primary)', color: 'white', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                      {items.length} prod.
                    </span>
                  </div>
                  <div style={{ padding: '10px' }}>
                    {items.sort((a, b) => a.name.localeCompare(b.name)).map((item, index) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 5px', borderBottom: index < items.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <div style={{ flex: 1, paddingRight: '10px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--color-text-main)', fontSize: '0.9rem', lineHeight: '1.2' }}>{item.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <select 
                              value={item.category || 'Otros'}
                              onChange={(e) => updateInventoryItem(item.id, { category: e.target.value })}
                              style={{
                                fontSize: '0.75rem',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--color-bg-deep)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                                cursor: 'pointer'
                              }}
                            >
                              {(groceriesCategories || []).map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))}
                              {!groceriesCategories?.some(c => c.name === 'Otros') && <option value="Otros">Otros</option>}
                            </select>
                            {item.quantity <= 0 && <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>Agotado</span>}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--color-bg-deep)', padding: '4px', borderRadius: '8px' }}>
                          <button 
                            onClick={() => updateInventoryItem(item.id, { quantity: Math.max(0, (item.quantity || 0) - 1) })}
                            style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--color-text-main)', padding: 0 }}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center', color: item.quantity > 0 ? 'var(--color-text-main)' : '#ef4444', fontSize: '0.9rem' }}>{item.quantity}</span>
                          <button 
                            onClick={() => updateInventoryItem(item.id, { quantity: (item.quantity || 0) + 1 })}
                            style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--color-text-main)', padding: 0 }}
                          >
                            +
                          </button>
                          <button onClick={() => deleteInventoryItem(item.id)} className="no-print" style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginLeft: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
