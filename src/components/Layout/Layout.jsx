import React, { useContext } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Home, List, PieChart, CalendarClock, Wallet, Landmark, ShoppingCart, Hammer, Settings } from 'lucide-react';
import './Layout.css';

export const CurrencyToggle = () => {
  const { appSettings, updateAppSettings } = useContext(FinanceContext);
  const isBs = appSettings?.displayCurrency === 'VES';

  const toggleCurrency = () => {
    updateAppSettings({ displayCurrency: isBs ? 'USD' : 'VES' });
  };

  return (
    <button 
      onClick={toggleCurrency}
      style={{
        position: 'fixed',
        top: '15px',
        right: '15px',
        zIndex: 1000,
        padding: '8px 12px',
        borderRadius: '20px',
        backgroundColor: 'var(--color-bg-card)',
        border: '2px solid var(--color-primary)',
        color: 'var(--color-text-main)',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        cursor: 'pointer',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}
      title="Cambiar moneda de visualización"
    >
      Ver: {isBs ? 'Bs.' : '$'}
    </button>
  );
};

export const Sidebar = ({ activeTab, setActiveTab }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">Finanzas</div>
      <nav className="sidebar-nav">
        <button 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Home size={20} />
          <span>Resumen</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <List size={20} />
          <span>Historial</span>
        </button>
        
        <div style={{margin: '10px 0', borderBottom: '1px solid #334155'}}></div>
        
        <button 
          className={`nav-item ${activeTab === 'cajas' ? 'active' : ''}`}
          onClick={() => setActiveTab('cajas')}
        >
          <Wallet size={20} />
          <span>Cajas / Cuentas</span>
        </button>
        
        <button 
          className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          <CalendarClock size={20} />
          <span>Gastos y Deudas</span>
        </button>
        
        <button 
          className={`nav-item ${activeTab === 'budgets' ? 'active' : ''}`}
          onClick={() => setActiveTab('budgets')}
        >
          <PieChart size={20} />
          <span>Presupuestos</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'savings' ? 'active' : ''}`}
          onClick={() => setActiveTab('savings')}
        >
          <Landmark size={20} />
          <span>Ahorros (Cajas Fuertes)</span>
        </button>
        
        <div style={{margin: '10px 0', borderBottom: '1px solid #334155'}}></div>
        
        <button 
          className={`nav-item ${activeTab === 'groceries' ? 'active' : ''}`}
          onClick={() => setActiveTab('groceries')}
        >
          <ShoppingCart size={20} />
          <span>Mercado</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          <Hammer size={20} />
          <span>Proyectos</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
          style={{ marginTop: 'auto' }}
        >
          <Settings size={20} />
          <span>Configuración</span>
        </button>
      </nav>
    </aside>
  );
};

export const BottomNav = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="bottom-nav">
      <button 
        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => setActiveTab('dashboard')}
      >
        <Home size={24} />
        <span>Inicio</span>
      </button>
      <button 
        className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`}
        onClick={() => setActiveTab('expenses')}
      >
        <CalendarClock size={24} />
        <span>Gastos</span>
      </button>
      <button 
        className={`nav-item ${activeTab === 'cajas' ? 'active' : ''}`}
        onClick={() => setActiveTab('cajas')}
      >
        <Wallet size={24} />
        <span>Cajas</span>
      </button>
      <button 
        className={`nav-item ${activeTab === 'groceries' ? 'active' : ''}`}
        onClick={() => setActiveTab('groceries')}
      >
        <ShoppingCart size={24} />
        <span>Mercado</span>
      </button>
      <button 
        className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
        onClick={() => setActiveTab('config')}
      >
        <Settings size={24} />
        <span>Config.</span>
      </button>
    </nav>
  );
};
