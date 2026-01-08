import React, { useMemo, useEffect, useState } from 'react';
import * as Recharts from 'recharts';
import { AuditRecord, ActionItem } from '../types';
import { 
  Trophy, 
  ClipboardList, 
  BarChart3,
  Database,
  TrendingUp,
  AlertTriangle,
  Target
} from 'lucide-react';

interface DashboardProps {
  records: AuditRecord[];
  actions: ActionItem[];
  onViewConsolidated: () => void;
  onViewActions: () => void;
  onGenerateDemo?: () => void;
}

const StatCard = ({ label, value, color, icon: Icon }: any) => (
  <div className="bg-[#1e293b] p-5 rounded-2xl border border-gray-800">
    <div className="flex justify-between items-start mb-2">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
      {Icon && <Icon className={`w-4 h-4 ${color}`} />}
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

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  const safeRecords = useMemo(() => {
    return Array.isArray(records)
      ? records.filter(r => r && typeof r.score === 'number')
      : [];
  }, [records]);

  const safeActions = useMemo(() => {
    return Array.isArray(actions) ? actions : [];
  }, [actions]);

  const stats = useMemo(() => {
    if (safeRecords.length === 0) return null;

    const areaMap: Record<string, { total: number; count: number }> = {};

    safeRecords.forEach(r => {
      if (!areaMap[r.area]) {
        areaMap[r.area] = { total: 0, count: 0 };
      }
      areaMap[r.area].total += r.score;
      areaMap[r.area].count += 1;
    });

    const chartData = Object.entries(areaMap).map(([name, s]) => ({
      name: name.length > 20 ? name.slice(0, 18) + '…' : name,
      score: Math.round(s.total / s.count)
    }));

    const avg =
      Math.round(
        safeRecords.reduce((a, r) => a + r.score, 0) / safeRecords.length
      );

    return {
      chartData,
      averageScore: avg,
      openActions: safeActions.filter(a => a.status !== 'CLOSED').length,
      closedActions: safeActions.filter(a => a.status === 'CLOSED').length,
      pieData: [
        { name: 'Cumplimiento', value: avg },
        { name: 'Brecha', value: 100 - avg }
      ]
    };
  }, [safeRecords, safeActions]);

  if (!ready) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-gray-500">Cargando indicadores…</p>
      </div>
    );
  }

  if (!stats || stats.chartData.length === 0) {
    return (
      <div className="text-center py-24">
        <BarChart3 className="w-20 h-20 mx-auto text-gray-600 mb-4" />
        <p className="text-gray-400">No hay datos para mostrar</p>
        {onGenerateDemo && (
          <button
            onClick={onGenerateDemo}
            className="mt-6 px-6 py-3 bg-blue-600 rounded-xl text-white"
          >
            <Database className="inline w-4 h-4 mr-2" />
            Generar demo
          </button>
        )}
      </div>
    );
  }

  const { chartData, averageScore, openActions, closedActions, pieData } = stats;

  const barColor = (v: number) =>
    v >= 85 ? '#22c55e' : v >= 70 ? '#eab308' : '#ef4444';

  return (
    <div className="space-y-8 pb-24">
      <h2 className="text-3xl font-black flex items-center gap-3">
        <TrendingUp className="text-blue-500" /> Dashboard de Planta
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Auditorías" value={safeRecords.length} color="text-blue-400" icon={ClipboardList} />
        <StatCard label="Promedio" value={`${averageScore}%`} color="text-green-400" icon={Target} />
        <StatCard label="Pendientes" value={openActions} color="text-red-400" icon={AlertTriangle} />
        <StatCard label="Cerradas" value={closedActions} color="text-purple-400" icon={Trophy} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* PIE */}
        <div className="bg-[#1e293b] p-6 rounded-2xl flex flex-col items-center">
          <h3 className="text-xs uppercase mb-4 text-gray-400">Nivel Global</h3>

          <Recharts.ResponsiveContainer width={300} height={300}>
            <Recharts.PieChart>
              <Recharts.Pie
                data={pieData}
                dataKey="value"
                innerRadius={80}
                outerRadius={120}
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                <Recharts.Cell fill={barColor(averageScore)} />
                <Recharts.Cell fill="#0f172a" />
              </Recharts.Pie>
            </Recharts.PieChart>
          </Recharts.ResponsiveContainer>

          <p className="text-4xl font-black mt-[-170px]">{averageScore}%</p>
        </div>

        {/* BAR */}
        <div className="lg:col-span-2 bg-[#1e293b] p-6 rounded-2xl">
          <h3 className="text-sm mb-4 uppercase text-gray-400">
            Desempeño por Área
          </h3>

          <Recharts.ResponsiveContainer width={700} height={300}>
            <Recharts.BarChart data={chartData} layout="vertical">
              <Recharts.XAxis type="number" domain={[0, 100]} hide />
              <Recharts.YAxis type="category" dataKey="name" width={120} />
              <Recharts.Bar dataKey="score" radius={[0, 6, 6, 0]}>
                {chartData.map((d, i) => (
                  <Recharts.Cell key={i} fill={barColor(d.score)} />
                ))}
              </Recharts.Bar>
            </Recharts.BarChart>
          </Recharts.ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={onViewConsolidated} className="p-6 bg-[#1e293b] rounded-2xl">
          <BarChart3 className="w-6 h-6 text-blue-400 mb-2" />
          Análisis Consolidado
        </button>
        <button onClick={onViewActions} className="p-6 bg-[#1e293b] rounded-2xl">
          <ClipboardList className="w-6 h-6 text-purple-400 mb-2" />
          Plan de Acciones
        </button>
      </div>
    </div>
  );
};
