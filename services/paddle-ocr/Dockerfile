FROM python:3.11.13-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True \
    HOME=/tmp \
    PADDLE_PDX_CACHE_HOME=/tmp/paddle-models

RUN apt-get update \
    && apt-get install --no-install-recommends -y libgl1 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /service
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py ./

USER 65532:65532
EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--no-access-log"]
