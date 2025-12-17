import React, { useRef } from 'react';
import { AuditRecord, ActionItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, PieChart, Pie } from 'recharts';
import { Trophy, TrendingUp, AlertTriangle, CheckCircle, PieChart as PieChartIcon, ClipboardList, Camera, PlusCircle } from 'lucide-react';
import html2canvas from 'html2canvas';

interface DashboardProps {
  records: AuditRecord[];
  actions: ActionItem[];
  onViewConsolidated: () => void;
  onViewActions: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ records, actions, onViewConsolidated, onViewActions }) => {
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Si no hay registros, mostrar mensaje de bienvenida/vacío
  if (!records || records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in">
        <div className="bg-[#1e293b] p-8 rounded-full border border-gray-700 shadow-2xl">
          <BarChart3 className="w-16 h-16 text-gray-500" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Dashboard sin datos</h2>
          <p className="text-gray-400">Aún no se han realizado auditorías. Realiza tu primera inspección para ver las estadísticas de cumplimiento aquí.</p>
        </div>
      </div>
    );
  }

  const handleCaptureScreenshot = async () => {
    if (dashboardRef.current) {
        try {
            window.scrollTo(0, 0);
            const canvas = await html2canvas(dashboardRef.current, {
                backgroundColor: '#121212',
                scale: 2,
                logging: false,
                useCORS: true
            });
            const link = document.createElement('a');
            link.download = `Dashboard_5S_${new Date().toLocaleDateString()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error("Error capturando pantalla:", error);
            alert("Error al generar la imagen.");
        }
    }
  };

  const areaStats: Record<string, { totalScore: number; count: number }> = {};
  records.forEach(r => {
    if (!areaStats[r.area]) areaStats[r.area] = { totalScore: 0, count: 0 };
    areaStats[r.area].totalScore += r.score;
    areaStats[r.area].count += 1;
  });

  const chartData = Object.entries(areaStats)
    .map(([area, stats]) => ({
      name: area,
      score: Math.round(stats.totalScore / stats.count),
      audits: stats.count
    }))
    .sort((a, b) => b.score - a.score);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400 bg-green-900/30 border-green-500/30';
    if (score >= 70) return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30';
    return 'text-red-400 bg-red-900/30 border-red-500/30';
  };

  const getBarColor = (score: number) => {
    if (score >= 90) return '#22c55e';
    if (score >= 70) return '#eab308';
    return '#ef4444';
  };

  const averageScore = Math.round(records.reduce((acc, r) => acc + r.score, 0) / records.length);
  const openActions = actions.filter(a => a.status !== 'CLOSED').length;
  const closedActions = actions.filter(a => a.status === 'CLOSED').length;
  const chartHeight = Math.max(350, chartData.length * 45);

  const pieData = [
    { name: 'Cumplimiento', value: averageScore },
    { name: 'Faltante', value: 100 - averageScore }
  ];

  return (
    <div className="space-y-8 mb-24 animate-fade-in" ref={dashboardRef}>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-100 tracking-tight">Panel de Indicadores</h2>
            <p className="text-sm text-gray-500">Resumen ejecutivo del desempeño 5S</p>
          </div>
          <button 
            onClick={handleCaptureScreenshot}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all font-bold shadow-lg shadow-blue-500/20"
          >
            <Camera className="w-4 h-4" /> Exportar Imagen
          </button>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-gray-800">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Auditorías</p>
            <p className="text-2xl font-black text-white">{records.length}</p>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-gray-800">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Promedio</p>
            <p className={`text-2xl font-black ${averageScore >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>{averageScore}%</p>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-gray-800">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Acciones Pend.</p>
            <p className="text-2xl font-black text-red-400">{openActions}</p>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-gray-800">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Cerradas</p>
            <p className="text-2xl font-black text-purple-400">{closedActions}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={onViewConsolidated} className="flex items-center justify-between p-6 bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-orange-500/20 rounded-2xl hover:border-orange-500/50 transition-all group shadow-xl">
            <div className="text-left">
                <p className="text-orange-400 font-bold text-lg">Análisis de Hallazgos</p>
                <p className="text-xs text-gray-500">Ver preguntas con más fallos</p>
            </div>
            <PieChartIcon className="w-8 h-8 text-orange-500/50 group-hover:text-orange-500 transition-colors" />
        </button>
        <button onClick={onViewActions} className="flex items-center justify-between p-6 bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-blue-500/20 rounded-2xl hover:border-blue-500/50 transition-all group shadow-xl">
            <div className="text-left">
                <p className="text-blue-400 font-bold text-lg">Planes de Acción</p>
                <p className="text-xs text-gray-500">Seguimiento de correctivas</p>
            </div>
            <ClipboardList className="w-8 h-8 text-blue-500/50 group-hover:text-blue-500 transition-colors" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Circular */}
        <div className="bg-[#1e293b] rounded-2xl shadow-xl border border-gray-800 p-6 flex flex-col items-center justify-center min-h-[350px]">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Cumplimiento Total</h3>
          <div className="relative w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie 
                        data={pieData} 
                        cx="50%" cy="50%" 
                        innerRadius={65} 
                        outerRadius={90} 
                        dataKey="value" 
                        stroke="none"
                        startAngle={90}
                        endAngle={-270}
                      >
                          <Cell fill={getBarColor(averageScore)} />
                          <Cell fill="#0f172a" />
                      </Pie>
                  </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-5xl font-black text-white">{averageScore}%</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Objetivo 95%</span>
              </div>
          </div>
        </div>

        {/* Ranking List */}
        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl shadow-xl border border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-[#0f172a]/30">
            <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Ranking de Áreas</h3>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[350px] divide-y divide-gray-800/50">
            {chartData.map((item, index) => (
              <div key={item.name} className="p-4 flex items-center justify-between hover:bg-blue-500/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-black border ${
                    index === 0 ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-gray-800 text-gray-500 border-gray-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-100 text-sm leading-tight">{item.name}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{item.audits} auditorías realizadas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-1.5 bg-gray-800 rounded-full hidden sm:block">
                    <div className="h-full rounded-full" style={{ width: `${item.score}%`, backgroundColor: getBarColor(item.score) }} />
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getScoreColor(item.score)}`}>
                    {item.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar Chart Tendency */}
      <div className="bg-[#1e293b] rounded-2xl shadow-xl border border-gray-800 p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" /> Comparativa de Cumplimiento (%)
        </h3>
        <div className="w-full" style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.3} />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fontWeight: '600', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{fill: '#0f172a', opacity: 0.2}} 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #374151', borderRadius: '12px', color: '#fff' }} 
              />
              <Bar dataKey="score" radius={[0, 8, 8, 0]} barSize={22}>
                  {chartData.map((entry, index) => <Cell key={index} fill={getBarColor(entry.score)} />)}
                  <LabelList dataKey="score" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: '11px', fontWeight: '800', fill: '#cbd5e1' }} offset={10} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Icono auxiliar faltante
const BarChart3 = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
);
