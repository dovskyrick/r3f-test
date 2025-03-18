# Installing GODOT in a Docker Container

This guide explains how to install ESA's GODOT (Generic Orbit Determination and Orbit Analysis Tool) within a Docker container, adapting the standard virtual environment approach to work in a containerized environment.

## Prerequisites

- Docker installed on your system
- Access to ESA Gitlab or space-codev
- A personal access token for the respective Git repository

## Docker Implementation Approach

While the standard GODOT installation uses a Python virtual environment, we can adapt this approach for Docker by:

1. Creating a custom Dockerfile that installs GODOT
2. Configuring proper authentication for the ESA package registry
3. Setting up the Docker container with the necessary environment

## Step 1: Create a Personal Access Token

Before creating your Docker image, you need a personal access token:

1. Go to your user settings in ESA Gitlab (https://gitlab.esa.int/-/profile/personal_access_tokens) or space-codev
2. Create a new token with at least `read_api` and `read_repository` scopes
3. Save this token securely - you'll need it for the Docker build process

## Step 2: Create a Dockerfile

Create a `Dockerfile` in your project directory:

```dockerfile
# Use Python 3.6 (or version specified by GODOT requirements)
FROM python:3.6-slim

# Set working directory
WORKDIR /app

# Install any system dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements or directly install GODOT
COPY requirements.txt .

# Set environment variables for pip
ENV PIP_EXTRA_INDEX_URL=https://gitlab.esa.int/api/v4/projects/4424/packages/pypi/simple

# Create a .netrc file for authentication (will be removed in a multi-stage build)
ARG GIT_USERNAME
ARG GIT_TOKEN

# Set up authentication for package registry
RUN echo "machine gitlab.esa.int\nlogin ${GIT_USERNAME}\npassword ${GIT_TOKEN}" > /root/.netrc && \
    chmod 600 /root/.netrc && \
    # Install GODOT and dependencies
    pip install --upgrade pip && \
    pip install -r requirements.txt && \
    # Remove credentials after installation
    rm /root/.netrc

# Copy your application code
COPY . .

# Command to run when container starts
CMD ["python", "your_script.py"]
```

## Step 3: Create a requirements.txt file

Create a `requirements.txt` file with GODOT and other dependencies:

```
godot==1.0.0
# Add other dependencies here
```

## Step 4: Build the Docker Image

Build your Docker image, passing your Git credentials as build arguments:

```bash
docker build \
  --build-arg GIT_USERNAME=your_username \
  --build-arg GIT_TOKEN=your_personal_access_token \
  -t godot-app .
```

## Step 5: Run the Container

Run your Docker container:

```bash
docker run -it --rm godot-app
```

## Security Considerations

The above Dockerfile includes credentials only during the build process and removes them afterward. However, for production use, consider these more secure alternatives:

### Option 1: Multi-stage Build (Recommended)

```dockerfile
# Stage 1: Install dependencies
FROM python:3.6-slim as builder

WORKDIR /app

COPY requirements.txt .

# Set environment variables for pip
ENV PIP_EXTRA_INDEX_URL=https://gitlab.esa.int/api/v4/projects/4424/packages/pypi/simple

# Set up authentication
ARG GIT_USERNAME
ARG GIT_TOKEN
RUN echo "machine gitlab.esa.int\nlogin ${GIT_USERNAME}\npassword ${GIT_TOKEN}" > /root/.netrc && \
    chmod 600 /root/.netrc && \
    pip install --upgrade pip && \
    pip install -r requirements.txt && \
    pip wheel --wheel-dir=/app/wheels -r requirements.txt

# Stage 2: Final image
FROM python:3.6-slim

WORKDIR /app

# Copy wheels from builder stage
COPY --from=builder /app/wheels /app/wheels

# Install packages from wheels
RUN pip install --no-index --find-links=/app/wheels/ godot && \
    rm -rf /app/wheels

# Copy your application code
COPY . .

# Command to run when container starts
CMD ["python", "your_script.py"]
```

### Option 2: Using Docker BuildKit Secret

If you're using Docker BuildKit (available in Docker 18.09+), you can use build secrets:

```dockerfile
# Use BuildKit syntax
# syntax=docker/dockerfile:1.2

FROM python:3.6-slim

WORKDIR /app

COPY requirements.txt .

# Mount the secret during build
RUN --mount=type=secret,id=netrc,target=/root/.netrc,required=true \
    chmod 600 /root/.netrc && \
    pip install --upgrade pip && \
    pip install --extra-index-url https://gitlab.esa.int/api/v4/projects/4424/packages/pypi/simple -r requirements.txt

COPY . .

CMD ["python", "your_script.py"]
```

Build this image with:

```bash
# Create .netrc file first
echo "machine gitlab.esa.int\nlogin ${GIT_USERNAME}\npassword ${GIT_TOKEN}" > .netrc
chmod 600 .netrc

# Build with secret
DOCKER_BUILDKIT=1 docker build --secret id=netrc,src=.netrc -t godot-app .

# Remove .netrc after build
rm .netrc
```

## Docker Compose Setup

For a more complete setup, you can use Docker Compose:

```yaml
version: '3.8'

services:
  godot-api:
    build:
      context: .
      args:
        - GIT_USERNAME=${GIT_USERNAME}
        - GIT_TOKEN=${GIT_TOKEN}
    ports:
      - "8000:8000"
    volumes:
      - ./app:/app
    environment:
      - LOG_LEVEL=INFO
    restart: unless-stopped
```

Run with:

```bash
export GIT_USERNAME=your_username
export GIT_TOKEN=your_personal_access_token
docker-compose up
```

## Testing GODOT Installation

To verify that GODOT is correctly installed in your container, you can run:

```bash
docker run -it --rm godot-app python -c "import godot; print(godot.__version__)"
```

This should print the installed GODOT version.

## Troubleshooting

### Authentication Issues

If you encounter authentication issues:

1. Verify your personal access token has the correct permissions
2. Check that your token hasn't expired
3. Ensure the .netrc file is correctly formatted

### Package Not Found

If pip can't find the GODOT package:

1. Verify the extra-index-url is correct
2. Check that the project ID (4424) is correct for your version of GODOT
3. Try using the space-codev URL instead if you have access

## Conclusion

Following this guide allows you to install and use GODOT within a Docker container, making it easy to deploy your GODOT-based applications in containerized environments. The Docker approach offers advantages in terms of reproducibility and isolation compared to traditional virtual environments, while still allowing you to leverage ESA's GODOT toolkit for orbit determination and analysis. 