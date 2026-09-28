import React from 'react';
import { Plus } from 'lucide-react';
import './FAB.css';

export const FAB = ({ onClick }) => {
  return (
    <button className="fab" onClick={onClick} aria-label="Añadir transacción">
      <Plus size={24} />
    </button>
  );
};
