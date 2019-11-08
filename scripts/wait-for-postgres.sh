#!/bin/sh
# wait-for-postgres.sh

set -e

host="$1"
database="$S2"
username="$3"
shift
cmd="$@"

until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$host" -U "$username" -d "$database" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - executing command"
exec $cmd
