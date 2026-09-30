from django.urls import path
from .views import (
    HealthCheckView,
    FormularioInfoView,
    RespuestaListCreateView,
    RespuestaDetailView,
    ArchivoListCreateView,
    ArchivoDetailView,
    SincronizacionBatchView,
    FinalizarFormularioView,
)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('formulario/', FormularioInfoView.as_view(), name='formulario-info'),
    path('respuestas/', RespuestaListCreateView.as_view(), name='respuestas-list-create'),
    path('respuestas/<str:pk>/', RespuestaDetailView.as_view(), name='respuestas-detail'),
    path('archivos/', ArchivoListCreateView.as_view(), name='archivos-list-create'),
    path('archivos/<uuid:pk>/', ArchivoDetailView.as_view(), name='archivos-detail'),
    path('sincronizar/', SincronizacionBatchView.as_view(), name='sincronizar-batch'),
    path('formulario/finalizar/', FinalizarFormularioView.as_view(), name='formulario-finalizar'),
]
