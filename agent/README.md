# Agent Application

This is a FastAPI application with Docker and Nginx setup.

## Requirements

- Docker
- Docker Compose

## Usage

### Start the Application

```bash
make start
```

This command will:
1. Build the Docker image using the Dockerfile
2. Start both the application and Nginx using Docker Compose
3. The application will be accessible at http://localhost

### Stop the Application

```bash
make stop
```

This command will stop and remove all containers.

### Restart the Application

```bash
make restart
```

This will stop and start the application in one command.

## Architecture

- The FastAPI application runs on port 8000 inside the Docker container
- Nginx acts as a reverse proxy, forwarding requests from port 80 to the application
- All services are connected through a Docker network

## API Endpoints

- `GET /`: Simple Hello World endpoint
- `POST /translate`: Translation service
- `POST /yc_coach`: YC Coach service 