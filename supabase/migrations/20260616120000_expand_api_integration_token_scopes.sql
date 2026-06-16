-- Align stored integration-token scope validation with the public API surface.
-- The application and API docs now support claims/document read scopes in
-- addition to warranty read/write scopes.

alter table if exists public.api_integration_tokens
  drop constraint if exists api_integration_tokens_scopes_allowed;

alter table if exists public.api_integration_tokens
  add constraint api_integration_tokens_scopes_allowed check (
    scopes <@ array[
      'warranties:read',
      'warranties:write',
      'claims:read',
      'documents:read'
    ]::text[]
    and cardinality(scopes) > 0
  );

notify pgrst, 'reload schema';
