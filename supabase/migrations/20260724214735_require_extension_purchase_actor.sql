alter table public.warranty_extensions
  drop constraint if exists warranty_extensions_purchase_actor_required,
  add constraint warranty_extensions_purchase_actor_required
    check (is_purchased = false or purchased_by is not null);
