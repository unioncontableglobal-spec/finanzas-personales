import React, { useState, useContext, useEffect, useRef } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import './Chatbot.css';

export const Chatbot = () => {
  const { 
    appSettings, 
    cajas, 
    savings, 
    transactions, 
    budgets, 
    categories 
  } = useContext(FinanceContext);
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Mover hacia abajo el scroll cuando hay mensajes nuevos
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Mensaje de bienvenida inicial
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { 
          role: 'model', 
          text: '¡Hola! Soy tu asistente financiero personal. Puedo ayudarte a analizar tus gastos, revisar tus presupuestos o darte consejos basados en tus datos. ¿En qué te puedo ayudar hoy?' 
        }
      ]);
    }
  }, [isOpen, messages.length]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const apiKey = appSettings?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      setMessages(prev => [...prev, 
        { role: 'user', text: inputMessage },
        { role: 'model', text: 'Para ayudarle necesito que configure su API Key de Google Gemini en la sección de Configuración.' }
      ]);
      setInputMessage('');
      return;
    }

    const newUserMessage = { role: 'user', text: inputMessage };
    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);

      // Preparar el contexto financiero
      const financeContext = `
Eres un experto asistente financiero integrado en una aplicación de Finanzas Personales.
Debes responder siempre de forma concisa, amable, profesional y usando formato Markdown si es necesario.
Si te preguntan algo fuera del contexto financiero, recuérdales amablemente tu propósito.

Aquí tienes los datos financieros actuales del usuario para que puedas darle respuestas precisas:

- Cajas (Cuentas disponibles): ${JSON.stringify(cajas)}
- Ahorros: ${JSON.stringify(savings)}
- Presupuestos (Límites por categoría): ${JSON.stringify(budgets)}
- Categorías de gastos: ${JSON.stringify(categories.map(c => c.name))}
- Últimas 20 transacciones: ${JSON.stringify(transactions.slice(0, 20).map(t => ({
  tipo: t.type,
  monto: t.amount,
  categoria: t.category,
  descripcion: t.description,
  fecha: t.date,
  pagado: t.isPaid
})))}

Tasa de cambio actual: BCV ${appSettings?.exchangeRate}, USDT ${appSettings?.usdtRate}.
Moneda principal de visualización: ${appSettings?.displayCurrency}.
`;

      const model = genAI.getGenerativeModel({ 
        model: "gemini-3.5-flash",
        systemInstruction: financeContext
      });

      // Preparar historial de mensajes para la API (omitiendo el primer mensaje de bienvenida para evitar conflictos de roles si es necesario, o simplemente enviándolo)
      // Gemini requiere que si el historial empieza, empiece con 'user'. Así que ignoramos el primer mensaje de bienvenida de la UI.
      const chatHistory = messages.slice(1).map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      // Iniciar chat
      const chat = model.startChat({
        history: chatHistory,
      });

      const result = await chat.sendMessage(newUserMessage.text);
      const responseText = result.response.text();

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error("Error with Gemini API:", error);
      let errorMsg = 'Hubo un error al procesar tu solicitud.';
      
      if (error.message && error.message.includes('API key not valid')) {
        errorMsg = '🚨 Error: La API Key ingresada no es válida. Asegúrate de haberla copiado correctamente desde Google AI Studio (debe empezar con "AIzaSy").';
      } else if (error.message && error.message.includes('not found for API version')) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          const data = await res.json();
          if (data.models) {
            const availableModels = data.models.map(m => m.name.replace('models/', '')).filter(m => m.includes('gemini')).join(', ');
            errorMsg = `🚨 Error: El modelo principal no está disponible en tu cuenta. Modelos a los que sí tienes acceso: ${availableModels || 'Ninguno'}. Avísame cuáles te salen para configurarlo.`;
          } else {
            errorMsg = `🚨 Error: Tu API Key no tiene acceso a ningún modelo de Gemini (Respuesta: ${JSON.stringify(data)}).`;
          }
        } catch (e) {
          errorMsg = `Error técnico: ${error.message}`;
        }
      } else {
        errorMsg = `Error técnico: ${error.message}. Verifica tu conexión o tu API Key.`;
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: errorMsg
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botón Flotante del Chatbot */}
      <button 
        className="chatbot-fab" 
        onClick={() => setIsOpen(true)}
        style={{ display: isOpen ? 'none' : 'flex' }}
      >
        <MessageCircle size={28} />
      </button>

      {/* Ventana del Chatbot */}
      <div className={`chatbot-window ${isOpen ? 'open' : ''}`}>
        <div className="chatbot-header">
          <div className="chatbot-header-title">
            <Bot size={24} />
            <span>Asistente Financiero AI</span>
          </div>
          <button className="chatbot-close-btn" onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="chatbot-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chatbot-message-wrapper ${msg.role}`}>
              <div className="chatbot-message-avatar">
                {msg.role === 'model' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className="chatbot-message-bubble">
                {/* Renderizar saltos de línea básicos */}
                {msg.text.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ))}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="chatbot-message-wrapper model">
              <div className="chatbot-message-avatar">
                <Bot size={18} />
              </div>
              <div className="chatbot-message-bubble loading">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chatbot-input-area" onSubmit={handleSendMessage}>
          <input 
            type="text" 
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Escribe tu consulta financiera..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !inputMessage.trim()}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </>
  );
};
