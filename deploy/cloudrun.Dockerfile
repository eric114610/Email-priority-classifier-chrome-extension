FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Copy only backend code and requirements
COPY backend /app/backend
COPY backend/requirements.txt /app/backend/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Expose the port Cloud Run will use
EXPOSE 8000

# Run FastAPI app with uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
