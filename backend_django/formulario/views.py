import datetime
import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .models import FormularioRegistro, Respuesta, ArchivoAdjunto
from .serializers import (
    RespuestaSerializer,
    ArchivoAdjuntoSerializer,
    FormularioRegistroSerializer,
)

class HealthCheckView(APIView):
    def get(self, request):
        return Response({
            "status": "ok",
            "institucion": "INEGI",
            "sistema": "Inventario Federal de Programas y Acciones de Desarrollo Social 2024 y 2025",
            "timestamp": datetime.datetime.now().isoformat(),
            "supabase_configurado": bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)
        })


class FormularioInfoView(APIView):
    def get(self, request):
        return Response({
            "titulo": "Instrumento de captación del Inventario Federal de Programa y Acciones de Desarrollo Social 2024 y 2025",
            "institucion": "INSTITUTO NACIONAL DE ESTADÍSTICA Y GEOGRAFÍA (INEGI)",
            "max_caracteres_abiertas": 300,
            "archivos_permitidos": [".pdf", ".xls", ".xlsx"],
            "tamanio_maximo_mb": 15
        })

    def post(self, request):
        data = request.data.get('usuario', {})
        return Response({
            "success": True,
            "mensaje": "Datos de usuario registrados correctamente",
            "usuario": data
        })


class RespuestaListCreateView(APIView):
    def get(self, request):
        respuestas = Respuesta.objects.all()
        serializer = RespuestaSerializer(respuestas, many=True)
        return Response({"count": respuestas.count(), "resultados": serializer.data})

    def post(self, request):
        data = request.data
        pregunta_id = data.get('pregunta_id')
        
        if not pregunta_id:
            return Response(
                {"error": "pregunta_id es requerido"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validación backend: máximo 300 caracteres
        respuesta_val = data.get('respuesta')
        if isinstance(respuesta_val, str) and len(respuesta_val) > 300:
            return Response(
                {"error": "La respuesta excede el límite máximo de 300 caracteres establecido por la norma."},
                status=status.HTTP_400_BAD_REQUEST
            )

        respuesta_obj, created = Respuesta.objects.update_or_create(
            pregunta_id=pregunta_id,
            defaults={
                'seccion_id': data.get('seccion_id', ''),
                'pregunta': data.get('pregunta', ''),
                'respuesta': str(respuesta_val) if respuesta_val is not None else '',
                'fuente': data.get('fuente', ''),
                'estado': 'guardado'
            }
        )

        serializer = RespuestaSerializer(respuesta_obj)
        return Response({
            "success": True,
            "mensaje": "Respuesta guardada correctamente",
            "data": serializer.data
        }, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)


class RespuestaDetailView(APIView):
    def put(self, request, pk):
        try:
            respuesta_obj = Respuesta.objects.get(pregunta_id=pk)
        except Respuesta.DoesNotExist:
            return Response({"error": "No encontrada"}, status=status.HTTP_404_NOT_FOUND)

        serializer = RespuestaSerializer(respuesta_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"success": True, "data": serializer.data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ArchivoListCreateView(APIView):
    def get(self, request):
        archivos = ArchivoAdjunto.objects.all()
        serializer = ArchivoAdjuntoSerializer(archivos, many=True)
        return Response({"count": archivos.count(), "archivos": serializer.data})

    def post(self, request):
        serializer = ArchivoAdjuntoSerializer(data=request.data)
        if serializer.is_valid():
            archivo_obj = serializer.save()
            return Response({
                "success": True,
                "mensaje": "Archivo registrado correctamente",
                "data": ArchivoAdjuntoSerializer(archivo_obj).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ArchivoDetailView(APIView):
    def delete(self, request, pk):
        try:
            archivo_obj = ArchivoAdjunto.objects.get(id=pk)
            archivo_obj.delete()
            return Response({"success": True, "mensaje": "Archivo eliminado"})
        except ArchivoAdjunto.DoesNotExist:
            return Response({"error": "Archivo no encontrado"}, status=status.HTTP_404_NOT_FOUND)


class SincronizacionBatchView(APIView):
    """
    Endpoint para procesar la cola de mutaciones acumuladas en IndexedDB
    durante el modo sin conexión (Offline).
    """
    def post(self, request):
        items = request.data.get('items', [])
        procesados = 0

        for item in items:
            tipo = item.get('tipo')
            payload = item.get('payload', {})

            if tipo == 'respuesta':
                p_id = payload.get('preguntaId') or payload.get('pregunta_id')
                r_val = payload.get('valor') or payload.get('respuesta', '')
                if isinstance(r_val, str) and len(r_val) > 300:
                    r_val = r_val[:300]
                
                Respuesta.objects.update_or_create(
                    pregunta_id=p_id,
                    defaults={
                        'seccion_id': payload.get('seccionId', ''),
                        'pregunta': payload.get('pregunta', ''),
                        'respuesta': str(r_val),
                        'fuente': payload.get('fuente', ''),
                        'estado': 'guardado'
                    }
                )
                procesados += 1

            elif tipo == 'archivo':
                ArchivoAdjunto.objects.update_or_create(
                    nombre=payload.get('nombre'),
                    defaults={
                        'tipo': payload.get('tipo', 'application/octet-stream'),
                        'tamanio': payload.get('tamanio', 0),
                        'extension': payload.get('extension', ''),
                        'estado': 'sincronizado'
                    }
                )
                procesados += 1

        return Response({
            "success": True,
            "mensaje": f"Sincronización por lotes exitosa: {procesados} elementos procesados",
            "elementos_procesados": procesados
        })


class FinalizarFormularioView(APIView):
    """
    Consolida la información del formulario, genera el folio oficial INEGI
    y emite la confirmación de registro final.
    """
    def post(self, request):
        usuario = request.data.get('usuario', {})
        respuestas_data = request.data.get('respuestas', {})
        archivos_data = request.data.get('archivos', [])

        year = datetime.datetime.now().year
        random_num = random.randint(100000, 999999)
        folio = f"INEGI-IFPADS-{year}-{random_num}"
        timestamp = datetime.datetime.now().isoformat()

        registro = FormularioRegistro.objects.create(
            folio=folio,
            usuario_nombre=usuario.get('nombre', 'Anónimo')[:300],
            usuario_puesto=usuario.get('puesto', 'No especificado')[:300],
            usuario_correo=usuario.get('correo', 'no-reply@inegi.gob.mx')[:300],
            usuario_telefono=usuario.get('telefono', '0000000000')[:300],
            usuario_entidad=usuario.get('entidadDependencia', 'No especificada')[:300],
            fecha_captura=usuario.get('fechaCaptura', datetime.date.today().isoformat()),
            estado='CONCLUIDO',
            fecha_finalizacion=datetime.datetime.now()
        )

        return Response({
            "success": True,
            "folio": folio,
            "fecha": timestamp,
            "mensaje": "Formulario enviado y registrado satisfactoriamente en el Inventario Federal de Programas y Acciones de Desarrollo Social.",
            "registro_id": str(registro.id)
        })
