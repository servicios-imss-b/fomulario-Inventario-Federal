# Archivos privados en Supabase Storage

La función `archivos-storage` valida la contraseña y la asignación del formulario
antes de emitir URL firmadas. Los PDF y documentos se suben directamente desde el
navegador al bucket privado `ipads-archivos`; la clave `service_role` solo se usa
en el entorno de Edge Functions. Las URL de descarga duran 60 segundos.

## Activación

1. Ejecutar `supabase_storage_archivos.sql` en el SQL Editor del proyecto
   `uxtodshztvazkebjhkaz`. El bucket queda privado y limitado a 15 MB y los tipos
   permitidos por el formulario.
2. Confirmar que `SUPABASE_SERVICE_ROLE_KEY` está disponible como secreto de
   Edge Functions. No agregarla a `VITE_*`, al frontend ni al repositorio.
3. Desde la carpeta del proyecto, desplegar la función:

   ```sh
   npx supabase functions deploy archivos-storage --project-ref uxtodshztvazkebjhkaz
   npx supabase functions deploy archivos-reporte --project-ref uxtodshztvazkebjhkaz
   ```

4. Publicar el frontend construido y probar carga y descarga con una asignación
   autorizada. Mantener el proyecto en el plan gratuito y revisar su cuota antes
   de cargar archivos institucionales.

Los documentos previos de Google Drive conservan su proveedor y su enlace. No se
deben hacer públicos los objetos del bucket para habilitar las descargas.