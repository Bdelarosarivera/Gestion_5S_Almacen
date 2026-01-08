import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as Recharts from 'recharts';
import { 
  Trophy, 
  ClipboardList, 
  BarChart3,
  Database,
  TrendingUp,
  AlertTriangle,
  Target
} from 'lucide-react';

// Tipos necesarios
interface Answer { questionId: number; rating: string; }
interface AuditRecord {
  id: string;
  area: string;
  auditor: string;
  responsable: string;
  date: string;
  score: number;
  answers: Answer[];
}
interface ActionItem {
  id: string;
  status: string;
  [key: string]: any;
}

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

export const Dashboard: React.FC<DashboardProps> = ({ 
  records = [], 
  actions = [], 
  onViewConsolidated, 
  onViewActions, 
  onGenerateDemo 
}) => {
  const [isReady, setIsReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Esperar a que el componente esté completamente montado
  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Validar y sanitizar datos de entrada
  const safeRecords = useMemo(() => {
    if (!Array.isArray(records)) return [];
    return records.filter(r => 
      r && 
      typeof r === 'object' && 
      r.area && 
      typeof r.score === 'number' &&
      !isNaN(r.score)
    );
  }, [records]);

  const safeActions = useMemo(() => {
    if (!Array.isArray(actions)) return [];
    return actions.filter(a => a && typeof a === 'object' && a.status);
  }, [actions]);

  // Calcular estadísticas con validación exhaustiva
  const stats = useMemo(() => {
    if (safeRecords.length === 0) return null;

    try {
      const areaMap: Record<string, { total: number; count: number }> = {};
      
      safeRecords.forEach(r => {
        const areaName = String(r.area || 'Sin Área');
        if (!areaMap[areaName]) {
          areaMap[areaName] = { total: 0, count: 0 };
        }
        
        const scoreVal = Number(r.score);
        if (!isNaN(scoreVal) && scoreVal >= 0 && scoreVal <= 100) {
          areaMap[areaName].total += scoreVal;
          areaMap[areaName].count += 1;
        }
      });

      const calculatedChartData = Object.entries(areaMap)
        .filter(([_, s]) => s.count > 0)
        .map(([name, s]) => ({
          name: name.length > 20 ? name.substring(0, 18) + '...' : name,
          score: Math.round(s.total / s.count),
          audits: s.count
        }))
        .sort((a, b) => b.score - a.score);

      // Calcular promedio global
      const totalSum = safeRecords.reduce((acc, r) => {
        const val = Number(r.score);
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
      
      const finalAvg = safeRecords.length > 0 ? Math.round(totalSum / safeRecords.length) : 0;

      // Datos para gráfico de pastel
      const pieData = [
        { name: 'Cumplimiento', value: Math.max(0, Math.min(100, finalAvg)) },
        { name: 'Brecha', value: Math.max(0, 100 - finalAvg) }
      ];

      return {
        chartData: calculatedChartData,
        averageScore: finalAvg,
        openActions: safeActions.filter(a => a.status !== 'CLOSED').length,
        closedActions: safeActions.filter(a => a.status === 'CLOSED').length,
        pieData
      };
    } catch (e) {
      console.error("Error calculando estadísticas:", e);
      return null;
    }
  }, [safeRecords, safeActions]);

  // Pantalla de carga inicial
  if (!mounted || !isReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 text-sm">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Pantalla sin datos
  if (!stats || stats.chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in bg-[#1e293b]/50 rounded-3xl border border-gray-800 p-12">
        <div className="bg-[#0f172a] p-10 rounded-full border border-gray-700 shadow-2xl">
          <BarChart3 className="w-20 h-20 text-blue-500/50" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Esperando Auditorías...</h2>
          <p className="text-gray-400 mb-8 text-sm">Realice su primera inspección o cargue datos de prueba para visualizar el desempeño de planta.</p>
          {onGenerateDemo && (
            <button 
              onClick={onGenerateDemo}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl transition-all font-bold shadow-lg shadow-blue-600/20"
            >
              <Database className="w-5 h-5" /> Generar Datos de Ejemplo
            </button>
          )}
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
      <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
          <TrendingUp className="text-blue-500" /> DASHBOARD DE PLANTA
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Auditorías" value={safeRecords.length} color="text-blue-400" icon={ClipboardList} />
        <StatCard label="Global" value={`${averageScore}%`} color={averageScore >= 80 ? 'text-green-400' : 'text-yellow-400'} icon={Target} />
        <StatCard label="Pendientes" value={openActions} color="text-red-400" icon={AlertTriangle} />
        <StatCard label="Cerrados" value={closedActions} color="text-purple-400" icon={Trophy} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de pastel */}
        <div className="bg-[#1e293b] rounded-2xl border border-gray-800 p-8 flex flex-col items-center justify-center min-h-[400px]">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-8">Nivel de Calidad</h3>
          <div className="relative w-full h-72">
              <Recharts.ResponsiveContainer width="100%" height="100%">
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
                        isAnimationActive={true}
                      >
                          <Recharts.Cell key="cell-0" fill={getBarColor(averageScore)} />
                          <Recharts.Cell key="cell-1" fill="#0f172a" />
                      </Recharts.Pie>
                  </Recharts.PieChart>
              </Recharts.ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-6xl font-black text-white leading-none">{averageScore}%</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter mt-2">Planta Global</span>
              </div>
          </div>
        </div>

        {/* Gráfico de barras */}
        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl border border-gray-800 p-8 shadow-2xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8">Desempeño por Área (%)</h3>
          <div className="w-full" style={{ height: '300px' }}>
            <Recharts.ResponsiveContainer width="100%" height="100%">
              <Recharts.BarChart 
                data={chartData} 
                layout="vertical" 
                margin={{ left: 10, right: 45, top: 5, bottom: 5 }}
              >
                <Recharts.XAxis 
                  type="number" 
                  domain={[0, 100]} 
                  hide 
                />
                <Recharts.YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120} 
                  tick={{fontSize: 11, fill: '#94a3b8'}} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Recharts.Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: '1px solid #334155', 
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Recharts.Bar 
                  dataKey="score" 
                  radius={[0, 6, 6, 0]} 
                  barSize={24}
                  isAnimationActive={true}
                >
                    {chartData.map((entry, index) => (
                      <Recharts.Cell 
                        key={`cell-${index}`} 
                        fill={getBarColor(entry.score)} 
                      />
                    ))}
                </Recharts.Bar>
              </Recharts.BarChart>
            </Recharts.ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Botones de acción adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <button 
          onClick={onViewConsolidated}
          className="bg-[#1e293b] border border-blue-500/30 p-6 rounded-2xl hover:border-blue-500/60 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-blue-400 mb-1">Análisis Consolidado</h3>
              <p className="text-xs text-gray-500">Ver desglose detallado por preguntas</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-500/50 group-hover:text-blue-400 transition-colors" />
          </div>
        </button>
        
        <button 
          onClick={onViewActions}
          className="bg-[#1e293b] border border-purple-500/30 p-6 rounded-2xl hover:border-purple-500/60 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-purple-400 mb-1">Plan de Acciones</h3>
              <p className="text-xs text-gray-500">Gestionar hallazgos y seguimiento</p>
            </div>
            <ClipboardList className="w-8 h-8 text-purple-500/50 group-hover:text-purple-400 transition-colors" />
          </div>
        </button>
      </div>
    </div>
  );
}
