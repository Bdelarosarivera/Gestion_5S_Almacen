import React, { useState } from 'react';
import { AppConfig } from '../types';
import { Plus, Trash2, Edit2, Check, X, Settings as SettingsIcon, Users, MapPin, HelpCircle } from 'lucide-react';

interface SettingsViewProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ config, onUpdateConfig }) => {
  const [activeTab, setActiveTab] = useState<'areas' | 'questions'>('areas');
  const [newArea, setNewArea] = useState('');
  const [newResp, setNewResp] = useState('');
  const [newQuestion, setNewQuestion] = useState('');

  // Estados para edición
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [editAreaName, setEditAreaName] = useState('');
  const [editRespName, setEditRespName] = useState('');

  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [editQuestionText, setEditQuestionText] = useState('');

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
      alert("Por favor, ingrese tanto el nombre del Área como el nombre del Responsable para continuar.");
    }
  };

  const handleUpdateArea = () => {
    if (editingArea && editAreaName.trim() && editRespName.trim()) {
      const oldName = editingArea;
      const newName = editAreaName.trim().toUpperCase();
      const newResp = editRespName.trim().toUpperCase();

      const updatedAreas = config.areas.map(a => a === oldName ? newName : a);
      const updatedResponsables = config.responsables.map(r => 
        r.area === oldName ? { name: newResp, area: newName } : r
      );

      onUpdateConfig({
        ...config,
        areas: updatedAreas,
        responsables: updatedResponsables
      });
      setEditingArea(null);
    }
  };

  const handleUpdateQuestion = () => {
    if (editingQuestion !== null && editQuestionText.trim()) {
      onUpdateConfig({
        ...config,
        questions: config.questions.map(q => 
          q.id === editingQuestion ? { ...q, text: editQuestionText.trim() } : q
        )
      });
      setEditingQuestion(null);
    }
  };

  const handleDeleteArea = (area: string) => {
    if (confirm(`¿Está seguro de eliminar el área "${area}"? También se eliminará su responsable asignado.`)) {
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
    <div className="bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-700 mb-24 overflow-hidden animate-fade-in">
      <div className="p-6 bg-[#0f172a] border-b border-gray-800 flex items-center gap-3">
        <div className="bg-blue-600/20 p-2 rounded-xl">
            <SettingsIcon className="w-6 h-6 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white uppercase tracking-tight">Configuración del Sistema</h2>
      </div>

      <div className="flex bg-[#0f172a]/50">
        <button 
          onClick={() => setActiveTab('areas')} 
          className={`flex-1 py-4 text-xs font-bold transition-all tracking-widest ${activeTab === 'areas' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}
        >
          ÁREAS Y RESPONSABLES
        </button>
        <button 
          onClick={() => setActiveTab('questions')} 
          className={`flex-1 py-4 text-xs font-bold transition-all tracking-widest ${activeTab === 'questions' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}
        >
          PREGUNTAS DE AUDITORÍA
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'areas' && (
          <div className="space-y-8">
            <div className="bg-[#0f172a] p-6 rounded-2xl border border-gray-700 space-y-4 shadow-inner">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Plus className="w-4 h-4" /> Alta de Nueva Área
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold ml-1">NOMBRE DEL ÁREA</label>
                    <input type="text" value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="Ej: ALMACÉN FRÍO" className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold ml-1">RESPONSABLE ASIGNADO</label>
                    <input type="text" value={newResp} onChange={(e) => setNewResp(e.target.value)} placeholder="Ej: JUAN PÉREZ" className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <button onClick={handleAddArea} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20">
                <Plus className="w-5 h-5" /> Registrar Área y Responsable
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.areas.map((area) => {
                const isEditing = editingArea === area;
                const responsable = config.responsables.find(r => r.area === area)?.name || 'Sin responsable';

                return (
                  <div key={area} className={`p-4 rounded-xl border transition-all ${isEditing ? 'bg-blue-600/10 border-blue-500' : 'bg-[#0f172a]/50 border-gray-800 hover:border-blue-500/30'} flex flex-col gap-3 group`}>
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-blue-400 font-bold">NOMBRE DEL ÁREA</label>
                          <input 
                            type="text" 
                            value={editAreaName} 
                            onChange={(e) => setEditAreaName(e.target.value)} 
                            className="w-full bg-[#1e293b] border border-blue-500/40 rounded-lg p-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-blue-400 font-bold">RESPONSABLE</label>
                          <input 
                            type="text" 
                            value={editRespName} 
                            onChange={(e) => setEditRespName(e.target.value)} 
                            className="w-full bg-[#1e293b] border border-blue-500/40 rounded-lg p-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={handleUpdateArea} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold">
                            <Check className="w-3.5 h-3.5" /> GUARDAR
                          </button>
                          <button onClick={() => setEditingArea(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold">
                            <X className="w-3.5 h-3.5" /> CANCELAR
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-blue-400 flex items-center gap-2">
                                <MapPin className="w-3 h-3" /> {area}
                            </p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter mt-1">
                                <Users className="w-2.5 h-2.5 inline mr-1" /> {responsable}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => {
                                setEditingArea(area);
                                setEditAreaName(area);
                                setEditRespName(responsable);
                              }} 
                              className="p-2 text-gray-600 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteArea(area)} className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Eliminar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-4">
             <div className="flex gap-2 bg-[#0f172a] p-3 rounded-2xl border border-gray-700 shadow-inner">
              <input type="text" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Escriba la nueva pregunta..." className="flex-1 bg-transparent text-white p-2 outline-none" />
              <button onClick={handleAddQuestion} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all">Agregar</button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {config.questions.map((q) => {
                const isEditing = editingQuestion === q.id;
                return (
                  <div key={q.id} className={`p-4 rounded-xl border flex justify-between items-center group transition-all ${isEditing ? 'bg-blue-600/10 border-blue-500' : 'bg-[#0f172a]/50 border-gray-800 hover:border-blue-500/20'}`}>
                    {isEditing ? (
                      <div className="flex-1 flex gap-2">
                        <input 
                          type="text" 
                          value={editQuestionText} 
                          onChange={(e) => setEditQuestionText(e.target.value)} 
                          className="flex-1 bg-[#1e293b] border border-blue-500/40 rounded-lg p-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button onClick={handleUpdateQuestion} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1">
                          <Check className="w-3 h-3" /> GUARDAR
                        </button>
                        <button onClick={() => setEditingQuestion(null)} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1">
                          <X className="w-3 h-3" /> CANCELAR
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-gray-300 flex gap-3">
                          <span className="text-blue-500 font-bold">{q.id}.</span> {q.text}
                        </span>
                        <div className="flex gap-2 items-center">
                          <button 
                            onClick={() => {
                              setEditingQuestion(q.id);
                              setEditQuestionText(q.text);
                            }} 
                            className="text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};