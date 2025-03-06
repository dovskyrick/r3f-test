# GODOT Backend API

This is a backend service for orbital dynamics calculations using ESA's GODOT (Generic Orbit Determination and Orbit Analysis Tool).

## Prerequisites

- Docker and Docker Compose installed
- Access to space-codev.org GitLab
- A personal access token for space-codev.org

## Setup Instructions

### 1. Create a Personal Access Token

If you haven't already:

1. Go to your user settings in space-codev.org GitLab (https://gitlab.space-codev.org/-/profile/personal_access_tokens)
2. Create a new token with the following scopes:
   - `api` (Grants complete access to API, including package registry) - **REQUIRED**
   - `read_registry` (Specifically for registry access) - Recommended
3. Save this token securely

> **Important**: The `api` scope is critical for accessing the package registry. Without this permission, you'll get 401 Unauthorized errors when trying to install GODOT.

### 2. Configure Environment Variables

1. Copy the template file to create your environment file:

```bash
cp .env.template .env
```

2. Edit `.env` and add your space-codev.org GitLab username and personal access token:

```
GIT_USERNAME=your_username
GIT_TOKEN=your_personal_access_token
```

### 3. Build and Run the Container

Build and start the service with Docker Compose:

```bash
docker-compose up --build
```

The API will be available at http://localhost:8000

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /` - API information
- `POST /propagation/orbit` - Orbit propagation endpoint

## Development

The source code for the backend is in the `src` directory. The `src` directory is mounted as a volume in the Docker container, so changes to the code will be reflected immediately (restart the app inside the container if needed).

## Testing

You can test the health check endpoint to verify the API is running:

```bash
curl http://localhost:8000/health
```

For more detailed API documentation, access the Swagger UI:

```
http://localhost:8000/docs
```

## Troubleshooting

### Authentication Issues

If you encounter issues with GODOT installation:

1. **Token permissions**: Make sure your token has the `api` scope - this is the most important permission
2. **URL encoding**: If your token contains special characters, they will be automatically URL encoded
3. **Token expiration**: Check that your token hasn't expired
4. **GitLab URL**: The project is using space-codev.org with project ID 107

### Special Characters in Token

If your token contains special characters, they will be automatically URL encoded by the Dockerfile, but you can also manually encode them in the `.env` file:
- `-` (hyphen) becomes `%2D`
- `@` becomes `%40`
- `/` becomes `%2F`
- `:` becomes `%3A`

### Package Not Found

If pip can't find the GODOT package:

1. Verify you have access to the space-codev.org repository
2. Check if there are version constraints (the Dockerfile is looking for version 1.3.1)
3. Ask space-codev.org administrators if you need specific access to the package

### Docker Build Issues

If Docker build fails:

1. Check Docker logs for detailed error messages
2. Verify your Docker and Docker Compose installations
3. Try building with verbose output: `docker-compose build --progress=plain`

For other issues, consult the GODOT documentation or seek assistance from the space-codev.org support team. 