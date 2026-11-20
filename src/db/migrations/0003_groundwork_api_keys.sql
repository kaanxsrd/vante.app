CREATE TABLE "gw_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"previous_key_hash" text,
	"previous_key_expires_at" timestamp with time zone,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"owner_id" text,
	"rate_limit" integer,
	"rate_limit_window" text,
	"daily_quota" integer,
	"allowed_ips" text[] DEFAULT '{}'::text[] NOT NULL,
	"allowed_origins" text[] DEFAULT '{}'::text[] NOT NULL,
	"metadata" jsonb,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	"suspended_until" timestamp with time zone,
	"suspended_reason" text,
	"rotated_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"last_used_ip" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gw_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"rule" text NOT NULL,
	"used" double precision NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "gw_api_keys_key_hash_idx" ON "gw_api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "gw_api_keys_prefix_idx" ON "gw_api_keys" USING btree ("prefix");--> statement-breakpoint
CREATE INDEX "gw_api_keys_previous_key_hash_idx" ON "gw_api_keys" USING btree ("previous_key_hash") WHERE previous_key_hash is not null;--> statement-breakpoint
CREATE INDEX "gw_api_keys_owner_idx" ON "gw_api_keys" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "gw_rate_limits_expires_at_idx" ON "gw_rate_limits" USING btree ("expires_at");