import React, { Suspense, lazy, useState } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { Sidebar, BottomNav, CurrencyToggle } from './components/Layout/Layout';
import { FAB } from './components/UI/FAB';
import { Chatbot } from './components/Chatbot/Chatbot';

const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload(true);
        // Add a slight delay to allow the reload to happen
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { default: () => <div className="loading-spinner">Actualizando aplicación...</div> };
      }
      throw error;
    }
  });

// Lazy loading for better performance, with retry logic for PWA chunk errors
const Dashboard = lazyWithRetry(() => import('./components/Dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const TransactionList = lazyWithRetry(() => import('./components/Transactions/TransactionList').then(module => ({ default: module.TransactionList })));
const BudgetView = lazyWithRetry(() => import('./components/Budgets/BudgetView').then(module => ({ default: module.BudgetView })));
const ExpensesView = lazyWithRetry(() => import('./components/Expenses/ExpensesView').then(module => ({ default: module.ExpensesView })));
const CajasView = lazyWithRetry(() => import('./components/Cajas/CajasView').then(module => ({ default: module.CajasView })));
const SavingsView = lazyWithRetry(() => import('./components/Savings/SavingsView').then(module => ({ default: module.SavingsView })));
const GroceriesView = lazyWithRetry(() => import('./components/Groceries/GroceriesView').then(module => ({ default: module.GroceriesView })));
const ProjectsView = lazyWithRetry(() => import('./components/Projects/ProjectsView').then(module => ({ default: module.ProjectsView })));
const SettingsView = lazyWithRetry(() => import('./components/Settings/SettingsView').then(module => ({ default: module.SettingsView })));
const TransactionFormModal = lazyWithRetry(() => import('./components/Transactions/TransactionFormModal').then(module => ({ default: module.TransactionFormModal })));

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
