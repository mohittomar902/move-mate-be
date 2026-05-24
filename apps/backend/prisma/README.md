# Prisma Notes

The V1 schema stores latitude/longitude columns directly so local development only needs PostgreSQL.

When route matching needs real geospatial search, add PostGIS point columns with a migration:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE trips ADD COLUMN source_point geometry(Point, 4326);
ALTER TABLE trips ADD COLUMN destination_point geometry(Point, 4326);

UPDATE trips
SET
  source_point = ST_SetSRID(ST_MakePoint(source_lng, source_lat), 4326),
  destination_point = ST_SetSRID(ST_MakePoint(destination_lng, destination_lat), 4326);
```

New writes can populate points with:

```sql
ST_SetSRID(ST_MakePoint(source_lng, source_lat), 4326)
```

Then trip search can use `ST_DWithin` for pickup/drop radius and route overlap.
