CREATE TABLE "gw_audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gw_audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"actor_label" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"summary" text,
	"changes" jsonb,
	"metadata" jsonb,
	"ip" text,
	"request_id" text
);
--> statement-breakpoint
CREATE INDEX "gw_audit_log_occurred_at_idx" ON "gw_audit_log" USING btree ("occurred_at","id");--> statement-breakpoint
CREATE INDEX "gw_audit_log_action_idx" ON "gw_audit_log" USING btree ("action","occurred_at","id");--> statement-breakpoint
CREATE INDEX "gw_audit_log_entity_idx" ON "gw_audit_log" USING btree ("entity_type","entity_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "gw_audit_log_actor_idx" ON "gw_audit_log" USING btree ("actor_type","actor_id","occurred_at","id");