CREATE TABLE "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"position" text DEFAULT '' NOT NULL,
	"avatar" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "author" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "author" DROP NOT NULL;--> statement-breakpoint
INSERT INTO "authors" ("slug", "name") SELECT DISTINCT "author", "author" FROM "posts" WHERE "author" IS NOT NULL ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_authors_slug_fk" FOREIGN KEY ("author") REFERENCES "public"."authors"("slug") ON DELETE set null ON UPDATE cascade;