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
  const [newResponsableForArea, setNewResponsableForArea] = useState('');
  const [newQuestion, setNewQuestion] = useState('');

  const handleAddAreaAndResponsable = () => {
    if (newArea.trim() && newResponsableForArea.trim()) {
      const areaName = newArea.trim().toUpperCase();
      const responsableName = newResponsableForArea.trim().toUpperCase();

      onUpdateConfig({ 
        ...config, 
        areas: [...config.areas, areaName],
        responsables: [...config.responsables, { name: responsableName, area: areaName }]
      });
      setNewArea('');
      setNewResponsableForArea('');
    } else {
        alert("Debe ingresar tanto el nombre del Área como el Responsable.");
    }
  };

  const handleDeleteArea = (area: string) => {
    if (confirm(`¿Eliminar área ${area} y su responsable asignado?`)) {
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

  const handleDeleteQuestion = (id: number) => {
    if (confirm(`¿Eliminar pregunta ID ${id}?`)) {
      onUpdateConfig({ ...config, questions: config.questions.filter(q => q.id !== id) });
    }
  };

  return (
    <div className="bg-[#1e293b] rounded-xl shadow-lg border border-gray-800 mb-24 overflow-hidden">
      <div className="p-6 border-b border-gray-800 bg-[#0f172a] flex items-center gap-3">
        <div className="bg-gray-800 p-2 rounded-lg">
            <SettingsIcon className="w-6 h-6 text-gray-300" />
        </div>
        <div>
            <h2 className="text-xl font-bold text-gray-100">Configuración</h2>
            <p className="text-sm text-gray-400">Gestione áreas, responsables y preguntas.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-800">
        <button onClick={() => setActiveTab('areas')} className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'areas' ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}><MapPin className="w-4 h-4" /> Áreas y Responsables</button>
        <button onClick={() => setActiveTab('questions')} className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'questions' ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}><HelpCircle className="w-4 h-4" /> Preguntas</button>
      </div>

      <div className="p-6">
        {activeTab === 'areas' && (
          <div className="space-y-6">
            <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-lg space-y-3">
                <h3 className="text-sm font-bold text-blue-300">Agregar Nueva Área</h3>
                <div className="flex flex-col md:flex-row gap-3">
                    <input type="text" value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="Nombre del Área" className="flex-1 bg-[#0f172a] border border-gray-600 rounded-lg p-2.5 text-white focus:ring-blue-500 focus:border-blue-500 text-sm" />
                    <input type="text" value={newResponsableForArea} onChange={(e) => setNewResponsableForArea(e.target.value)} placeholder="Nombre del Responsable" className="flex-1 bg-[#0f172a] border border-gray-600 rounded-lg p-2.5 text-white focus:ring-blue-500 focus:border-blue-500 text-sm" />
                    <button onClick={handleAddAreaAndResponsable} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm font-medium"><Plus className="w-4 h-4" /> Agregar</button>
                </div>
            </div>
            
            <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Áreas Existentes</h3>
                <ul className="divide-y divide-gray-800 border border-gray-700 rounded-lg overflow-hidden bg-[#0f172a]/50">
                {config.areas.map((area) => {
                    const resp = config.responsables.find(r => r.area === area);
                    return (
                        <li key={area} className="p-4 hover:bg-[#0f172a] flex justify-between items-center group transition-colors">
                            <div>
                                <div className="font-bold text-gray-200 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-500" /> {area}
                                </div>
                                <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 ml-6">
                                    <Users className="w-3 h-3" /> Responsable: <span className="text-gray-400">{resp?.name || 'No asignado'}</span>
                                </div>
                            </div>
                            <button onClick={() => handleDeleteArea(area)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-all" title="Eliminar Área"><Trash2 className="w-4 h-4" /></button>
                        </li>
                    );
                })}
                </ul>
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-4">
             <div className="flex gap-2">
              <input type="text" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Nueva pregunta..." className="flex-1 bg-[#0f172a] border border-gray-600 rounded-lg p-2 text-white focus:ring-blue-500 focus:border-blue-500" />
              <button onClick={handleAddQuestion} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"><Plus className="w-4 h-4" /> Agregar</button>
            </div>
            <ul className="divide-y divide-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              {config.questions.map((q) => (
                <li key={q.id} className="p-3 hover:bg-[#0f172a] flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-blue-900/50 text-blue-300 rounded-full flex items-center justify-center text-xs font-bold border border-blue-800">{q.id}</span>
                    <span className="text-gray-300 text-sm">{q.text}</span>
                  </div>
                  <button onClick={() => handleDeleteQuestion(q.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
