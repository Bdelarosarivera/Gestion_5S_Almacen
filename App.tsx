import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, AuditRecord, ActionItem, AppConfig, Rating } from './types';
import { QUESTIONS, AREA_MAPPING, AREAS } from './constants';
import { AuditForm } from './components/AuditForm';
import { Dashboard } from './components/Dashboard';
import { History } from './components/History';
import { AIEditor } from './components/AIEditor';
import { ConsolidatedView } from './components/ConsolidatedView';
import { ActionPlanView } from './components/ActionPlanView';
import { SettingsView } from './components/SettingsView';
import { 
  ClipboardList, 
  Plus, 
  FileText, 
  BarChart, 
  Settings, 
  Home, 
  Camera,
  Loader2,
  ListChecks,
  Lock,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  subscribeToAuth, 
  handleFirestoreError,
  OperationType 
} from './services/firebaseService';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { User } from 'firebase/auth';

const DEFAULT_CONFIG: AppConfig = {
  questions: QUESTIONS,
  areas: AREAS,
  responsables: AREA_MAPPING.map(am => ({ name: am.responsable, area: am.area }))
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [editingRecord, setEditingRecord] = useState<AuditRecord | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Estado de Autenticación Firebase
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Sincronización en tiempo real con Firestore
  useEffect(() => {
    const unsubscribeAuth = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setIsInitializing(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    setIsSyncing(true);
    
    // Listen to Audits
    const qAudits = query(collection(db, 'audits'));
    const unsubscribeAudits = onSnapshot(qAudits, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as AuditRecord);
      setRecords(docs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setIsInitializing(false);
      setIsSyncing(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'audits');
      setIsSyncing(false);
    });

    // Listen to Actions
    const qActions = query(collection(db, 'actions'));
    const unsubscribeActions = onSnapshot(qActions, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as ActionItem);
      setActions(docs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'actions');
    });

    // Listen to Config
    const configDocRef = doc(db, 'config', 'global_config');
    const unsubscribeConfig = onSnapshot(configDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data() as AppConfig);
      } else {
        // Si no existe la config global, la creamos con los valores por defecto
        saveConfigToFirebase(DEFAULT_CONFIG);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/global_config');
    });

    return () => {
      unsubscribeAudits();
      unsubscribeActions();
      unsubscribeConfig();
    };
  }, [user]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError('');
    try {
      await loginWithGoogle();
    } catch (error: any) {
      console.error("Login detail:", error);
      if (error.code === 'auth/unauthorized-domain') {
        setLoginError('Error: Este dominio no está autorizado en Firebase. Añada su URL de Render a la consola de Firebase.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setLoginError('La ventana de inicio de sesión fue cerrada.');
      } else {
        setLoginError(`Error al iniciar sesión: ${error.message || 'Verifique su conexión'}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setView('home');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const saveAuditToFirebase = async (record: AuditRecord, newActions: ActionItem[]) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const batch = writeBatch(db);
      
      // Save Record
      const recordWithUser = { ...record, userId: user.uid };
      const recordRef = doc(db, 'audits', record.id);
      batch.set(recordRef, recordWithUser);

      // Save Actions
      newActions.forEach(action => {
        const actionWithUser = { ...action, userId: user.uid };
        const actionRef = doc(db, 'actions', action.id);
        batch.set(actionRef, actionWithUser);
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'audits/actions');
    } finally {
      setIsSyncing(false);
    }
  };

  const updateActionStatusInFirebase = async (action: ActionItem) => {
    if (!user) return;
    try {
      const actionRef = doc(db, 'actions', action.id);
      await setDoc(actionRef, { ...action, userId: user.uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `actions/${action.id}`);
    }
  };

  const deleteActionFromFirebase = async (actionId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'actions', actionId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `actions/${actionId}`);
    }
  };

  const deleteRecordFromFirebase = async (recordId: string) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'audits', recordId));
      
      // Delete associated actions too
      const actionsToDelete = actions.filter(a => a.auditId === recordId);
      actionsToDelete.forEach(a => {
        batch.delete(doc(db, 'actions', a.id));
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `audits/${recordId}`);
    }
  };

  const saveConfigToFirebase = async (newConfig: AppConfig) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'config', 'global_config'), { ...newConfig, userId: user.uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/global_config');
    }
  };

  const handleSaveAudit = useCallback((record: AuditRecord, newActions: ActionItem[]) => {
    saveAuditToFirebase(record, newActions);
    setView('dashboard');
  }, [user, actions]);

  const handleUpdateAction = useCallback((updatedAction: ActionItem) => {
    updateActionStatusInFirebase(updatedAction);
  }, [user]);

  const handleDeleteAction = useCallback((actionId: string) => {
    deleteActionFromFirebase(actionId);
  }, [user]);

  const handleDeleteRecord = useCallback((id: string) => {
    deleteRecordFromFirebase(id);
  }, [user, actions]);

  const handleUpdateConfig = useCallback((newConfig: AppConfig) => {
    setConfig(newConfig);
    saveConfigToFirebase(newConfig);
  }, [user]);

  const handleClearActions = useCallback(() => {
    setActions([]);
  }, []);

  const handleClearHistory = useCallback(() => {
    setRecords([]);
    setActions([]);
  }, []);

  const generateDemo = () => {
    const demo = config.areas.slice(0, 8).map((area, i) => ({
      id: `demo-${i}-${Date.now()}`,
      area,
      auditor: 'Admin Demo',
      responsable: config.responsables.find(r => r.area === area)?.name || 'N/A',
      date: new Date().toISOString(),
      score: 70 + Math.floor(Math.random() * 25),
      answers: config.questions.map(q => ({ questionId: q.id, rating: Rating.SI }))
    }));
    setRecords(demo);
    setView('dashboard');
  };

  const NavIcon = ({ active, onClick, icon: Icon, title }: any) => (
    <button 
      type="button"
      onClick={onClick} 
      title={title}
      className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[9px] font-bold uppercase tracking-tighter sm:hidden">{title}</span>
    </button>
  );

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-blue-500 font-black tracking-widest text-[10px] uppercase">Verificando Sesión de Google...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 flex flex-col">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div 
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center p-4 bg-[#0f172a] z-[100]"
          >
            <div className="w-full max-w-sm bg-[#1e293b] p-8 rounded-3xl border border-gray-800 shadow-2xl space-y-8">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/10 rounded-2xl border border-blue-500/20 mb-4">
                  <Lock className="w-8 h-8 text-blue-500" />
                </div>
                <h1 className="text-3xl font-black tracking-tighter">Audit<span className="text-blue-500">Check</span></h1>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest text-center">Gestión Pro 5S</p>
              </div>

              <div className="space-y-4">
                <p className="text-gray-400 text-sm text-center">Inicie sesión para sincronizar sus auditorías en la nube y acceder desde cualquier dispositivo.</p>
                
                {loginError && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                    <p className="text-red-400 text-[10px] font-bold text-center uppercase tracking-wider leading-relaxed">{loginError}</p>
                  </div>
                )}

                <p className="text-gray-500 text-[9px] text-center uppercase tracking-tight">
                  Si tiene problemas, use el botón de abrir en nueva pestaña (arriba a la derecha ↗)
                </p>

                <button 
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full bg-white text-gray-900 p-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-gray-100 disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    <LogIn className="w-5 h-5" />
                  )}
                  Google Login
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col min-h-screen"
          >
            <header className="bg-[#1e293b]/90 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('home')}>
                  <div className="bg-blue-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                    <ClipboardList className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-xl font-black tracking-tighter">Audit<span className="text-blue-500">Check</span></h1>
                </div>
                <nav className="flex items-center gap-1 sm:gap-2">
                  <NavIcon active={view === 'home'} onClick={() => setView('home')} icon={Home} title="Inicio" />
                  <NavIcon active={view === 'form'} onClick={() => { setEditingRecord(null); setView('form'); }} icon={Plus} title="Auditar" />
                  <NavIcon active={view === 'dashboard' || view === 'consolidated'} onClick={() => setView('dashboard')} icon={BarChart} title="Métricas" />
                  <NavIcon active={view === 'actions'} onClick={() => setView('actions')} icon={ListChecks} title="Planes" />
                  <NavIcon active={view === 'history'} onClick={() => setView('history')} icon={FileText} title="Historial" />
                  <NavIcon active={view === 'ai-editor'} onClick={() => setView('ai-editor')} icon={Camera} title="IA" />
                  <NavIcon active={view === 'settings'} onClick={() => setView('settings')} icon={Settings} title="Ajustes" />
                  {isSyncing && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full animate-pulse">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">Nube</span>
                    </div>
                  )}
                  <button 
                    onClick={handleLogout}
                    title="Cerrar Sesión"
                    className="p-2.5 rounded-xl text-gray-500 hover:bg-red-600/10 hover:text-red-400 transition-all flex flex-col items-center gap-1"
                  >
                    <Lock className="w-5 h-5" />
                    <span className="text-[9px] font-bold uppercase tracking-tighter sm:hidden">Salir</span>
                  </button>
                </nav>
              </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-1">
              {view === 'home' && (
                <div className="max-w-xl mx-auto py-12 space-y-8 animate-fade-in">
                  <div className="text-center space-y-2">
                      <h2 className="text-5xl font-black text-white leading-tight">Gestión Operativa <br/><span className="text-blue-500 underline decoration-blue-500/30">Sin Papel</span></h2>
                      <p className="text-gray-500 text-lg">Digitalice sus auditorías 5S y controle su planta en tiempo real.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                      <button type="button" onClick={() => { setEditingRecord(null); setView('form'); }} className="flex items-center justify-between p-8 bg-[#1e293b] border border-green-500/20 rounded-3xl hover:border-green-500/50 hover:bg-[#1e293b]/80 transition-all shadow-xl group">
                          <div className="flex items-center gap-6">
                              <div className="bg-green-600/10 p-4 rounded-2xl group-hover:bg-green-600/20 transition-colors">
                                  <Plus className="w-10 h-10 text-green-500" />
                              </div>
                              <div className="text-left">
                                  <p className="text-2xl font-black text-white">Nueva Auditoría</p>
                                  <p className="text-sm text-gray-500">Iniciar inspección de área ahora</p>
                              </div>
                          </div>
                      </button>
                      <div className="grid grid-cols-2 gap-4">
                          <button type="button" onClick={() => setView('dashboard')} className="p-6 bg-[#1e293b] border border-blue-500/20 rounded-3xl hover:border-blue-500/50 transition-all text-left">
                              <BarChart className="w-8 h-8 text-blue-500 mb-4" />
                              <p className="text-lg font-bold">Indicadores</p>
                              <p className="text-xs text-gray-500">Métricas de planta</p>
                          </button>
                          <button type="button" onClick={() => setView('actions')} className="p-6 bg-[#1e293b] border border-amber-500/20 rounded-3xl hover:border-amber-500/50 transition-all text-left">
                              <ListChecks className="w-8 h-8 text-amber-500 mb-4" />
                              <p className="text-lg font-bold">Planes de Acción</p>
                              <p className="text-xs text-gray-500">Hallazgos y tareas</p>
                          </button>
                      </div>
                  </div>
                </div>
              )}
              {view === 'form' && <AuditForm initialData={editingRecord} config={config} onSave={handleSaveAudit} onCancel={() => setView('home')} />}
              {view === 'dashboard' && <Dashboard records={records} actions={actions} onViewConsolidated={() => setView('consolidated')} onViewActions={() => setView('actions')} onGenerateDemo={generateDemo} />}
              {view === 'history' && <History records={records} actions={actions} onEdit={(r) => { setEditingRecord(r); setView('form'); }} onDelete={handleDeleteRecord} onClearHistory={handleClearHistory} />}
              {view === 'consolidated' && <ConsolidatedView records={records} onBack={() => setView('dashboard')} />}
              {view === 'actions' && (
                <ActionPlanView 
                  actions={actions} 
                  onUpdateAction={handleUpdateAction} 
                  onDeleteAction={handleDeleteAction} 
                  onClearActions={handleClearActions} 
                />
              )}
              {view === 'settings' && <SettingsView config={config} onUpdateConfig={handleUpdateConfig} />}
              {view === 'ai-editor' && <AIEditor />}
            </main>

            <footer className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-800 w-full opacity-30 text-center">
              <p className="text-[10px] font-bold tracking-widest uppercase">AuditCheck Pro v2.5 - Acceso Rápido Habilitado</p>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
