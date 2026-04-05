export interface Barbero {
  id: string;
  nombre: string;
  especialidad: string;
  activo: boolean;
}

export interface Servicio {
  id: string;
  nombre: string;
  precio: number;
  duracion: number; // en minutos
  comision_tipo: 'porcentaje' | 'monto';
  comision_valor: number;
}

export interface Cita {
  id: string;
  cliente: string;
  servicio_id: string;
  servicio_nombre: string; // denormalizado para reportes rápidos
  precio: number;          // denormalizado
  barbero_id: string;
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  status: 'pendiente' | 'completada' | 'cancelada';
}

export interface Producto {
  id: string;
  nombre: string;
  stock: number;
  precio: number;
  alerta_minima: number;
  imagen?: string;
  comision_tipo?: 'porcentaje' | 'monto';
  comision_valor?: number;
}

export interface Venta {
  id: string;
  producto_id: string;
  cantidad: number;
  total: number;
  fecha: string; // ISO 8601
  barbero_id: string;
}

export interface AppUser {
  id: string;
  email: string;
  nombre: string;
  rol: 'administrador' | 'barbero';
  permisos: {
    citas: boolean;
    servicios: boolean;
    barberos: boolean;
    inventario: boolean;
    reportes: boolean;
  };
}

export interface AppConfig {
  id: 'global';
  startHour: number; // 0-23
  endHour: number;   // 0-23
  theme: 'light' | 'dark' | 'system';
  preset: 'default' | 'altum' | 'royal' | 'vintage';
}
