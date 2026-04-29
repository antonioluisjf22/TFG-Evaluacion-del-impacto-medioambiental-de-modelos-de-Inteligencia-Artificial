# ── Etapa 1: dependencias ────────────────────────────────────────────────────
FROM python:3.12-slim AS deps

WORKDIR /app

# Instalar dependencias del sistema mínimas (pandas necesita compilador para
# algunas arquitecturas, pero la imagen slim de Python 3.12 incluye las
# bibliotecas de C necesarias para los wheels precompilados de PyPI)
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Etapa 2: imagen final ─────────────────────────────────────────────────────
FROM python:3.12-slim AS final

# Usuario sin privilegios para ejecutar la aplicación
RUN groupadd --gid 1001 appgroup \
    && useradd --uid 1001 --gid appgroup --no-create-home appuser

WORKDIR /app

# Copiar dependencias instaladas desde la etapa anterior
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copiar el código fuente
COPY app/       ./app/
COPY scripts/   ./scripts/
COPY datasets/  ./datasets/
COPY run.py     .

RUN chown -R appuser:appgroup /app

USER appuser

# Puerto que expone la aplicación (Gunicorn)
EXPOSE 5000

# Variables de entorno con valores por defecto seguros
ENV FLASK_ENV=production \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Gunicorn como servidor WSGI de producción:
#   - 2 workers síncronos (ajustar según CPU disponible)
#   - timeout de 120 s para peticiones de cálculo pesadas
CMD ["python", "-m", "gunicorn", \
     "--workers", "2", \
     "--bind", "0.0.0.0:5000", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "run:app"]
