import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Trash2, Edit2, Plus, ChevronDown, ChevronUp, CheckCircle, Printer, Hammer } from 'lucide-react';

export const ProjectsView = () => {
  const { projects, addProject, deleteProject, renameProject, addProjectItem, deleteProjectItem, addTransaction } = useContext(FinanceContext);
  
  const [newProjectName, setNewProjectName] = useState('');
  const [expandedProject, setExpandedProject] = useState(null);
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    addProject({ name: newProjectName });
    setNewProjectName('');
  };

  const handleAddItem = (e, projectId) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;
    addProjectItem(projectId, {
      name: newItemName,
      price: parseFloat(newItemPrice)
    });
    setNewItemName('');
    setNewItemPrice('');
  };

  const toggleExpand = (id) => {
    setExpandedProject(expandedProject === id ? null : id);
  };

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + item.price, 0).toFixed(2);
  };

  const handleApproveProject = (project) => {
    const amount = parseFloat(calculateTotal(project.items));
    if (amount <= 0) return;
    
    addTransaction({
      type: 'expense',
      amount: amount,
      category: 'Gastos del hogar',
      description: `Proyecto: ${project.name}`
    });
    
    alert(`Proyecto "${project.name}" aprobado y registrado como gasto por $${amount}.`);
  };

  const totalInvestment = projects.reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.price, 0), 0);
  const handlePrint = () => window.print();

  return (
    <div className="section-card" id="printable-projects">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Proyectos de Casa</h2>
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
          <Printer size={16} /> PDF
        </button>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          borderRadius: '12px', padding: '16px', border: '1px solid #93c5fd'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#2563eb', fontSize: '0.75rem', fontWeight: '600' }}>
            <Hammer size={14} /> INVERSIÓN TOTAL ESTIMADA
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af' }}>
            ${totalInvestment.toFixed(2)}
          </div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          borderRadius: '12px', padding: '16px', border: '1px solid #bbf7d0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#16a34a', fontSize: '0.75rem', fontWeight: '600' }}>
            PROYECTOS ACTIVOS
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#14532d' }}>
            {projects.length}
          </div>
        </div>
      </div>
      
      {/* Formulario Nuevo Proyecto */}
      <form onSubmit={handleCreateProject} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <input 
          type="text" 
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="Nuevo proyecto (Ej. Remodelar Cocina)" 
          className="form-input" 
          style={{ flex: 1 }}
        />
        <button type="submit" className="submit-btn" style={{ padding: '0.75rem', width: 'auto' }}>
          <Plus size={20} />
        </button>
      </form>

      {/* Lista de Proyectos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {projects.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>No hay proyectos registrados.</p>
        ) : (
          projects.map(project => (
            <div key={project.id} style={{ backgroundColor: 'var(--color-bg-surface)', borderRadius: '8px', overflow: 'hidden' }}>
              
              {/* Cabecera del Proyecto */}
              <div 
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '15px', borderBottom: expandedProject === project.id ? '1px solid var(--color-border)' : 'none'
                }}
              >
                <div onClick={() => toggleExpand(project.id)} style={{ flex: 1, cursor: 'pointer' }}>
                  <h3 style={{ margin: 0, color: 'var(--color-text-main)', fontSize: '1rem' }}>{project.name}</h3>
                  <p style={{ margin: '5px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    Total Estimado: <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>${calculateTotal(project.items)}</span>
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button 
                    onClick={() => {
                      const newName = window.prompt(`Nuevo nombre para el proyecto:`, project.name);
                      if (newName && newName !== project.name) {
                        renameProject(project.id, newName);
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', padding: '5px', cursor: 'pointer' }}
                    title="Editar Proyecto"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button 
                    onClick={() => {
                      if(window.confirm(`¿Seguro que deseas eliminar el proyecto "${project.name}"?`)) {
                        deleteProject(project.id);
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', padding: '5px', cursor: 'pointer' }}
                    title="Eliminar Proyecto"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button onClick={() => toggleExpand(project.id)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', padding: '5px', cursor: 'pointer' }}>
                    {expandedProject === project.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </button>
                </div>
              </div>

              {/* Detalle del Proyecto (Cotizaciones) */}
              {expandedProject === project.id && (
                <div style={{ padding: '15px', backgroundColor: 'var(--color-bg-deep)' }}>
                  
                  {/* Formulario Agregar Item */}
                  <form onSubmit={(e) => handleAddItem(e, project.id)} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <input 
                      type="text" 
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Ej. Pintura blanca" 
                      className="form-input" 
                      style={{ flex: 2, padding: '8px', fontSize: '0.875rem' }}
                      required
                    />
                    <input 
                      type="number" 
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="Monto $" 
                      className="form-input" 
                      step="0.01" min="0"
                      style={{ flex: 1, padding: '8px', fontSize: '0.875rem' }}
                      required
                    />
                    <button type="submit" className="submit-btn" style={{ padding: '8px', width: 'auto' }}>
                      <Plus size={18} />
                    </button>
                  </form>

                  {/* Lista de Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                    {project.items.length === 0 ? (
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>No hay cotizaciones agregadas.</p>
                    ) : (
                      project.items.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-surface)', padding: '10px', borderRadius: '4px' }}>
                          <span style={{ color: 'var(--color-text-main)', fontSize: '0.875rem' }}>{item.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>${item.price.toFixed(2)}</span>
                            <button 
                              onClick={() => deleteProjectItem(project.id, item.id)}
                              style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {project.items.length > 0 && (
                    <button 
                      onClick={() => handleApproveProject(project)}
                      style={{ 
                        width: '100%', backgroundColor: '#22c55e', color: '#fff', border: 'none', 
                        padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                      }}
                    >
                      <CheckCircle size={18} /> Aprobar Proyecto y Registrar Gasto
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
