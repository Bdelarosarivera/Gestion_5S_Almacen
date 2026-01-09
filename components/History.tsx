
import React from 'react';
import { AuditRecord, ActionItem } from '../types';
import * as XLSX from 'xlsx';
import { Edit2, Trash2, FileSpreadsheet, Calendar, Share, Download } from 'lucide-react';

interface HistoryProps {
  records: AuditRecord[];
  actions: ActionItem[];
  onEdit: (record: AuditRecord) => void;
  onDelete: (id: string) => void;
}

export const History: React.FC<HistoryProps> = ({ records, actions, onEdit, onDelete }) => {
  
  const handleExportExcel = () => {
    // 1. Preparar datos de Auditorías
    const auditData = records.map(r => {
      const row: any = {
        'ID_Auditoria': r.id,
        'Fecha': new Date(r.date).toLocaleDateString(),
        'Area': r.area,
        'Responsable_Area': r.responsable || 'N/A',
        'Auditor': r.auditor,
        'Puntaje_Final': r.score
      };
      // Añadir respuestas individuales
      r.answers.forEach(a => { row[`Pregunta_${a.questionId}`] = a.rating; });
      return row;
    });

    // 2. Preparar datos del Plan de Acción
    const actionData = actions.map(a => ({
      'ID_Auditoria_Origen': a.auditId,
      'ID_Accion': a.id,
      'Area': a.area,
      'Hallazgo_Critico': a.questionText,
      'Accion_Sugerida': a.suggestedAction,
      'Responsable_Seguimiento': a.responsable,
      'Fecha_Vencimiento': new Date(a.dueDate).toLocaleDateString(),
      'Estado_Actual': a.status === 'PENDING' ? 'Pendiente' : a.status === 'IN_PROGRESS' ? 'En Proceso' : 'Cerrado',
      'Fecha_Registro': new Date(a.createdAt).toLocaleDateString()
    }));

    // 3. Crear el libro y las hojas
    const wb = XLSX.utils.book_new();
    
    const wsAudits = XLSX.utils.json_to_sheet(auditData);
    const wsActions = XLSX.utils.json_to_sheet(actionData);

    // 4. Adjuntar hojas al libro
    XLSX.utils.book_append_sheet(wb, wsAudits, "Auditorias");
    XLSX.utils.book_append_sheet(wb, wsActions, "Plan_de_Accion");

    // 5. Descargar archivo
    XLSX.writeFile(wb, `Reporte_Operativo_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getScoreBadge = (score: number) => {
    let colorClass = score >= 90 ? 'bg-green-900/30 text-green-400 border-green-500/30' : 
                     score >= 70 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30' : 
                     'bg-red-900/30 text-red-400 border-red-500/30';
    return <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${colorClass}`}>{score}%</span>;
  };

  return (
    <div className="space-y-6 mb-24 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Reportes Corporativos</h2>
          <p className="text-sm text-gray-400">Descargue el consolidado de auditorías y planes de acción para SharePoint.</p>
        </div>
        <button 
          onClick={handleExportExcel}
          className="flex items-center gap-2 bg-[#107c41] hover:bg-[#0b5c30] text-white px-6 py-3 rounded-xl transition-all font-bold shadow-lg w-full sm:w-auto justify-center group"
        >
          <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" /> 
          Exportar Reporte Completo
        </button>
      </div>

      <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl flex items-start gap-3">
        <Share className="w-5 h-5 text-blue-400 mt-0.5" />
        <div className="text-xs text-gray-300">
            <span className="font-bold text-blue-300">Nota para SharePoint:</span> 
            <p>El archivo contiene dos pestañas. Puede importar la pestaña <code className="text-blue-200">Plan_de_Accion</code> directamente a una lista de SharePoint para dar seguimiento a los hallazgos críticos.</p>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-2xl shadow-lg border border-gray-700 overflow-hidden">
        <div className="p-4 bg-[#0f172a] border-b border-gray-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Historial de Evaluaciones</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-[#0f172a]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Área</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Score</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500 italic">No hay registros disponibles.</td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 text-sm text-gray-400">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-white">{r.area}</td>
                    <td className="px-6 py-4">{getScoreBadge(r.score)}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => onEdit(r)} 
                        title="Editar auditoría"
                        className="text-blue-400 hover:bg-blue-400/10 p-2 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('¿Está seguro de eliminar esta auditoría?')) {
                            onDelete(r.id);
                          }
                        }} 
                        title="Eliminar registro"
                        className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
