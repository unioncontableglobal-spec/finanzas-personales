import React, { useState } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { Sidebar, BottomNav, CurrencyToggle } from './components/Layout/Layout';
import { Dashboard } from './components/Dashboard/Dashboard';
import { TransactionList } from './components/Transactions/TransactionList';
import { BudgetView } from './components/Budgets/BudgetView';
import { ExpensesView } from './components/Expenses/ExpensesView';
import { CajasView } from './components/Cajas/CajasView';
import { SavingsView } from './components/Savings/SavingsView';
import { GroceriesView } from './components/Groceries/GroceriesView';
import { ProjectsView } from './components/Projects/ProjectsView';
import { SettingsView } from './components/Settings/SettingsView';
import { FAB } from './components/UI/FAB';
import { TransactionFormModal } from './components/Transactions/TransactionFormModal';
import { Chatbot } from './components/Chatbot/Chatbot';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <FinanceProvider>
      <div className="app-container">
        <CurrencyToggle />
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="main-content">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'history' && <TransactionList />}
          {activeTab === 'budgets' && <BudgetView />}
          {activeTab === 'expenses' && <ExpensesView />}
          {activeTab === 'cajas' && <CajasView />}
          {activeTab === 'savings' && <SavingsView />}
          {activeTab === 'groceries' && <GroceriesView />}
          {activeTab === 'projects' && <ProjectsView />}
          {activeTab === 'config' && <SettingsView />}
        </main>
        
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <FAB onClick={() => setIsModalOpen(true)} />
        
        {isModalOpen && (
          <TransactionFormModal onClose={() => setIsModalOpen(false)} />
        )}
        
        <Chatbot />
      </div>
    </FinanceProvider>
  );
}

export default App;
