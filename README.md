# Formulario Institucional INEGI — Inventario Federal de Programas y Acciones de Desarrollo Social 2024 y 2025

Aplicación web institucional completa, moderna, minimalista y responsive, construida a partir del documento oficial del **Instituto Nacional de Estadística y Geografía (INEGI)**.

---

## 🏛️ Identidad Visual Institucional

La aplicación implementa rigurosamente la paleta de colores institucional del gobierno federal mexicano:

| Color | Código Hex | Uso en la Aplicación |
|---|---|---|
| **Verde Institucional** | `#002F2A` | Encabezados principales, barras de navegación, botones primarios y estados positivos |
| **Guinda Institucional** | `#611232` | Cards institucionales, elementos de atención, badges y contrastes |
| **Dorado Institucional** | `#A57F2C` | Indicadores de progreso, bordes activos, elementos destacados y estados guardados |
| **Guinda Secundario** | `#9B2247` | Acentos de cards secundarias y campos de captura |

Diseño basado en **Glassmorphism institucional** con fondos transparentes, desenfoque de fondo (`backdrop-filter: blur`), bordes sutiles en tono dorado y sin bloques blancos opacos.

---

## 📐 Arquitectura del Sistema

```text
       ┌────────────────────────┐
       │     Frontend React     │  ← Multi-pantalla guiada
       │  (IndexedDB + Offline) │  ← Almacenamiento local inmediato
       └───────────┬────────────┘
                   │
                   ▼ (Fetch REST API /api/*)
       ┌────────────────────────┐
       │   API Django REST /    │  ← Validación estricta 300 caracteres
       │   Express Full-Stack   │  ← Ingesta por lotes (/api/sincronizar/)
       └───────────┬────────────┘
                   │
                   ▼ (Persistencia PostgreSQL)
       ┌────────────────────────┐
       │        Supabase        │  ← Row Level Security (RLS)
       │    (Storage Buckets)   │  ← PDF / XLS / XLSX (Máx. 15 MB)
       └────────────────────────┘
```

---

## 📋 Fidelidad 100% al PDF Oficial (8 Páginas)

Todas las preguntas provienen del instrumento del INEGI sin modificaciones de significado:

1. **Identificación** (Preguntas 1 a 5: Nombre, Puesto, Correo institucional, Teléfono, Fecha de captura).
2. **Persona responsable del Programa** (Preguntas 6 a 9).
3. **Dependencias y Unidades Responsables** (Preguntas 10 y 10.1 con condición dinámica).
4. **Normatividad y Objetivo** (Preguntas 12 a 14 con enlace oficial y objetivo general).
5. **Población Potencial y Objetivo** (Preguntas 15 a 18.1 con unidades de medida y cuantificaciones).
6. **Criterios de Priorización** (Preguntas 20 a 21: criterios territoriales ZAP, rezago, etc.).
7. **Padrón de Beneficiarios y Contraloría Social** (Preguntas 22 a 23).
8. **Apoyo y Caracterización** (Preguntas 24 a 29.1: nombre, descripción, modalidad, frecuencia).
9. **Monto y MIR** (Preguntas 30 y 31: monto otorgado y componente de la MIR).
10. **Población Atendida** (Preguntas 32 a 34: unidad de medida, definición y grupos etarios).
11. **Grupos de Población Atendidos** (Preguntas 35 y 35.1: 29 grupos prioritarios y carencias).
12. **Nivel de Desagregación** (Preguntas 36 a 37.1: cuantificación estatal o municipal, agregada o por sexo).
13. **Documentación / Archivos** (Carga de archivos PDF, XLS, XLSX con validación MIME).
14. **Revisión del Formulario** (Resumen de integridad con botones `← EDITAR`).
15. **Confirmación y Folio Oficial** (`INEGI-IFPADS-2025-XXXXX`).

---

## ⚡ Regla Estricta: Límite de 300 Caracteres

Todas las preguntas abiertas cuentan con:
- `maxlength="300"` en el HTML.
- Contador dinámico en tiempo real (`0 / 300`, `124 / 300`, `300 / 300`).
- Truncamiento preventivo en el estado de React.
- Validación con `serializers.ValidationError` y `MaxLengthValidator(300)` en el backend Django.

---

## 💾 Modo Offline y Resiliencia

- **IndexedDB**: Cada pulsación o selección se guarda al milisegundo en la base de datos local `inegi_inventario_federal_db`.
- **Cola de sincronización**: Si se pierde la conexión, las mutaciones se acumulan en `colaSincronizacion`.
- **Detección inteligente**: No solo `navigator.onLine`, sino sondeos de disponibilidad de la API `/api/health/`.
- **Reconexión**: Al volver la red, el sistema vacía automáticamente la cola hacia `/api/sincronizar/`.

---

## 🚀 Puesta en Marcha

### 1. Entorno de Desarrollo (Frontend + API Full-Stack)
```bash
# Instalar dependencias
npm install

# Iniciar servidor interactivo
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

### 2. Backend Django REST Framework (Producción)
```bash
cd backend_django
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py test formulario  # Ejecuta los tests unitarios
python manage.py runserver 8000
```

### 3. Configuración en Supabase
1. Ejecutar `supabase_schema.sql` en el SQL Editor de tu proyecto Supabase.
2. Ejecutar `supabase_pages_rpc.sql` para crear las funciones de verificación y registro atómico. RLS queda habilitado y la app solo expone la función de envío; no se usa la clave `service_role` en el navegador.
3. Para desarrollo local, configurar `.env` con:
   ```bash
       VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
       VITE_SUPABASE_ANON_KEY="tu-anon-public-key"
   ```
4. Para GitHub Pages, crear las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en **Settings > Secrets and variables > Actions > Variables** del repositorio. El workflow las inyecta al compilar. No agregar `service_role` al frontend ni a las variables `VITE_`.

El envío a Supabase ocurre al finalizar el formulario. Los adjuntos se guardan localmente y la base recibe sus metadatos; el binario requiere configurar almacenamiento por separado.
