import React, { useRef, useMemo, useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  LabelList,
  PieChart,
  Pie
} from 'recharts';
import html2canvas from 'html2canvas';
import { AuditRecord, ActionItem } from '../types';
import { 
  Trophy, 
  ClipboardList, 
  BarChart as LucideBarChart,
  Database,
  TrendingUp,
  AlertTriangle,
  Target,
  ListChecks,
  SearchCode,
  ArrowRight,
  Camera,
  Filter,
  Calendar as CalendarIcon,
  X,
  ChevronDown,
  Mail,
  Send,
  Loader2,
  TrendingDown
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface DashboardProps {
  records: AuditRecord[];
  actions: ActionItem[];
  onViewConsolidated: () => void;
  onViewActions: () => void;
  onGenerateDemo?: () => void;
}

const StatCard = ({ label, value, color, icon: Icon, onClick }: any) => (
    <div 
      onClick={onClick}
      className={`bg-[#1e293b] p-5 rounded-2xl border border-gray-800 shadow-sm transition-all ${onClick ? 'cursor-pointer hover:border-blue-500/50 hover:bg-[#243146]' : 'hover:border-gray-700'}`}
    >
        <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-gray-100 uppercase tracking-widest">{label}</p>
            {Icon && <Icon className={`w-4 h-4 ${color.replace('text-', 'text-opacity-40 ')}`} />}
        </div>
        <div className="flex items-end justify-between">
          <p className={`text-3xl font-black ${color}`}>{value}</p>
          {onClick && <ArrowRight className="w-4 h-4 text-gray-600 mb-1" />}
        </div>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ records = [], actions = [], onViewConsolidated, onViewActions, onGenerateDemo }) => {
  const [isReady, setIsReady] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Estados de Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedArea, setSelectedArea] = useState('ALL');

  // Estados del Formulario de Envío
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState(`Reporte de Auditoría 5S - ${new Date().toLocaleDateString()}`);
  const [emailMessage, setEmailMessage] = useState('Adjunto encontrará el reporte detallado de la auditoría 5S realizada en planta, incluyendo el plan de acción y el desempeño por áreas.');

  const dashboardRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const consolidatedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 200);
    return () => clearTimeout(timer);
  }, [records.length]);

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedArea('ALL');
  };

  const handleCaptureScreenshot = async () => {
    if (dashboardRef.current) {
        try {
            const canvas = await html2canvas(dashboardRef.current, {
                backgroundColor: '#0f172a',
                scale: 2,
                logging: false,
                useCORS: true
            });
            const link = document.createElement('a');
            link.download = `Dashboard_Planta_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error("Error capturando dashboard:", error);
            alert("Error al capturar la imagen. Intente nuevamente.");
        }
    }
  };

  const areasList = useMemo(() => {
    const areas = new Set(records.map(r => r.area));
    return Array.from(areas).sort();
  }, [records]);

  // Aplicar Filtros
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const recordDate = new Date(r.date).toISOString().split('T')[0];
      const matchesStart = !startDate || recordDate >= startDate;
      const matchesEnd = !endDate || recordDate <= endDate;
      const matchesArea = selectedArea === 'ALL' || r.area === selectedArea;
      return matchesStart && matchesEnd && matchesArea;
    });
  }, [records, startDate, endDate, selectedArea]);

  const filteredActions = useMemo(() => {
    return actions.filter(a => {
      const record = records.find(r => r.id === a.auditId);
      if (!record) return false;
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      const matchesStart = !startDate || recordDate >= startDate;
      const matchesEnd = !endDate || recordDate <= endDate;
      const matchesArea = selectedArea === 'ALL' || a.area === selectedArea;
      return matchesStart && matchesEnd && matchesArea;
    });
  }, [actions, records, startDate, endDate, selectedArea]);

  // Cálculo de estadísticas tipo Consolidado para el reporte
  const consolidatedStats = useMemo(() => {
    if (filteredRecords.length === 0) return null;

    const areaMap: Record<string, { totalScore: number; count: number }> = {};
    filteredRecords.forEach(r => {
      if (!areaMap[r.area]) areaMap[r.area] = { totalScore: 0, count: 0 };
      areaMap[r.area].totalScore += r.score;
      areaMap[r.area].count += 1;
    });

    const areaStats = Object.entries(areaMap).map(([area, stats]) => ({
      name: area,
      average: Math.round(stats.totalScore / stats.count),
      count: stats.count
    }));

    const sortedAreas = [...areaStats].sort((a, b) => a.average - b.average);
    const midPoint = Math.floor(sortedAreas.length / 2);
    const topLowestAreas = sortedAreas.slice(0, midPoint).slice(0, 5);
    const topHighestAreas = sortedAreas.slice(midPoint).reverse().slice(0, 5);

    return { topLowestAreas, topHighestAreas };
  }, [filteredRecords]);

  const stats = useMemo(() => {
    if (filteredRecords.length === 0) return null;

    try {
      const areaMap: Record<string, { total: number; count: number }> = {};
      
      filteredRecords.forEach(r => {
        if (!r) return;
        const areaName = r.area || 'Sin Área';
        if (!areaMap[areaName]) areaMap[areaName] = { total: 0, count: 0 };
        
        const scoreVal = parseFloat(String(r.score || 0));
        areaMap[areaName].total += isNaN(scoreVal) ? 0 : scoreVal;
        areaMap[areaName].count += 1;
      });

      const calculatedChartData = Object.entries(areaMap)
        .map(([name, s]) => ({
          name,
          score: s.count > 0 ? Math.round(s.total / s.count) : 0,
          audits: s.count
        }))
        .sort((a, b) => b.score - a.score);

      const totalSum = filteredRecords.reduce((acc, r) => {
        const val = parseFloat(String(r?.score || 0));
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
      
      const finalAvg = filteredRecords.length > 0 ? Math.round(totalSum / filteredRecords.length) : 0;

      return {
        chartData: calculatedChartData,
        averageScore: finalAvg,
        openActions: filteredActions.filter(a => a && a.status !== 'CLOSED').length,
        closedActions: filteredActions.filter(a => a && a.status === 'CLOSED').length,
        pieData: [
          { name: 'Cumplimiento', value: finalAvg },
          { name: 'Brecha', value: Math.max(0, 100 - finalAvg) }
        ]
      };
    } catch (e) {
      console.error("Dashboard calculation error:", e);
      return null;
    }
  }, [filteredRecords, filteredActions]);

  const handleSendReport = async () => {
    if (!emailTo) {
      alert("Por favor ingrese al menos un destinatario.");
      return;
    }

    setIsSending(true);
    try {
      const captureOptions = {
        backgroundColor: '#0f172a',
        scale: 1.5,
        ignoreElements: (element: Element) => {
          return element.tagName === 'BUTTON' || element.classList.contains('fixed');
        }
      };

      // 1. Capturar Dashboard Completo
      let dashboardImage = '';
      if (dashboardRef.current) {
        const canvas = await html2canvas(dashboardRef.current, captureOptions);
        dashboardImage = canvas.toDataURL('image/png');
      }
      
      // 2. Capturar Rendimiento por Área (Estilo Consolidado)
      let performanceImage = '';
      if (consolidatedRef.current) {
        const canvas = await html2canvas(consolidatedRef.current, { 
          backgroundColor: '#0f172a', 
          scale: 2,
          useCORS: true
        });
        performanceImage = canvas.toDataURL('image/png');
      }

      // 3. Generar Excel (Audit y Plan de Acción)
      const wb = XLSX.utils.book_new();
      
      const auditData = records.map(r => ({
        ID: r.id,
        Fecha: r.date,
        Área: r.area,
        Responsable: r.responsable,
        Resultado: `${r.score}%`,
        Observaciones: r.notes
      }));
      const wsAudit = XLSX.utils.json_to_sheet(auditData);
      XLSX.utils.book_append_sheet(wb, wsAudit, "Auditorías");

      const actionData = actions.map(a => ({
        ID: a.id,
        Área: a.area,
        Hallazgo: a.finding,
        Acción: a.action,
        Responsable: a.responsable,
        Estatus: a.status === 'OPEN' ? 'ABIERTO' : 'CERRADO',
        Fecha_Límite: a.dueDate
      }));
      const wsActions = XLSX.utils.json_to_sheet(actionData);
      XLSX.utils.book_append_sheet(wb, wsActions, "Plan de Acción");

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

      // 4. Enviar al Servidor
      const token = localStorage.getItem('auth_token') || '';
      const response = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          message: emailMessage,
          attachments: [
            {
              filename: `Reporte_Auditoria_5S_${new Date().toISOString().split('T')[0]}.xlsx`,
              content: excelBuffer
            }
          ],
          images: {
            chart: dashboardImage,
            consolidated: performanceImage
          }
        })
      });

      const result = await response.json();
      if (response.ok) {
        alert("Reporte enviado correctamente.");
        setShowEmailModal(false);
      } else {
        throw new Error(result.error || result.details || "Error desconocido");
      }
    } catch (error: any) {
      console.error("Error enviando reporte:", error);
      alert(`Error al enviar el reporte: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const hasActiveFilters = startDate || endDate || selectedArea !== 'ALL';

  if (!stats || !isReady || (records.length === 0 && !hasActiveFilters)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in bg-[#1e293b]/50 rounded-3xl border border-gray-800 p-12">
        <div className="bg-[#0f172a] p-10 rounded-full border border-gray-700 shadow-2xl">
          <LucideBarChart className="w-20 h-20 text-blue-500/50" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Esperando Auditorías...</h2>
          <p className="text-gray-200 mb-8 text-sm">Realice su primera inspección o cargue datos de prueba para visualizar el desempeño de planta.</p>
          <button 
            onClick={onGenerateDemo}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl transition-all font-bold shadow-lg shadow-blue-600/20"
          >
            <Database className="w-5 h-5" /> Generar Datos de Ejemplo
          </button>
        </div>
      </div>
    );
  }

  if (!stats && hasActiveFilters) {
     return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
                    <TrendingUp className="text-blue-500" /> DASHBOARD
                </h2>
                <button onClick={clearFilters} className="text-blue-400 font-bold text-sm underline">Limpiar Filtros</button>
            </div>
            <div className="bg-[#1e293b] p-12 rounded-3xl border border-gray-800 text-center">
                <Filter className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No se encontraron datos para los filtros aplicados.</p>
            </div>
        </div>
     );
  }

  const { chartData, averageScore, openActions, closedActions, pieData } = stats!;

  const getBarColor = (score: number) => {
    if (score >= 90) return '#22c55e';
    if (score >= 75) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in" ref={dashboardRef}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
                <TrendingUp className="text-blue-500" /> DASHBOARD DE PLANTA
            </h2>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showFilters ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
            >
                <Filter className="w-3.5 h-3.5" /> 
                Filtros {hasActiveFilters && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
            </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-2 bg-green-600/10 text-green-400 border border-green-500/30 px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-600 hover:text-white transition-all"
              title="Enviar reporte por correo"
            >
                <Mail className="w-4 h-4" /> Enviar Reporte
            </button>
            <button 
              onClick={handleCaptureScreenshot}
              className="flex items-center gap-2 bg-purple-600/10 text-purple-400 border border-purple-500/30 px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-600 hover:text-white transition-all"
              title="Descargar imagen del dashboard"
            >
                <Camera className="w-4 h-4" /> Capturar
            </button>
            <button 
              onClick={onViewConsolidated}
              className="flex items-center gap-2 bg-blue-600/10 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all"
            >
                <SearchCode className="w-4 h-4" /> Análisis Consolidado
            </button>
            <button 
              onClick={onViewActions}
              className="flex items-center gap-2 bg-amber-600/10 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-600 hover:text-white transition-all"
            >
                <ListChecks className="w-4 h-4" /> Plan de Acción
            </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-[#1e293b] border border-gray-700 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in shadow-xl">
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                    <CalendarIcon className="w-3 h-3" /> Fecha Desde
                </label>
                <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500" 
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                    <CalendarIcon className="w-3 h-3" /> Fecha Hasta
                </label>
                <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500" 
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                    <Target className="w-3 h-3" /> Área Específica
                </label>
                <div className="relative">
                    <select 
                        value={selectedArea} 
                        onChange={(e) => setSelectedArea(e.target.value)}
                        className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500 appearance-none pr-8"
                    >
                        <option value="ALL">Todas las Áreas</option>
                        {areasList.map(area => <option key={area} value={area}>{area}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                </div>
            </div>
            <div className="flex items-end">
                <button 
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${hasActiveFilters ? 'bg-red-600/10 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white' : 'bg-gray-800 text-gray-600 border border-gray-700 cursor-not-allowed'}`}
                >
                    <X className="w-3.5 h-3.5" /> Limpiar Filtros
                </button>
            </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="AREAS AUDITADAS" value={filteredRecords.length} color="text-blue-400" icon={ClipboardList} />
        <StatCard label="RESULTADO GENERAL" value={`${averageScore}%`} color={averageScore >= 80 ? 'text-green-400' : 'text-yellow-400'} icon={Target} />
        <StatCard 
          label="ACCIONES PENDIENTES" 
          value={openActions} 
          color="text-red-400" 
          icon={AlertTriangle} 
          onClick={onViewActions}
        />
        <StatCard label="ACCIONES CERRADAS" value={closedActions} color="text-purple-400" icon={Trophy} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] rounded-2xl border border-gray-800 p-8 flex flex-col items-center justify-center min-h-[400px]">
          <h3 className="text-xs font-bold text-gray-100 uppercase tracking-widest mb-8">RESULTADO DE CALIDAD</h3>
          <div className="relative w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie 
                        data={pieData} 
                        cx="50%" cy="50%" 
                        innerRadius={80} outerRadius={110} 
                        dataKey="value" stroke="none" 
                        startAngle={90} endAngle={-270}
                      >
                          <Cell fill={getBarColor(averageScore)} />
                          <Cell fill="#0f172a" />
                      </Pie>
                  </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-6xl font-black text-white leading-none">{averageScore}%</span>
              </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl border border-gray-800 p-8 shadow-2xl" ref={chartRef}>
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8">Desempeño por Área (%)</h3>
          <div className="w-full pr-2 overflow-x-hidden">
            {chartData.length > 0 ? (
              <div style={{ height: `${Math.max(400, chartData.length * 42)}px`, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData} 
                    layout="vertical" 
                    margin={{ left: 20, right: 60, top: 10, bottom: 10 }}
                  >
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={140} 
                      tick={{fontSize: 10, fill: '#f1f5f9', fontWeight: 600}} 
                      axisLine={false} 
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} 
                    />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={26}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                        ))}
                        <LabelList 
                          dataKey="score" 
                          position="right" 
                          formatter={(val: number) => `${val}%`} 
                          style={{ fill: '#f1f5f9', fontSize: '11px', fontWeight: 'bold' }} 
                          offset={10}
                        />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center border border-dashed border-gray-700 rounded-xl">
                <p className="text-gray-500 italic">Sin datos de desempeño disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e293b] w-full max-w-lg rounded-3xl border border-gray-700 shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0f172a]/50">
              <h3 className="text-lg font-black text-white flex items-center gap-3 tracking-tighter">
                <Mail className="text-blue-500" /> ENVIAR REPORTE POR CORREO
              </h3>
              <button 
                onClick={() => setShowEmailModal(false)}
                className="p-2 text-gray-400 hover:bg-gray-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Para (Separe con coma para múltiples)</label>
                <input 
                  type="email" 
                  multiple
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="ejemplo@correo.com, jefe@planta.com"
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Asunto</label>
                <input 
                  type="text" 
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mensaje</label>
                <textarea 
                  rows={4}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                />
              </div>

              <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl">
                <p className="text-[10px] text-blue-400 font-bold uppercase mb-2">Se adjuntará automáticamente:</p>
                <ul className="text-[10px] text-gray-300 space-y-1">
                  <li className="flex items-center gap-2">• Reporte Excel (Auditorías + Plan de Acción)</li>
                  <li className="flex items-center gap-2">• Capturas visuales del desempeño</li>
                </ul>
              </div>
            </div>

            <div className="p-6 bg-[#0f172a]/50 border-t border-gray-800 flex gap-3">
              <button 
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-gray-400 hover:bg-gray-800 transition-all border border-gray-700"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSendReport}
                disabled={isSending}
                className="flex-none bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-3 transition-all font-bold shadow-lg shadow-blue-600/20"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> ENVIANDO...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" /> ENVIAR AHORA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <PerformanceReportCapture ref={consolidatedRef} stats={consolidatedStats} />
    </div>
  );
};

// Sección de Captura (Oculta)
const PerformanceReportCapture = React.forwardRef<HTMLDivElement, { stats: any }>((props, ref) => {
  if (!props.stats) return null;
  const { topLowestAreas, topHighestAreas } = props.stats;

  return (
    <div 
      ref={ref} 
      className="bg-[#0f172a] p-10 w-[1000px] absolute -left-[9999px] top-0 pointer-events-none"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-blue-600 p-3 rounded-2xl">
          <TrendingUp className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Resumen de Desempeño Operativo</h2>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Análisis por Áreas Críticas y Destacadas</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Áreas Críticas */}
        <div className="bg-[#1e293b] rounded-3xl border border-red-500/20 overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-red-500/20 bg-red-500/5 flex items-center gap-3">
            <TrendingDown className="w-6 h-6 text-red-500" />
            <h3 className="text-xl font-black text-red-100 italic tracking-tight uppercase tracking-widest">Áreas Críticas</h3>
          </div>
          <div className="p-8 space-y-6">
            {topLowestAreas.length > 0 ? topLowestAreas.map((item: any) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-lg font-black text-white uppercase tracking-tight">{item.name}</span>
                  <span className="text-xl font-black text-red-400">{item.average}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <div className="bg-red-500 h-3 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.4)]" style={{ width: `${item.average}%` }}></div>
                </div>
              </div>
            )) : <p className="text-gray-500 font-bold italic">No hay datos suficientes</p>}
          </div>
        </div>

        {/* Áreas Destacadas */}
        <div className="bg-[#1e293b] rounded-3xl border border-green-500/20 overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-green-500/20 bg-green-500/5 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-green-500" />
            <h3 className="text-xl font-black text-green-100 italic tracking-tight uppercase tracking-widest">Áreas Destacadas</h3>
          </div>
          <div className="p-8 space-y-6">
            {topHighestAreas.length > 0 ? topHighestAreas.map((item: any) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-lg font-black text-white uppercase tracking-tight">{item.name}</span>
                  <span className="text-xl font-black text-green-400">{item.average}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.4)]" style={{ width: `${item.average}%` }}></div>
                </div>
              </div>
            )) : <p className="text-gray-500 font-bold italic">No hay datos suficientes</p>}
          </div>
        </div>
      </div>
      
      <div className="mt-12 pt-8 border-t border-gray-800 text-center">
        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Reporte Automatizado - AuditCheck Pro</p>
      </div>
    </div>
  );
});
PerformanceReportCapture.displayName = 'PerformanceReportCapture';
