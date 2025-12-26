#!/bin/bash

echo "🚀 Starting quick project update..."

# Switch to root
sudo su -c "

echo '📦 Stopping Docker containers...'
docker compose down

echo '📥 Pulling latest code...'
git pull

echo '🔨 Building and starting containers...'
docker compose up --build -d

echo '✅ Update completed!'
"