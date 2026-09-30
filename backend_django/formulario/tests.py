from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import FormularioRegistro, Respuesta, ArchivoAdjunto
import datetime

class FormularioBackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_check(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ok')
        self.assertEqual(response.data['institucion'], 'INEGI')

    def test_guardar_respuesta_valida(self):
        payload = {
            "pregunta_id": "1",
            "seccion_id": "identificacion",
            "pregunta": "1. Nombre de la persona que captura la información:",
            "respuesta": "Lic. Juan Pérez González",
            "fuente": "Credencial institucional"
        }
        response = self.client.post('/api/respuestas/', payload, format='json')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertTrue(response.data['success'])

    def test_rechazo_exceso_300_caracteres(self):
        """Verifica que el límite estricto de 300 caracteres sea rechazado por el backend"""
        texto_largo = "A" * 301
        payload = {
            "pregunta_id": "14",
            "seccion_id": "normatividad_objetivo",
            "pregunta": "14. Proporcione el Objetivo General del Programa durante año reportado.",
            "respuesta": texto_largo
        }
        response = self.client.post('/api/respuestas/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('300 caracteres', response.data['error'])

    def test_validacion_extension_archivo(self):
        """Rechaza extensiones no autorizadas (solo se aceptan .pdf, .xls, .xlsx)"""
        payload = {
            "nombre": "script_peligroso.exe",
            "tipo": "application/x-msdownload",
            "tamanio": 1024,
            "extension": ".exe"
        }
        response = self.client.post('/api/archivos/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sincronizacion_batch_offline(self):
        """Verifica la ingesta por lotes de elementos encolados en IndexedDB"""
        items = [
            {
                "tipo": "respuesta",
                "payload": {
                    "preguntaId": "2",
                    "seccionId": "identificacion",
                    "pregunta": "2. Puesto:",
                    "valor": "Director de Planeación"
                }
            },
            {
                "tipo": "respuesta",
                "payload": {
                    "preguntaId": "6",
                    "seccionId": "responsable_programa",
                    "pregunta": "6. Capture el nombre de la persona responsable del programa...",
                    "valor": "Mtra. María Elena Garza"
                }
            }
        ]
        response = self.client.post('/api/sincronizar/', {"items": items}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['elementos_procesados'], 2)

    def test_finalizar_formulario_genera_folio(self):
        payload = {
            "usuario": {
                "nombre": "Lic. Roberto Sánchez",
                "puesto": "Coordinador",
                "correo": "roberto.sanchez@bienestar.gob.mx",
                "telefono": "5512345678",
                "entidadDependencia": "Secretaría de Bienestar",
                "fechaCaptura": "2025-05-10"
            },
            "respuestas": {},
            "archivos": []
        }
        response = self.client.post('/api/formulario/finalizar/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['folio'].startswith('INEGI-IFPADS-'))
