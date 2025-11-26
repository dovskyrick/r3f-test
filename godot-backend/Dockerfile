# Stage 1: Install dependencies
FROM python:3.6-slim as builder

WORKDIR /app

COPY requirements.txt .

# Set up authentication with direct URL format
ARG GIT_USERNAME
ARG GIT_TOKEN

# Install Python's URL encoding tools and use them to encode the token
RUN pip install --upgrade pip && \
    # Use Python to URL encode the token
    TOKEN_ENCODED=$(python -c "import urllib.parse; print(urllib.parse.quote('${GIT_TOKEN}'))") && \
    # Set pip config with the encoded token
    pip config set global.extra-index-url https://${GIT_USERNAME}:${TOKEN_ENCODED}@gitlab.space-codev.org/api/v4/projects/107/packages/pypi/simple && \
    # Install packages
    pip install -r requirements.txt && \
    pip wheel --wheel-dir=/app/wheels -r requirements.txt

# Stage 2: Final image
FROM python:3.6-slim

WORKDIR /app

# Copy wheels from builder stage
COPY --from=builder /app/wheels /app/wheels

# Install packages from wheels
RUN pip install --no-index --find-links=/app/wheels/ godot fastapi uvicorn pydantic numpy scipy python-multipart httpx && \
    rm -rf /app/wheels

# Copy application code
COPY ./src /app/src
COPY ./config /app/config
COPY ./data /app/data

# Create a directory for outputs
RUN mkdir -p /app/output

# Expose the API port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"] 