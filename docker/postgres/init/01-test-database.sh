#!/bin/sh
# Separate database for the e2e test suites (see .env.test.example).
# Names come from POSTGRES_TEST_DB and POSTGRES_USER, set in the root .env.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v test_db="$POSTGRES_TEST_DB" -v owner="$POSTGRES_USER" <<'SQL'
CREATE DATABASE :"test_db" OWNER :"owner";
SQL
