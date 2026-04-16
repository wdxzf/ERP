FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN mkdir -p /app/data /app/uploads/purchase_invoices /app/uploads/revision_drawings

COPY app ./app
COPY scripts ./scripts
COPY README.md README_EN.md LICENSE DISCLAIMER.md ./
COPY image ./image
COPY .env.example ./

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
