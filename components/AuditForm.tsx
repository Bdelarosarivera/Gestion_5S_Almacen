import React, { useState, useEffect } from 'react';
import { Rating, Answer, AuditRecord, AppConfig, ActionItem } from '../types';
import { Save, User, MapPin, ClipboardCheck, Calendar, UserCircle, X } from 'lucide-react';

interface AuditFormProps {
  initialData?: AuditRecord | null;
  config: AppConfig;
  onSave: (record: AuditRecord, newActions: ActionItem[]) => void;
  onCancel: () => void;
}

export const AuditForm: React.FC<AuditFormProps> = ({ initialData, config, onSave, onCancel }) => {
  const [area, setArea] = useState(config.areas[0] || '');
  const [auditor, setAuditor] = useState('');
  const [responsable, setResponsable] = useState('');
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
  const [answers, setAnswers] = useState<Record<number, Rating>>({});

  useEffect(() => {
    if (initialData) {
      setArea(initialData.area);
      setAuditor(initialData.auditor);
      setResponsable(initialData.responsable || getResponsableForArea(initialData.area));
      setAuditDate(initialData.date.split('T')[0]);
      const loadedAnswers: Record<number, Rating> = {};
      initialData.answers.forEach(a => { loadedAnswers[a.questionId] = a.rating; });
      setAnswers(loadedAnswers);
    } else {
      if (config.areas.length > 0) {
        const defaultArea = config.areas[0];
        setArea(defaultArea);
        setResponsable(getResponsableForArea(defaultArea));
      }
      setAuditDate(new Date().toISOString().split('T')[0]);
      const savedAuditor = localStorage.getItem('last_auditor_name');
      if (savedAuditor) setAuditor(savedAuditor);
    }
  }, [initialData, config]);

  useEffect(() => {
    if (!initialData || (initialData && area !== initialData.area)) {
       setResponsable(getResponsableForArea(area));
    }
  }, [area, initialData, config.responsables]);

  const getResponsableForArea = (areaName: string) => {
    const found = config.responsables.find(r => r.area === areaName);
    return found ? found.name : '';
  };

  const handleRatingChange = (questionId: number, rating: Rating) => {
    setAnswers(prev => ({ ...prev, [questionId]: rating }));
  };

  const calculateScore = () => {
    let totalPoints = 0;
    let maxPoints = 0;
    Object.values(answers).forEach(rating => {
      if (rating === Rating.SI) { totalPoints += 1; maxPoints += 1; }
      else if (rating === Rating.PARCIAL) { totalPoints += 0.5; maxPoints += 1; }
      else if (rating === Rating.NO) { maxPoints += 1; }
    });
    return maxPoints === 0 ? 0 : Math.round((totalPoints / maxPoints) * 100);
  };

  const currentScore = calculateScore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditor.trim()) { alert("Por favor ingrese el nombre del auditor"); return; }
    localStorage.setItem('last_auditor_name', auditor);

    const answerList: Answer[] = Object.entries(answers).map(([qId, rating]) => ({
      questionId: parseInt(qId),
      rating: rating as Rating
    }));

    const newId = initialData ? initialData.id : crypto.randomUUID();
    const [year, month, day] = auditDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); 

    const record: AuditRecord = {
      id: newId, area, auditor, responsable, date: dateObj.toISOString(), answers: answerList, score: currentScore,
    };

    const newActions: ActionItem[] = [];
    if (!initialData) { 
        answerList.forEach(ans => {
            // REQUERIMIENTO: Solo generar plan de acción para respuestas "NO"
            if (ans.rating === Rating.NO) {
                const q = config.questions.find(q => q.id === ans.questionId);
                if (q) {
                    const dueDate = new Date(dateObj); 
                    dueDate.setDate(dueDate.getDate() + 7);
                    newActions.push({
                        id: crypto.randomUUID(),
                        auditId: newId,
                        area: area,
                        questionId: q.id,
                        questionText: q.text,
                        issueType: 'NO',
                        suggestedAction: `Corregir hallazgo: "${q.text}"`,
                        responsable: responsable,
                        dueDate: dueDate.toISOString(),
                        status: 'PENDING',
                        createdAt: new Date().toISOString()
                    });
                }
            }
        });
    }
    onSave(record, newActions);
  };

  const getRatingColorClass = (rating: Rating, isSelected: boolean) => {
    if (!isSelected) return 'bg-[#0f172a] border-gray-700 text-gray-500 hover:bg-gray-800';
    switch (rating) {
      case Rating.SI: return 'bg-green-600 border-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]';
      case Rating.NO: return 'bg-red-600 border-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]';
      case Rating.PARCIAL: return 'bg-yellow-500 border-yellow-500 text-white shadow-[0_0_10px_rgba(234,179,8,0.3)]';
      case Rating.NA: return 'bg-gray-600 border-gray-600 text-white';
      default: return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto mb-24 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-100">Nueva Auditoría</h2>
        <div className={`px-4 py-2 rounded-xl font-bold text-lg border ${
            currentScore >= 90 ? 'bg-green-900/20 text-green-400 border-green-500/30' :
            currentScore >= 70 ? 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30' :
            'bg-red-900/20 text-red-400 border-red-500/30'
        }`}>
            {currentScore}% pts
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[#1e293b] rounded-2xl shadow-xl border border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Fecha de Auditoría
              </label>
              <input type="date" value={auditDate} onChange={(e) => setAuditDate(e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" /> Área a Evaluar
              </label>
              <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full bg-[#0f172a] border border-gray-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none">
                {config.areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-purple-400" /> Responsable del Área
              </label>
              <input type="text" value={responsable} readOnly className="w-full bg-[#0f172a]/50 border border-gray-800 text-gray-400 rounded-xl p-3 font-medium cursor-not-allowed" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" /> Nombre del Auditor
              </label>
              <input type="text" value={auditor} onChange={(e) => setAuditor(e.target.value)} placeholder="Su nombre completo" className="w-full bg-[#0f172a] border border-gray-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {config.questions.map((q, index) => (
            <div key={q.id} className="bg-[#1e293b] p-5 rounded-2xl border border-gray-800 shadow-sm transition-all hover:bg-[#1e293b]/80">
              <p className="text-gray-200 font-medium mb-4 flex gap-3">
                <span className="text-blue-500 font-bold">{index + 1}.</span> {q.text}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 ml-6">
                {Object.values(Rating).map((rating) => (
                  <button key={rating} type="button" onClick={() => handleRatingChange(q.id, rating)} className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${getRatingColorClass(rating, answers[q.id] === rating)}`}>
                    {rating}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4 sticky bottom-20 z-10 p-2 bg-[#0f172a]/80 backdrop-blur rounded-2xl border border-gray-800 shadow-2xl">
          <button type="button" onClick={onCancel} className="px-6 py-3 bg-[#1e293b] border border-gray-700 text-gray-300 rounded-xl hover:bg-gray-800 font-bold transition-all flex items-center gap-2">
            <X className="w-5 h-5" /> Cancelar
          </button>
          <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
            <Save className="w-5 h-5" /> Guardar Auditoría
          </button>
        </div>
      </form>
    </div>
  );
};