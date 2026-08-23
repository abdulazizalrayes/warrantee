-- Keep duplicate previews fail-safe when an incoming row contains an invalid
-- calendar date. Validation reports the row error after this matcher returns.

create or replace function public.match_warranty_import_duplicate_keys(p_rows jsonb)
returns table (duplicate_key text)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;
  if jsonb_array_length(p_rows) > 500 then
    raise exception 'p_rows exceeds the 500 row import limit';
  end if;

  return query
  with input_rows as (
    select
      nullif(btrim(item->>'key'), '') as row_key,
      lower(nullif(btrim(item->>'serial_number'), '')) as serial_number,
      lower(nullif(btrim(item->>'invoice_reference'), '')) as invoice_reference,
      lower(nullif(btrim(item->>'product_name'), '')) as product_name,
      nullif(btrim(item->>'start_date'), '') as start_date,
      nullif(btrim(item->>'end_date'), '') as end_date
    from jsonb_array_elements(p_rows) as input(item)
  )
  select distinct input.row_key
  from input_rows input
  where input.row_key is not null
    and (
      (
        input.serial_number is not null
        and exists (
          select 1
          from public.warranties warranty
          where warranty.user_id = (select auth.uid())
            and warranty.deleted_at is null
            and lower(btrim(warranty.serial_number)) = input.serial_number
        )
      )
      or (
        input.invoice_reference is not null
        and exists (
          select 1
          from public.warranties warranty
          where warranty.user_id = (select auth.uid())
            and warranty.deleted_at is null
            and lower(btrim(warranty.invoice_reference)) = input.invoice_reference
        )
      )
      or (
        input.serial_number is null
        and input.invoice_reference is null
        and input.product_name is not null
        and input.start_date is not null
        and input.end_date is not null
        and exists (
          select 1
          from public.warranties warranty
          where warranty.user_id = (select auth.uid())
            and warranty.deleted_at is null
            and nullif(btrim(warranty.serial_number), '') is null
            and nullif(btrim(warranty.invoice_reference), '') is null
            and lower(btrim(warranty.product_name)) = input.product_name
            and warranty.start_date::text = input.start_date
            and warranty.end_date::text = input.end_date
        )
      )
    );
end;
$$;

revoke all on function public.match_warranty_import_duplicate_keys(jsonb) from public;
grant execute on function public.match_warranty_import_duplicate_keys(jsonb) to authenticated;

notify pgrst, 'reload schema';
