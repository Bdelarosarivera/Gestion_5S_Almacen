
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
  AlertTriangle,
  Target
} from 'lucide-react';
import html2canvas from 'html2canvas';

interface DashboardProps {
  records: AuditRecord[];
  actions: ActionItem[];
  onViewConsolidated: () => void;
  onViewActions: () => void;
  onGenerateDemo?: () => void;
}

const StatCard = ({ label, value, color, icon: Icon }: any) => (
    <div className="bg-[#1e293b] p-5 rounded-2xl border border-gray-800 shadow-sm hover:border-gray-700 transition-all">
        <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
            {Icon && <Icon className={`w-4 h-4 ${color.replace('text-', 'text-opacity-40 ')}`} />}
        </div>
        <p className={`text-3xl font-black ${color}`}>{value}</p>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ records = [], actions = [], onViewConsolidated, onViewActions, onGenerateDemo }) => {
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Asegurar siempre un array válido para evitar fallos de iteración
  const safeRecords = useMemo(() => Array.isArray(records) ? records : [], [records]);
  const safeActions = useMemo(() => Array.isArray(actions) ? actions : [], [actions]);

  const stats = useMemo(() => {
    if (safeRecords.length === 0) return null;

    try {
      const areaMap: Record<string, { total: number; count: number }> = {};
      
      safeRecords.forEach(r => {
        const areaName = r.area || 'Sin Área';
        if (!areaMap[areaName]) areaMap[areaName] = { total: 0, count: 0 };
        
        // Validación estricta del puntaje para evitar NaN
        const scoreVal = Number(r.score);
        const validScore = isNaN(scoreVal) ? 0 : scoreVal;
        
        areaMap[areaName].total += validScore;
        areaMap[areaName].count += 1;
      });

      const calculatedChartData = Object.entries(areaMap)
        .map(([name, s]) => ({
          name,
          score: s.count > 0 ? Math.round(s.total / s.count) : 0,
          audits: s.count
        }))
        .sort((a, b) => b.score - a.score);

      const totalSum = safeRecords.reduce((acc, r) => {
          const val = Number(r.score);
          return acc + (isNaN(val) ? 0 : val);
      }, 0);
      
      const avg = safeRecords.length > 0 ? Math.round(totalSum / safeRecords.length) : 0;
      const finalAvg = isNaN(avg) ? 0 : avg;

      return {
        chartData: calculatedChartData,
        averageScore: finalAvg,
        openActions: safeActions.filter(a => a && a.status !== 'CLOSED').length,
        closedActions: safeActions.filter(a => a && a.status === 'CLOSED').length,
        pieData: [
          { name: 'Cumplimiento', value: finalAvg },
          { name: 'Brecha', value: Math.max(0, 100 - finalAvg) }
        ]
      };
    } catch (e) {
      console.error("Dashboard calculation error:", e);
      return null;
    }
  }, [safeRecords, safeActions]);

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in bg-[#1e293b]/50 rounded-3xl border border-gray-800 p-12">
        <div className="bg-[#0f172a] p-10 rounded-full border border-gray-700 shadow-2xl">
          <LucideBarChart className="w-20 h-20 text-blue-500/50" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Sin Datos de Desempeño</h2>
          <p className="text-gray-400 mb-8 text-sm">Realice su primera auditoría para visualizar las métricas y tendencias de cumplimiento en planta.</p>
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

  const { chartData, averageScore, openActions, closedActions, pieData } = stats;

  const getBarColor = (score: number) => {
    if (score >= 90) return '#22c55e';
    if (score >= 75) return '#eab308';
    return '#ef4444';
  };

  const handleCaptureScreenshot = async () => {
    if (!dashboardRef.current) return;
    try {
        const canvas = await html2canvas(dashboardRef.current, { 
          backgroundColor: '#0f172a', 
          scale: 2,
          logging: false
        });
        const link = document.createElement('a');
        link.download = `Status_AuditCheck_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) { console.error("Screenshot error:", e); }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in" ref={dashboardRef}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
                <TrendingUp className="text-blue-500" /> DASHBOARD DE PLANTA
            </h2>
            <p className="text-sm text-gray-500 font-medium italic">Consolidado de auditorías y planes de mejora</p>
          </div>
          <button onClick={handleCaptureScreenshot} className="flex items-center gap-2 bg-[#1e293b] border border-gray-700 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-widest">
            <Camera className="w-4 h-4" /> Capturar Informe
          </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Auditorías" value={safeRecords.length} color="text-blue-400" icon={ClipboardList} />
        <StatCard label="Promedio Planta" value={`${averageScore}%`} color={averageScore >= 80 ? 'text-green-400' : 'text-yellow-400'} icon={Target} />
        <StatCard label="Hallazgos Pendientes" value={openActions} color="text-red-400" icon={AlertTriangle} />
        <StatCard label="Cierres Exitosos" value={closedActions} color="text-purple-400" icon={Trophy} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={onViewConsolidated} className="p-6 bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-orange-500/20 rounded-2xl hover:border-orange-500/50 transition-all flex justify-between items-center group text-left shadow-lg">
            <div>
                <p className="text-orange-400 font-black text-xl mb-1 italic">ANÁLISIS DE FALLOS</p>
                <p className="text-xs text-gray-500 font-medium">Preguntas con menor nivel de cumplimiento</p>
            </div>
            <PieIcon className="w-10 h-10 text-orange-500/20 group-hover:text-orange-500 transition-colors" />
        </button>
        <button onClick={onViewActions} className="p-6 bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-blue-500/20 rounded-2xl hover:border-blue-500/50 transition-all flex justify-between items-center group text-left shadow-lg">
            <div>
                <p className="text-blue-400 font-black text-xl mb-1 italic">PLAN DE ACCIÓN</p>
                <p className="text-xs text-gray-500 font-medium">Seguimiento de tareas por responsable</p>
            </div>
            <ClipboardList className="w-10 h-10 text-blue-500/20 group-hover:text-blue-500 transition-colors" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] rounded-2xl border border-gray-800 p-8 flex flex-col items-center justify-center min-h-[400px]">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-8">Nivel de Calidad</h3>
          <div className="relative w-full h-72">
              <Recharts.ResponsiveContainer width="100%" height="100%" key={`pie-${safeRecords.length}`}>
                  <Recharts.PieChart>
                      <Recharts.Pie 
                        data={pieData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={80} 
                        outerRadius={110} 
                        dataKey="value" 
                        stroke="none" 
                        startAngle={90} 
                        endAngle={-270}
                      >
                          <Recharts.Cell fill={getBarColor(averageScore)} />
                          <Recharts.Cell fill="#0f172a" />
                      </Recharts.Pie>
                  </Recharts.PieChart>
              </Recharts.ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-6xl font-black text-white leading-none">{averageScore}%</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter mt-2">Planta Global</span>
              </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl border border-gray-800 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-800 bg-[#0f172a]/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">Ranking de Áreas</h3>
              </div>
              <span className="text-[10px] text-gray-500 font-bold italic">Top Desempeño</span>
          </div>
          <div className="p-2 overflow-y-auto flex-1 max-h-[350px] divide-y divide-gray-800/50">
            {chartData.map((item, index) => (
              <div key={item.name} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${index < 3 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-gray-800 text-gray-500'}`}>
                    {index + 1}
                  </span>
                  <span className="font-bold text-gray-200 group-hover:text-white transition-colors">{item.name}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">{item.audits} Auditorías</span>
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black border ${item.score >= 85 ? 'text-green-400 border-green-900/50 bg-green-900/10' : 'text-yellow-400 border-yellow-900/50 bg-yellow-900/10'}`}>
                        {item.score}%
                    </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-[#1e293b] rounded-2xl border border-gray-800 p-8 shadow-2xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8">Comparativa Visual (%)</h3>
        <div className="w-full" style={{ height: `${Math.max(300, chartData.length * 50)}px` }}>
          <Recharts.ResponsiveContainer width="100%" height="100%" key={`bar-${safeRecords.length}`}>
            <Recharts.BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 45 }}>
              <Recharts.XAxis type="number" domain={[0, 100]} hide />
              <Recharts.YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 600}} axisLine={false} tickLine={false} />
              <Recharts.Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.03)'}} 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} 
              />
              <Recharts.Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={24}>
                  {chartData.map((entry, index) => <Recharts.Cell key={index} fill={getBarColor(entry.score)} />)}
                  <Recharts.LabelList dataKey="score" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: '11px', fill: '#cbd5e1', fontWeight: 800 }} offset={12} />
              </Recharts.Bar>
            </Recharts.BarChart>
          </Recharts.ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
