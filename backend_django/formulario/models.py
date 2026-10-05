import uuid
from django.db import models
from django.core.validators import MaxLengthValidator, FileExtensionValidator

class FormularioRegistro(models.Model):
    """
    Registro general de captura del Inventario Federal de Programas
    y Acciones de Desarrollo Social 2024 y 2025.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    folio = models.CharField(max_length=50, unique=True, db_index=True)
    
    # Datos de la persona que captura
    usuario_nombre = models.CharField(max_length=300, validators=[MaxLengthValidator(300)])
    usuario_puesto = models.CharField(max_length=300, validators=[MaxLengthValidator(300)])
    usuario_correo = models.EmailField(max_length=300, validators=[MaxLengthValidator(300)])
    usuario_telefono = models.CharField(max_length=300, validators=[MaxLengthValidator(300)])
    usuario_entidad = models.CharField(max_length=300, validators=[MaxLengthValidator(300)])
    fecha_captura = models.DateField()
    
    # Estado institucional
    ESTADOS = [
        ('EN_CAPTURA', 'En Captura'),
        ('CONCLUIDO', 'Concluido y Certificado'),
        ('SINCRONIZADO_SUPABASE', 'Sincronizado en Supabase'),
    ]
    estado = models.CharField(max_length=30, choices=ESTADOS, default='EN_CAPTURA')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_finalizacion = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.folio} - {self.usuario_nombre} ({self.estado})"


class Respuesta(models.Model):
    """
    Respuesta individual a una pregunta oficial del instrumento INEGI.
    Las respuestas abiertas admiten 300 caracteres, excepto las preguntas 10, 14 y 15 y el comentario de la 7, que admiten 500.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    formulario = models.ForeignKey(
        FormularioRegistro,
        on_delete=models.CASCADE,
        related_name='respuestas',
        null=True,
        blank=True
    )
    pregunta_id = models.CharField(max_length=50, db_index=True)
    seccion_id = models.CharField(max_length=100)
    pregunta = models.CharField(max_length=500)
    
    # Contenido de la respuesta (texto, JSON, número o selección)
    # El límite de cada pregunta se valida en el serializador.
    respuesta = models.TextField(validators=[MaxLengthValidator(500)])
    fuente = models.CharField(max_length=300, blank=True, null=True, validators=[MaxLengthValidator(300)])
    
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    estado = models.CharField(max_length=30, default='guardado')

    class Meta:
        ordering = ['pregunta_id']

    def __str__(self):
        return f"Pregunta {self.pregunta_id}: {self.respuesta[:40]}"


class ArchivoAdjunto(models.Model):
    """
    Archivos adjuntos autorizados: PDF (.pdf) y Excel (.xls, .xlsx).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    formulario = models.ForeignKey(
        FormularioRegistro,
        on_delete=models.CASCADE,
        related_name='archivos',
        null=True,
        blank=True
    )
    nombre = models.CharField(max_length=255)
    tipo = models.CharField(max_length=100)
    tamanio = models.BigIntegerField(help_text="Tamaño en bytes (máximo 15 MB)")
    extension = models.CharField(max_length=10)
    
    archivo = models.FileField(
        upload_to='archivos_inegi/%Y/%m/',
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'xls', 'xlsx'])],
        null=True,
        blank=True
    )
    
    fecha_carga = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=30, default='sincronizado')

    def __str__(self):
        return f"{self.nombre} ({self.extension})"
