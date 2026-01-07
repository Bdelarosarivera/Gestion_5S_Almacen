
import React, { useRef, useMemo } from 'react';
import * as Recharts from 'recharts';
import { AuditRecord, ActionItem } from '../types';
import { 
  Trophy, 
  PieChart as PieIcon, 
  ClipboardList, 
  Camera, 
  BarChart as LucideBarChart,
  Database,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import html2canvas from 'html2canvas';

interface DashboardProps {
  records: AuditRecord[];
  actions: ActionItem[];
  onViewConsolidated: () => void;
  onViewActions: () => void;
  onGenerateDemo?: () => void;
}

const StatCard = ({ label, value, color }: { label: string, value: string | number, color: string }) => (
    <div className="bg-[#1e293b] p-4 rounded-2xl border border-gray-800 shadow-sm">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ records = [], actions = [], onViewConsolidated, onViewActions, onGenerateDemo }) => {
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Garantizar que siempre trabajamos con arrays válidos
  const safeRecords = useMemo(() => Array.isArray(records) ? records : [], [records]);
  const safeActions = useMemo(() => Array.isArray(actions) ? actions : [], [actions]);

  // Cálculos estadísticos con protección total contra NaN
  const stats = useMemo(() => {
    if (safeRecords.length === 0) return null;

    try {
      const areaMap: Record<string, { total: number; count: number }> = {};
      safeRecords.forEach(r => {
        const area = r.area || 'General';
        if (!areaMap[area]) areaMap[area] = { total: 0, count: 0 };
        const score = Number(r.score);
        areaMap[area].total += isNaN(score) ? 0 : score;
        areaMap[area].count += 1;
      });

      const calculatedChartData = Object.entries(areaMap)
        .map(([name, s]) => ({
          name,
          score: s.count > 0 ? Math.round(s.total / s.count) : 0,
          audits: s.count
        }))
        .sort((a, b) => b.score - a.score);

      const totalSum = safeRecords.reduce((acc, r) => acc + (Number(r.score) || 0), 0);
      const avg = safeRecords.length > 0 ? Math.round(totalSum / safeRecords.length) : 0;
      
      // Validación final para evitar NaN en las gráficas
      const finalAvg = isNaN(avg) ? 0 : avg;

      return {
        chartData: calculatedChartData,
        averageScore: finalAvg,
        openActions: safeActions.filter(a => a && a.status !== 'CLOSED').length,
        closedActions: safeActions.filter(a => a && a.status === 'CLOSED').length,
        pieData: [
          { name: 'Cumplimiento', value: finalAvg },
          { name: 'Restante', value: Math.max(0, 100 - finalAvg) }
        ]
      };
    } catch (e) {
      console.error("Error crítico en cálculos del Dashboard:", e);
      return null;
    }
  }, [safeRecords, safeActions]);

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in bg-[#1e293b] rounded-3xl border border-gray-800 p-10">
        <div className="bg-[#0f172a] p-8 rounded-full border border-gray-700 shadow-2xl">
          <LucideBarChart className="w-16 h-16 text-gray-500" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Panel de Indicadores</h2>
          <p className="text-gray-400 mb-6">Realice su primera auditoría para visualizar las métricas en tiempo real.</p>
          <button 
            onClick={onGenerateDemo}
            className="flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all font-bold shadow-lg shadow-blue-500/20"
          >
            <Database className="w-5 h-5" /> Generar Datos de Ejemplo
          </button>
        </div>
      </div>
    );
  }

  const { chartData, averageScore, openActions, closedActions, pieData } = stats;

  const getBarColor = (score: number) => {
    if (score >= 90) return '#22c55e';
    if (score >= 70) return '#eab308';
    return '#ef4444';
  };

  const handleCaptureScreenshot = async () => {
    if (!dashboardRef.current) return;
    try {
        const canvas = await html2canvas(dashboardRef.current, { 
          backgroundColor: '#0f172a', 
          scale: 2,
          useCORS: true 
        });
        const link = document.createElement('a');
        link.download = `Reporte_Indicadores_5S.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) { console.error("Error al capturar pantalla:", e); }
  };

  const chartHeight = Math.max(300, chartData.length * 45);

  // Si Recharts no cargó correctamente (raro con el nuevo importmap), mostramos un fallback
  if (typeof Recharts.ResponsiveContainer === 'undefined') {
    return (
        <div className="p-10 bg-red-900/10 border border-red-500/30 rounded-2xl text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white">Error de Carga</h2>
            <p className="text-gray-400">Las librerías de gráficos no cargaron correctamente. Por favor, limpie la caché de su navegador y recargue la página.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in" ref={dashboardRef}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <TrendingUp className="text-blue-400" /> Indicadores Operativos
            </h2>
            <p className="text-sm text-gray-500">Métricas de cumplimiento y gestión de planta</p>
          </div>
          <button onClick={handleCaptureScreenshot} className="flex items-center gap-2 bg-[#1e293b] border border-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-xl transition-all font-bold text-sm">
            <Camera className="w-4 h-4" /> Exportar Gráficas
          </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Auditorías" value={safeRecords.length} color="text-blue-400" />
        <StatCard label="Cumplimiento" value={`${averageScore}%`} color={averageScore >= 80 ? 'text-green-400' : 'text-yellow-400'} />
        <StatCard label="Pendientes" value={openActions} color="text-red-400" />
        <StatCard label="Cerradas" value={closedActions} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={onViewConsolidated} className="p-5 bg-[#1e293b] border border-orange-500/20 rounded-2xl hover:border-orange-500/50 transition-all flex justify-between items-center group text-left">
            <div>
                <p className="text-orange-400 font-bold text-lg">Análisis de Debilidades</p>
                <p className="text-xs text-gray-500">Puntos de control con bajo desempeño</p>
            </div>
            <PieIcon className="w-8 h-8 text-orange-500/30 group-hover:text-orange-500 transition-colors" />
        </button>
        <button onClick={onViewActions} className="p-5 bg-[#1e293b] border border-blue-500/20 rounded-2xl hover:border-blue-500/50 transition-all flex justify-between items-center group text-left">
            <div>
                <p className="text-blue-400 font-bold text-lg">Planes de Acción</p>
                <p className="text-xs text-gray-500">Estado de compromisos de mejora</p>
            </div>
            <ClipboardList className="w-8 h-8 text-blue-500/30 group-hover:text-blue-500 transition-colors" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] rounded-2xl border border-gray-800 p-6 flex flex-col items-center justify-center min-h-[350px]">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Meta de Cumplimiento</h3>
          <div className="relative w-full h-64">
              <Recharts.ResponsiveContainer width="100%" height="100%">
                  <Recharts.PieChart>
                      <Recharts.Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                          <Recharts.Cell fill={getBarColor(averageScore)} />
                          <Recharts.Cell fill="#0f172a" />
                      </Recharts.Pie>
                  </Recharts.PieChart>
              </Recharts.ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-5xl font-black text-white">{averageScore}%</span>
              </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-[#0f172a]/30 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Top Desempeño por Áreas</h3>
          </div>
          <div className="p-2 overflow-y-auto max-h-[300px] divide-y divide-gray-800/50">
            {chartData.map((item, index) => (
              <div key={item.name} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-800 text-gray-500'}`}>
                    {index + 1}
                  </span>
                  <span className="font-bold text-sm text-gray-100">{item.name}</span>
                </div>
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${item.score >= 85 ? 'text-green-400 border-green-900/50 bg-green-900/10' : 'text-yellow-400 border-yellow-900/50 bg-yellow-900/10'}`}>
                    {item.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-gray-800 p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Comparativa por Planta</h3>
        <div className="w-full" style={{ height: `${chartHeight}px` }}>
          <Recharts.ResponsiveContainer width="100%" height="100%">
            <Recharts.BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 40 }}>
              <Recharts.XAxis type="number" domain={[0, 100]} hide />
              <Recharts.YAxis dataKey="name" type="category" width={110} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
              <Recharts.Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #374151' }} />
              <Recharts.Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                  {chartData.map((entry, index) => <Recharts.Cell key={index} fill={getBarColor(entry.score)} />)}
                  <Recharts.LabelList dataKey="score" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: '10px', fill: '#cbd5e1' }} offset={10} />
              </Recharts.Bar>
            </Recharts.BarChart>
          </Recharts.ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
