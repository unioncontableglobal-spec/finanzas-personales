import React, { createContext, useState, useEffect } from 'react';

const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const FinanceContext = createContext();

const GAS_URL = import.meta.env.VITE_GAS_URL || '';

export const FinanceProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [savings, setSavings] = useState({});
  const [cajas, setCajas] = useState({});// New States
  const [contributors, setContributors] = useState([]);
  const [groceries, setGroceries] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [categories, setCategories] = useState([
    { id: '1', name: 'Gastos del hogar' },
    { id: '2', name: 'Comida' },
    { id: '3', name: 'Proteína' },
    { id: '4', name: 'Limpieza' },
    { id: '5', name: 'Salud' },
    { id: '6', name: 'Cosmética' },
    { id: '7', name: 'Otros' }
  ]);
  
  const [appSettings, setAppSettings] = useState({
    exchangeRate: 43.0,
    usdtRate: 44.0,
    displayCurrency: 'USD',
    savingsCurrencies: {}
  });

  const [loading, setLoading] = useState(true);

  // Load from Google Sheets initially
  useEffect(() => {
    // Limpiar cualquier cola offline vieja que pueda corromper datos
    localStorage.removeItem('finance_offline_queue');

    const fetchData = async () => {
      if (!GAS_URL || GAS_URL === 'TU_URL_DE_APPS_SCRIPT_AQUI') {
        console.warn('VITE_GAS_URL no está configurado.');
        setLoading(false);
        return;
      }

      // Optimistic Loading (Caché local para que cargue en 0 segundos)
      try {
        const cached = localStorage.getItem('finance_cached_data');
        if (cached) {
          const data = JSON.parse(cached);
          if (data.transactions) setTransactions(data.transactions);
          if (data.cajas) setCajas(data.cajas);
          if (data.budgets) setBudgets(data.budgets);
          if (data.savings) setSavings(data.savings);
          if (data.contributors) setContributors(data.contributors);
          if (data.groceries) setGroceries(data.groceries);
          if (data.appSettings && data.appSettings.inventory) setInventory(data.appSettings.inventory);
          if (data.projects) setProjects(data.projects);
          if (data.categories && data.categories.length > 0) setCategories(data.categories);
          if (data.appSettings) setAppSettings(data.appSettings);
          if (data.groceriesCategories && data.groceriesCategories.length > 0) setGroceriesCategories(data.groceriesCategories);
          
          setLoading(false); // Quita la pantalla de carga instantáneamente
        }
      } catch(e) {
        console.warn("Error leyendo caché", e);
      }

      try {
        const res = await fetch(GAS_URL);
        const data = await res.json();
        if (data) {
          let loadedTxs = data.transactions || [];
          let loadedCajas = data.cajas || { 'Caja Común': 0 };
          let loadedSavings = data.savings || savings;
          
          // MIGRATION: Migrar pagos antiguos al nuevo esquema de pagos parciales
          loadedTxs = loadedTxs.map(t => {
            if (t.isPaid && (!t.payments || t.payments.length === 0)) {
              return {
                ...t,
                payments: [{
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  amount: t.amount,
                  cajaName: t.originCaja,
                  date: t.date
                }]
              };
            }
            return { ...t, payments: t.payments || [] };
          });

          // MIGRATION: Si hay 'payables' antiguos, los convertimos a transactions y los vaciamos en el backend
          if (data.payables && data.payables.length > 0) {
            const migratedPayables = data.payables.map(p => ({
              ...p,
              type: 'expense',
              isPaid: p.isPaid || false
            }));
            loadedTxs = [...migratedPayables, ...loadedTxs];
            syncData('update_payables', []);
            syncData('update_transactions', loadedTxs);
          }

          // Si 'cajas' no existía antes, lo creamos basándonos en los contributors
          if (!data.cajas && data.contributors) {
            data.contributors.forEach(c => {
              loadedCajas[`Caja ${c.name}`] = 0;
            });
            syncData('update_cajas', loadedCajas);
          }

          setTransactions(loadedTxs);
          setCajas(loadedCajas);
          if (data.budgets) setBudgets(data.budgets);
          setSavings(loadedSavings);
          if (data.contributors) setContributors(data.contributors);
          if (data.groceries) setGroceries(data.groceries);
          if (data.appSettings && data.appSettings.inventory) setInventory(data.appSettings.inventory);
          if (data.projects) setProjects(data.projects);
          if (data.categories && data.categories.length > 0) setCategories(data.categories);
          if (data.appSettings) setAppSettings(data.appSettings);
          if (data.groceriesCategories && data.groceriesCategories.length > 0) setGroceriesCategories(data.groceriesCategories);
          
          // Actualizar la caché local con los datos frescos
          localStorage.setItem('finance_cached_data', JSON.stringify({
            transactions: loadedTxs,
            cajas: loadedCajas,
            budgets: data.budgets || budgets,
            savings: loadedSavings,
            contributors: data.contributors || contributors,
            groceries: data.groceries || groceries,
            inventory: (data.appSettings && data.appSettings.inventory) || inventory,
            projects: data.projects || projects,
            categories: data.categories || categories,
            appSettings: data.appSettings || appSettings,
            groceriesCategories: data.groceriesCategories || groceriesCategories
          }));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const syncData = async (type, data) => {
    if (!GAS_URL || GAS_URL === 'TU_URL_DE_APPS_SCRIPT_AQUI') return;

    let finalType = type;
    let finalData = data;

    if (['update_groceries', 'update_groceriesCategories', 'update_projects', 'update_cajas'].includes(type)) {
      finalType = 'update_all';
      finalData = { [type.replace('update_', '')]: data };
    }

    try {
      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ type: finalType, data: finalData })
      });
    } catch (err) {
      console.error('Error sincronizando datos:', err);
    }
  };

  // --- Settings ---
  const updateAppSettings = (newSettings) => {
    const updated = { ...appSettings, ...newSettings };
    setAppSettings(updated);
    syncData('update_appSettings', updated);
  };

  // --- Savings & Cajas ---
  const updateSavings = (account, amount, type) => {
    const current = savings[account] || 0;
    const value = parseFloat(amount);
    const newBalance = type === 'deposit' ? current + value : current - value;
    const newSavings = { ...savings, [account]: Math.max(0, newBalance) };
    setSavings(newSavings);
    syncData('update_savings', newSavings);
    return newSavings;
  };

  const deleteSavings = (account) => {
    const newSavings = { ...savings };
    delete newSavings[account];
    setSavings(newSavings);
    syncData('update_savings', newSavings);
  };

  const renameSavings = (oldName, newName) => {
    if(!newName || oldName === newName || savings[newName] !== undefined) return;
    const newSavings = { ...savings };
    newSavings[newName] = newSavings[oldName];
    delete newSavings[oldName];
    setSavings(newSavings);
    syncData('update_savings', newSavings);
  };

  const updateCaja = (cajaName, amount, type) => {
    const current = cajas[cajaName] || 0;
    const value = parseFloat(amount);
    const newBalance = type === 'deposit' ? current + value : current - value;
    const newCajas = { ...cajas, [cajaName]: newBalance }; // Permite negativos temporalmente
    setCajas(newCajas);
    syncData('update_cajas', newCajas);
    return newCajas;
  };

  const deleteCaja = (cajaName) => {
    const newCajas = { ...cajas };
    delete newCajas[cajaName];
    setCajas(newCajas);
    syncData('update_cajas', newCajas);
  };

  const renameCaja = (oldName, newName) => {
    if(!newName || oldName === newName || cajas[newName] !== undefined) return;
    const newCajas = { ...cajas };
    newCajas[newName] = newCajas[oldName];
    delete newCajas[oldName];
    setCajas(newCajas);
    syncData('update_cajas', newCajas);

    const newTransactions = transactions.map(t => {
      if (t.originCaja === oldName) return { ...t, originCaja: newName };
      return t;
    });
    if (JSON.stringify(newTransactions) !== JSON.stringify(transactions)) {
      setTransactions(newTransactions);
      syncData('update_transactions', newTransactions);
    }
  };

  // --- Transactions ---
  const addTransaction = (transaction) => {
    const newTx = { 
      ...transaction, 
      id: generateId(), 
      date: transaction.date || new Date().toISOString(),
      isPaid: transaction.isPaid !== undefined ? transaction.isPaid : false,
      payments: transaction.payments || []
    };

    const newCajas = { ...cajas };
    // Process initial payments if any (e.g. if it's already created as paid)
    if (newTx.isPaid && newTx.originCaja && newCajas[newTx.originCaja] !== undefined && newTx.payments.length === 0) {
      newTx.payments = [{
        id: generateId(),
        amount: newTx.amount,
        cajaName: newTx.originCaja,
        date: newTx.date
      }];
    }

    // Apply payments to cajas
    newTx.payments.forEach(p => {
      if (newCajas[p.cajaName] !== undefined) {
        if (newTx.type === 'income') {
          newCajas[p.cajaName] += p.amount;
        } else if (newTx.type === 'expense') {
          newCajas[p.cajaName] -= p.amount;
        }
      }
    });

    setCajas(newCajas);
    syncData('update_cajas', newCajas);

    const newTransactions = [newTx, ...transactions];
    setTransactions(newTransactions);
    syncData('update_transactions', newTransactions);
  };

  const deleteTransaction = (id) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    const newCajas = { ...cajas };
    // Revert all payments
    const payments = tx.payments || [];
    payments.forEach(p => {
      if (newCajas[p.cajaName] !== undefined) {
        if (tx.type === 'income') {
          newCajas[p.cajaName] -= p.amount; // Refund income
        } else if (tx.type === 'expense') {
          newCajas[p.cajaName] += p.amount; // Refund expense
        }
      }
    });
    
    setCajas(newCajas);
    syncData('update_cajas', newCajas);

    const newTransactions = transactions.filter(t => t.id !== id);
    setTransactions(newTransactions);
    syncData('update_transactions', newTransactions);
  };

  const updateTransaction = (id, updatedTx) => {
    const oldTx = transactions.find(t => t.id === id);
    if (!oldTx) return;

    const newCajas = { ...cajas };
    
    // 1. Revert old payments
    const oldPayments = oldTx.payments || [];
    oldPayments.forEach(p => {
      if (newCajas[p.cajaName] !== undefined) {
        if (oldTx.type === 'income') {
          newCajas[p.cajaName] -= p.amount;
        } else if (oldTx.type === 'expense') {
          newCajas[p.cajaName] += p.amount;
        }
      }
    });

    // 2. Format new transaction
    const finalTx = { ...oldTx, ...updatedTx };
    if (!finalTx.payments) finalTx.payments = [];
    
    // Si la transacción tiene un solo pago (escenario estándar), sincronizamos el monto y la caja
    // si el usuario los cambió en el formulario de edición.
    if (finalTx.payments.length === 1) {
      if (oldTx.amount === finalTx.payments[0].amount && finalTx.amount !== oldTx.amount) {
        finalTx.payments[0].amount = finalTx.amount;
      }
      if (finalTx.originCaja && finalTx.originCaja !== finalTx.payments[0].cajaName) {
        finalTx.payments[0].cajaName = finalTx.originCaja;
      }
    }
    
    // Compatibilidad: si lo editaron y marcaron como isPaid sin payments, generamos uno
    if (finalTx.isPaid && finalTx.payments.length === 0 && finalTx.originCaja) {
      finalTx.payments = [{
        id: generateId(),
        amount: finalTx.amount,
        cajaName: finalTx.originCaja,
        date: finalTx.date
      }];
    }

    // Recalcular isPaid por si se editó el monto total
    const totalPaid = finalTx.payments.reduce((sum, p) => sum + p.amount, 0);
    finalTx.isPaid = totalPaid >= finalTx.amount;

    // 3. Apply new payments
    finalTx.payments.forEach(p => {
      if (newCajas[p.cajaName] !== undefined) {
        if (finalTx.type === 'income') {
          newCajas[p.cajaName] += p.amount;
        } else if (finalTx.type === 'expense') {
          newCajas[p.cajaName] -= p.amount;
        }
      }
    });

    setCajas(newCajas);
    syncData('update_cajas', newCajas);

    const newTransactions = transactions.map(t => t.id === id ? finalTx : t);
    setTransactions(newTransactions);
    syncData('update_transactions', newTransactions);
  };

  const markTransactionAsPaid = (id, cajaName, paymentAmount = null) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx || tx.isPaid) return;

    const amountToPay = paymentAmount !== null ? parseFloat(paymentAmount) : tx.amount;
    if (isNaN(amountToPay) || amountToPay <= 0) return;

    // Update Caja Balance
    if (tx.type === 'income') {
      updateCaja(cajaName, amountToPay, 'deposit');
    } else {
      updateCaja(cajaName, amountToPay, 'withdraw');
    }

    // Add payment record
    const newPayment = {
      id: generateId(),
      amount: amountToPay,
      cajaName: cajaName,
      date: new Date().toISOString().split('T')[0] // today
    };

    const newTransactions = transactions.map(t => {
      if (t.id === id) {
        const currentPayments = t.payments || [];
        const updatedPayments = [...currentPayments, newPayment];
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        
        return { 
          ...t, 
          payments: updatedPayments,
          isPaid: totalPaid >= t.amount,
          originCaja: cajaName // keeping originCaja for backwards compatibility of last used
        };
      }
      return t;
    });

    setTransactions(newTransactions);
    syncData('update_transactions', newTransactions);
  };

  // --- Budgets ---
  const updateBudget = (budgetId, limit) => {
    // budgetId format is now typically "ContributorName_CategoryName" or just "CategoryName"
    const newBudgets = { ...budgets, [budgetId]: parseFloat(limit) };
    setBudgets(newBudgets);
    syncData('update_budgets', newBudgets);
  };

  // --- Contributors ---
  const addContributor = (name) => {
    const newContributor = { id: generateId(), name };
    const newContributors = [...contributors, newContributor];
    setContributors(newContributors);
    syncData('update_contributors', newContributors);
    
    // Crear su caja automáticamente
    updateCaja(`Caja ${name}`, 0, 'deposit');
  };
  
  const deleteContributor = (id) => {
    const newContributors = contributors.filter(c => c.id !== id);
    setContributors(newContributors);
    syncData('update_contributors', newContributors);
  };

  // --- Groceries ---
  const [groceriesCategories, setGroceriesCategories] = useState([
    { id: '1', name: 'Proteínas' },
    { id: '2', name: 'Charcutería' },
    { id: '3', name: 'Frutas y Verduras' },
    { id: '4', name: 'Seco' },
    { id: '5', name: 'Detergentes' },
    { id: '6', name: 'Aseo Personal' },
    { id: '7', name: 'Otros' }
  ]);

  const addGroceryCategory = (name) => {
    const newCategory = { id: generateId(), name };
    const newCategories = [...groceriesCategories, newCategory];
    setGroceriesCategories(newCategories);
    syncData('update_groceriesCategories', newCategories);
  };

  const updateGroceryCategory = (id, newName) => {
    const oldCat = groceriesCategories.find(c => c.id === id);
    const oldName = oldCat ? oldCat.name : null;

    const newCategories = groceriesCategories.map(c => c.id === id ? { ...c, name: newName } : c);
    setGroceriesCategories(newCategories);
    syncData('update_groceriesCategories', newCategories);

    if (oldName && oldName !== newName) {
      const newGroceries = groceries.map(g => g.category === oldName ? { ...g, category: newName } : g);
      setGroceries(newGroceries);
      syncData('update_groceries', newGroceries);
    }
  };

  const deleteGroceryCategory = (id) => {
    const newCategories = groceriesCategories.filter(c => c.id !== id);
    setGroceriesCategories(newCategories);
    syncData('update_groceriesCategories', newCategories);
  };

  const addGroceryItem = (item) => {
    const newItem = { ...item, id: generateId(), checked: false };
    const newGroceries = [...groceries, newItem];
    setGroceries(newGroceries);
    syncData('update_groceries', newGroceries);
  };
  
  const toggleGroceryItem = (id) => {
    const newGroceries = groceries.map(g => g.id === id ? { ...g, checked: !g.checked } : g);
    setGroceries(newGroceries);
    syncData('update_groceries', newGroceries);
  };

  const deleteGroceryItem = (id) => {
    const newGroceries = groceries.filter(g => g.id !== id);
    setGroceries(newGroceries);
    syncData('update_groceries', newGroceries);
  };

  const clearCheckedGroceries = () => {
    const newGroceries = groceries.filter(g => !g.checked);
    setGroceries(newGroceries);
    syncData('update_groceries', newGroceries);
  };

  // --- Inventory ---
  const addInventoryItem = (item) => {
    const newItem = { ...item, id: generateId() };
    const newInventory = [...inventory, newItem];
    setInventory(newInventory);
    updateAppSettings({ inventory: newInventory });
  };

  const updateInventoryItem = (id, updates) => {
    const newInventory = inventory.map(i => i.id === id ? { ...i, ...updates } : i);
    setInventory(newInventory);
    updateAppSettings({ inventory: newInventory });
  };

  const deleteInventoryItem = (id) => {
    const newInventory = inventory.filter(i => i.id !== id);
    setInventory(newInventory);
    updateAppSettings({ inventory: newInventory });
  };

  // --- Projects ---
  const deleteProject = (projectId) => {
    const newProjects = projects.filter(p => p.id !== projectId);
    setProjects(newProjects);
    syncData('update_projects', newProjects);
  };

  const renameProject = (id, newName) => {
    if(!newName) return;
    const newProjects = projects.map(p => p.id === id ? { ...p, name: newName } : p);
    setProjects(newProjects);
    syncData('update_projects', newProjects);
  };

  const addProject = (project) => {
    const newProject = { ...project, id: generateId(), items: [] };
    const newProjects = [...projects, newProject];
    setProjects(newProjects);
    syncData('update_projects', newProjects);
  };

  const addProjectItem = (projectId, item) => {
    const newProjects = projects.map(p => {
      if (p.id === projectId) {
        return { ...p, items: [...p.items, { ...item, id: generateId() }] };
      }
      return p;
    });
    setProjects(newProjects);
    syncData('update_projects', newProjects);
  };
  
  const deleteProjectItem = (projectId, itemId) => {
    const newProjects = projects.map(p => {
      if (p.id === projectId) {
        return { ...p, items: p.items.filter(i => i.id !== itemId) };
      }
      return p;
    });
    setProjects(newProjects);
    syncData('update_projects', newProjects);
  };

  // --- Categories ---
  const addCategory = (name) => {
    const newCategory = { id: generateId(), name };
    const newCategories = [...categories, newCategory];
    setCategories(newCategories);
    syncData('update_categories', newCategories);
  };

  const updateCategory = (id, newName) => {
    const oldCat = categories.find(c => c.id === id);
    const oldName = oldCat ? oldCat.name : null;

    const newCategories = categories.map(c => c.id === id ? { ...c, name: newName } : c);
    setCategories(newCategories);
    syncData('update_categories', newCategories);

    if (oldName && oldName !== newName) {
      const newTransactions = transactions.map(t => t.category === oldName ? { ...t, category: newName } : t);
      setTransactions(newTransactions);
      syncData('update_transactions', newTransactions);
    }
  };

  const deleteCategory = (id) => {
    const newCategories = categories.filter(c => c.id !== id);
    setCategories(newCategories);
    syncData('update_categories', newCategories);
  };

  // Cargar datos extra si vienen de GS
  useEffect(() => {
    if (loading) return;
  }, [loading]);

  return (
    <FinanceContext.Provider value={{ 
      transactions, addTransaction, deleteTransaction, markTransactionAsPaid, updateTransaction,
      budgets, updateBudget,
      savings, updateSavings, deleteSavings, renameSavings,
      cajas, updateCaja, deleteCaja, renameCaja,
      contributors, addContributor, deleteContributor,
      groceriesCategories, addGroceryCategory, updateGroceryCategory, deleteGroceryCategory,
      groceries, addGroceryItem, toggleGroceryItem, deleteGroceryItem, clearCheckedGroceries,
      inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem,
      projects, addProject, deleteProject, renameProject, addProjectItem, deleteProjectItem,
      categories, addCategory, updateCategory, deleteCategory,
      appSettings, updateAppSettings,
      loading
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
