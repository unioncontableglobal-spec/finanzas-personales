import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './MultiSelectDropdown.css';

export const MultiSelectDropdown = ({ options, selectedOptions, onChange, placeholder = "Seleccionar..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    if (selectedOptions.includes(option)) {
      onChange(selectedOptions.filter(o => o !== option));
    } else {
      onChange([...selectedOptions, option]);
    }
  };

  const selectAll = () => {
    onChange([...options]);
  };

  const deselectAll = () => {
    onChange([]);
  };

  const displayText = selectedOptions.length === 0 
    ? placeholder 
    : selectedOptions.length === options.length 
      ? "Todos seleccionados" 
      : selectedOptions.length === 1 
        ? selectedOptions[0] 
        : `${selectedOptions.length} seleccionados`;

  return (
    <div className="multi-select-container" ref={dropdownRef}>
      <div 
        className={`multi-select-header ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{displayText}</span>
        <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </div>
      
      {isOpen && (
        <div className="multi-select-menu card">
          <div className="multi-select-actions">
            <button type="button" onClick={selectAll} className="text-btn">Marcar todos</button>
            <span className="separator">|</span>
            <button type="button" onClick={deselectAll} className="text-btn">Desmarcar</button>
          </div>
          
          <div className="multi-select-options">
            {options.map(option => {
              const isSelected = selectedOptions.includes(option);
              return (
                <div 
                  key={option} 
                  className={`multi-select-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleOption(option)}
                >
                  <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <Check size={14} color="white" />}
                  </div>
                  <span className="option-label">{option}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
