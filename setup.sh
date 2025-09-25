#!/bin/bash

# Smart e-National ID Queue Management System
# Quick Setup Script for Development

echo "🇿🇼 Smart e-National ID Queue Management System"
echo "=================================================="
echo "Setting up the development environment..."
echo ""

# Backend Setup
echo "📦 Setting up Backend (FastAPI)..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Copy environment file
if [ ! -f ".env" ]; then
    echo "Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your actual configuration"
fi

# Create and seed database
echo "Setting up database with sample data..."
python seed_data.py

echo "✅ Backend setup complete!"
echo ""

# Frontend Setup
echo "📦 Setting up Frontend (React)..."
cd ../frontend

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

echo "✅ Frontend setup complete!"
echo ""

# Final instructions
echo "🚀 Setup Complete!"
echo "=================================================="
echo ""
echo "To start the development servers:"
echo ""
echo "Backend (Terminal 1):"
echo "  cd backend"
echo "  source venv/bin/activate  # On Windows: venv\\Scripts\\activate"
echo "  uvicorn main:app --reload"
echo "  API will be available at: http://localhost:8000"
echo "  API Documentation: http://localhost:8000/docs"
echo ""
echo "Frontend (Terminal 2):"
echo "  cd frontend"
echo "  npm start"
echo "  App will be available at: http://localhost:3000"
echo ""
echo "📋 Sample Login Credentials:"
echo "  Admin: admin@example.com / admin123"
echo "  Staff: staff@example.com / staff123"
echo "  Citizen: john.doe@example.com / user123"
echo ""
echo "🔧 Configuration:"
echo "  - Backend: backend/.env"
echo "  - Frontend: frontend/.env"
echo ""
echo "Happy coding! 🎉"