
import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as Recharts from 'recharts';
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
  ArrowRight
} from 'lucide-react';

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
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
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

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 200);
    return () => clearTimeout(timer);
  }, [records.length]);

  const safeRecords = useMemo(() => Array.isArray(records) ? records : [], [records]);
  const safeActions = useMemo(() => Array.isArray(actions) ? actions : [], [actions]);

  const stats = useMemo(() => {
    if (safeRecords.length === 0) return null;

    try {
      const areaMap: Record<string, { total: number; count: number }> = {};
      
      safeRecords.forEach(r => {
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

      const totalSum = safeRecords.reduce((acc, r) => {
        const val = parseFloat(String(r?.score || 0));
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
      
      const finalAvg = safeRecords.length > 0 ? Math.round(totalSum / safeRecords.length) : 0;

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

  if (!stats || !isReady || stats.chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in bg-[#1e293b]/50 rounded-3xl border border-gray-800 p-12">
        <div className="bg-[#0f172a] p-10 rounded-full border border-gray-700 shadow-2xl">
          <LucideBarChart className="w-20 h-20 text-blue-500/50" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Esperando Auditorías...</h2>
          <p className="text-gray-400 mb-8 text-sm">Realice su primera inspección o cargue datos de prueba para visualizar el desempeño de planta.</p>
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

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
            <TrendingUp className="text-blue-500" /> DASHBOARD DE PLANTA
        </h2>
        <div className="flex items-center gap-2">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Auditorías" value={safeRecords.length} color="text-blue-400" icon={ClipboardList} />
        <StatCard label="Global" value={`${averageScore}%`} color={averageScore >= 80 ? 'text-green-400' : 'text-yellow-400'} icon={Target} />
        <StatCard 
          label="Hallazgos Pendientes" 
          value={openActions} 
          color="text-red-400" 
          icon={AlertTriangle} 
          onClick={onViewActions}
        />
        <StatCard label="Cerrados" value={closedActions} color="text-purple-400" icon={Trophy} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] rounded-2xl border border-gray-800 p-8 flex flex-col items-center justify-center min-h-[400px]">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-8">Nivel de Calidad</h3>
          <div className="relative w-full h-72">
              <Recharts.ResponsiveContainer width="100%" height="100%">
                  <Recharts.PieChart>
                      <Recharts.Pie 
                        data={pieData} 
                        cx="50%" cy="50%" 
                        innerRadius={80} outerRadius={110} 
                        dataKey="value" stroke="none" 
                        startAngle={90} endAngle={-270}
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

        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl border border-gray-800 p-8 shadow-2xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8">Desempeño por Área (%)</h3>
          <div className="w-full" style={{ height: '300px' }}>
            <Recharts.ResponsiveContainer width="100%" height="100%">
              <Recharts.BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 45 }}>
                <Recharts.XAxis type="number" domain={[0, 100]} hide />
                <Recharts.YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <Recharts.Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} 
                />
                <Recharts.Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={24}>
                    {chartData.map((entry, index) => <Recharts.Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />)}
                </Recharts.Bar>
              </Recharts.BarChart>
            </Recharts.ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
