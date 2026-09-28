import React, { Suspense, lazy, useState } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { Sidebar, BottomNav, CurrencyToggle } from './components/Layout/Layout';
import { FAB } from './components/UI/FAB';
import { Chatbot } from './components/Chatbot/Chatbot';

// Lazy loading for better performance
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const TransactionList = lazy(() => import('./components/Transactions/TransactionList').then(module => ({ default: module.TransactionList })));
const BudgetView = lazy(() => import('./components/Budgets/BudgetView').then(module => ({ default: module.BudgetView })));
const ExpensesView = lazy(() => import('./components/Expenses/ExpensesView').then(module => ({ default: module.ExpensesView })));
const CajasView = lazy(() => import('./components/Cajas/CajasView').then(module => ({ default: module.CajasView })));
const SavingsView = lazy(() => import('./components/Savings/SavingsView').then(module => ({ default: module.SavingsView })));
const GroceriesView = lazy(() => import('./components/Groceries/GroceriesView').then(module => ({ default: module.GroceriesView })));
const ProjectsView = lazy(() => import('./components/Projects/ProjectsView').then(module => ({ default: module.ProjectsView })));
const SettingsView = lazy(() => import('./components/Settings/SettingsView').then(module => ({ default: module.SettingsView })));
const TransactionFormModal = lazy(() => import('./components/Transactions/TransactionFormModal').then(module => ({ default: module.TransactionFormModal })));

function App() {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <FinanceProvider>
      <div className="app-container">
        <CurrencyToggle />
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="main-content">
          <Suspense fallback={<div className="loading-spinner">Cargando...</div>}>
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'history' && <TransactionList />}
            {activeTab === 'budgets' && <BudgetView />}
            {activeTab === 'expenses' && <ExpensesView />}
            {activeTab === 'cajas' && <CajasView />}
            {activeTab === 'savings' && <SavingsView />}
            {activeTab === 'groceries' && <GroceriesView />}
            {activeTab === 'projects' && <ProjectsView />}
            {activeTab === 'config' && <SettingsView />}
          </Suspense>
        </main>
        
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <FAB onClick={() => setIsModalOpen(true)} />
        
        <Suspense fallback={null}>
          {isModalOpen && (
            <TransactionFormModal onClose={() => setIsModalOpen(false)} />
          )}
        </Suspense>
        
        <Chatbot />
      </div>
    </FinanceProvider>
  );
}

export default App;
