CREATE TABLE "default_views" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT,
    "view_name" TEXT NOT NULL,
    "view_id" TEXT NOT NULL,

    CONSTRAINT "default_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique index with NULLS NOT DISTINCT (PostgreSQL 15+)
-- This ensures (project_id, NULL, view_name) can only exist once for project-level defaults
CREATE UNIQUE INDEX "default_views_project_id_user_id_view_name_key"
ON "default_views" ("project_id", "user_id", "view_name") NULLS NOT DISTINCT;

-- CreateIndex: Index for lookups by project and view name
CREATE INDEX "default_views_project_id_view_name_idx" ON "default_views"("project_id", "view_name");

ALTER TABLE "default_views" ADD CONSTRAINT "default_views_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "default_views" ADD CONSTRAINT "default_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
