import React, { useState, useEffect, ErrorInfo, ReactNode } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  getDoc,
  Timestamp,
  orderBy,
  limit,
  getDocFromServer,
  setDoc
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { db, auth } from './firebase';
import { AppUser, AppConfig, Barbero, Cita, Producto, Venta, Servicio } from './types';
import { 
  Calendar, 
  Users, 
  Package, 
  BarChart3, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  LogOut,
  Scissors,
  DollarSign,
  Clock,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Briefcase,
  Filter,
  Search,
  TrendingUp,
  Settings,
  Pencil,
  Sun,
  Moon,
  Monitor,
  Shield,
  UserPlus,
  Lock,
  Unlock,
  Clock3,
  ChevronDown,
  ChevronUp,
  Save,
  LayoutDashboard
} from 'lucide-react';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  parseISO, 
  addHours, 
  addMinutes, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfWeek, 
  endOfWeek,
  eachHourOfInterval,
  eachMinuteOfInterval,
  isSameDay,
  addDays,
  setHours,
  setMinutes,
  isSameHour,
  differenceInMinutes
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LabelList
} from 'recharts';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx';

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<any, any> {
  state: any;
  props: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Algo salió mal.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error) errorMessage = `Error de Base de Datos: ${parsed.error}`;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Error Inesperado</h2>
            <p className="text-slate-600 mb-8">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const formatCurrency = (val: number) => {
  return '$' + new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(val));
};

// --- Components ---

