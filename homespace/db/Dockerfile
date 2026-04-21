FROM mysql:8.0

COPY schema.sql /docker-entrypoint-initdb.d/01-schema.sql
COPY 02-dev-users.sql /docker-entrypoint-initdb.d/02-dev-users.sql
