#!/bin/bash
# ==================== FREELANCER MARKETPLACE - QUICK START SCRIPT ====================
# Usage: chmod +x quickstart.sh && ./quickstart.sh

echo ""
echo "================================="
echo "🚀 FREELANCER MARKETPLACE SETUP"
echo "================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found. Please install npm first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found${NC}"

# Frontend Setup
echo ""
echo -e "${BLUE}[1/4] Setting up frontend...${NC}"
cd frontend
npm install --legacy-peer-deps
echo -e "${GREEN}✓ Frontend dependencies installed${NC}""

# Verify backend is running
echo ""
echo -e "${BLUE}[2/4] Checking backend connection...${NC}"
if curl -s http://localhost:8080/api/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is running on port 8080${NC}"
else
    echo -e "${YELLOW}⚠ Backend not detected on port 8080${NC}"
    echo -e "${YELLOW}Make sure to start the backend first:${NC}"
    echo -e "${YELLOW}  cd backend && ./build/FreelancePlatform${NC}"
    echo ""
fi

# Create sample .env file
echo ""
echo -e "${BLUE}[3/4] Creating configuration files...${NC}"
cat > .env.local << EOF
VITE_API_URL=http://localhost:8080/api
VITE_APP_NAME=Freelancer Marketplace
EOF
echo -e "${GREEN}✓ Configuration file created (.env.local)${NC}"

# Summary
echo ""
echo "================================="
echo "✅ SETUP COMPLETE!"
echo "================================="
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "${YELLOW}Terminal 1 - Backend:${NC}"
echo "  cd backend/build"
echo "  ./FreelancePlatform"
echo ""
echo -e "${YELLOW}Terminal 2 - Frontend:${NC}"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo -e "${BLUE}Then visit:${NC}"
echo "  Frontend: http://localhost:5173"
echo "  Backend API: http://localhost:8080/api"
echo ""
echo -e "${GREEN}For complete setup guide, see DEPLOYMENT_GUIDE.md${NC}"
echo ""
