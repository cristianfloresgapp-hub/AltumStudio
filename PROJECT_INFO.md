# Altum Studio - Sistema de Gestión Profesional para Barberías

## Descripción General
**Altum Studio** (anteriormente Barber-Sync) es una plataforma integral diseñada para la administración eficiente de barberías. Permite la gestión de citas, control de inventario, seguimiento de ventas y generación de reportes de rendimiento detallados para el personal.

## Stack Tecnológico
- **Frontend:** React 18+ con Vite.
- **Lenguaje:** TypeScript.
- **Estilos:** Tailwind CSS (con soporte para modo oscuro/claro).
- **Base de Datos y Autenticación:** Firebase (Firestore y Google Auth).
- **Iconografía:** Lucide React.
- **Gráficos:** Recharts (Gráficos de barras y circulares).
- **Reportes:** jsPDF y jsPDF-AutoTable para informes en PDF; **xlsx** para exportaciones a Excel.
- **Animaciones:** Framer Motion.
- **Manejo de Fechas:** date-fns.

## Funcionalidades Principales

### 1. Dashboard (Panel de Control)
- Visualización de métricas clave: Citas del día, Ventas totales, Stock bajo.
- Gráficos de rendimiento mensual y distribución de servicios.
- Resumen rápido de la actividad reciente.

### 2. Gestión de Citas (Calendario)
- Agendamiento de citas por barbero.
- Vista de calendario diaria con slots de tiempo.
- Estados de cita: Pendiente, Completada, Cancelada.
- Validación de disponibilidad de barberos.

### 3. Catálogo de Servicios
- Definición de servicios con nombre, precio y duración estimada.
- Asignación dinámica de servicios a las citas.

### 4. Gestión de Personal (Barberos)
- Registro de barberos y sus especialidades.
- Configuración de estados (Activo/Inactivo).
- Seguimiento de comisiones por servicios realizados.

### 5. Inventario y Ventas
- Control de stock de productos.
- Alertas de stock bajo configurables.
- Registro de ventas vinculado a barberos.
- Prevención de stock negativo en operaciones de venta.

### 6. Reportes de Rendimiento
- Generación de informes PDF detallados por rango de fecha.
- **Exportación a Excel:** Permite descargar los datos de rendimiento en formato .xlsx para análisis externo.
- Desglose de servicios y ventas por barbero.
- Cálculo automático de comisiones (Fijas o Porcentuales).
- Alineación profesional de datos financieros en el reporte.

### 7. Configuración y Seguridad
- Roles de usuario: Administrador y Barbero.
- Sistema de permisos granular por módulo (Citas, Inventario, Reportes, etc.).
- Autenticación segura mediante Google.
- Configuración global: Horarios de atención, tema visual.

## Estructura de Datos (Firestore)

### Entidades Principales:
- **`barberos`**: Perfiles del personal.
- **`servicios`**: Catálogo de cortes y tratamientos.
- **`citas`**: Registro de agendamientos.
- **`productos`**: Inventario de la tienda.
- **`ventas`**: Transacciones de productos.
- **`app_users`**: Usuarios del sistema y sus permisos.
- **`app_config`**: Ajustes globales de la aplicación.

## Identidad Visual
- **Nombre de Marca:** Altum Studio.
- **Logo:** Diseño minimalista con tipografía elegante ("ALTUM" sobre "STUDIO" con línea divisoria).
- **Paleta de Colores:** Basada en Slate y Primary (Indigo/Blue) para un look profesional y moderno.
- **Tipografía:** Inter / Sans-serif con espaciado amplio para la marca.

## Reglas de Negocio Clave
- **Comisiones:** Se calculan en base a los servicios completados.
- **Ventas:** Cada venta debe estar asociada a un barbero y resta stock automáticamente del inventario.
- **Acceso:** El acceso está restringido a personal autorizado mediante validación de correo electrónico en Firestore.
