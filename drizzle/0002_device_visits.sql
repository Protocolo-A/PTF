-- Cambios aditivos para identificar el tipo de dispositivo y registrar visitas.
-- No elimina ni reemplaza las tablas existentes ni sus datos.
ALTER TABLE "chat_conversations" ADD COLUMN IF NOT EXISTS "device_label" text NOT NULL DEFAULT 'Dispositivo no identificado';
--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN IF NOT EXISTS "browser_name" text NOT NULL DEFAULT 'Navegador no identificado';
--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN IF NOT EXISTS "platform_name" text NOT NULL DEFAULT 'Sistema no identificado';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_visits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "visitor_token" text NOT NULL,
  "device_label" text NOT NULL,
  "browser_name" text NOT NULL,
  "platform_name" text NOT NULL,
  "path" text DEFAULT '/' NOT NULL,
  "visited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "site_visits_visitor_token_unique" ON "site_visits" USING btree ("visitor_token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_visits_visited_at_idx" ON "site_visits" USING btree ("visited_at");
