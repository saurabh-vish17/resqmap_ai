FROM python:3.11-slim

WORKDIR /app

# Install dependencies needed for some python packages
RUN apt-get update && apt-get install -y gcc sqlite3 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose the API port
EXPOSE 8000

# Create db storage volume mount point
RUN mkdir -p /app/db

# Wait script or direct startup. We will just use straightforward uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
