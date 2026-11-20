ALTER TABLE "api_requests" DROP CONSTRAINT "api_requests_api_key_id_api_keys_id_fk";
--> statement-breakpoint
ALTER TABLE "security_events" DROP CONSTRAINT "security_events_api_key_id_api_keys_id_fk";
--> statement-breakpoint
ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_api_key_id_gw_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."gw_api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_api_key_id_gw_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."gw_api_keys"("id") ON DELETE set null ON UPDATE no action;