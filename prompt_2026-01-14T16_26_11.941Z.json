import React, { useState } from 'react';
import { ActionItem, ActionStatus } from '../types';
import { CheckCircle2, Clock, AlertCircle, Search, Save, X, Users, Trash2, Edit2, Eraser, MessageSquare } from 'lucide-react';

interface ActionPlanViewProps {
  actions: ActionItem[];
  onUpdateAction: (action: ActionItem) => void;
  onDeleteAction: (actionId: string) => void;
  onClearActions: () => void;
}

export const ActionPlanView: React.FC<ActionPlanViewProps> = ({ actions, onUpdateAction, onDeleteAction, onClearActions }) => {
  const [filterStatus, setFilterStatus] = useState<ActionStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);

  const filteredActions = (actions || []).filter(a => {
    const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;
    const matchesSearch = 
        (a.area || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (a.suggestedAction || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.questionText || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.responsable || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusLabel = (status: ActionStatus) => {
    switch (status) {
      case 'PENDING': return 'Pendiente';
      case 'IN_PROGRESS': return 'En Proceso';
      case 'CLOSED': return 'Cerrado';
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAction) {
      onUpdateAction(editingAction);
      setEditingAction(null);
    }
  };

  return (
    <div className="space-y-6 mb-24 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Seguimiento de Hallazgos</h2>
          <p className="text-sm text-gray-500">Gestión activa de planes de acción correctivos.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
            <button 
                type="button"
                onClick={() => {
                  if (window.confirm('¿Desea borrar COMPLETAMENTE el plan de acción? Esta acción no se puede deshacer.')) {
                    onClearActions();
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm"
            >
                <Eraser className="w-3.5 h-3.5" /> Limpiar Todo
            </button>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                    type="text" 
                    placeholder="Filtrar hallazgos..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-700 bg-[#1e293b] text-white rounded-xl text-xs w-full sm:w-48 focus:ring-blue-500 outline-none"
                />
            </div>
            <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-700 bg-[#1e293b] text-white rounded-xl text-xs focus:ring-blue-500 outline-none"
            >
                <option value="ALL">Todos los Estados</option>
                <option value="PENDING">Pendientes</option>
                <option value="IN_PROGRESS">En Proceso</option>
                <option value="CLOSED">Cerrados</option>
            </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-2xl text-center shadow-inner">
            <div className="text-xl font-black text-red-500">{(actions || []).filter(a => a.status === 'PENDING').length}</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pendientes</div>
        </div>
        <div className="bg-yellow-900/10 border border-yellow-500/20 p-4 rounded-2xl text-center shadow-inner">
            <div className="text-xl font-black text-yellow-500">{(actions || []).filter(a => a.status === 'IN_PROGRESS').length}</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">En Proceso</div>
        </div>
        <div className="bg-green-900/10 border border-green-500/20 p-4 rounded-2xl text-center shadow-inner">
            <div className="text-xl font-black text-green-500">{(actions || []).filter(a => a.status === 'CLOSED').length}</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cerrados</div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredActions.length === 0 ? (
            <div className="text-center py-16 bg-[#1e293b]/50 rounded-3xl border border-gray-800 border-dashed">
                <AlertCircle className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No se encontraron hallazgos con los filtros seleccionados.</p>
            </div>
        ) : (
            filteredActions.map(action => (
                <div key={action.id} className="bg-[#1e293b] rounded-2xl shadow-sm border border-gray-800 overflow-hidden hover:border-gray-700 transition-all">
                    {editingAction?.id === action.id ? (
                        <form onSubmit={handleSaveEdit} className="p-5 space-y-4 bg-blue-900/10 animate-fade-in">
                            <div className="flex justify-between items-center border-b border-blue-500/20 pb-3">
                                <h3 className="font-black text-blue-400 text-xs uppercase tracking-widest">Edición de Hallazgo</h3>
                                <button type="button" onClick={() => setEditingAction(null)} className="text-gray-400 hover:text-white p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Descripción del Checks List</label>
                                <textarea 
                                    value={editingAction.questionText}
                                    onChange={(e) => setEditingAction({...editingAction, questionText: e.target.value})}
                                    className="w-full p-3 border border-gray-700 rounded-xl text-sm bg-[#0f172a] text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-blue-400 uppercase">Plan de Acción (Resolución)</label>
                                <textarea 
                                    value={editingAction.suggestedAction}
                                    onChange={(e) => setEditingAction({...editingAction, suggestedAction: e.target.value})}
                                    className="w-full p-3 border border-gray-700 rounded-xl text-sm bg-[#0f172a] text-white font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Comentario Adicional de la Acción</label>
                                <textarea 
                                    value={editingAction.comments || ''}
                                    onChange={(e) => setEditingAction({...editingAction, comments: e.target.value})}
                                    className="w-full p-3 border border-gray-700 rounded-xl text-sm bg-[#0f172a] text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                    rows={2}
                                    placeholder="Ingrese comentarios sobre el progreso o cierre..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Responsable</label>
                                    <input type="text" value={editingAction.responsable} onChange={(e) => setEditingAction({...editingAction, responsable: e.target.value})} className="w-full p-2.5 border border-gray-700 rounded-xl text-sm bg-[#0f172a] text-white focus:ring-1 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Vencimiento</label>
                                    <input type="date" value={editingAction.dueDate.split('T')[0]} onChange={(e) => setEditingAction({...editingAction, dueDate: new Date(e.target.value).toISOString()})} className="w-full p-2.5 border border-gray-700 rounded-xl text-sm bg-[#0f172a] text-white focus:ring-1 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                             <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Estado Actual</label>
                                <div className="flex gap-2">
                                    {(['PENDING', 'IN_PROGRESS', 'CLOSED'] as ActionStatus[]).map(s => (
                                        <button 
                                          key={s} 
                                          type="button"
                                          onClick={() => setEditingAction({...editingAction, status: s})} 
                                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${editingAction.status === s ? (s === 'CLOSED' ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-500/20' : s === 'IN_PROGRESS' ? 'bg-yellow-600 border-yellow-600 text-white shadow-lg shadow-yellow-500/20' : 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-500/20') : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'}`}
                                        >
                                          {getStatusLabel(s)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all mt-4"><Save className="w-4 h-4" /> Guardar Cambios</button>
                        </form>
                    ) : (
                        <div className="p-5 flex flex-col md:flex-row gap-5">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${action.status === 'PENDING' ? 'bg-red-500/10 text-red-500' : action.status === 'IN_PROGRESS' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>{getStatusLabel(action.status)}</span>
                                        <span className="text-[10px] text-gray-300 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">Registrado: {new Date(action.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-[11px] font-black text-blue-400 uppercase tracking-tighter bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">{action.area}</div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">CHECKS LIST:</label>
                                        <p className="text-sm text-gray-100 font-medium flex items-start gap-2 leading-relaxed">
                                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                            <span>{action.questionText}</span>
                                        </p>
                                    </div>

                                    <div className="bg-[#0f172a] p-4 rounded-2xl border border-gray-800 shadow-inner group-hover:border-gray-700 transition-colors">
                                        <label className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] block mb-2">Plan de Acción:</label>
                                        <p className="text-white text-sm leading-relaxed font-bold">
                                            {action.suggestedAction}
                                        </p>
                                    </div>

                                    {action.comments && (
                                        <div className="bg-blue-900/5 p-4 rounded-2xl border border-blue-500/10 shadow-inner">
                                            <label className="text-[9px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1 mb-2">
                                                <MessageSquare className="w-3 h-3" /> Comentario de la acción:
                                            </label>
                                            <p className="text-gray-300 text-xs italic">
                                                "{action.comments}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-4 text-[11px] pt-2 font-bold uppercase tracking-tight">
                                    <span className="flex items-center gap-1.5 bg-[#0f172a] px-3 py-1.5 rounded-lg border border-gray-800 text-gray-100">
                                        <Users className="w-3.5 h-3.5 text-blue-400" /> 
                                        Responsable: <span className="text-white ml-1">{action.responsable}</span>
                                    </span>
                                    <span className={`flex items-center gap-1.5 bg-[#0f172a] px-3 py-1.5 rounded-lg border border-gray-800 ${new Date(action.dueDate) < new Date() && action.status !== 'CLOSED' ? 'text-red-400 border-red-500/30' : 'text-gray-100'}`}>
                                        <Clock className={`w-3.5 h-3.5 ${new Date(action.dueDate) < new Date() && action.status !== 'CLOSED' ? 'text-red-500' : 'text-blue-400'}`} /> 
                                        Vencimiento: <span className="text-white ml-1">{new Date(action.dueDate).toLocaleDateString()}</span>
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex md:flex-col items-stretch justify-center border-t md:border-t-0 md:border-l border-gray-800 pt-4 md:pt-0 md:pl-5 gap-2 min-w-[140px]">
                                <button 
                                    type="button"
                                    onClick={() => setEditingAction(action)} 
                                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500/10 text-blue-400 rounded-xl font-black text-[10px] uppercase hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                >
                                    <Edit2 className="w-3.5 h-3.5" /> Gestionar
                                </button>
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm('¿Eliminar este hallazgo permanentemente del plan?')) {
                                        onDeleteAction(action.id);
                                      }
                                    }} 
                                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))
        )}
      </div>
    </div>
  );
};