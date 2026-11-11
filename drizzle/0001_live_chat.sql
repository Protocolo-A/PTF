CREATE TABLE IF NOT EXISTS "chat_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "visitor_token" text NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "unread_for_admin" boolean DEFAULT true NOT NULL,
  "unread_for_visitor" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_message_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_conversations_visitor_token_unique" ON "chat_conversations" USING btree ("visitor_token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversations_last_message_idx" ON "chat_conversations" USING btree ("last_message_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL REFERENCES "chat_conversations"("id") ON DELETE CASCADE,
  "sender" text NOT NULL,
  "message" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_conversation_created_idx" ON "chat_messages" USING btree ("conversation_id", "created_at");
