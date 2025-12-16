import React from 'react';
import { AuditRecord, Rating } from '../types';
import { QUESTIONS } from '../constants';
import { TrendingDown, TrendingUp, AlertOctagon, CheckCircle2, BarChart3, ArrowLeft, MapPin } from 'lucide-react';

interface ConsolidatedViewProps {
  records: AuditRecord[];
  onBack: () => void;
}

export const ConsolidatedView: React.FC<ConsolidatedViewProps> = ({ records, onBack }) => {
  const questionStats = QUESTIONS.map(q => {
    let totalPoints = 0;
    let maxPoints = 0;
    records.forEach(record => {
      const answer = record.answers.find(a => a.questionId === q.id);
      if (answer) {
        if (answer.rating === Rating.SI) { totalPoints += 1; maxPoints += 1; }
        else if (answer.rating === Rating.PARCIAL) { totalPoints += 0.5; maxPoints += 1; }
        else if (answer.rating === Rating.NO) { maxPoints += 1; }
      }
    });
    const percentage = maxPoints === 0 ? 0 : Math.round((totalPoints / maxPoints) * 100);
    return { ...q, percentage, count: maxPoints };
  });

  const activeQuestions = questionStats.filter(q => q.count > 0);
  const topLowestQuestions = [...activeQuestions].sort((a, b) => a.percentage - b.percentage).slice(0, 5);
  const topHighestQuestions = [...activeQuestions].sort((a, b) => b.percentage - a.percentage).slice(0, 5);

  const areaMap: Record<string, { totalScore: number; count: number }> = {};
  records.forEach(r => {
    if (!areaMap[r.area]) {
      areaMap[r.area] = { totalScore: 0, count: 0 };
    }
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

  return (
    <div className="space-y-8 mb-24 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-[#1e293b] rounded-full transition-colors text-gray-400 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Análisis Consolidado</h2>
          <p className="text-sm text-gray-500">Desglose de cumplimiento por áreas y preguntas críticas.</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" /> Rendimiento por Áreas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Worst Areas */}
            <div className="bg-[#1e293b] rounded-xl shadow-lg border border-red-900/30 overflow-hidden">
            <div className="p-4 border-b border-red-900/30 bg-red-900/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-red-100">Áreas Críticas</h3>
                </div>
            </div>
            <div className="p-4 space-y-4">
                {topLowestAreas.length > 0 ? (
                topLowestAreas.map((item) => (
                    <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-300">{item.name}</span>
                        <span className="font-bold text-red-400">{item.average}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full transition-all duration-500" style={{ width: `${item.average}%` }}></div>
                    </div>
                    </div>
                ))
                ) : <p className="text-gray-500 text-sm">Sin datos suficientes.</p>}
            </div>
            </div>

            {/* Best Areas */}
            <div className="bg-[#1e293b] rounded-xl shadow-lg border border-green-900/30 overflow-hidden">
            <div className="p-4 border-b border-green-900/30 bg-green-900/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h3 className="font-bold text-green-100">Áreas Destacadas</h3>
                </div>
            </div>
            <div className="p-4 space-y-4">
                {topHighestAreas.length > 0 ? (
                topHighestAreas.map((item) => (
                    <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-300">{item.name}</span>
                        <span className="font-bold text-green-400">{item.average}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${item.average}%` }}></div>
                    </div>
                    </div>
                ))
                ) : <p className="text-gray-500 text-sm">Sin datos suficientes.</p>}
            </div>
            </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-orange-500" /> Análisis de Hallazgos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1e293b] rounded-xl shadow-lg border border-red-900/30 overflow-hidden">
            <div className="p-4 border-b border-red-900/30 bg-red-900/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-red-100">Mayor Incumplimiento</h3>
                </div>
            </div>
            <div className="p-4 space-y-5">
                {topLowestQuestions.length > 0 ? (
                topLowestQuestions.map((item) => (
                    <div key={item.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-300 flex-1 pr-4" title={item.text}>{item.id}. {item.text}</span>
                        <span className="font-bold text-red-400 flex-shrink-0">{item.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2.5">
                        <div className="bg-red-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${item.percentage}%` }}></div>
                    </div>
                    </div>
                ))
                ) : <p className="text-center text-gray-500 py-4">No hay datos suficientes.</p>}
            </div>
            </div>

            <div className="bg-[#1e293b] rounded-xl shadow-lg border border-green-900/30 overflow-hidden">
            <div className="p-4 border-b border-green-900/30 bg-green-900/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h3 className="font-bold text-green-100">Mayor Cumplimiento</h3>
                </div>
            </div>
            <div className="p-4 space-y-5">
                {topHighestQuestions.length > 0 ? (
                topHighestQuestions.map((item) => (
                    <div key={item.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-300 flex-1 pr-4" title={item.text}>{item.id}. {item.text}</span>
                        <span className="font-bold text-green-400 flex-shrink-0">{item.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2.5">
                        <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${item.percentage}%` }}></div>
                    </div>
                    </div>
                ))
                ) : <p className="text-center text-gray-500 py-4">No hay datos suficientes.</p>}
            </div>
            </div>
        </div>
      </div>
    </div>
  );
};