// 1. Sidebar/Navigation
const Sidebar = ({ activeTab, setActiveTab, user, userProfile, onLogout, theme, toggleTheme }: { 
  activeTab: string, 
  setActiveTab: (t: string) => void, 
  user: User | null, 
  userProfile: AppUser | null, 
  onLogout: () => void,
  theme: 'light' | 'dark' | 'system',
  toggleTheme: () => void
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'citas', label: 'Citas', icon: Calendar, permiso: 'citas' },
    { id: 'servicios', label: 'Servicios', icon: Briefcase, permiso: 'servicios' },
    { id: 'barberos', label: 'Barberos', icon: Users, permiso: 'barberos' },
    { id: 'inventario', label: 'Inventario', icon: Package, permiso: 'inventario' },
    { id: 'reportes', label: 'Reportes', icon: BarChart3, permiso: 'reportes' },
    { id: 'configuracion', label: 'Configuración', icon: Settings, permiso: 'configuracion' },
  ];

  const filteredTabs = tabs.filter(tab => {
    if (tab.permiso) return userProfile?.rol === 'administrador' || userProfile?.permisos?.[tab.permiso as keyof typeof userProfile.permisos] !== false;
    return true;
  });

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col border-r border-slate-800">
      <div className="p-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-xl font-light tracking-[0.2em] text-white leading-none">ALTUM</span>
            <div className="w-full h-[0.5px] bg-white/40 my-1"></div>
            <span className="text-[0.6rem] font-medium tracking-[0.4em] text-white/80 leading-none">STUDIO</span>
          </div>
        </div>
        <button 
          onClick={toggleTheme}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          title="Cambiar Tema"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {filteredTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === tab.id 
                ? 'bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </nav>

      {user && (
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-slate-700" />
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{userProfile?.nombre || user.displayName}</p>
              <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                {userProfile?.rol === 'administrador' ? <Shield className="w-3 h-3 text-primary" /> : <Users className="w-3 h-3 text-slate-400" />}
                {userProfile?.rol || 'Invitado'}
              </p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
};

// Componente de Modal de Confirmación
const Dashboard = ({ setActiveTab }: { setActiveTab: (t: string) => void }) => {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [barberos, setBarberos] = useState<Barbero[]>([]);

  useEffect(() => {
    const unsubCitas = onSnapshot(collection(db, 'citas'), (snap) => {
      setCitas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cita)));
    });
    const unsubVentas = onSnapshot(collection(db, 'ventas'), (snap) => {
      setVentas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venta)));
    });
    const unsubProd = onSnapshot(collection(db, 'productos'), (snap) => {
      setProductos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto)));
    });
    const unsubBarberos = onSnapshot(collection(db, 'barberos'), (snap) => {
      setBarberos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Barbero)));
    });
    return () => { unsubCitas(); unsubVentas(); unsubProd(); unsubBarberos(); };
  }, []);

  const today = startOfDay(new Date());
  const endOfToday = endOfDay(new Date());

  const citasHoy = citas.filter(c => {
    const d = parseISO(c.start_time);
    return d >= today && d <= endOfToday && c.status !== 'cancelada';
  });

  const ventasHoy = ventas.filter(v => {
    const d = parseISO(v.fecha);
    return d >= today && d <= endOfToday;
  });

  const revenueHoy = citasHoy.filter(c => c.status === 'completada').reduce((acc, c) => acc + (c.precio || 0), 0) +
                     ventasHoy.reduce((acc, v) => acc + v.total, 0);

  const lowStock = productos.filter(p => p.stock < p.alerta_minima);

  // Weekly Revenue Data
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const d = startOfDay(addDays(new Date(), - (6 - i)));
    const e = endOfDay(d);
    
    const dayCitas = citas.filter(c => {
      const cd = parseISO(c.start_time);
      return cd >= d && cd <= e && c.status === 'completada';
    });
    
    const dayVentas = ventas.filter(v => {
      const vd = parseISO(v.fecha);
      return vd >= d && vd <= e;
    });
    
    const total = dayCitas.reduce((acc, c) => acc + (c.precio || 0), 0) +
                  dayVentas.reduce((acc, v) => acc + v.total, 0);
                  
    return {
      name: format(d, 'EEE', { locale: es }),
      total
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Panel de Control</h2>
        <p className="text-slate-500 mt-1">Resumen del día y alertas importantes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => setActiveTab('citas')}
            className="flex items-center justify-center gap-3 p-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <Calendar className="w-5 h-5" />
            Nueva Cita
          </button>
          <button 
            onClick={() => setActiveTab('inventario')}
            className="flex items-center justify-center gap-3 p-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
          >
            <DollarSign className="w-5 h-5" />
            Nueva Venta
          </button>
          <button 
            onClick={() => setActiveTab('barberos')}
            className="flex items-center justify-center gap-3 p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Users className="w-5 h-5" />
            Equipo
          </button>
          <button 
            onClick={() => setActiveTab('reportes')}
            className="flex items-center justify-center gap-3 p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <BarChart3 className="w-5 h-5" />
            Reportes
          </button>
        </div>

        {/* Revenue Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-2xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left">Ingresos Hoy</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white text-left">{formatCurrency(revenueHoy)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-green-600">
            <TrendingUp className="w-3 h-3" />
            <span>Actualizado en tiempo real</span>
          </div>
        </div>

        {/* Appointments Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left">Citas Hoy</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white text-left">{citasHoy.length}</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('citas')}
            className="text-xs font-bold text-primary hover:opacity-80 flex items-center gap-1"
          >
            Ver calendario <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Low Stock Card */}
        <div className={`bg-white dark:bg-slate-900 p-6 rounded-[2rem] border shadow-sm ${lowStock.length > 0 ? 'border-red-200 dark:border-red-900/50' : 'border-slate-200 dark:border-slate-800'}`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-2xl ${lowStock.length > 0 ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left">Stock Bajo</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white text-left">{lowStock.length}</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('inventario')}
            className={`text-xs font-bold flex items-center gap-1 ${lowStock.length > 0 ? 'text-red-600 hover:text-red-700' : 'text-slate-400 hover:text-slate-500'}`}
          >
            Ver inventario <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Active Barbers Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left">Barberos Activos</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white text-left">{barberos.filter(b => b.activo).length}</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('barberos')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Gestionar equipo <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Proximas Citas */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Próximas Citas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {citasHoy.filter(c => c.status === 'pendiente').sort((a, b) => a.start_time.localeCompare(b.start_time)).slice(0, 6).map(c => (
              <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-center min-w-[60px]">
                    <p className="text-xs font-black text-slate-900 dark:text-white">{format(parseISO(c.start_time), 'HH:mm')}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{c.cliente}</p>
                    <p className="text-xs text-slate-500">{c.servicio_nombre}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400">{barberos.find(b => b.id === c.barbero_id)?.nombre}</p>
                </div>
              </div>
            ))}
            {citasHoy.filter(c => c.status === 'pendiente').length === 0 && (
              <div className="col-span-full py-8 text-center">
                <p className="text-slate-400 italic">No hay citas pendientes para hoy.</p>
              </div>
            )}
          </div>
        </div>

        {/* Alertas de Inventario */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Alertas de Stock
          </h3>
          <div className="space-y-4">
            {lowStock.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-500/20">
                    <Package className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-red-700 dark:text-red-400">{p.nombre}</p>
                    <p className="text-xs text-red-600/70">Quedan {p.stock} unidades</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('inventario')}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-all"
                >
                  Reponer
                </button>
              </div>
            ))}
            {lowStock.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-slate-400 italic">Todo el inventario está al día.</p>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Revenue Chart */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Ingresos de la Semana
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }} 
                  tickFormatter={(val) => `$${val/1000}k`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                  formatter={(val: number) => [formatCurrency(val), 'Ingresos']}
                />
                <Bar 
                  dataKey="total" 
                  fill="var(--primary)" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente de Modal de Confirmación
const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  type = 'danger'
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string,
  confirmText?: string,
  cancelText?: string,
  type?: 'danger' | 'warning' | 'info'
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-primary hover:opacity-90 text-primary-foreground',
    info: 'bg-slate-900 hover:bg-slate-800 text-white'
  };

  const icons = {
    danger: <AlertTriangle className="w-6 h-6 text-red-600" />,
    warning: <AlertTriangle className="w-6 h-6 text-primary" />,
    info: <CheckCircle2 className="w-6 h-6 text-slate-900" />
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-2xl ${type === 'danger' ? 'bg-red-50' : type === 'warning' ? 'bg-primary/10' : 'bg-slate-50'}`}>
              {icons[type]}
            </div>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          </div>
          <p className="text-slate-600 leading-relaxed">
            {message}
          </p>
        </div>
        <div className="bg-slate-50 p-4 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors ${colors[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Servicios Manager
const ServiciosManager = () => {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [duracion, setDuracion] = useState('30');
  const [comisionTipo, setComisionTipo] = useState<'porcentaje' | 'monto'>('porcentaje');
  const [comisionValor, setComisionValor] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Estado para el modal de eliminación
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string | null, nombre: string }>({
    isOpen: false,
    id: null,
    nombre: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'servicios'), (snap) => {
      setServicios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Servicio)));
    });
    return unsub;
  }, []);

  const resetForm = () => {
    setNombre('');
    setPrecio('');
    setDuracion('30');
    setComisionTipo('porcentaje');
    setComisionValor('');
    setEditingId(null);
  };

  const handleEdit = (s: Servicio) => {
    setEditingId(s.id);
    setNombre(s.nombre);
    setPrecio(s.precio.toString());
    setDuracion(s.duracion.toString());
    setComisionTipo(s.comision_tipo || 'porcentaje');
    setComisionValor(s.comision_valor?.toString() || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precio) return;
    try {
      const data = {
        nombre,
        precio: parseFloat(precio),
        duracion: parseInt(duracion),
        comision_tipo: comisionTipo,
        comision_valor: parseFloat(comisionValor) || 0
      };

      if (editingId) {
        await updateDoc(doc(db, 'servicios', editingId), data);
      } else {
        await addDoc(collection(db, 'servicios'), data);
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'servicios');
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteDoc(doc(db, 'servicios', deleteModal.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `servicios/${deleteModal.id}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ConfirmationModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={confirmDelete}
        title="¿Eliminar Servicio?"
        message={`¿Estás seguro de que deseas eliminar el servicio "${deleteModal.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Catálogo de Servicios</h2>
        <p className="text-slate-500 mt-1">Define los servicios, precios y comisiones de la barbería.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={addServicio} className={`bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border ${editingId ? 'border-primary ring-2 ring-primary/10' : 'border-slate-200 dark:border-slate-800'} space-y-4 sticky top-8 transition-all`}>
            <h3 className="text-lg font-semibold mb-2 dark:text-white">{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
            {editingId && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-bold uppercase mb-4 inline-block">
                Modo Edición Activo
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Servicio</label>
              <input 
                type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                placeholder="Ej. Corte de Cabello"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio ($)</label>
                <input 
                  type="number" step="0.01" required value={precio} onChange={e => setPrecio(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duración (min)</label>
                <input 
                  type="number" required value={duracion} onChange={e => setDuracion(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Configuración de Comisión</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                  <select 
                    value={comisionTipo} onChange={e => setComisionTipo(e.target.value as 'porcentaje' | 'monto')}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="monto">Monto Fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Valor</label>
                  <input 
                    type="number" step="0.01" required value={comisionValor} onChange={e => setComisionValor(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                    placeholder={comisionTipo === 'porcentaje' ? "Ej. 20" : "Ej. 500"}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {editingId && (
                <button 
                  type="button" onClick={resetForm}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button 
                type="submit"
                className={`flex-[2] ${editingId ? 'bg-primary text-primary-foreground' : 'bg-slate-900 text-white'} py-3 rounded-xl font-semibold hover:opacity-90 transition-colors flex items-center justify-center gap-2`}
              >
                {editingId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingId ? 'Guardar Cambios' : 'Agregar Servicio'}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {servicios.map(s => (
            <div key={s.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between group hover:border-primary transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{s.nombre}</h4>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {s.duracion} min
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleEdit(s)}
                    className="text-slate-400 hover:text-primary p-2 rounded-lg hover:bg-primary/10 transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteModal({ isOpen: true, id: s.id, nombre: s.nombre })}
                    className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                <div className="flex flex-col">
                  <span className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(s.precio)}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Precio</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-primary">
                    {s.comision_tipo === 'porcentaje' ? `${s.comision_valor}%` : formatCurrency(s.comision_valor || 0)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Comisión</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 3. Barberos Manager
const BarberosManager = () => {
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [nombre, setNombre] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estado para el modal de eliminación
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string | null, nombre: string }>({
    isOpen: false,
    id: null,
    nombre: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'barberos'), (snap) => {
      setBarberos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Barbero)));
    });
    return unsub;
  }, []);

  const resetForm = () => {
    setNombre('');
    setEspecialidad('');
    setEditingId(null);
  };

  const handleEdit = (b: Barbero) => {
    setEditingId(b.id);
    setNombre(b.nombre);
    setEspecialidad(b.especialidad);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addBarbero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !especialidad) return;
    try {
      const data = {
        nombre,
        especialidad,
        activo: editingId ? barberos.find(b => b.id === editingId)?.activo ?? true : true
      };

      if (editingId) {
        await updateDoc(doc(db, 'barberos', editingId), data);
      } else {
        await addDoc(collection(db, 'barberos'), data);
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'barberos');
    }
  };

  const toggleActivo = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'barberos', id), { activo: !current });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `barberos/${id}`);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteDoc(doc(db, 'barberos', deleteModal.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `barberos/${deleteModal.id}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ConfirmationModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={confirmDelete}
        title="¿Eliminar Barbero?"
        message={`¿Estás seguro de que deseas eliminar al barbero "${deleteModal.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Gestión de Barberos</h2>
          <p className="text-slate-500 mt-1">Administra el personal de tu barbería.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={addBarbero} className={`bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border ${editingId ? 'border-primary ring-2 ring-primary/10' : 'border-slate-200 dark:border-slate-800'} space-y-4 sticky top-8 transition-all`}>
            <h3 className="text-lg font-semibold mb-2 dark:text-white">{editingId ? 'Editar Barbero' : 'Nuevo Barbero'}</h3>
            {editingId && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-bold uppercase mb-4 inline-block">
                Modo Edición Activo
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={e => setNombre(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="Ej. Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Especialidad</label>
              <input 
                type="text" 
                value={especialidad} 
                onChange={e => setEspecialidad(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="Ej. Fade, Barba, Clásico"
              />
            </div>
            <div className="flex gap-2 pt-2">
              {editingId && (
                <button 
                  type="button" onClick={resetForm}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-3 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button 
                type="submit"
                className={`flex-[2] ${editingId ? 'bg-primary text-primary-foreground' : 'bg-slate-900 text-white'} py-3 rounded-xl font-semibold hover:opacity-90 transition-colors flex items-center justify-center gap-2`}
              >
                {editingId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingId ? 'Guardar Cambios' : 'Agregar Barbero'}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {barberos.map(b => (
            <div key={b.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between group hover:border-primary transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{b.nombre}</h4>
                    <p className="text-sm text-slate-500">{b.especialidad}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleEdit(b)}
                    className="text-slate-400 hover:text-primary p-2 rounded-lg hover:bg-primary/10 transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteModal({ isOpen: true, id: b.id, nombre: b.nombre })}
                    className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${b.activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {b.activo ? 'ACTIVO' : 'INACTIVO'}
                </span>
                <button 
                  onClick={() => toggleActivo(b.id, b.activo)}
                  className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                    b.activo ? 'text-slate-500 hover:bg-slate-50' : 'text-primary hover:bg-primary/10'
                  }`}
                >
                  {b.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 4. Citas Manager
const CitasManager = ({ config }: { config: AppConfig }) => {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [barberoFilter, setBarberoFilter] = useState('all');

  // Form State
  const [cliente, setCliente] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [barberoId, setBarberoId] = useState('');
  const [startTime, setStartTime] = useState('');

  // Completion Modal State
  const [extraServicios, setExtraServicios] = useState<string[]>([]);
  const [selectedProductos, setSelectedProductos] = useState<{ id: string, cantidad: number }[]>([]);
  const [finalTotal, setFinalTotal] = useState(0);

  useEffect(() => {
    const unsubCitas = onSnapshot(collection(db, 'citas'), (snap) => {
      setCitas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cita)));
    });
    const unsubBarberos = onSnapshot(collection(db, 'barberos'), (snap) => {
      setBarberos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Barbero)).filter(b => b.activo));
    });
    const unsubServicios = onSnapshot(collection(db, 'servicios'), (snap) => {
      setServicios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Servicio)));
    });
    const unsubProductos = onSnapshot(collection(db, 'productos'), (snap) => {
      setProductos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto)));
    });
    return () => { unsubCitas(); unsubBarberos(); unsubServicios(); unsubProductos(); };
  }, []);

  useEffect(() => {
    if (selectedCita) {
      const basePrice = selectedCita.precio || 0;
      const extrasPrice = extraServicios.reduce((acc, sId) => {
        const s = servicios.find(serv => serv.id === sId);
        return acc + (s?.precio || 0);
      }, 0);
      const productsPrice = selectedProductos.reduce((acc, pItem) => {
        const p = productos.find(prod => prod.id === pItem.id);
        return acc + ((p?.precio || 0) * pItem.cantidad);
      }, 0);
      setFinalTotal(basePrice + extrasPrice + productsPrice);
    }
  }, [selectedCita, extraServicios, selectedProductos, servicios, productos]);

  const checkOverlap = (newStart: string, newEnd: string, bId: string) => {
    const start = parseISO(newStart);
    const end = parseISO(newEnd);
    
    return citas.some(c => {
      if (c.barbero_id !== bId || c.status === 'cancelada') return false;
      const cStart = parseISO(c.start_time);
      const cEnd = parseISO(c.end_time);
      // Overlap if (start < cEnd && end > cStart)
      return (start < cEnd && end > cStart);
    });
  };

  const addCita = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedServicio = servicios.find(s => s.id === servicioId);
    if (!cliente || !servicioId || !barberoId || !startTime || !selectedServicio) return;

    const start = parseISO(startTime);
    const end = addMinutes(start, selectedServicio.duracion);
    const endISO = end.toISOString();

    if (checkOverlap(startTime, endISO, barberoId)) {
      alert('Error: El barbero ya tiene una cita en ese horario.');
      return;
    }

    try {
      await addDoc(collection(db, 'citas'), {
        cliente,
        servicio_id: servicioId,
        servicio_nombre: selectedServicio.nombre,
        precio: selectedServicio.precio,
        barbero_id: barberoId,
        start_time: startTime,
        end_time: endISO,
        status: 'pendiente'
      });

      const barbero = barberos.find(b => b.id === barberoId);
      console.log('Google Calendar JSON:', JSON.stringify({
        summary: `[${barbero?.nombre}] ${selectedServicio.nombre} - ${cliente}`,
        start: { dateTime: startTime },
        end: { dateTime: endISO }
      }));

      setShowModal(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'citas');
    }
  };

  const resetForm = () => {
    setCliente('');
    setServicioId('');
    setBarberoId('');
    setStartTime('');
  };

  const updateStatus = async (id: string, status: string) => {
    if (status === 'completada') {
      const cita = citas.find(c => c.id === id);
      if (cita) {
        setSelectedCita(cita);
        setExtraServicios([]);
        setSelectedProductos([]);
        setShowCompleteModal(true);
        return;
      }
    }
    try {
      await updateDoc(doc(db, 'citas', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `citas/${id}`);
    }
  };

  const confirmCompletion = async () => {
    if (!selectedCita) return;
    
    const extraNombres = extraServicios.map(sId => servicios.find(s => s.id === sId)?.nombre).filter(Boolean);
    const productNombres = selectedProductos.map(pItem => {
      const p = productos.find(prod => prod.id === pItem.id);
      return p ? `${p.nombre} (x${pItem.cantidad})` : '';
    }).filter(Boolean);
    
    const finalNombre = [selectedCita.servicio_nombre, ...extraNombres, ...productNombres].join(' + ');

    try {
      // 1. Update Appointment
      await updateDoc(doc(db, 'citas', selectedCita.id), { 
        status: 'completada',
        precio: finalTotal,
        servicio_nombre: finalNombre
      });

      // 2. Register Product Sales and Update Stock
      for (const pItem of selectedProductos) {
        const product = productos.find(p => p.id === pItem.id);
        if (product) {
          // Record Sale
          await addDoc(collection(db, 'ventas'), {
            producto_id: product.id,
            cantidad: pItem.cantidad,
            total: product.precio * pItem.cantidad,
            fecha: new Date().toISOString(),
            barbero_id: selectedCita.barbero_id // Assigned barber gets the sale
          });

          // Update Stock
          await updateDoc(doc(db, 'productos', product.id), {
            stock: product.stock - pItem.cantidad
          });
        }
      }

      setShowCompleteModal(false);
      setSelectedCita(null);
      setSelectedProductos([]);
      setExtraServicios([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `citas/${selectedCita.id}`);
    }
  };

  const openAddModal = (time: string, bId: string) => {
    setStartTime(format(parseISO(time), "yyyy-MM-dd'T'HH:mm"));
    setBarberoId(bId);
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Agenda de Citas</h2>
          <p className="text-slate-500 mt-1">Gestiona los turnos del día.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 gap-2 shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={barberoFilter} 
              onChange={e => setBarberoFilter(e.target.value)}
              className="text-xs font-bold text-slate-600 outline-none bg-transparent cursor-pointer min-w-[120px]"
            >
              <option value="all">Todos los Barberos</option>
              {barberos.map(b => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1">
            <button 
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              CALENDARIO
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              LISTA
            </button>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nueva Cita
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView 
          citas={citas.filter(c => barberoFilter === 'all' || c.barbero_id === barberoFilter)} 
          barberos={barberos.filter(b => barberoFilter === 'all' || b.id === barberoFilter)} 
          config={config} 
          onAddCita={openAddModal}
          onUpdateStatus={updateStatus}
          currentDate={selectedDate}
          setCurrentDate={setSelectedDate}
        />
      ) : (
        <div className="space-y-6">
          {/* List View Header with Date Selection */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold text-slate-900 capitalize">
                {format(selectedDate, "MMMM yyyy", { locale: es })}
              </h3>
              <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl p-1">
                <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
                <button onClick={() => setSelectedDate(new Date())} className="px-3 text-[10px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-wider">HOY</button>
                <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                {format(selectedDate, "EEEE d", { locale: es })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {citas
              .filter(c => isSameDay(parseISO(c.start_time), selectedDate))
              .filter(c => barberoFilter === 'all' || c.barbero_id === barberoFilter)
              .length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">No hay citas agendadas para este día o barbero.</p>
              </div>
            ) : (
              citas
                .filter(c => isSameDay(parseISO(c.start_time), selectedDate))
                .filter(c => barberoFilter === 'all' || c.barbero_id === barberoFilter)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map(c => {
                const barbero = barberos.find(b => b.id === c.barbero_id);
                return (
                  <div key={c.id} className={`bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border-l-4 flex items-center justify-between transition-all hover:shadow-md ${
                    c.status === 'completada' ? 'border-l-green-500' : 
                    c.status === 'cancelada' ? 'border-l-red-500' : 'border-l-primary'
                  }`}>
                    <div className="flex items-center gap-6">
                      <div className="text-center min-w-[80px]">
                        <p className="text-lg font-bold text-slate-900">{format(parseISO(c.start_time), 'HH:mm')}</p>
                        <p className="text-xs text-slate-400 uppercase font-bold">{format(parseISO(c.end_time), 'HH:mm')}</p>
                      </div>
                      <div className="h-10 w-px bg-slate-100"></div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg">{c.cliente}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md font-medium">{c.servicio_nombre}</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(c.precio || 0)}</span>
                          <span className="text-sm text-slate-400 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {barbero?.nombre || 'Barbero no asignado'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.status === 'pendiente' && (
                        <>
                          <button 
                            onClick={() => updateStatus(c.id, 'completada')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                            title="Completar"
                          >
                            <CheckCircle2 className="w-6 h-6" />
                          </button>
                          <button 
                            onClick={() => updateStatus(c.id, 'cancelada')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-6 h-6" />
                          </button>
                        </>
                      )}
                      <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        c.status === 'completada' ? 'bg-green-100 text-green-700' : 
                        c.status === 'cancelada' ? 'bg-red-100 text-red-700' : 'bg-primary/10 text-primary'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                );
              })
          )}
          </div>
        </div>
      )}

      {/* Modal Completar Cita */}
      {showCompleteModal && selectedCita && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">Finalizar Cita</h3>
              <button onClick={() => setShowCompleteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">CLIENTE</p>
                    <p className="text-lg font-bold text-slate-900">{selectedCita.cliente}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">BARBERO</p>
                    <p className="text-sm font-bold text-slate-700">
                      {barberos.find(b => b.id === selectedCita.barbero_id)?.nombre || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200/50">
                  <p className="text-sm text-slate-500">Servicio original: <span className="font-bold text-slate-700">{selectedCita.servicio_nombre}</span> <span className="ml-2 font-bold text-slate-900">({formatCurrency(selectedCita.precio)})</span></p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  ¿Agregar servicios adicionales?
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {servicios.filter(s => s.id !== selectedCita.servicio_id).map(s => (
                    <label key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={extraServicios.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) setExtraServicios([...extraServicios, s.id]);
                            else setExtraServicios(extraServicios.filter(id => id !== s.id));
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-slate-700">{s.nombre}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(s.precio)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  ¿Agregar productos?
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {productos.map(p => {
                    const selected = selectedProductos.find(item => item.id === p.id);
                    return (
                      <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selected ? 'border-primary/20 bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={!!selected}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedProductos([...selectedProductos, { id: p.id, cantidad: 1 }]);
                              else setSelectedProductos(selectedProductos.filter(item => item.id !== p.id));
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-700">{p.nombre}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{formatCurrency(p.precio)} • Stock: {p.stock}</p>
                          </div>
                        </div>
                        {selected && (
                          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
                            <button 
                              onClick={() => {
                                if (selected.cantidad > 1) {
                                  setSelectedProductos(selectedProductos.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad - 1 } : item));
                                }
                              }}
                              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{selected.cantidad}</span>
                            <button 
                              onClick={() => {
                                if (selected.cantidad < p.stock) {
                                  setSelectedProductos(selectedProductos.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
                                }
                              }}
                              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-slate-900">Total a Pagar</span>
                  <span className="text-2xl font-black text-primary">{formatCurrency(finalTotal)}</span>
                </div>
                <button 
                  onClick={confirmCompletion}
                  className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Confirmar y Finalizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Cita */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">Agendar Nueva Cita</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={addCita} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cliente</label>
                <input 
                  type="text" required value={cliente} onChange={e => setCliente(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Servicio</label>
                <select 
                  required value={servicioId} onChange={e => setServicioId(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">Seleccionar servicio...</option>
                  {servicios.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre} ({formatCurrency(s.precio)} - {s.duracion}min)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Barbero</label>
                  <select 
                    required value={barberoId} onChange={e => setBarberoId(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">Seleccionar barbero...</option>
                    {barberos.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha y Hora</label>
                  <input 
                    type="datetime-local" required value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                  />
                  {startTime && servicioId && (
                    <p className="text-[10px] text-primary mt-1 font-black uppercase tracking-wider flex items-center gap-1">
                      <Clock3 className="w-3 h-3" />
                      Finaliza aprox: {format(addMinutes(parseISO(startTime), servicios.find(s => s.id === servicioId)?.duracion || 0), 'HH:mm')}
                    </p>
                  )}
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                Confirmar Cita
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// 4. Inventario Manager
const InventarioManager = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [nombre, setNombre] = useState('');
  const [stock, setStock] = useState('0');
  const [precio, setPrecio] = useState('0');
  const [alerta, setAlerta] = useState('5');
  const [imagen, setImagen] = useState<string | undefined>(undefined);
  const [comisionTipo, setComisionTipo] = useState<'porcentaje' | 'monto'>('porcentaje');
  const [comisionValor, setComisionValor] = useState('0');

  // Modal de eliminación
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string | null, nombre: string }>({
    isOpen: false,
    id: null,
    nombre: ''
  });

  // Stock Add State
  const [stockToAdd, setStockToAdd] = useState('0');

  // Sale State
  const [saleCantidad, setSaleCantidad] = useState('1');
  const [saleBarberoId, setSaleBarberoId] = useState('');

  useEffect(() => {
    const unsubProd = onSnapshot(collection(db, 'productos'), (snap) => {
      setProductos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto)));
    });
    const unsubBarberos = onSnapshot(collection(db, 'barberos'), (snap) => {
      setBarberos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Barbero)).filter(b => b.activo));
    });
    return () => { unsubProd(); unsubBarberos(); };
  }, []);

  const addProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        nombre,
        stock: parseInt(stock),
        precio: parseFloat(precio),
        alerta_minima: parseInt(alerta),
        imagen,
        comision_tipo: comisionTipo,
        comision_valor: parseFloat(comisionValor)
      };

      if (editingId) {
        await updateDoc(doc(db, 'productos', editingId), data);
      } else {
        await addDoc(collection(db, 'productos'), data);
      }
      
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'productos');
    }
  };

  const resetForm = () => {
    setNombre(''); 
    setStock('0'); 
    setPrecio('0'); 
    setAlerta('5');
    setImagen(undefined);
    setComisionTipo('porcentaje');
    setComisionValor('0');
    setEditingId(null);
  };

  const handleEdit = (p: Producto) => {
    setEditingId(p.id);
    setNombre(p.nombre);
    setStock(p.stock.toString());
    setPrecio(p.precio.toString());
    setAlerta(p.alerta_minima.toString());
    setImagen(p.imagen);
    setComisionTipo(p.comision_tipo || 'porcentaje');
    setComisionValor((p.comision_valor || 0).toString());
    setShowAddModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteDoc(doc(db, 'productos', deleteModal.id));
      setDeleteModal({ ...deleteModal, isOpen: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `productos/${deleteModal.id}`);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagen(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const registerSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !saleBarberoId) return;

    const cant = parseInt(saleCantidad);
    if (selectedProduct.stock < cant) {
      alert('Error: Stock insuficiente.');
      return;
    }

    const total = selectedProduct.precio * cant;

    try {
      // 1. Record Sale
      await addDoc(collection(db, 'ventas'), {
        producto_id: selectedProduct.id,
        cantidad: cant,
        total,
        fecha: new Date().toISOString(),
        barbero_id: saleBarberoId
      });

      // 2. Update Stock
      await updateDoc(doc(db, 'productos', selectedProduct.id), {
        stock: selectedProduct.stock - cant
      });

      setShowSaleModal(false);
      setSaleCantidad('1');
      setSaleBarberoId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ventas/productos');
    }
  };

  const addStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const amount = parseInt(stockToAdd);
    if (isNaN(amount) || amount <= 0) return;

    try {
      await updateDoc(doc(db, 'productos', selectedProduct.id), {
        stock: selectedProduct.stock + amount
      });
      setShowStockModal(false);
      setStockToAdd('0');
      setSelectedProduct(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `productos/${selectedProduct.id}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ConfirmationModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={confirmDelete}
        title="¿Eliminar Producto?"
        message={`¿Estás seguro de que deseas eliminar el producto "${deleteModal.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Inventario y Ventas</h2>
          <p className="text-slate-500 mt-1">Control de stock y registro de ventas directas.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productos.map(p => (
          <div key={p.id} className={`bg-white p-6 rounded-3xl shadow-sm border-2 transition-all hover:shadow-lg ${
            p.stock < p.alerta_minima ? 'border-red-100 bg-red-50/30' : 'border-slate-100'
          }`}>
            <div className="flex justify-between items-start mb-4">
              <div className="relative">
                <div className="p-3 bg-slate-100 rounded-2xl text-slate-600 w-14 h-14 flex items-center justify-center overflow-hidden">
                  {p.imagen ? (
                    <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Package className="w-6 h-6" />
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex gap-1 mb-2">
                  <button 
                    onClick={() => handleEdit(p)}
                    className="text-slate-400 hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteModal({ isOpen: true, id: p.id, nombre: p.nombre })}
                    className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-900">{formatCurrency(p.precio)}</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Precio Unit.</p>
                </div>
              </div>
            </div>

            <h4 className="text-xl font-bold text-slate-900 mb-1">{p.nombre}</h4>
            
            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-500 uppercase">Stock Disponible</span>
                  <span className={p.stock < p.alerta_minima ? 'text-red-600' : 'text-slate-900'}>{p.stock} unidades</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${p.stock < p.alerta_minima ? 'bg-red-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min((p.stock / (p.alerta_minima * 3)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {p.stock < p.alerta_minima && (
              <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-100 px-3 py-2 rounded-xl text-sm font-bold animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                Reposición Necesaria
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button 
                onClick={() => { setSelectedProduct(p); setShowStockModal(true); }}
                className="bg-slate-100 text-slate-900 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Stock
              </button>
              <button 
                onClick={() => { setSelectedProduct(p); setShowSaleModal(true); }}
                className="bg-primary text-primary-foreground py-3 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/20"
              >
                <DollarSign className="w-4 h-4" />
                Venta
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Agregar Stock */}
      {showStockModal && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Reponer Stock</h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedProduct.nombre}</p>
                </div>
              </div>
              <button onClick={() => setShowStockModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={addStock} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-slate-500">Stock Actual:</span>
                <span className="text-lg font-bold text-slate-900">{selectedProduct.stock} unidades</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad a Agregar</label>
                <input 
                  type="number" required min="1" value={stockToAdd} onChange={e => setStockToAdd(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none text-lg font-bold"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" onClick={() => setShowStockModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-[2] bg-primary text-primary-foreground py-4 rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                  Confirmar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Producto */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editingId ? 'Editar Producto' : 'Agregar al Inventario'}</h3>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={addProducto} className="p-6 space-y-4">
              <div className="flex justify-center mb-4">
                <div className="relative group">
                  <div className="w-24 h-24 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                    {imagen ? (
                      <img src={imagen} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Package className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                    <Plus className="w-6 h-6 text-white" />
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Producto</label>
                <input 
                  type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Ej. Cera Mate"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{editingId ? 'Stock Actual' : 'Stock Inicial'}</label>
                  <input 
                    type="number" required value={stock} onChange={e => setStock(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio ($)</label>
                  <input 
                    type="number" step="0.01" required value={precio} onChange={e => setPrecio(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alerta Stock Mínimo</label>
                <input 
                  type="number" required value={alerta} onChange={e => setAlerta(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Configuración de Comisión</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                    <select 
                      value={comisionTipo} onChange={e => setComisionTipo(e.target.value as 'porcentaje' | 'monto')}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="porcentaje">Porcentaje (%)</option>
                      <option value="monto">Monto Fijo ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Valor</label>
                    <input 
                      type="number" step="0.01" required value={comisionValor} onChange={e => setComisionValor(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                      placeholder={comisionTipo === 'porcentaje' ? "Ej. 20" : "Ej. 500"}
                    />
                  </div>
                </div>
              </div>
              <button 
                type="submit"
                className={`w-full ${editingId ? 'bg-primary text-primary-foreground' : 'bg-slate-900 text-white'} py-4 rounded-2xl font-bold hover:opacity-90 transition-all mt-4`}
              >
                {editingId ? 'Guardar Cambios' : 'Guardar Producto'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Venta */}
      {showSaleModal && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Registrar Venta</h3>
              <button onClick={() => setShowSaleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={registerSale} className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mb-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Producto seleccionado:</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedProduct.nombre}</p>
                <p className="text-sm font-medium text-primary">Precio: {formatCurrency(selectedProduct.precio)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Barbero que vende</label>
                <select 
                  required value={saleBarberoId} onChange={e => setSaleBarberoId(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {barberos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cantidad</label>
                <input 
                  type="number" min="1" max={selectedProduct.stock} required 
                  value={saleCantidad} onChange={e => setSaleCantidad(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Total a cobrar:</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(selectedProduct.precio * parseInt(saleCantidad))}</span>
              </div>
              <button 
                type="submit"
                className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 transition-all mt-4 shadow-lg shadow-green-600/20"
              >
                Confirmar Venta
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// 6. Configuracion Manager
const ConfiguracionManager = ({ config, setConfig, userProfile, setActiveTab }: { config: AppConfig, setConfig: (c: AppConfig) => void, userProfile: AppUser | null, setActiveTab: (t: string) => void }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRol, setNewUserRol] = useState<'administrador' | 'barbero'>('barbero');
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'app_users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
    });
    return unsub;
  }, []);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const saveConfig = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateDoc(doc(db, 'app_config', 'global'), {
        theme: localConfig.theme,
        preset: localConfig.preset,
        startHour: localConfig.startHour,
        endHour: localConfig.endHour
      });
      setConfig(localConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'app_config/global');
    } finally {
      setSaving(false);
    }
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;
    try {
      await addDoc(collection(db, 'app_users'), {
        nombre: newUserName,
        email: newUserEmail,
        rol: newUserRol,
        permisos: {
          citas: true,
          servicios: true,
          barberos: true,
          inventario: true,
          reportes: true,
          configuracion: true
        }
      });
      setNewUserName('');
      setNewUserEmail('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'app_users');
    }
  };

  const togglePermiso = async (userId: string, permiso: string, current: boolean) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      // If we are toggling a permission for an admin, we should probably warn or just allow it
      // but usually admins should have all permissions.
      await updateDoc(doc(db, 'app_users', userId), {
        [`permisos.${permiso}`]: !current
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `app_users/${userId}`);
    }
  };

  const toggleRol = async (userId: string, currentRol: string) => {
    if (userId === userProfile?.id) {
      alert('No puedes cambiar tu propio rol.');
      return;
    }
    
    const newRol = currentRol === 'administrador' ? 'barbero' : 'administrador';
    const confirmMsg = `¿Cambiar el rol de este usuario a ${newRol}?`;
    
    if (confirm(confirmMsg)) {
      try {
        const updateData: any = { rol: newRol };
        // If promoting to admin, ensure all permissions are true
        if (newRol === 'administrador') {
          updateData.permisos = {
            citas: true,
            servicios: true,
            barberos: true,
            inventario: true,
            reportes: true,
            configuracion: true
          };
        }
        await updateDoc(doc(db, 'app_users', userId), updateData);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `app_users/${userId}`);
      }
    }
  };

  const deleteUser = async (id: string) => {
    if (id === userProfile?.id) {
      alert('No puedes eliminar tu propia cuenta desde aquí.');
      return;
    }

    const userToDelete = users.find(u => u.id === id);
    if (userToDelete?.email === 'cristian.floresg.app@gmail.com') {
      alert('El administrador principal no puede ser eliminado.');
      return;
    }

    if (confirm('¿Eliminar este usuario?')) {
      try {
        await deleteDoc(doc(db, 'app_users', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `app_users/${id}`);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Configuración</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ajustes globales y gestión de accesos.</p>
        </div>
        <button 
          onClick={() => setActiveTab('citas')}
          className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold text-sm"
        >
          <X className="w-4 h-4" />
          Cerrar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Preferencias Generales */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 flex flex-col">
          <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
            <Settings className="w-5 h-5 text-primary" />
            Preferencias de la App
          </h3>
          
          <div className="space-y-6 flex-1">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Estilo de Color (Presets)</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'default', label: 'Clásico Ámbar', color: 'bg-[#f59e0b]' },
                  { id: 'altum', label: 'Altum Gold', color: 'bg-[#E2D1A1]' },
                  { id: 'royal', label: 'Royal Blue', color: 'bg-blue-600' },
                  { id: 'vintage', label: 'Vintage Wood', color: 'bg-[#78350f]' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setLocalConfig({ ...localConfig, preset: p.id as any })}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 relative ${
                      localConfig.preset === p.id 
                        ? 'bg-slate-50 dark:bg-slate-800 border-primary shadow-sm' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full ${p.color} border border-black/10`}></div>
                    <span className={`text-xs font-bold ${localConfig.preset === p.id ? 'text-primary' : 'text-slate-500'}`}>{p.label}</span>
                    {localConfig.preset === p.id && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Tema Visual</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'light', label: 'Claro', icon: Sun },
                  { id: 'dark', label: 'Oscuro', icon: Moon },
                  { id: 'system', label: 'Sistema', icon: Monitor }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setLocalConfig({ ...localConfig, theme: t.id as any })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 relative group ${
                      localConfig.theme === t.id 
                        ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10 scale-[1.02]' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {localConfig.theme === t.id && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5 animate-in zoom-in duration-300">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                    )}
                    <t.icon className={`w-6 h-6 transition-transform duration-500 ${localConfig.theme === t.id ? 'scale-110 rotate-3' : 'group-hover:scale-110'}`} />
                    <span className="text-xs font-bold uppercase tracking-wider">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Rango Horario del Calendario</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 mb-1 block">Hora Inicio</span>
                  <select 
                    value={localConfig.startHour} 
                    onChange={e => setLocalConfig({ ...localConfig, startHour: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    {Array.from({length: 24}).map((_, i) => (
                      <option key={i} value={i}>{i}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-xs text-slate-400 mb-1 block">Hora Fin</span>
                  <select 
                    value={localConfig.endHour} 
                    onChange={e => setLocalConfig({ ...localConfig, endHour: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    {Array.from({length: 24}).map((_, i) => (
                      <option key={i} value={i}>{i}:00</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {saved && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 animate-in fade-in slide-in-from-left-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Cambios guardados</span>
                </div>
              )}
            </div>
            <button 
              onClick={saveConfig}
              disabled={saving}
              className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all shadow-xl ${
                saving 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                  : 'bg-primary text-primary-foreground hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        {/* Gestión de Usuarios */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
            <UserPlus className="w-5 h-5 text-primary" />
            Usuarios y Roles
          </h3>

          <form onSubmit={addUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="text" placeholder="Nombre" required value={newUserName} onChange={e => setNewUserName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <input 
                type="email" placeholder="Email" required value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="flex gap-4">
              <select 
                value={newUserRol} onChange={e => setNewUserRol(e.target.value as any)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="barbero">Barbero</option>
                <option value="administrador">Administrador</option>
              </select>
              <button type="submit" className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/10">
                Agregar
              </button>
            </div>
          </form>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {users.map(u => (
              <div key={u.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{u.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleRol(u.id, u.rol)}
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase transition-all hover:scale-105 ${u.rol === 'administrador' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'}`}
                    >
                      {u.rol}
                    </button>
                    <button onClick={() => deleteUser(u.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {Object.entries(u.permisos).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => togglePermiso(u.id, key, val as boolean)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        val ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30' : 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                      }`}
                    >
                      {val ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {key.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 7. Calendar View
const CalendarView = ({ citas, barberos, config, onAddCita, onUpdateStatus, currentDate, setCurrentDate }: { 
  citas: Cita[], 
  barberos: Barbero[], 
  config: AppConfig,
  onAddCita: (time: string, barberoId: string) => void,
  onUpdateStatus: (id: string, status: string) => void,
  currentDate: Date,
  setCurrentDate: (d: Date) => void
}) => {
  const slots = eachMinuteOfInterval({
    start: setHours(startOfDay(currentDate), config.startHour),
    end: setHours(startOfDay(currentDate), config.endHour)
  }, { step: 30 });

  const isSlotOccupied = (slotStart: Date, barberoId: string) => {
    const slotEnd = addMinutes(slotStart, 30);
    return citas.some(c => {
      if (c.barbero_id !== barberoId || c.status === 'cancelada') return false;
      const start = parseISO(c.start_time);
      const end = parseISO(c.end_time);
      return (start < slotEnd && end > slotStart);
    });
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
      {/* Calendar Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-slate-900 capitalize">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </h3>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1">
            <button onClick={() => setCurrentDate(addDays(currentDate, -1))} className="p-1.5 hover:bg-slate-50 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs font-bold text-slate-600 hover:text-slate-900">HOY</button>
            <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-1.5 hover:bg-slate-50 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
            {format(currentDate, "EEEE d", { locale: es })}
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto relative">
        <div className="flex min-w-[800px]">
          {/* Time Column */}
          <div className="w-20 sticky left-0 bg-white z-20 border-r border-slate-100">
            <div className="h-12 border-b border-slate-100"></div>
            {slots.map(slot => (
              <div key={slot.toISOString()} className="h-12 border-b border-slate-50 flex items-start justify-center pt-1">
                {slot.getMinutes() === 0 && (
                  <span className="text-[10px] font-black text-slate-400">{format(slot, 'HH:mm')}</span>
                )}
              </div>
            ))}
          </div>

          {/* Barber Columns */}
          {barberos.map(barbero => (
            <div key={barbero.id} className="flex-1 border-r border-slate-100 last:border-r-0">
              <div className="h-12 border-b border-slate-100 flex items-center justify-center bg-slate-50/30 sticky top-0 z-10 backdrop-blur-sm">
                <span className="text-xs font-bold text-slate-700">{barbero.nombre}</span>
              </div>
              
              <div className="relative">
                {slots.map(slot => {
                  const occupied = isSlotOccupied(slot, barbero.id);
                  return (
                    <div 
                      key={slot.toISOString()} 
                      className={`h-12 border-b border-slate-50 group relative transition-colors ${
                        occupied ? 'bg-slate-50/50 cursor-not-allowed' : 'hover:bg-slate-50/50 cursor-pointer'
                      }`}
                      onClick={() => !occupied && onAddCita(slot.toISOString(), barbero.id)}
                    >
                      {!occupied && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      {occupied && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/30">
                          <Lock className="w-3 h-3 text-slate-300 mb-0.5" />
                          <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">OCUPADO</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Appointments Overlay */}
                {citas.filter(c => c.barbero_id === barbero.id && isSameDay(parseISO(c.start_time), currentDate)).map(cita => {
                  const start = parseISO(cita.start_time);
                  const end = parseISO(cita.end_time);
                  const startMinutes = start.getHours() * 60 + start.getMinutes();
                  const calendarStartMinutes = config.startHour * 60;
                  const top = ((startMinutes - calendarStartMinutes) / 60) * 96; 
                  const height = (differenceInMinutes(end, start) / 60) * 96;

                  if (start.getHours() < config.startHour || start.getHours() > config.endHour) return null;

                  return (
                    <div 
                      key={cita.id}
                      className={`absolute left-1 right-1 rounded-xl p-2 shadow-sm border-l-4 overflow-hidden transition-all hover:scale-[1.02] hover:z-30 cursor-pointer ${
                        cita.status === 'completada' ? 'bg-green-50 dark:bg-green-950/30 border-green-500 text-green-700 dark:text-green-400' :
                        cita.status === 'cancelada' ? 'bg-red-50 dark:bg-red-950/30 border-red-500 text-red-700 dark:text-red-400 opacity-50' :
                        'bg-primary/10 border-primary text-primary-foreground dark:text-primary'
                      }`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (cita.status === 'pendiente') {
                          onUpdateStatus(cita.id, 'completada');
                        }
                      }}
                    >
                      <p className="text-[10px] font-black leading-none mb-1">{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</p>
                      <p className="text-xs font-bold truncate">{cita.cliente}</p>
                      <p className="text-[10px] opacity-70 truncate">{cita.servicio_nombre}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Reportes = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [range, setRange] = useState<'diario' | 'semanal' | 'mensual'>('mensual');
  
  // Filtros
  const [filterBarbero, setFilterBarbero] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'servicios' | 'productos'>('all');

  useEffect(() => {
    const unsubVentas = onSnapshot(collection(db, 'ventas'), (snap) => {
      setVentas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venta)));
    });
    const unsubCitas = onSnapshot(collection(db, 'citas'), (snap) => {
      setCitas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cita)));
    });
    const unsubBarberos = onSnapshot(collection(db, 'barberos'), (snap) => {
      setBarberos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Barbero)));
    });
    const unsubProductos = onSnapshot(collection(db, 'productos'), (snap) => {
      setProductos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto)));
    });
    const unsubServicios = onSnapshot(collection(db, 'servicios'), (snap) => {
      setServicios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Servicio)));
    });
    return () => { unsubVentas(); unsubCitas(); unsubBarberos(); unsubProductos(); unsubServicios(); };
  }, []);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("Reporte de Rendimiento - Altum Studio", 14, 22);
    
    // Filters Info
    doc.setFontSize(10);
    doc.setTextColor(100);
    const barberName = filterBarbero === 'all' ? 'Todos los Barberos' : barberos.find(b => b.id === filterBarbero)?.nombre || 'Desconocido';
    const typeLabel = filterType === 'all' ? 'Servicios + Productos' : filterType === 'servicios' ? 'Solo Servicios' : 'Solo Productos';
    
    doc.text(`Frecuencia: ${range.charAt(0).toUpperCase() + range.slice(1)}`, 14, 32);
    doc.text(`Barbero: ${barberName}`, 14, 38);
    doc.text(`Tipo: ${typeLabel}`, 14, 44);
    doc.text(`Fecha de generación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 50);

    let currentY = 60;

    // Filter barbers to only those selected or all
    const selectedBarberos = filterBarbero === 'all' 
      ? barberos 
      : barberos.filter(b => b.id === filterBarbero);

    selectedBarberos.forEach((b, index) => {
      const bCitas = (filterType === 'all' || filterType === 'servicios') 
        ? filteredCitas.filter(c => c.barbero_id === b.id) 
        : [];
      const bVentas = (filterType === 'all' || filterType === 'productos') 
        ? filteredVentas.filter(v => v.barbero_id === b.id) 
        : [];

      if (bCitas.length === 0 && bVentas.length === 0) return;

      // Combine and sort by date
      const combinedData = [
        ...bCitas.map(c => {
          const s = servicios.find(serv => serv.id === c.servicio_id);
          const calcComision = s?.comision_tipo === 'porcentaje' 
            ? (c.precio || 0) * ((s.comision_valor || 0) / 100)
            : (s?.comision_valor || 0);
          return {
            fechaRaw: c.start_time,
            fecha: `${format(parseISO(c.start_time), 'dd/MM/yyyy HH:mm')} - ${format(parseISO(c.end_time), 'HH:mm')}`,
            tipo: 'Servicio',
            detalle: c.servicio_nombre,
            total: c.precio || 0,
            tipoComision: s?.comision_tipo === 'porcentaje' ? `${s.comision_valor}%` : 'Monto Fijo',
            comisionRaw: calcComision,
            comision: formatCurrency(calcComision)
          };
        }),
        ...bVentas.map(v => {
          const p = productos.find(prod => prod.id === v.producto_id);
          const calcComision = p?.comision_tipo === 'porcentaje' 
            ? (v.total || 0) * ((p.comision_valor || 0) / 100)
            : (p?.comision_valor || 0);
          return {
            fechaRaw: v.fecha,
            fecha: format(parseISO(v.fecha), 'dd/MM/yyyy HH:mm'),
            tipo: 'Producto',
            detalle: p?.nombre || 'Producto Eliminado',
            total: v.total,
            tipoComision: p?.comision_tipo === 'porcentaje' ? `${p.comision_valor}%` : 'Monto Fijo',
            comisionRaw: calcComision,
            comision: formatCurrency(calcComision)
          };
        })
      ].sort((a, b) => a.fechaRaw.localeCompare(b.fechaRaw));

      const barberTotal = combinedData.reduce((acc, item) => acc + item.total, 0);
      const barberComisionTotal = combinedData.reduce((acc, item) => acc + item.comisionRaw, 0);

      // Barber Header
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(`Barbero: ${b.nombre}`, 14, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [[
          'Fecha', 
          'Tipo', 
          'Detalle', 
          { content: 'Total', styles: { halign: 'right' } }, 
          'Tipo Comisión', 
          { content: 'Comisión', styles: { halign: 'right' } }
        ]],
        body: combinedData.map(item => [
          item.fecha, 
          item.tipo, 
          item.detalle, 
          formatCurrency(item.total),
          item.tipoComision,
          item.comision
        ]),
        foot: [[
          '', 
          '', 
          'SUBTOTAL', 
          { content: formatCurrency(barberTotal), styles: { halign: 'right' } }, 
          '', 
          { content: formatCurrency(barberComisionTotal), styles: { halign: 'right' } }
        ]],
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        footStyles: { fillColor: [241, 245, 249], textColor: 0, fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'left', cellWidth: 40 },
          1: { halign: 'left', cellWidth: 20 },
          2: { halign: 'left' },
          3: { halign: 'right', cellWidth: 25 },
          4: { halign: 'center', cellWidth: 25 },
          5: { halign: 'right', cellWidth: 25 }
        },
        styles: { fontSize: 7 },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // Check if we need a new page
      if (currentY > 250 && index < selectedBarberos.length - 1) {
        doc.addPage();
        currentY = 20;
      }
    });

    // Final Total
    // Check if we need a new page for the summary table
    if (currentY > 260) {
      doc.addPage();
      currentY = 20;
    }

    // Calculate Total General Commission
    const totalComisionGeneral = selectedBarberos.reduce((acc, b) => {
      const bCitas = (filterType === 'all' || filterType === 'servicios') 
        ? filteredCitas.filter(c => c.barbero_id === b.id) 
        : [];
      const bVentas = (filterType === 'all' || filterType === 'productos') 
        ? filteredVentas.filter(v => v.barbero_id === b.id) 
        : [];
      
      const citasComision = bCitas.reduce((sum, c) => {
        const s = servicios.find(serv => serv.id === c.servicio_id);
        return sum + (s?.comision_tipo === 'porcentaje' ? (c.precio || 0) * ((s.comision_valor || 0) / 100) : (s?.comision_valor || 0));
      }, 0);

      const ventasComision = bVentas.reduce((sum, v) => {
        const p = productos.find(prod => prod.id === v.producto_id);
        return sum + (p?.comision_tipo === 'porcentaje' ? (v.total || 0) * ((p.comision_valor || 0) / 100) : (p?.comision_valor || 0));
      }, 0);

      return acc + citasComision + ventasComision;
    }, 0);

    autoTable(doc, {
      startY: currentY,
      head: [[
        '', 
        '', 
        'TOTAL GENERAL', 
        { content: formatCurrency(totalGeneral), styles: { halign: 'right' } }, 
        '', 
        { content: formatCurrency(totalComisionGeneral), styles: { halign: 'right' } }
      ]],
      body: [],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, halign: 'right' },
      styles: { fontSize: 10, fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20 },
        2: { halign: 'right' },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right' },
        5: { halign: 'right', cellWidth: 25 }
      }
    });

    doc.save(`reporte_${range}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Filter barbers to only those selected or all
    const selectedBarberos = filterBarbero === 'all' 
      ? barberos 
      : barberos.filter(b => b.id === filterBarbero);

    const allDataForExcel: any[] = [];

    selectedBarberos.forEach((b) => {
      const bCitas = (filterType === 'all' || filterType === 'servicios') 
        ? filteredCitas.filter(c => c.barbero_id === b.id) 
        : [];
      const bVentas = (filterType === 'all' || filterType === 'productos') 
        ? filteredVentas.filter(v => v.barbero_id === b.id) 
        : [];

      if (bCitas.length === 0 && bVentas.length === 0) return;

      const combinedData = [
        ...bCitas.map(c => {
          const s = servicios.find(serv => serv.id === c.servicio_id);
          const calcComision = s?.comision_tipo === 'porcentaje' 
            ? (c.precio || 0) * ((s.comision_valor || 0) / 100)
            : (s?.comision_valor || 0);
          return {
            Barbero: b.nombre,
            Fecha: format(parseISO(c.start_time), 'dd/MM/yyyy HH:mm'),
            Tipo: 'Servicio',
            Detalle: c.servicio_nombre,
            Total: c.precio || 0,
            'Tipo Comisión': s?.comision_tipo === 'porcentaje' ? `${s.comision_valor}%` : 'Monto Fijo',
            Comisión: calcComision
          };
        }),
        ...bVentas.map(v => {
          const p = productos.find(prod => prod.id === v.producto_id);
          const calcComision = p?.comision_tipo === 'porcentaje' 
            ? (v.total || 0) * ((p.comision_valor || 0) / 100)
            : (p?.comision_valor || 0);
          return {
            Barbero: b.nombre,
            Fecha: format(parseISO(v.fecha), 'dd/MM/yyyy HH:mm'),
            Tipo: 'Producto',
            Detalle: p?.nombre || 'Producto Eliminado',
            Total: v.total,
            'Tipo Comisión': p?.comision_tipo === 'porcentaje' ? `${p.comision_valor}%` : 'Monto Fijo',
            Comisión: calcComision
          };
        })
      ].sort((a, b) => a.Fecha.localeCompare(b.Fecha));

      allDataForExcel.push(...combinedData);
    });

    if (allDataForExcel.length === 0) {
      alert("No hay datos para exportar en este rango.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(allDataForExcel);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    
    XLSX.writeFile(workbook, `reporte_${range}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  const getFilteredData = () => {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (range === 'diario') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (range === 'semanal') {
      start = startOfWeek(now);
      end = endOfWeek(now);
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    let filteredVentas = ventas.filter(v => {
      const d = parseISO(v.fecha);
      return d >= start && d <= end;
    });

    let filteredCitas = citas.filter(c => {
      const d = parseISO(c.start_time);
      return d >= start && d <= end && c.status === 'completada';
    });

    // Aplicar filtros adicionales
    if (filterBarbero !== 'all') {
      filteredVentas = filteredVentas.filter(v => v.barbero_id === filterBarbero);
      filteredCitas = filteredCitas.filter(c => c.barbero_id === filterBarbero);
    }

    return { filteredVentas, filteredCitas };
  };

  const { filteredVentas, filteredCitas } = getFilteredData();

  const totalVentasProd = filteredVentas.reduce((acc, v) => acc + v.total, 0);
  const totalVentasServ = filteredCitas.reduce((acc, c) => acc + (c.precio || 0), 0);
  
  const totalGeneral = (filterType === 'all' || filterType === 'productos' ? totalVentasProd : 0) + 
                       (filterType === 'all' || filterType === 'servicios' ? totalVentasServ : 0);

  const dataByBarber = barberos.map(b => {
    const bVentas = filteredVentas.filter(v => v.barbero_id === b.id).reduce((acc, v) => acc + v.total, 0);
    const bCitasRev = filteredCitas.filter(c => c.barbero_id === b.id).reduce((acc, c) => acc + (c.precio || 0), 0);
    
    let total = 0;
    if (filterType === 'all') total = bVentas + bCitasRev;
    else if (filterType === 'productos') total = bVentas;
    else total = bCitasRev;

    return {
      name: b.nombre,
      total: total,
      ventas: bVentas,
      servicios: bCitasRev
    };
  }).filter(d => d.total > 0);

  const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e'];

  const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="#1e293b" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-bold">
        {`${name}: ${formatCurrency(value)} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Reportes de Rendimiento</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Analiza el desempeño general y por barbero.</p>
        </div>
        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
          {(['diario', 'semanal', 'mensual'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                range === r ? 'bg-primary text-primary-foreground shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={exportToPDF}
            className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            PDF
          </button>
          <button 
            onClick={exportToExcel}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
          >
            <TrendingUp className="w-5 h-5" />
            Excel
          </button>
        </div>
      </div>

      {/* Filtros Adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <Users className="w-5 h-5 text-slate-400" />
          <select 
            value={filterBarbero} 
            onChange={e => setFilterBarbero(e.target.value)}
            className="flex-1 bg-transparent outline-none font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="all">Todos los Barberos</option>
            {barberos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <Filter className="w-5 h-5 text-slate-400" />
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value as any)}
            className="flex-1 bg-transparent outline-none font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="all">Todo (Servicios + Productos)</option>
            <option value="servicios">Solo Servicios</option>
            <option value="productos">Solo Productos</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Ingresos Totales</p>
            <h3 className="text-5xl font-black">{formatCurrency(totalGeneral)}</h3>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <DollarSign className="w-32 h-32" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Servicios</p>
          <h3 className="text-4xl font-black text-slate-900 dark:text-white">{formatCurrency(totalVentasServ)}</h3>
          <div className="mt-4 flex items-center gap-2 text-green-600 font-bold text-sm">
            <TrendingUp className="w-4 h-4" />
            {filteredCitas.length} citas completadas
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Productos</p>
          <h3 className="text-4xl font-black text-slate-900 dark:text-white">{formatCurrency(totalVentasProd)}</h3>
          <div className="mt-4 flex items-center gap-2 text-primary font-bold text-sm">
            <Package className="w-4 h-4" />
            {filteredVentas.length} ventas realizadas
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-8">Ingresos por Barbero</h4>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataByBarber}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10}} 
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{fill: '#f8fafc'}}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                />
                <Bar dataKey="servicios" name="Servicios" stackId="a" fill="var(--primary)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="ventas" name="Productos" stackId="a" fill="#1e293b" radius={[10, 10, 0, 0]}>
                  <LabelList 
                    dataKey="total" 
                    position="top" 
                    formatter={(v: any) => formatCurrency(v)} 
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: 'var(--primary)' }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-8">Distribución de Citas</h4>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataByBarber}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="servicios"
                  label={renderCustomizedPieLabel}
                >
                  {dataByBarber.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                  formatter={(value: number) => [formatCurrency(value), "Total"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {dataByBarber.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig>({ 
    id: 'global', 
    startHour: 8, 
    endHour: 20, 
    theme: 'system',
    preset: 'default'
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch User Profile by UID directly
        const userDocRef = doc(db, 'app_users', u.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data() as AppUser;
          // Migration: Ensure configuracion permission exists for everyone
          // AND ensure administrators have all permissions
          const needsUpdate = !data.permisos || 
                             data.permisos.configuracion === undefined || 
                             (data.rol === 'administrador' && Object.values(data.permisos).some(v => v === false));

          if (needsUpdate) {
            const updatedPermisos = { ...data.permisos };
            if (data.rol === 'administrador') {
              updatedPermisos.citas = true;
              updatedPermisos.servicios = true;
              updatedPermisos.barberos = true;
              updatedPermisos.inventario = true;
              updatedPermisos.reportes = true;
              updatedPermisos.configuracion = true;
            } else {
              updatedPermisos.configuracion = true;
            }
            await updateDoc(userDocRef, { permisos: updatedPermisos });
            setUserProfile({ id: userSnap.id, ...data, permisos: updatedPermisos } as AppUser);
          } else {
            setUserProfile({ id: userSnap.id, ...data } as AppUser);
          }
        } else {
          // Check if a profile with this email already exists (created via addUser)
          const q = query(collection(db, 'app_users'), where('email', '==', u.email), limit(1));
          const querySnap = await getDocs(q);
          
          let existingProfile: any = null;
          if (!querySnap.empty) {
            // Found a profile created by email, we'll use its data
            const docData = querySnap.docs[0].data();
            existingProfile = { ...docData };
            // Delete the old random-id document
            try {
              await deleteDoc(doc(db, 'app_users', querySnap.docs[0].id));
            } catch (e) {
              console.error("Error deleting old profile doc:", e);
            }
          }

          // Check if it's the first user to assign admin role
          let isFirst = u.email === 'cristian.floresg.app@gmail.com';
          if (!isFirst && !existingProfile) {
            try {
              // This might still fail if not admin, but we handle it
              const allUsersSnap = await getDocs(query(collection(db, 'app_users'), limit(1)));
              isFirst = allUsersSnap.empty;
            } catch (e) {
              // If we can't list, assume not first or just rely on email
              isFirst = false;
            }
          }
          
          const newProfile = existingProfile || {
            email: u.email!,
            nombre: u.displayName || 'Usuario',
            rol: isFirst ? 'administrador' : 'barbero',
            permisos: {
              citas: true,
              servicios: isFirst,
              barberos: isFirst,
              inventario: true,
              reportes: isFirst,
              configuracion: true // Everyone can change config by default now
            }
          };
          
          // Ensure configuracion is true if it was missing or false
          if (newProfile.permisos) {
            newProfile.permisos.configuracion = true;
          }

          try {
            await setDoc(userDocRef, newProfile);
            setUserProfile({ id: u.uid, ...newProfile } as AppUser);
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `app_users/${u.uid}`);
          }
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => { unsubAuth(); };
  }, []);

  useEffect(() => {
    // Fetch Config
    const unsubConfig = onSnapshot(doc(db, 'app_config', 'global'), (snap) => {
      if (snap.exists()) {
        setAppConfig(snap.data() as AppConfig);
      } else if (userProfile?.rol === 'administrador') {
        // Initialize config if not exists and user is admin
        const defaultConfig: AppConfig = { 
          id: 'global', 
          startHour: 8, 
          endHour: 20, 
          theme: 'system',
          preset: 'default'
        };
        setDoc(doc(db, 'app_config', 'global'), defaultConfig).catch(e => {
          console.error("Error initializing config:", e);
        });
      }
    }, (error) => {
      // Only handle error if user is logged in (otherwise it's expected to fail if rules are strict)
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.GET, 'app_config/global');
      }
    });

    return () => unsubConfig();
  }, [userProfile]);

  useEffect(() => {
    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    const theme = appConfig.theme;
    const preset = appConfig.preset || 'default';
    
    // Remove all preset classes
    root.classList.remove('preset-default', 'preset-altum', 'preset-royal', 'preset-vintage');
    // Add current preset class
    if (preset !== 'default') {
      root.classList.add(`preset-${preset}`);
    }

    const applyTheme = (t: string) => {
      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.remove('light', 'dark');
        root.classList.add(systemTheme);
      } else {
        root.classList.remove('light', 'dark');
        root.classList.add(t);
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [appConfig.theme, appConfig.preset]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const login = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      // Ignorar error si el usuario cancela el popup o hay una solicitud pendiente
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        console.log('Login cancelado o popup cerrado');
      } else {
        console.error('Error de autenticación:', err);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => signOut(auth);

  const toggleTheme = () => {
    const newTheme = appConfig.theme === 'dark' ? 'light' : 'dark';
    setAppConfig(prev => ({ ...prev, theme: newTheme }));
    // Save to Firestore if admin or has config permission
    if (userProfile?.rol === 'administrador' || userProfile?.permisos?.configuracion) {
      updateDoc(doc(db, 'app_config', 'global'), { theme: newTheme }).catch(console.error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl p-10 rounded-[40px] border border-white/10 text-center shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-12">
            <span className="text-6xl font-light tracking-[0.2em] text-white leading-none">ALTUM</span>
            <div className="w-full h-[1px] bg-white/40 my-4"></div>
            <span className="text-lg font-medium tracking-[0.5em] text-white/80 leading-none">STUDIO</span>
          </div>
          <p className="text-slate-400 mb-10 text-lg leading-relaxed">
            Gestión interna profesional para tu barbería. Agenda, inventario y reportes en un solo lugar.
          </p>
          <button 
            onClick={login}
            className="w-full bg-white text-slate-950 py-4 rounded-2xl font-bold text-lg hover:bg-slate-100 transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
            Acceder con Google
          </button>
          <p className="mt-8 text-slate-500 text-sm">
            Solo personal autorizado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          user={user} 
          userProfile={userProfile} 
          onLogout={logout} 
          theme={appConfig.theme}
          toggleTheme={toggleTheme}
        />
        
        <main className="flex-1 ml-64 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
            {activeTab === 'citas' && <CitasManager config={appConfig} />}
            {activeTab === 'servicios' && <ServiciosManager />}
            {activeTab === 'barberos' && <BarberosManager />}
            {activeTab === 'inventario' && <InventarioManager />}
            {activeTab === 'reportes' && <Reportes />}
            {activeTab === 'configuracion' && <ConfiguracionManager config={appConfig} setConfig={setAppConfig} userProfile={userProfile} setActiveTab={setActiveTab} />}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
