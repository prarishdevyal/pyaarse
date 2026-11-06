ALTER TABLE "product_variants" ADD COLUMN "weight_grams" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "length_cm" numeric(6, 1);--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "width_cm" numeric(6, 1);--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "height_cm" numeric(6, 1);--> statement-breakpoint
-- Shipping details supplied by the shop for the existing products (only fills empty values).
UPDATE "product_variants" v SET "weight_grams" = 491, "length_cm" = 24, "width_cm" = 16, "height_cm" = 6 FROM "products" p WHERE v."product_id" = p."id" AND p."slug" = 'wooden-rose-candle-hamper' AND v."weight_grams" IS NULL;--> statement-breakpoint
UPDATE "product_variants" v SET "weight_grams" = 288, "length_cm" = 20.4, "width_cm" = 20.4, "height_cm" = 7.7 FROM "products" p WHERE v."product_id" = p."id" AND p."slug" = 'maa-laxmi-hamper-with-candles' AND v."weight_grams" IS NULL;--> statement-breakpoint
UPDATE "product_variants" v SET "weight_grams" = 121, "length_cm" = 12, "width_cm" = 12, "height_cm" = 5 FROM "products" p WHERE v."product_id" = p."id" AND p."slug" = 'moti-choor-candle-hamper-box' AND v."weight_grams" IS NULL;--> statement-breakpoint
UPDATE "product_variants" v SET "weight_grams" = 348, "length_cm" = 16, "width_cm" = 16, "height_cm" = 6 FROM "products" p WHERE v."product_id" = p."id" AND p."slug" = 'neelkamal-candle-hamper' AND v."weight_grams" IS NULL;
