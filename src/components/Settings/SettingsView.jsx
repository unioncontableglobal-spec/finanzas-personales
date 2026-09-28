import React, { useContext, useState, useEffect } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Settings, Trash2, Plus, Tag, Edit2, Check, ShoppingCart, UserPlus, Users, DollarSign } from 'lucide-react';

export const SettingsView = () => {
  const { 
    categories, addCategory, updateCategory, deleteCategory,
    groceriesCategories, addGroceryCategory, updateGroceryCategory, deleteGroceryCategory,
    contributors, addContributor, deleteContributor,
    appSettings, updateAppSettings
  } = useContext(FinanceContext);
  
  const [newCatName, setNewCatName] = useState('');
  const [newGroceryCatName, setNewGroceryCatName] = useState('');
  const [newContributorName, setNewContributorName] = useState('');

  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');

  const [editingGroceryCatId, setEditingGroceryCatId] = useState(null);
  const [editingGroceryCatName, setEditingGroceryCatName] = useState('');

  const [newExchangeRate, setNewExchangeRate] = useState(appSettings?.exchangeRate || 43.0);
  const [newUsdtRate, setNewUsdtRate] = useState(appSettings?.usdtRate || 44.0);
  const [newGeminiKey, setNewGeminiKey] = useState(appSettings?.geminiApiKey || '');

  useEffect(() => {
    if (appSettings?.exchangeRate) setNewExchangeRate(appSettings.exchangeRate);
    if (appSettings?.usdtRate) setNewUsdtRate(appSettings.usdtRate);
    if (appSettings?.geminiApiKey !== undefined) setNewGeminiKey(appSettings.geminiApiKey);
  }, [appSettings?.exchangeRate, appSettings?.usdtRate, appSettings?.geminiApiKey]);

  const handleUpdateExchangeRate = (e) => {
    e.preventDefault();
    
    const parseRate = (val) => parseFloat(String(val).replace(',', '.'));
    const parsedExchange = parseRate(newExchangeRate);
    const parsedUsdt = parseRate(newUsdtRate);

    if (parsedExchange > 0 && parsedUsdt > 0) {
      updateAppSettings({ 
        exchangeRate: parsedExchange,
        usdtRate: parsedUsdt
      });
      alert("Tasas actualizadas correctamente.");
    } else {
      alert("Por favor ingrese tasas válidas (use punto o coma decimal).");
    }
  };

  const handleUpdateGeminiKey = (e) => {
    e.preventDefault();
    updateAppSettings({ geminiApiKey: newGeminiKey.trim() });
    alert("API Key de Gemini actualizada.");
  };

  const handleAddGeneral = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim());
    setNewCatName('');
  };

  const handleAddGrocery = (e) => {
    e.preventDefault();
    if (!newGroceryCatName.trim()) return;
    addGroceryCategory(newGroceryCatName.trim());
    setNewGroceryCatName('');
  };

  const handleAddContributor = (e) => {
    e.preventDefault();
    if (!newContributorName.trim()) return;
    addContributor(newContributorName.trim());
    setNewContributorName('');
  };

  const startEditingCat = (cat) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const saveEditingCat = () => {
    if (editingCatName.trim()) {
      updateCategory(editingCatId, editingCatName.trim());
    }
    setEditingCatId(null);
    setEditingCatName('');
  };

  const startEditingGroceryCat = (cat) => {
    setEditingGroceryCatId(cat.id);
    setEditingGroceryCatName(cat.name);
  };

  const saveEditingGroceryCat = () => {
    if (editingGroceryCatName.trim()) {
      updateGroceryCategory(editingGroceryCatId, editingGroceryCatName.trim());
    }
    setEditingGroceryCatId(null);
    setEditingGroceryCatName('');
  };

  return (
    <div className="settings-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
        <Settings size={32} color="var(--color-primary)" />
        <h2 className="page-title" style={{ margin: 0 }}>Configuración</h2>
      </div>
      <p className="page-subtitle" style={{ marginBottom: '30px' }}>
        Personaliza las configuraciones globales, tasa BCV y categorías.
      </p>

      {/* Tasa de Cambio */}
      <div className="card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'var(--color-bg-card)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '30px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '10px', color: 'var(--color-text-main)' }}>
          <DollarSign size={20} color="#10b981" /> Tasa de Cambio (BCV)
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '15px', fontSize: '0.95rem' }}>
          Actualiza aquí la tasa del día para que el sistema convierta automáticamente tus ingresos y gastos en Bolívares.
        </p>
        
        <form onSubmit={handleUpdateExchangeRate} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ position: 'relative', flex: '1 1 120px' }}>
            <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>BCV</span>
            <input 
              type="text" 
              inputMode="decimal"
              value={newExchangeRate}
              onChange={(e) => setNewExchangeRate(e.target.value)}
              placeholder="Tasa BCV (Ej. 43.15)"
              className="modern-input"
              required
              style={{ width: '100%', paddingLeft: '55px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ position: 'relative', flex: '1 1 120px' }}>
            <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>USDT</span>
            <input 
              type="text" 
              inputMode="decimal"
              value={newUsdtRate}
              onChange={(e) => setNewUsdtRate(e.target.value)}
              placeholder="Tasa USDT (Ej. 44.20)"
              className="modern-input"
              required
              style={{ width: '100%', paddingLeft: '65px', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" style={{ flex: '1 1 100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>
            <Check size={18} /> Guardar Tasas
          </button>
        </form>
      </div>

      {/* Inteligencia Artificial */}
      <div className="card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'var(--color-bg-card)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '30px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '10px', color: 'var(--color-text-main)' }}>
          <Settings size={20} color="#6366f1" /> Asistente de IA (Gemini)
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '15px', fontSize: '0.95rem' }}>
          Configura tu API Key de Google Gemini para habilitar el asistente financiero integrado.
        </p>
        
        <form onSubmit={handleUpdateGeminiKey} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="password" 
            value={newGeminiKey}
            onChange={(e) => setNewGeminiKey(e.target.value)}
            placeholder="Introduce tu API Key de Gemini"
            className="modern-input"
            style={{ flex: 1 }}
          />
          <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 20px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '500' }}>
            <Check size={18} /> Guardar Key
          </button>
        </form>
      </div>

      {/* Categorías Generales */}
      <div className="card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'var(--color-bg-card)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '30px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '20px', color: 'var(--color-text-main)' }}>
          <Tag size={20} color="var(--color-secondary)" /> Categorías Generales
        </h3>
        
        <form onSubmit={handleAddGeneral} style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
          <input 
            type="text" 
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Nueva categoría (ej. Entretenimiento)"
            className="modern-input"
            required
            style={{ flex: 1 }}
          />
          <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 20px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '500' }}>
            <Plus size={18} /> Añadir
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {categories.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px' }}>No hay categorías. Agrega una arriba.</p>
          ) : (
            categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                {editingCatId === cat.id ? (
                  <div style={{ display: 'flex', flex: 1, gap: '10px', marginRight: '10px' }}>
                    <input 
                      type="text" 
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditingCat()}
                      className="modern-input"
                      style={{ flex: 1, padding: '5px 10px' }}
                      autoFocus
                    />
                    <button onClick={saveEditingCat} style={{ background: 'var(--color-income)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 10px', cursor: 'pointer' }}><Check size={16}/></button>
                  </div>
                ) : (
                  <span style={{ fontWeight: '500', color: 'var(--color-text-main)' }}>{cat.name}</span>
                )}
                
                {editingCatId !== cat.id && (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      onClick={() => startEditingCat(cat)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px' }}
                      title="Editar categoría"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => deleteCategory(cat.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px' }}
                      title="Eliminar categoría"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Categorías del Mercado */}
      <div className="card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'var(--color-bg-card)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '30px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '20px', color: 'var(--color-text-main)' }}>
          <ShoppingCart size={20} color="var(--color-income)" /> Categorías del Mercado
        </h3>
        
        <form onSubmit={handleAddGrocery} style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
          <input 
            type="text" 
            value={newGroceryCatName}
            onChange={(e) => setNewGroceryCatName(e.target.value)}
            placeholder="Nueva categoría de mercado (ej. Lácteos)"
            className="modern-input"
            required
            style={{ flex: 1 }}
          />
          <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 20px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '500' }}>
            <Plus size={18} /> Añadir
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {groceriesCategories.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px' }}>No hay categorías de mercado.</p>
          ) : (
            groceriesCategories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                {editingGroceryCatId === cat.id ? (
                  <div style={{ display: 'flex', flex: 1, gap: '10px', marginRight: '10px' }}>
                    <input 
                      type="text" 
                      value={editingGroceryCatName}
                      onChange={(e) => setEditingGroceryCatName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditingGroceryCat()}
                      className="modern-input"
                      style={{ flex: 1, padding: '5px 10px' }}
                      autoFocus
                    />
                    <button onClick={saveEditingGroceryCat} style={{ background: 'var(--color-income)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 10px', cursor: 'pointer' }}><Check size={16}/></button>
                  </div>
                ) : (
                  <span style={{ fontWeight: '500', color: 'var(--color-text-main)' }}>{cat.name}</span>
                )}
                
                {editingGroceryCatId !== cat.id && (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      onClick={() => startEditingGroceryCat(cat)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px' }}
                      title="Editar categoría"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => deleteGroceryCategory(cat.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px' }}
                      title="Eliminar categoría"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Aportantes y Responsables */}
      <div className="card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'var(--color-bg-card)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '20px', color: 'var(--color-text-main)' }}>
          <Users size={20} color="var(--color-primary)" /> Aportantes y Responsables
        </h3>
        
        <form onSubmit={handleAddContributor} style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
          <input 
            type="text" 
            value={newContributorName}
            onChange={(e) => setNewContributorName(e.target.value)}
            placeholder="Nombre del aportante"
            className="modern-input"
            required
            style={{ flex: 1 }}
          />
          <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 20px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '500' }}>
            <UserPlus size={18} /> Añadir
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {contributors.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px' }}>No hay aportantes registrados.</p>
          ) : (
            contributors.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: 'var(--color-bg-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontWeight: '500', color: 'var(--color-text-main)' }}>{c.name}</span>
                <button 
                  onClick={() => deleteContributor(c.id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px' }}
                  title="Eliminar aportante"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
