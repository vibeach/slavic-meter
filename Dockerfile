FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY templates/ templates/
COPY static/ static/

ENV PORT=10000
ENV DB_PATH=/var/data/slavic.db
EXPOSE 10000

CMD ["gunicorn", "-w", "2", "-k", "gthread", "--threads", "8", "-t", "180", "-b", "0.0.0.0:10000", "app:app"]
