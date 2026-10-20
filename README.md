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
    │    (Storage Buckets)   │  ← PDF / DOC / DOCX / XLS / XLSX (Máx. 15 MB)
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
13. **Documentación / Archivos** (Carga de archivos PDF, DOC, DOCX, XLS y XLSX con validación MIME).
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
2. Ejecutar `supabase_pages_rpc.sql` para configurar RLS y retirar el registrador anónimo anterior.
3. Para desarrollo local, configurar `.env` con:
   ```bash
       VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
       VITE_SUPABASE_ANON_KEY="tu-anon-public-key"
   ```
4. Para GitHub Pages, crear las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en **Settings > Secrets and variables > Actions > Variables** del repositorio. El workflow las inyecta al compilar. No agregar `service_role` al frontend ni a las variables `VITE_`.
5. Ejecutar `supabase_reporte_rpc.sql` para habilitar el reporte con contraseña hasheada; el usuario administrativo es `add.31` y se configura en `private.reporte_acceso`.
6. Ejecutar `supabase_form_access.sql` al final. Añade titulares/accesos, autosave y finalización por titular+clave+año; conserva los formularios anteriores sin asignarles otro titular. Cada entrada válida crea un evento en `private.form_access_events`, asociado al titular, clave, año y cuestionario.
7. Ejecutar `supabase_password_per_titular.sql`. Migra las credenciales al titular: una contraseña puede autorizar varias combinaciones de clave/año, mientras cada cuestionario sigue aislado por su `access_id`. No borra formularios ni respuestas. Si ya había contraseñas por asignación, asígnalas de nuevo desde el reporte para emitir una contraseña personal nueva.

El formulario pide la contraseña al pulsar **Comenzar** y luego muestra las combinaciones permitidas. En el reporte, `add.31` puede consultar/restablecer la contraseña y asignar varias claves/años a un titular. La tabla privada `private.form_titulares` guarda el hash bcrypt y la copia cifrada; `private.usuarios` es una vista privada de esa tabla, no duplica credenciales. Solo las RPC administrativas de `add.31` pueden descifrarla.

La RPC de inicio y las RPC de guardado verifican la contraseña en Supabase y fijan el titular, clave y año del registro. Las tablas privadas no son consultables desde el cliente; el rol anónimo solo puede invocar las funciones que validan una contraseña. Nunca agregues `service_role` a `.env` del frontend, GitHub Pages ni al bundle.

Cada respuesta se guarda como avance en Supabase para su asignación; el envío final bloquea únicamente ese registro. El reporte solo consulta Supabase al pulsar **Actualizar ahora**. Los adjuntos se guardan localmente y la base recibe sus metadatos; el binario requiere configurar almacenamiento por separado.

Para abrir el visor administrativo, toca cinco veces seguidas el logo IMSS-BIENESTAR. Inicia sesión con una cuenta creada manualmente en Supabase Auth cuyo `app_metadata.role` sea `admin`. Desactiva el registro público de usuarios; el visor solo permite leer registros a ese rol mediante RLS.

### GitHub Pages desde la rama

El sitio publicado desde `main` usa los archivos generados en `docs/`. Ejecuta `npm run build` antes de subir cambios de frontend y conserva `docs/` versionado. En **Settings > Pages**, selecciona **Deploy from a branch**, rama `main` y carpeta `/docs`.
