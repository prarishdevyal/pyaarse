CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"kind" text NOT NULL,
	"value" integer NOT NULL,
	"min_subtotal" integer DEFAULT 0 NOT NULL,
	"max_discount" integer,
	"expires_at" timestamp with time zone,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "compare_at_price" integer;