from rest_framework import serializers
from .models import FormularioRegistro, Respuesta, ArchivoAdjunto
import json

class RespuestaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Respuesta
        fields = [
            'id',
            'pregunta_id',
            'seccion_id',
            'pregunta',
            'respuesta',
            'fuente',
            'fecha_actualizacion',
            'estado',
        ]

    def validate_respuesta(self, value):
        if isinstance(value, str) and len(value) > 300:
            raise serializers.ValidationError(
                "La respuesta excede el límite máximo de 300 caracteres establecido por la norma institucional."
            )
        return value

    def validate_fuente(self, value):
        if value and len(value) > 300:
            raise serializers.ValidationError("La fuente no puede exceder 300 caracteres.")
        return value


class ArchivoAdjuntoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArchivoAdjunto
        fields = [
            'id',
            'nombre',
            'tipo',
            'tamanio',
            'extension',
            'archivo',
            'fecha_carga',
            'estado',
        ]

    def validate(self, data):
        ext = data.get('extension', '').lower()
        nombre = data.get('nombre', '')
        
        if not ext and nombre:
            ext = '.' + nombre.split('.')[-1].lower()

        allowed = ['.pdf', '.xls', '.xlsx']
        if ext not in allowed:
            raise serializers.ValidationError(
                {"extension": "Este tipo de archivo no está permitido. Solo se aceptan PDF (.pdf) y Excel (.xls, .xlsx)."}
            )

        tamanio = data.get('tamanio', 0)
        max_bytes = 15 * 1024 * 1024
        if tamanio > max_bytes:
            raise serializers.ValidationError(
                {"tamanio": "El archivo supera el tamaño máximo permitido de 15 MB."}
            )

        return data


class FormularioRegistroSerializer(serializers.ModelSerializer):
    respuestas = RespuestaSerializer(many=True, read_only=True)
    archivos = ArchivoAdjuntoSerializer(many=True, read_only=True)

    class Meta:
        model = FormularioRegistro
        fields = [
            'id',
            'folio',
            'usuario_nombre',
            'usuario_puesto',
            'usuario_correo',
            'usuario_telefono',
            'usuario_entidad',
            'fecha_captura',
            'estado',
            'fecha_creacion',
            'fecha_finalizacion',
            'respuestas',
            'archivos',
        ]
