import React, { useState } from 'react';
import { AppConfig } from '../types';
import { Plus, Trash2, Settings as SettingsIcon, Users, MapPin, HelpCircle } from 'lucide-react';

interface SettingsViewProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ config, onUpdateConfig }) => {
  const [activeTab, setActiveTab] = useState<'areas' | 'questions'>('areas');
  const [newArea, setNewArea] = useState('');
  const [newResp, setNewResp] = useState('');
  const [newQuestion, setNewQuestion] = useState('');

  const handleAddArea = () => {
    if (newArea.trim() && newResp.trim()) {
      const areaName = newArea.trim().toUpperCase();
      const respName = newResp.trim().toUpperCase();
      
      onUpdateConfig({ 
        ...config, 
        areas: [...config.areas, areaName],
        responsables: [...config.responsables, { name: respName, area: areaName }]
      });
      setNewArea('');
      setNewResp('');
    } else {
      alert("Ingrese tanto el Área como el Responsable.");
    }
  };

  const handleDeleteArea = (area: string) => {
    if (confirm(`¿Eliminar área ${area}?`)) {
      onUpdateConfig({ 
          ...config, 
          areas: config.areas.filter(a => a !== area),
          responsables: config.responsables.filter(r => r.area !== area)
      });
    }
  };

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      const nextId = config.questions.length > 0 ? Math.max(...config.questions.map(q => q.id)) + 1 : 1;
      onUpdateConfig({ ...config, questions: [...config.questions, { id: nextId, text: newQuestion.trim() }] });
      setNewQuestion('');
    }
  };

  return (
    <div className="bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-700 mb-24 overflow-hidden animate-fade-in">
      <div className="p-6 bg-[#0f172a] border-b border-gray-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-blue-500" /> Configuración del Sistema
        </h2>
      </div>

      <div className="flex bg-[#0f172a]/50">
        <button onClick={() => setActiveTab('areas')} className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'areas' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/10' : 'text-gray-500'}`}>ÁREAS Y RESPONSABLES</button>
        <button onClick={() => setActiveTab('questions')} className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'questions' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/10' : 'text-gray-500'}`}>PREGUNTAS</button>
      </div>

      <div className="p-6">
        {activeTab === 'areas' && (
          <div className="space-y-6">
            <div className="bg-[#0f172a] p-5 rounded-2xl border border-gray-700 space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Nueva Configuración</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="Nombre del Área" className="bg-[#1e293b] border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                <input type="text" value={newResp} onChange={(e) => setNewResp(e.target.value)} placeholder="Nombre del Responsable" className="bg-[#1e293b] border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <button onClick={handleAddArea} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> Registrar Área y Responsable
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.areas.map((area) => (
                <div key={area} className="bg-[#0f172a]/50 p-4 rounded-xl border border-gray-800 flex justify-between items-center group">
                  <div>
                    <p className="font-bold text-blue-400">{area}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-tighter">Responsable: {config.responsables.find(r => r.area === area)?.name || 'N/A'}</p>
                  </div>
                  <button onClick={() => handleDeleteArea(area)} className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-4">
             <div className="flex gap-2 bg-[#0f172a] p-3 rounded-2xl border border-gray-700">
              <input type="text" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Escriba la nueva pregunta..." className="flex-1 bg-transparent text-white p-2 outline-none" />
              <button onClick={handleAddQuestion} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700">Agregar</button>
            </div>
            <div className="space-y-2">
              {config.questions.map((q) => (
                <div key={q.id} className="p-4 bg-[#0f172a]/50 border border-gray-800 rounded-xl flex justify-between items-center group">
                  <span className="text-sm text-gray-300"><span className="text-blue-500 font-bold mr-2">{q.id}.</span> {q.text}</span>
                  <button onClick={() => onUpdateConfig({...config, questions: config.questions.filter(qu => qu.id !== q.id)})} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
