import React from 'react';
import { AuditRecord, ActionItem } from '../types';
import * as XLSX from 'xlsx';
import { Edit2, Trash2, FileSpreadsheet, Calendar, Share } from 'lucide-react';

interface HistoryProps {
  records: AuditRecord[];
  actions: ActionItem[];
  onEdit: (record: AuditRecord) => void;
  onDelete: (id: string) => void;
}

export const History: React.FC<HistoryProps> = ({ records, actions, onEdit, onDelete }) => {
  
  const handleExportExcel = () => {
    // Format data specifically for SharePoint List Import
    const auditData = records.map(r => {
      const row: any = {
        'ID_Unico': r.id,
        'Fecha_Auditoria': new Date(r.date).toLocaleDateString(),
        'Area': r.area,
        'Responsable': r.responsable || 'N/A',
        'Auditor': r.auditor,
        'Puntaje_Total': r.score
      };
      // Flatten questions for Excel columns
      r.answers.forEach(a => { row[`P${a.questionId}_Respuesta`] = a.rating; });
      return row;
    });

    const actionData = actions.map(a => ({
        'ID_Accion': a.id,
        'ID_Auditoria_Ref': a.auditId,
        'Fecha_Creacion': new Date(a.createdAt).toLocaleDateString(),
        'Area': a.area,
        'Hallazgo': a.questionText,
        'Tipo_Hallazgo': a.issueType,
        'Accion_Sugerida': a.suggestedAction,
        'Responsable_Accion': a.responsable,
        'Fecha_Compromiso': new Date(a.dueDate).toLocaleDateString(),
        'Estado_Actual': a.status === 'PENDING' ? 'Pendiente' : a.status === 'IN_PROGRESS' ? 'En Proceso' : 'Cerrado',
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auditData), "Datos_Para_SharePoint");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(actionData), "Planes_De_Accion");
    
    // Save file
    XLSX.writeFile(wb, `Auditoria_5S_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getScoreBadge = (score: number) => {
    let colorClass = '';
    if (score >= 90) colorClass = 'bg-green-900/30 text-green-400 border-green-500/30';
    else if (score >= 70) colorClass = 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30';
    else colorClass = 'bg-red-900/30 text-red-400 border-red-500/30';

    return (
      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full border ${colorClass}`}>
        {score}%
      </span>
    );
  };

  return (
    <div className="space-y-6 mb-24 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1e293b] p-5 rounded-xl shadow-lg border border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Historial de Registros</h2>
          <p className="text-sm text-gray-400">{records.length} auditorías en base de datos local</p>
        </div>
        <button 
          onClick={handleExportExcel}
          className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-[#107c41] text-white rounded-lg hover:bg-[#0b5c30] transition-all shadow-lg hover:shadow-green-500/20 font-medium border border-green-600"
        >
          <FileSpreadsheet className="w-5 h-5 mr-2" />
          Descargar para SharePoint
        </button>
      </div>

      <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg flex items-start gap-3">
        <Share className="w-5 h-5 text-blue-400 mt-0.5" />
        <div className="text-sm text-gray-300">
            <span className="font-bold text-blue-300">Nota sobre SharePoint:</span> Dado que esta es una aplicación web segura sin servidor, no guarda directamente en su nube corporativa. 
            <br/>1. Presione el botón verde de arriba para descargar el Excel.
            <br/>2. Arrastre el archivo descargado a su carpeta de SharePoint o Teams.
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-[#1e293b] rounded-xl shadow-sm border border-gray-800 p-12 text-center">
            <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
                <FileSpreadsheet className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-200">No hay registros</h3>
            <p className="text-gray-500 mt-1">Comience una nueva auditoría para ver los datos aquí.</p>
        </div>
      ) : (
        <>
          <div className="hidden sm:block bg-[#1e293b] rounded-xl shadow-lg border border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-[#0f172a]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Área</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Responsable</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Auditor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Puntaje</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-[#1e293b] divide-y divide-gray-800">
                {records.map((record) => (
                    <tr key={record.id} className="hover:bg-[#0f172a] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200 font-medium">
                        {record.area}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {record.responsable || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {record.auditor}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getScoreBadge(record.score)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => onEdit(record)} className="text-blue-400 hover:text-blue-300 mr-4 transition-colors">
                            <Edit2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => onDelete(record.id)} className="text-red-400 hover:text-red-300 transition-colors">
                            <Trash2 className="w-5 h-5" />
                        </button>
                        </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
           {/* Mobile Card View */}
           <div className="grid grid-cols-1 gap-4 sm:hidden">
            {records.map((record) => (
              <div key={record.id} className="bg-[#1e293b] rounded-xl shadow-md border border-gray-700 p-4 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${
                    record.score >= 90 ? 'bg-green-500' : record.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <div className="flex justify-between items-start pl-3 mb-3">
                  <div>
                    <h3 className="font-bold text-gray-100">{record.area}</h3>
                    <p className="text-xs text-gray-500 flex items-center mt-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(record.date).toLocaleDateString()}
                    </p>
                  </div>
                  {getScoreBadge(record.score)}
                </div>
                <div className="pl-3 grid grid-cols-2 gap-2 text-sm text-gray-400 mb-4 bg-[#0f172a] p-2 rounded-lg">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-gray-500 font-semibold">Responsable</span>
                        <span className="font-medium truncate text-gray-300">{record.responsable || '-'}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-gray-500 font-semibold">Auditor</span>
                        <span className="font-medium truncate text-gray-300">{record.auditor}</span>
                    </div>
                </div>
                <div className="pl-3 flex justify-end gap-3 border-t border-gray-800 pt-3">
                    <button onClick={() => onEdit(record)} className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center">
                        <Edit2 className="w-4 h-4 mr-1" /> Editar
                    </button>
                    <button onClick={() => onDelete(record.id)} className="text-red-400 hover:text-red-300 text-sm font-medium flex items-center">
                        <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                    </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};