#!/bin/sh
# Create the application roles on first cluster start (runs once, from
# /docker-entrypoint-initdb.d, as the postgres superuser).
#
# Roles are cluster-level and carry credentials, so they live here and NOT in
# migrations. Migrations only GRANT. Least privilege per connection:
#   app_user         the web app; RLS enforced (no BYPASSRLS), no DDL
#   migrator         owns schema changes; the only role that runs migrations
#   register_reader  the register MCP; SELECT on the two register objects only
#   backup           pg_dump / WAL tooling; read-only
# Passwords arrive as env vars (compose for local, Kamal secrets on the VPS).
set -eu

: "${APP_USER_PASSWORD:?APP_USER_PASSWORD is required}"
: "${MIGRATOR_PASSWORD:?MIGRATOR_PASSWORD is required}"
: "${REGISTER_READER_PASSWORD:?REGISTER_READER_PASSWORD is required}"
: "${BACKUP_PASSWORD:?BACKUP_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
create role app_user        login password '${APP_USER_PASSWORD}'        nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
create role migrator        login password '${MIGRATOR_PASSWORD}'        nosuperuser createdb   nocreaterole noinherit nobypassrls;
create role register_reader login password '${REGISTER_READER_PASSWORD}' nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
create role backup          login password '${BACKUP_PASSWORD}'          nosuperuser nocreatedb nocreaterole noinherit nobypassrls;

-- migrator owns the public schema so every object it creates is its own;
-- grants to app_user / register_reader are made by the migrations themselves.
alter schema public owner to migrator;
grant usage on schema public to app_user, register_reader, backup;

-- Extensions need a superuser, so install the ones the schema relies on now.
create extension if not exists pg_trgm;

-- Read-everything for backups, including future tables.
grant pg_read_all_data to backup;

-- Sanity: nothing here may bypass RLS or hold superuser.
do \$\$
begin
  if exists (select 1 from pg_roles
             where rolname in ('app_user','migrator','register_reader','backup')
               and (rolsuper or rolbypassrls)) then
    raise exception 'application roles must not be superuser or bypass RLS';
  end if;
end
\$\$;
SQL
