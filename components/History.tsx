import React from 'react';
import { AuditRecord, ActionItem } from '../types';
import * as XLSX from 'xlsx';
import { Edit2, Trash2, Download, Calendar, Share, Info, Eraser } from 'lucide-react';

interface HistoryProps {
  records: AuditRecord[];
  actions: ActionItem[];
  onEdit: (record: AuditRecord) => void;
  onDelete: (id: string) => void;
  onClearHistory?: () => void;
}

export const History: React.FC<HistoryProps> = ({ records, actions, onEdit, onDelete, onClearHistory }) => {
  
  const handleExportExcel = () => {
    if (records.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }

    // Preparar datos para SharePoint (Formato Plano)
    const auditData = records.map(r => {
      const row: any = {
        'ID': r.id,
        'Fecha_Auditoria': new Date(r.date).toLocaleDateString(),
        'Area': r.area,
        'Responsable': r.responsable || 'N/A',
        'Auditor': r.auditor,
        'Puntaje_Porcentaje': r.score
      };
      // Incluir respuestas dinámicas con nombres de columnas amigables
      r.answers.forEach(a => { 
        row[`P${a.questionId}_Calificacion`] = a.rating; 
      });
      return row;
    });

    const actionData = actions.map(a => ({
      'ID_Auditoria': a.auditId,
      'Hallazgo_ID': a.id,
      'Area_Hallazgo': a.area,
      'Pregunta_Incumplida': a.questionText,
      'Accion_Correctiva': a.suggestedAction,
      'Responsable_Ejecucion': a.responsable,
      'Fecha_Vencimiento': new Date(a.dueDate).toLocaleDateString(),
      'Estado': a.status === 'PENDING' ? 'Pendiente' : a.status === 'IN_PROGRESS' ? 'En Proceso' : 'Cerrado',
      'Comentarios_Seguimiento': a.comments || '',
      'Fecha_Creacion': new Date(a.createdAt).toLocaleDateString()
    }));

    const wb = XLSX.utils.book_new();
    const wsAudits = XLSX.utils.json_to_sheet(auditData);
    const wsActions = XLSX.utils.json_to_sheet(actionData);

    XLSX.utils.book_append_sheet(wb, wsAudits, "BD_Auditorias");
    XLSX.utils.book_append_sheet(wb, wsActions, "BD_Plan_Accion");

    // Descarga el archivo
    XLSX.writeFile(wb, `AuditCheck_Data_SharePoint_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getScoreBadge = (score: number) => {
    let colorClass = score >= 90 ? 'bg-green-900/30 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 
                     score >= 70 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30' : 
                     'bg-red-900/30 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]';
    return <span className={`px-3 py-1 text-xs font-black rounded-lg border ${colorClass}`}>{score}%</span>;
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('¿Confirmas la eliminación definitiva? Este registro y sus acciones correctivas desaparecerán inmediatamente del historial y del plan de acción.')) {
      onDelete(id);
    }
  };

  const handleEdit = (e: React.MouseEvent, record: AuditRecord) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(record);
  };

  return (
    <div className="space-y-6 mb-24 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#1e293b] p-6 rounded-3xl shadow-xl border border-gray-700">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-gray-100 tracking-tighter">Historial de Auditorías</h2>
          <p className="text-sm text-gray-400">Control maestro de registros almacenados localmente.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {onClearHistory && records.length > 0 && (
            <button 
                onClick={() => {
                    if(window.confirm('¿Borrar TODO el historial? Esta acción no se puede deshacer.')) {
                        onClearHistory();
                    }
                }}
                className="flex items-center gap-2 bg-red-600/10 text-red-500 border border-red-500/20 px-5 py-3 rounded-2xl transition-all font-bold text-sm hover:bg-red-600 hover:text-white"
            >
                <Eraser className="w-5 h-5" /> 
                Limpiar Historial
            </button>
          )}
          <button 
            onClick={handleExportExcel}
            disabled={records.length === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all font-bold shadow-lg w-full lg:w-auto justify-center group ${records.length === 0 ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' : 'bg-[#107c41] hover:bg-[#0b5c30] text-white border border-[#107c41]'}`}
          >
            <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" /> 
            Exportar para SharePoint
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-2xl flex items-start gap-4 shadow-inner">
            <Share className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
            <div>
                <p className="font-black text-blue-400 text-xs uppercase tracking-widest mb-1">Carga a SharePoint</p>
                <p className="text-xs text-gray-400 leading-relaxed">El Excel exportado está optimizado para alimentar Tablas de Excel en SharePoint Online y flujos de Power Automate.</p>
            </div>
        </div>
        <div className="bg-amber-900/10 border border-amber-500/20 p-5 rounded-2xl flex items-start gap-4 shadow-inner">
            <Info className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
            <div>
                <p className="font-black text-amber-500 text-xs uppercase tracking-widest mb-1">Gestión de Registros</p>
                <p className="text-xs text-gray-400 leading-relaxed">Al eliminar una auditoría, el sistema limpia instantáneamente la base de datos local y actualiza la vista del historial.</p>
            </div>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-3xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="p-5 bg-[#0f172a] border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Auditorías Guardadas ({records.length})</h3>
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-[#0f172a]">
              <tr>
                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Fecha / Auditor</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Área / Responsable</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Desempeño</th>
                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Operaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <Calendar className="w-12 h-12 text-gray-800" />
                        <p className="text-gray-500 font-bold">No se han encontrado registros de auditoría.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-all group animate-fade-in">
                    <td className="px-6 py-5">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-100">{new Date(r.date).toLocaleDateString()}</span>
                            <span className="text-[10px] font-medium text-gray-500 uppercase">{r.auditor}</span>
                        </div>
                    </td>
                    <td className="px-6 py-5">
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-blue-400 tracking-tight">{r.area}</span>
                            <span className="text-[10px] font-medium text-gray-500 uppercase">{r.responsable || 'N/A'}</span>
                        </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                        {getScoreBadge(r.score)}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                            type="button"
                            onClick={(e) => handleEdit(e, r)} 
                            title="Editar Auditoría"
                            className="bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white p-2.5 rounded-xl transition-all shadow-sm border border-blue-500/10"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                            type="button"
                            onClick={(e) => handleDelete(e, r.id)} 
                            title="Eliminar Auditoría"
                            className="bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white p-2.5 rounded-xl transition-all shadow-sm border border-red-500/10"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};