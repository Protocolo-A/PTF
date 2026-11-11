-- Extensiones aditivas para noticias y contexto de visitas.
-- No elimina, reemplaza ni vacía tablas ni registros existentes.
ALTER TABLE "chat_conversations" ADD COLUMN IF NOT EXISTS "device_type" text NOT NULL DEFAULT 'Dispositivo no identificado';
--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN IF NOT EXISTS "device_model" text;
--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN IF NOT EXISTS "location_label" text NOT NULL DEFAULT 'Ubicación no disponible';
--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN IF NOT EXISTS "latitude" double precision;
--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN IF NOT EXISTS "longitude" double precision;
--> statement-breakpoint
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "device_type" text NOT NULL DEFAULT 'Dispositivo no identificado';
--> statement-breakpoint
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "device_model" text;
--> statement-breakpoint
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "location_label" text NOT NULL DEFAULT 'Ubicación no disponible';
--> statement-breakpoint
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "latitude" double precision;
--> statement-breakpoint
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "longitude" double precision;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news_articles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "excerpt" text NOT NULL DEFAULT '',
  "cover_image" text NOT NULL DEFAULT '',
  "blocks" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status" text NOT NULL DEFAULT 'draft',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "news_articles_slug_unique" ON "news_articles" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "news_articles_status_published_idx" ON "news_articles" USING btree ("status", "published_at");
