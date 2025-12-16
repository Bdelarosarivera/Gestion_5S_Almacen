import React, { useState } from 'react';
import { ActionItem, ActionStatus } from '../types';
import { CheckCircle2, Circle, Clock, AlertCircle, Search, Save, X, Users } from 'lucide-react';

interface ActionPlanViewProps {
  actions: ActionItem[];
  onUpdateAction: (action: ActionItem) => void;
}

export const ActionPlanView: React.FC<ActionPlanViewProps> = ({ actions, onUpdateAction }) => {
  const [filterStatus, setFilterStatus] = useState<ActionStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);

  const filteredActions = actions.filter(a => {
    const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;
    const matchesSearch = 
        a.area.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.suggestedAction.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.responsable.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusLabel = (status: ActionStatus) => {
    switch (status) {
      case 'PENDING': return 'Pendiente';
      case 'IN_PROGRESS': return 'En Proceso';
      case 'CLOSED': return 'Cerrado';
    }
  };

  const handleSaveEdit = () => {
    if (editingAction) {
      onUpdateAction(editingAction);
      setEditingAction(null);
    }
  };

  return (
    <div className="space-y-6 mb-24 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Planes de Acción</h2>
          <p className="text-sm text-gray-500">Gestión de hallazgos y acciones correctivas.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-700 bg-[#1e293b] text-white rounded-lg text-sm w-full sm:w-48 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-700 bg-[#1e293b] text-white rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            >
                <option value="ALL">Todos los estados</option>
                <option value="PENDING">Pendientes</option>
                <option value="IN_PROGRESS">En Proceso</option>
                <option value="CLOSED">Cerrados</option>
            </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-red-400">{actions.filter(a => a.status === 'PENDING').length}</div>
            <div className="text-xs font-medium text-red-300 uppercase tracking-wide">Pendientes</div>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-yellow-400">{actions.filter(a => a.status === 'IN_PROGRESS').length}</div>
            <div className="text-xs font-medium text-yellow-300 uppercase tracking-wide">En Proceso</div>
        </div>
        <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-400">{actions.filter(a => a.status === 'CLOSED').length}</div>
            <div className="text-xs font-medium text-green-300 uppercase tracking-wide">Cerrados</div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredActions.length === 0 ? (
            <div className="text-center py-10 bg-[#1e293b] rounded-xl border border-gray-800">
                <p className="text-gray-500">No se encontraron acciones.</p>
            </div>
        ) : (
            filteredActions.map(action => (
                <div key={action.id} className="bg-[#1e293b] rounded-xl shadow-md border border-gray-800 overflow-hidden hover:border-gray-700 transition-all">
                    {editingAction?.id === action.id ? (
                        <div className="p-4 space-y-4 bg-blue-900/10">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-blue-300">Editando Acción</h3>
                                <button onClick={() => setEditingAction(null)} className="text-gray-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400">Acción Sugerida</label>
                                <textarea 
                                    value={editingAction.suggestedAction}
                                    onChange={(e) => setEditingAction({...editingAction, suggestedAction: e.target.value})}
                                    className="w-full p-2 border border-gray-600 rounded-md text-sm bg-[#0f172a] text-white"
                                    rows={2}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-400">Responsable</label>
                                    <input type="text" value={editingAction.responsable} onChange={(e) => setEditingAction({...editingAction, responsable: e.target.value})} className="w-full p-2 border border-gray-600 rounded-md text-sm bg-[#0f172a] text-white" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-400">Fecha Compromiso</label>
                                    <input type="date" value={editingAction.dueDate.split('T')[0]} onChange={(e) => setEditingAction({...editingAction, dueDate: new Date(e.target.value).toISOString()})} className="w-full p-2 border border-gray-600 rounded-md text-sm bg-[#0f172a] text-white" />
                                </div>
                            </div>
                             <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-400">Estado</label>
                                <div className="flex gap-2">
                                    {(['PENDING', 'IN_PROGRESS', 'CLOSED'] as ActionStatus[]).map(s => (
                                        <button key={s} onClick={() => setEditingAction({...editingAction, status: s})} className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${editingAction.status === s ? (s === 'CLOSED' ? 'bg-green-600 text-white' : s === 'IN_PROGRESS' ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white') : 'bg-transparent text-gray-400 border-gray-600'}`}>{getStatusLabel(s)}</button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleSaveEdit} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Guardar Cambios</button>
                        </div>
                    ) : (
                        <div className="p-4 flex flex-col md:flex-row gap-4">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${action.status === 'PENDING' ? 'bg-red-900/40 text-red-300' : action.status === 'IN_PROGRESS' ? 'bg-yellow-900/40 text-yellow-300' : 'bg-green-900/40 text-green-300'}`}>{getStatusLabel(action.status)}</span>
                                        <span className="text-xs text-gray-500">{new Date(action.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-xs font-bold text-gray-400">{action.area}</div>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-200 font-medium mb-1"><span className="text-red-400 font-bold mr-1">Hallazgo:</span> {action.questionText}</p>
                                    <p className="text-sm text-gray-400 bg-[#0f172a] p-2 rounded border border-gray-800"><span className="font-semibold text-gray-300">Acción:</span> {action.suggestedAction}</p>
                                </div>
                                <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1">
                                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {action.responsable}</span>
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Vence: {new Date(action.dueDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="flex md:flex-col justify-center border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-4">
                                <button onClick={() => setEditingAction(action)} className="text-blue-400 hover:text-blue-300 font-medium text-sm">Gestionar</button>
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