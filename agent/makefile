IMAGE_NAME = agent-app
CONTAINER_NAME = agent-container

.PHONY: build start stop restart

build:
	docker build -t $(IMAGE_NAME) .

# Start services using docker-compose
start:
	docker-compose up -d
	@echo "Services started. Application accessible at http://localhost"

# Stop services using docker-compose
stop:
	docker-compose down
	@echo "Services stopped"



restart: stop start
