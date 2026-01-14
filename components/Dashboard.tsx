import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as Recharts from 'recharts';
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
  ChevronDown
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
  
  // Estados de Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedArea, setSelectedArea] = useState('ALL');

  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 200);
    return () => clearTimeout(timer);
  }, [records.length]);

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

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedArea('ALL');
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

  // Si no hay stats por los filtros pero si hay registros generales
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
              </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl border border-gray-800 p-8 shadow-2xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8">Desempeño por Área (%)</h3>
          <div className="w-full" style={{ height: '300px' }}>
            <Recharts.ResponsiveContainer width="100%" height="100%">
              <Recharts.BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 60 }}>
                <Recharts.XAxis type="number" domain={[0, 100]} hide />
                <Recharts.YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11, fill: '#f1f5f9'}} axisLine={false} tickLine={false} />
                <Recharts.Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} 
                />
                <Recharts.Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={24}>
                    {chartData.map((entry, index) => <Recharts.Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />)}
                    <Recharts.LabelList 
                      dataKey="score" 
                      position="right" 
                      formatter={(val: number) => `${val}%`} 
                      style={{ fill: '#f1f5f9', fontSize: '11px', fontWeight: 'bold' }} 
                      offset={10}
                    />
                </Recharts.Bar>
              </Recharts.BarChart>
            </Recharts.ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};