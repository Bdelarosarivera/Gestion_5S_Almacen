import React, { useState } from 'react';
import { AppConfig } from '../types';
import { Plus, Trash2, Edit2, Check, X, Settings as SettingsIcon, Users, MapPin, HelpCircle, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { User } from 'firebase/auth';

interface SettingsViewProps {
  config: AppConfig;
  user: User | null;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onResetDatabase?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ config, user, onUpdateConfig, onResetDatabase }) => {
  const [activeTab, setActiveTab] = useState<'areas' | 'questions' | 'security' | 'admin'>('areas');
  const isSuperAdmin = user?.email === 'bartolodelarosarivera@gmail.com';
  const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token') || 'admin123');
  const [showToken, setShowToken] = useState(false);
  
  const handleSaveToken = () => {
    localStorage.setItem('auth_token', authToken);
    alert("Token de seguridad actualizado correctamente.");
  };

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

      <div className="px-6 py-3 bg-blue-500/10 border-b border-blue-500/20">
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest text-center">
          ⚠️ NOTA: Los cambios realizados aquí son GLOBALES y afectan a todos los usuarios.
        </p>
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
        <button 
          onClick={() => setActiveTab('security')} 
          className={`flex-1 py-4 text-xs font-bold transition-all tracking-widest ${activeTab === 'security' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}
        >
          SEGURIDAD Y CORREO
        </button>
        {isSuperAdmin && (
          <button 
            onClick={() => setActiveTab('admin')} 
            className={`flex-1 py-4 text-xs font-bold transition-all tracking-widest ${activeTab === 'admin' ? 'text-red-400 border-b-2 border-red-500 bg-red-500/10' : 'text-gray-500 hover:text-gray-300'}`}
          >
            ADMIN MAESTRA
          </button>
        )}
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
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-[#0f172a] p-6 rounded-2xl border border-gray-700 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-amber-500/10 p-2 rounded-lg">
                  <Lock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-tight">Seguridad del Sistema</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Token de Acceso Administrativo</p>
                </div>
              </div>
              
              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                <p className="text-[11px] text-gray-400 leading-relaxed italic">
                  Este token se utiliza para autorizar el envío de correos electrónicos. Debe coincidir con la variable <code className="text-blue-400 bg-blue-400/10 px-1 rounded">ADMIN_PASSWORD</code> configurada en su servidor (Render).
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="relative">
                  <input 
                    type={showToken ? "text" : "password"} 
                    value={authToken} 
                    onChange={(e) => setAuthToken(e.target.value)}
                    className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none pr-12 transition-all"
                    placeholder="Ingrese su token administrativo"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button 
                  onClick={handleSaveToken}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" /> GUARDAR TOKEN EN NAVEGADOR
                </button>
              </div>
            </div>

            <div className="bg-[#0f172a] p-6 rounded-2xl border border-gray-700 space-y-4">
              <div className="flex items-center gap-2 text-amber-500">
                <HelpCircle className="w-5 h-5" />
                <h4 className="text-xs font-bold uppercase tracking-widest">Guía de Solución de Problemas (Correo)</h4>
              </div>
              <div className="space-y-3">
                <div className="flex gap-3 text-[11px] text-gray-400">
                  <div className="bg-blue-500 h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-white font-bold">★</div>
                  <p className="text-blue-400 font-bold">RECOMENDADO: Use <a href="https://resend.com" target="_blank" rel="noreferrer" className="underline">Resend</a> (Gratis). Solo cree una API Key y añada <code className="text-white bg-blue-600 px-1 rounded">RESEND_API_KEY</code> a Render. ¡Bypassea todos los problemas de SMTP!</p>
                </div>
                <div className="flex gap-3 text-[11px] text-gray-400">
                  <div className="bg-gray-800 h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-white font-bold">1</div>
                  <p>Si usa Gmail, asegúrese de que en Render el <code className="text-amber-500">SMTP_PORT</code> sea 587.</p>
                </div>
                <div className="flex gap-3 text-[11px] text-gray-400">
                  <div className="bg-gray-800 h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-white font-bold">2</div>
                  <p>Si usa Gmail, active la <strong>Verificación en 2 pasos</strong> y genere una <strong>Contraseña de Aplicación</strong>.</p>
                </div>
                <div className="flex gap-3 text-[11px] text-gray-400">
                  <div className="bg-gray-800 h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-white font-bold">3</div>
                  <p>Si ve el error <code className="text-red-400">ENETUNREACH</code>, el servidor está intentando usar IPv6. El sistema está configurado para forzar IPv4 automáticamente.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'admin' && isSuperAdmin && (
          <div className="space-y-6">
            <div className="bg-red-600/10 p-6 rounded-2xl border border-red-500/20 space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 p-2 rounded-xl">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">Zona de Peligro Administrativa</h3>
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Solo visible para: {user?.email}</p>
                </div>
              </div>
              
              <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl space-y-2">
                <p className="text-xs text-gray-300 leading-relaxed font-medium">
                  Esta sección permite realizar un mantenimiento profundo de la base de datos. Use estas herramientas con extrema precaución ya que los cambios son inmediatos.
                </p>
                <ul className="text-[10px] text-gray-400 space-y-1 list-disc ml-4 font-bold uppercase tracking-tight">
                  <li>Borrado masivo de auditorías históricas</li>
                  <li>Limpieza de todos los hallazgos del plan de acción</li>
                  <li>Reinicio de configuración de áreas, responsables y preguntas a valores por defecto</li>
                </ul>
              </div>

              <div className="pt-4">
                <button 
                  onClick={onResetDatabase}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-6 rounded-2xl font-black transition-all shadow-xl shadow-red-600/20 flex flex-col items-center justify-center gap-1 group border border-red-500/30"
                >
                  <span className="flex items-center gap-2 text-lg">
                    <Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" /> RESETEO MAESTRO DE DATOS
                  </span>
                  <span className="text-[10px] opacity-70 uppercase tracking-tighter">(Auditorías + Hallazgos + Configuración)</span>
                </button>
                <p className="text-center text-[10px] text-red-500/40 mt-4 font-black uppercase tracking-[0.2em] animate-pulse">
                  ⚠️ ESTA OPERACIÓN ELIMINARÁ FÍSICAMENTE TODOS LOS DATOS
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
