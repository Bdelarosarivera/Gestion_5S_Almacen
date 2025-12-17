import React, { useRef } from 'react';
import { AuditRecord, ActionItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, PieChart, Pie, Legend } from 'recharts';
import { Trophy, TrendingUp, AlertTriangle, CheckCircle, PieChart as PieChartIcon, ClipboardList, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';

interface DashboardProps {
  records: AuditRecord[];
  actions: ActionItem[];
  onViewConsolidated: () => void;
  onViewActions: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ records, actions, onViewConsolidated, onViewActions }) => {
  const dashboardRef = useRef<HTMLDivElement>(null);

  const handleCaptureScreenshot = async () => {
    if (dashboardRef.current) {
        try {
            // Desplazamos al inicio para capturar correctamente si hay scroll
            window.scrollTo(0, 0);
            const canvas = await html2canvas(dashboardRef.current, {
                backgroundColor: '#0f172a', // Color del fondo de la app
                scale: 2, // Doble resolución para gerencia
                logging: false,
                useCORS: true
            });
            const link = document.createElement('a');
            link.download = `Reporte_Dashboard_5S_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error("Error capturando pantalla:", error);
            alert("Hubo un error al generar la imagen. Asegúrese de que todas las gráficas estén cargadas.");
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

  const averageScore = records.length > 0
    ? Math.round(records.reduce((acc, r) => acc + r.score, 0) / records.length)
    : 0;
  
  const openActions = actions.filter(a => a.status !== 'CLOSED').length;
  const closedActions = actions.filter(a => a.status === 'CLOSED').length;
  const chartHeight = Math.max(300, chartData.length * 50);

  const pieData = [
    { name: 'Cumplimiento', value: averageScore },
    { name: 'Brecha', value: 100 - averageScore }
  ];
  const pieColors = [getBarColor(averageScore), '#1e293b'];

  return (
    <div className="space-y-8 mb-24 animate-fade-in" ref={dashboardRef}>
      
      <div className="flex justify-between items-center p-2">
          <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Estado de Almacén</h2>
          <button 
            onClick={handleCaptureScreenshot}
            className="flex items-center gap-2 bg-[#1e293b] border border-gray-700 text-gray-300 px-4 py-2.5 rounded-xl hover:bg-[#0f172a] hover:text-white hover:border-blue-500/50 transition-all text-sm font-bold shadow-lg"
          >
            <Camera className="w-4 h-4" /> Capturar para Gerencia
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="AUDITORÍAS" value={records.length} color="cyan" icon={<CheckCircle />} />
        <StatCard label="PROMEDIO" value={`${averageScore}%`} color={averageScore >= 90 ? 'green' : averageScore >= 70 ? 'yellow' : 'red'} icon={<TrendingUp />} />
        <StatCard label="PENDIENTES" value={openActions} color="orange" icon={<AlertTriangle />} onClick={onViewActions} />
        <StatCard label="CERRADAS" value={closedActions} color="purple" icon={<CheckCircle />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={onViewConsolidated} className="w-full py-5 px-6 bg-[#1e293b] hover:bg-[#0f172a] text-gray-200 border border-gray-700 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 font-bold group">
            <PieChartIcon className="w-6 h-6 text-orange-400 group-hover:scale-110 transition-transform" /> Análisis Consolidado
        </button>
        <button onClick={onViewActions} className="w-full py-5 px-6 bg-[#1e293b] hover:bg-[#0f172a] text-gray-200 border border-gray-700 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 font-bold group">
            <ClipboardList className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" /> Planes de Acción
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] rounded-2xl shadow-xl border border-gray-800 p-6 flex flex-col items-center">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 w-full text-center">Cumplimiento Global</h3>
          <div className="relative w-full aspect-square max-w-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value" startAngle={90} endAngle={-270} stroke="none">
                          <Cell fill={pieColors[0]} />
                          <Cell fill={pieColors[1]} />
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #374151', backgroundColor: '#0f172a', color: '#f3f4f6' }} />
                  </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none mb-2">
                  <span className="text-4xl font-black text-white">{averageScore}%</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">KPI GLOBAL</span>
              </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl shadow-xl border border-gray-800 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-800 flex items-center gap-2 bg-[#0f172a]/50">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Ranking por Áreas</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] divide-y divide-gray-800">
            {chartData.map((item, index) => (
              <div key={item.name} className="p-4 flex items-center justify-between hover:bg-[#0f172a]/50 transition-colors">
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs border ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-gray-800 text-gray-500 border-gray-700'
                  }`}>{index + 1}</span>
                  <div>
                    <p className="font-bold text-gray-100 text-sm">{item.name}</p>
                    <p className="text-[10px] text-gray-500 font-bold">{item.audits} EVALUACIONES</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-2 bg-gray-800 rounded-full hidden sm:block">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.score}%`, backgroundColor: getBarColor(item.score) }} />
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-black border ${getScoreColor(item.score)}`}>{item.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-2xl shadow-xl border border-gray-800 p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8">Tendencia de Cumplimiento</h3>
        <div className="w-full" style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis dataKey="name" type="category" width={110} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
              <Tooltip cursor={{fill: '#0f172a', opacity: 0.4}} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #374151', borderRadius: '8px' }} />
              <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={25}>
                  {chartData.map((entry, index) => <Cell key={index} fill={getBarColor(entry.score)} />)}
                  <LabelList dataKey="score" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: '10px', fontWeight: '900', fill: '#f1f5f9' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; color: string; icon: React.ReactNode; onClick?: () => void }> = ({ label, value, color, icon, onClick }) => {
    const colors: any = {
        cyan: 'border-cyan-500/30 text-cyan-400 shadow-cyan-500/10',
        green: 'border-green-500/30 text-green-400 shadow-green-500/10',
        yellow: 'border-yellow-500/30 text-yellow-400 shadow-yellow-500/10',
        red: 'border-red-500/30 text-red-400 shadow-red-500/10',
        orange: 'border-orange-500/30 text-orange-400 shadow-orange-500/10',
        purple: 'border-purple-500/30 text-purple-400 shadow-purple-500/10',
    };
    return (
        <div onClick={onClick} className={`bg-[#0f172a] rounded-3xl border p-6 flex flex-col justify-between h-44 transition-all hover:-translate-y-1 shadow-2xl ${colors[color]} ${onClick ? 'cursor-pointer hover:border-white/20' : ''}`}>
            <div className="flex justify-between items-start">
                <span className="text-[10px] font-black tracking-[0.2em] text-gray-500">{label}</span>
                <div className="opacity-50">{icon}</div>
            </div>
            <div className="flex-1 flex items-center justify-center">
                <span className="text-5xl font-black drop-shadow-md">{value}</span>
            </div>
        </div>
    );
};
