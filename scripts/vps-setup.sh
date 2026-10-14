#!/usr/bin/env bash
set -e

echo "=== 1. Installing PostgreSQL ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y postgresql postgresql-contrib

systemctl enable postgresql
systemctl start postgresql

echo "=== 2. Configuring PostgreSQL Database and User ==="
sudo -u postgres psql << 'EOF'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kiritoshop_user') THEN
    CREATE USER kiritoshop_user WITH PASSWORD 'KiritoShop2026SecurePass!';
  ELSE
    ALTER USER kiritoshop_user WITH PASSWORD 'KiritoShop2026SecurePass!';
  END IF;
END
$$;

SELECT 'CREATE DATABASE kiritoshop_db OWNER kiritoshop_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kiritoshop_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE kiritoshop_db TO kiritoshop_user;
EOF

sudo -u postgres psql -d kiritoshop_db -c "GRANT ALL ON SCHEMA public TO kiritoshop_user;"
sudo -u postgres psql -d kiritoshop_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kiritoshop_user;"
sudo -u postgres psql -d kiritoshop_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kiritoshop_user;"
sudo -u postgres psql -d kiritoshop_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kiritoshop_user;"
sudo -u postgres psql -d kiritoshop_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kiritoshop_user;"

echo "=== 3. PostgreSQL Ready ==="
