CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer,
	"action" varchar(50) NOT NULL,
	"entity" varchar(50) NOT NULL,
	"entity_id" varchar(50),
	"before_json" jsonb,
	"after_json" jsonb,
	"ip" "inet",
	"request_id" uuid
);
--> statement-breakpoint
CREATE TABLE "doc_sequences" (
	"prefix" varchar(12) NOT NULL,
	"business_date" date NOT NULL,
	"last_no" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "doc_sequences_prefix_business_date_pk" PRIMARY KEY("prefix","business_date")
);
--> statement-breakpoint
CREATE TABLE "finance_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"kind" varchar(7) NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "finance_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "finance_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"txn_date" date NOT NULL,
	"kind" varchar(7) NOT NULL,
	"channel" varchar(4),
	"category_id" integer NOT NULL,
	"amount_rupiah" numeric(15, 0) NOT NULL,
	"source_type" varchar(20) DEFAULT 'MANUAL' NOT NULL,
	"source_id" integer,
	"note" text,
	"created_by" integer NOT NULL,
	"is_reversed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_yield_preps" (
	"id" serial PRIMARY KEY NOT NULL,
	"prep_code" varchar(50) NOT NULL,
	"source_item_id" integer NOT NULL,
	"output_item_id" integer NOT NULL,
	"source_qty_used" numeric(15, 4) NOT NULL,
	"clean_output_qty" numeric(15, 4) NOT NULL,
	"waste_qty" numeric(15, 4) NOT NULL,
	"waste_reason" varchar(100),
	"transferred_value_rupiah" numeric(15, 4) NOT NULL,
	"prep_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"is_reversed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "inventory_yield_preps_prep_code_unique" UNIQUE("prep_code")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" varchar(40) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(20) NOT NULL,
	"stock_mode" varchar(12) DEFAULT 'STOCKED' NOT NULL,
	"unit_base" varchar(5) NOT NULL,
	"display_unit" varchar(10) DEFAULT 'g' NOT NULL,
	"display_factor" numeric(15, 4) DEFAULT '1' NOT NULL,
	"current_stock_qty" numeric(15, 4) DEFAULT '0' NOT NULL,
	"current_stock_value_rupiah" numeric(15, 4) DEFAULT '0' NOT NULL,
	"current_avg_cost_rupiah" numeric(15, 4),
	"oversold" boolean DEFAULT false NOT NULL,
	"min_stock_alert" numeric(15, 4),
	"normal_shrink_min_pct" numeric(5, 2),
	"normal_shrink_max_pct" numeric(5, 2),
	"sell_price_rupiah" numeric(15, 0),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "opname_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"system_qty_snapshot" numeric(15, 4) NOT NULL,
	"counted_qty" numeric(15, 4),
	"system_qty_at_post" numeric(15, 4),
	"diff_qty" numeric(15, 4),
	"diff_value_rupiah" numeric(15, 4)
);
--> statement-breakpoint
CREATE TABLE "opname_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"session_date" date NOT NULL,
	"responsible_id" integer NOT NULL,
	"status" varchar(10) DEFAULT 'DRAFT' NOT NULL,
	"approved_by" integer,
	"total_diff_value_rupiah" numeric(15, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"posted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "production_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_code" varchar(100) NOT NULL,
	"recipe_id" integer,
	"output_item_id" integer NOT NULL,
	"operator_id" integer NOT NULL,
	"status" varchar(10) DEFAULT 'DRAFT' NOT NULL,
	"batch_date" timestamp with time zone NOT NULL,
	"qty_good" numeric(15, 4),
	"qty_waste" numeric(15, 4) DEFAULT '0' NOT NULL,
	"waste_treatment" varchar(20),
	"total_cost_rupiah" numeric(15, 4),
	"output_value_rupiah" numeric(15, 4),
	"loss_value_rupiah" numeric(15, 4) DEFAULT '0' NOT NULL,
	"hpp_per_unit_rupiah" numeric(15, 4),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"is_reversed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "production_batches_batch_code_unique" UNIQUE("batch_code")
);
--> statement-breakpoint
CREATE TABLE "production_inputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"qty" numeric(15, 4) NOT NULL,
	"value_rupiah" numeric(15, 4),
	"is_overhead" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"qty" numeric(15, 4) NOT NULL,
	"line_total_rupiah" numeric(15, 0) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_code" varchar(40) NOT NULL,
	"supplier_name" varchar(150),
	"purchase_date" date NOT NULL,
	"payment_channel" varchar(4) NOT NULL,
	"total_rupiah" numeric(15, 0) NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reversed_by_id" integer,
	"is_reversed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "purchases_purchase_code_unique" UNIQUE("purchase_code")
);
--> statement-breakpoint
CREATE TABLE "recipe_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"qty_per_basis" numeric(15, 4) NOT NULL,
	"is_overhead" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"output_item_id" integer NOT NULL,
	"basis_qty" numeric(15, 4) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"flag_type" varchar(20) NOT NULL,
	"detail" jsonb,
	"resolved_by" integer,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"line_type" varchar(8) NOT NULL,
	"item_id" integer,
	"qty" numeric(15, 4) DEFAULT '1' NOT NULL,
	"unit_price_rupiah" numeric(15, 0) NOT NULL,
	"line_total_rupiah" numeric(15, 0) NOT NULL,
	"hpp_snapshot_unit_rupiah" numeric(15, 4) DEFAULT '0' NOT NULL,
	"reduction_type" varchar(16) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_code" varchar(40) NOT NULL,
	"offline_invoice_id" uuid NOT NULL,
	"offline_device_id" varchar(100),
	"shift_id" integer,
	"created_by" integer NOT NULL,
	"device_created_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_date" date NOT NULL,
	"subtotal_rupiah" numeric(15, 0) NOT NULL,
	"shipping_cost_rupiah" numeric(15, 0) DEFAULT '0' NOT NULL,
	"discount_rupiah" numeric(15, 0) DEFAULT '0' NOT NULL,
	"total_amount_rupiah" numeric(15, 0) NOT NULL,
	"cogs_rupiah" numeric(15, 4) DEFAULT '0' NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"payment_channel" varchar(4) NOT NULL,
	"is_offline_synced" boolean DEFAULT true NOT NULL,
	"is_reversed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "sales_sale_code_unique" UNIQUE("sale_code"),
	CONSTRAINT "sales_offline_invoice_id_unique" UNIQUE("offline_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"cashier_id" integer NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"opening_cash_rupiah" numeric(15, 0) DEFAULT '0' NOT NULL,
	"counted_cash_rupiah" numeric(15, 0)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"movement_type" varchar(20) NOT NULL,
	"qty_delta" numeric(15, 4) NOT NULL,
	"value_delta_rupiah" numeric(15, 4) NOT NULL,
	"qty_after" numeric(15, 4) NOT NULL,
	"value_after_rupiah" numeric(15, 4) NOT NULL,
	"reference_type" varchar(30) NOT NULL,
	"reference_id" integer NOT NULL,
	"reverses_movement_id" bigserial NOT NULL,
	"created_by" integer,
	"notes" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"role" varchar(10) NOT NULL,
	"password_hash" text NOT NULL,
	"must_change_pw" boolean DEFAULT false NOT NULL,
	"session_epoch" integer DEFAULT 0 NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_category_id_finance_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."finance_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_yield_preps" ADD CONSTRAINT "inventory_yield_preps_source_item_id_items_id_fk" FOREIGN KEY ("source_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_yield_preps" ADD CONSTRAINT "inventory_yield_preps_output_item_id_items_id_fk" FOREIGN KEY ("output_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_yield_preps" ADD CONSTRAINT "inventory_yield_preps_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opname_lines" ADD CONSTRAINT "opname_lines_session_id_opname_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."opname_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opname_lines" ADD CONSTRAINT "opname_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opname_sessions" ADD CONSTRAINT "opname_sessions_responsible_id_users_id_fk" FOREIGN KEY ("responsible_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opname_sessions" ADD CONSTRAINT "opname_sessions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_output_item_id_items_id_fk" FOREIGN KEY ("output_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_inputs" ADD CONSTRAINT "production_inputs_batch_id_production_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_inputs" ADD CONSTRAINT "production_inputs_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_lines" ADD CONSTRAINT "recipe_lines_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_lines" ADD CONSTRAINT "recipe_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_output_item_id_items_id_fk" FOREIGN KEY ("output_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_flags" ADD CONSTRAINT "sale_flags_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_flags" ADD CONSTRAINT "sale_flags_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fin_date" ON "finance_transactions" USING btree ("txn_date","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_items_name" ON "items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_items_category" ON "items" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_opname_session_item" ON "opname_lines" USING btree ("session_id","item_id");--> statement-breakpoint
CREATE INDEX "idx_sm_item_date" ON "stock_movements" USING btree ("item_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_sm_ref" ON "stock_movements" USING btree ("reference_type","reference_id");