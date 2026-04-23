# Restaurar BD desde backup

```bash
docker exec rxflow_db psql -U rxcode_dba -d postgres -c "DROP DATABASE IF EXISTS rxflow;" && \
docker exec rxflow_db psql -U rxcode_dba -d postgres -c "CREATE DATABASE rxflow;" && \
docker exec -i rxflow_db psql -U rxcode_dba -d rxflow < rxflow_backup_20260423_140915.sql
```
