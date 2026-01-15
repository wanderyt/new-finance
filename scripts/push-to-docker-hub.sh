#!/bin/bash

# Script to build and push new-finance to Docker Hub
# Usage: ./scripts/push-to-docker-hub.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Docker Hub username is hardcoded
DOCKER_USERNAME="wanderyt"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}Building new-finance version ${VERSION}${NC}"

# Docker image name
IMAGE_NAME="${DOCKER_USERNAME}/new-finance"

echo -e "${YELLOW}Step 1: Building Docker image...${NC}"
docker build -t ${IMAGE_NAME}:${VERSION} -t ${IMAGE_NAME}:latest .

echo -e "${GREEN}✓ Image built successfully${NC}"

echo -e "${YELLOW}Step 2: Logging in to Docker Hub...${NC}"
docker login

echo -e "${YELLOW}Step 3: Pushing images to Docker Hub...${NC}"
docker push ${IMAGE_NAME}:${VERSION}
docker push ${IMAGE_NAME}:latest

echo -e "${GREEN}✓ Images pushed successfully!${NC}"
echo ""
echo -e "${GREEN}Your image is now available at:${NC}"
echo -e "  https://hub.docker.com/r/${DOCKER_USERNAME}/new-finance"
echo ""
echo -e "${GREEN}Available tags:${NC}"
echo -e "  - ${IMAGE_NAME}:${VERSION}"
echo -e "  - ${IMAGE_NAME}:latest"
echo ""
echo -e "${GREEN}To pull on your NAS:${NC}"
echo -e "  docker pull ${IMAGE_NAME}:latest"
echo ""
echo -e "${GREEN}Or use docker-compose to deploy:${NC}"
echo -e "  docker-compose up -d"
