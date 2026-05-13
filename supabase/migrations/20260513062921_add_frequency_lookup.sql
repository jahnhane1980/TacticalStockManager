
  create table "public"."frequency_lookup" (
    "id" text not null,
    "label" text not null,
    "description" text,
    "interval_minutes" integer not null default 1440,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."frequency_lookup" enable row level security;

alter table "public"."monitoring_config" drop column "frequency";

alter table "public"."monitoring_config" add column "frequency_id" text not null default 'daily'::text;

CREATE UNIQUE INDEX frequency_lookup_pkey ON public.frequency_lookup USING btree (id);

alter table "public"."frequency_lookup" add constraint "frequency_lookup_pkey" PRIMARY KEY using index "frequency_lookup_pkey";

alter table "public"."monitoring_config" add constraint "monitoring_config_frequency_id_fkey" FOREIGN KEY (frequency_id) REFERENCES public.frequency_lookup(id) not valid;

alter table "public"."monitoring_config" validate constraint "monitoring_config_frequency_id_fkey";

grant delete on table "public"."frequency_lookup" to "anon";

grant insert on table "public"."frequency_lookup" to "anon";

grant references on table "public"."frequency_lookup" to "anon";

grant select on table "public"."frequency_lookup" to "anon";

grant trigger on table "public"."frequency_lookup" to "anon";

grant truncate on table "public"."frequency_lookup" to "anon";

grant update on table "public"."frequency_lookup" to "anon";

grant delete on table "public"."frequency_lookup" to "authenticated";

grant insert on table "public"."frequency_lookup" to "authenticated";

grant references on table "public"."frequency_lookup" to "authenticated";

grant select on table "public"."frequency_lookup" to "authenticated";

grant trigger on table "public"."frequency_lookup" to "authenticated";

grant truncate on table "public"."frequency_lookup" to "authenticated";

grant update on table "public"."frequency_lookup" to "authenticated";

grant delete on table "public"."frequency_lookup" to "service_role";

grant insert on table "public"."frequency_lookup" to "service_role";

grant references on table "public"."frequency_lookup" to "service_role";

grant select on table "public"."frequency_lookup" to "service_role";

grant trigger on table "public"."frequency_lookup" to "service_role";

grant truncate on table "public"."frequency_lookup" to "service_role";

grant update on table "public"."frequency_lookup" to "service_role";


