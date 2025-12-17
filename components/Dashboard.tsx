import React, { useRef } from 'react';
import { AuditRecord, ActionItem } from '../types';
import { 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  LabelList, 
  PieChart, 
  Pie 
} from 'recharts';
import { 
  Trophy, 
  PieChart as PieChartIcon, 
  ClipboardList, 
  Camera, 
  BarChart,
  Database
} from 'lucide-react';
import html2canvas from 'html2canvas';

interface DashboardProps {
  records: AuditRecord[];
  actions: ActionItem[];
  onViewConsolidated: () => void;
  onViewActions: () => void;
  onGenerateDemo?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ records, actions, onViewConsolidated, onViewActions, onGenerateDemo }) => {
  const dashboardRef = useRef<HTMLDivElement>(null);

  if (!records || records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in bg-[#1e293b] rounded-3xl border border-gray-800 p-10">
        <div className="bg-[#0f172a] p-8 rounded-full border border-gray-700 shadow-2xl">
          <BarChart className="w-16 h-16 text-gray-500" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Dashboard sin datos</h2>
          <p className="text-gray-400 mb-6">Aún no se han realizado auditorías. Realiza una inspección o usa el botón de abajo para ver cómo se vería el panel.</p>
          <button 
            onClick={onGenerateDemo}
            className="flex items-center gap-2 mx-auto bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl transition-all font-bold"
          >
            <Database className="w-5 h-5" /> Cargar Datos de Ejemplo
          </button>
        </div>
      </div>
    );
  }

  const areaStats: Record<string, { totalScore: number; count: number }> = {};
  records.forEach(r => {
    if (!areaStats[r.area]) areaStats[r.area] = { totalScore: 0, count: 0 };
    areaStats[r.area].totalScore += (r.score || 0);
    areaStats[r.area].count += 1;
  });

  const chartData = Object.entries(areaStats)
    .map(([area, stats]) => ({
      name: area,
      score: Math.round(stats.totalScore / stats.count),
      audits: stats.count
    }))
    .sort((a, b) => b.score - a.score);

  const averageScore = Math.round(records.reduce((acc, r) => acc + (r.score || 0), 0) / records.length);
  const openActions = actions.filter(a => a.status !== 'CLOSED').length;
  const closedActions = actions.filter(a => a.status === 'CLOSED').length;
  
  const chartHeight = Math.max(300, chartData.length * 40);
  const pieData = [
    { name: 'Cumplimiento', value: averageScore },
    { name: 'Faltante', value: Math.max(0, 100 - averageScore) }
  ];

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
            console.error(error);
            alert("Error al generar imagen.");
        }
    }
  };

  const getBarColor = (score: number) => {
    if (score >= 90) return '#22c55e';
    if (score >= 70) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in" ref={dashboardRef}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Panel de Indicadores</h2>
            <p className="text-sm text-gray-500">Resumen operativo 5S</p>
          </div>
          <button 
            onClick={handleCaptureScreenshot}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all font-bold"
          >
            <Camera className="w-4 h-4" /> Exportar Imagen
          </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatItem label="Auditorías" value={records.length} color="text-white" />
        <StatItem label="Promedio" value={`${averageScore}%`} color={averageScore >= 80 ? 'text-green-400' : 'text-yellow-400'} />
        <StatItem label="Abiertas" value={openActions} color="text-red-400" />
        <StatItem label="Cerradas" value={closedActions} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={onViewConsolidated} className="p-6 bg-[#1e293b] border border-orange-500/20 rounded-2xl hover:border-orange-500/50 transition-all flex justify-between items-center group">
            <div className="text-left">
                <p className="text-orange-400 font-bold text-lg">Ver Hallazgos Críticos</p>
                <p className="text-xs text-gray-500">Preguntas con más fallos</p>
            </div>
            <PieChartIcon className="w-8 h-8 text-orange-500/40 group-hover:text-orange-500 transition-colors" />
        </button>
        <button onClick={onViewActions} className="p-6 bg-[#1e293b] border border-blue-500/20 rounded-2xl hover:border-blue-500/50 transition-all flex justify-between items-center group">
            <div className="text-left">
                <p className="text-blue-400 font-bold text-lg">Planes de Acción</p>
                <p className="text-xs text-gray-500">Seguimiento de tareas</p>
            </div>
            <ClipboardList className="w-8 h-8 text-blue-500/40 group-hover:text-blue-500 transition-colors" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] rounded-2xl border border-gray-800 p-6 flex flex-col items-center justify-center min-h-[350px]">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Cumplimiento Global</h3>
          <div className="relative w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                          <Cell fill={getBarColor(averageScore)} />
                          <Cell fill="#0f172a" />
                      </Pie>
                  </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-black text-white">{averageScore}%</span>
              </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-[#0f172a]/30 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Top Áreas</h3>
          </div>
          <div className="p-2 overflow-y-auto max-h-[300px]">
            {chartData.map((item, index) => (
              <div key={item.name} className="p-3 flex items-center justify-between hover:bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 w-4">{index + 1}</span>
                  <span className="font-bold text-sm text-gray-200">{item.name}</span>
                </div>
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${item.score >= 90 ? 'text-green-400 border-green-900' : 'text-yellow-400 border-yellow-900'}`}>
                    {item.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-gray-800 p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
            <BarChart className="w-4 h-4 text-blue-400" /> Rendimiento Detallado (%)
        </h3>
        <div className="w-full" style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <ReBarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.2} />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                  {chartData.map((entry, index) => <Cell key={index} fill={getBarColor(entry.score)} />)}
                  <LabelList dataKey="score" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: '10px', fill: '#fff' }} offset={10} />
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ label, value, color }: { label: string, value: string | number, color: string }) => (
    <div className="bg-[#1e293b] p-4 rounded-2xl border border-gray-800">
        <p className="text-[10px] font-bold text-gray-500 uppercase">{label}</p>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
);
