#!/bin/bash

echo "Setting up WMS Database..."

# WMS Database Setup Script
# This script creates the database, user, and grants necessary permissions

# Database configuration
DB_NAME="wms_database"
DB_USER="wms_user"
DB_PASSWORD="wms_password"

# Check if PostgreSQL is running
if ! pg_isready; then
    echo "PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Create database user
echo "Creating database user..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "User already exists or error occurred"

# Create database
echo "Creating database..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || echo "Database already exists or error occurred"

# Grant privileges
echo "Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"

echo "Database setup completed!"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Password: $DB_PASSWORD"
echo ""
echo "Next steps:"
echo "1. Copy config.env to .env"
echo "2. Run: npm install"
echo "3. Run: npm run db:migrate"
echo "4. Run: npm run db:seed" 