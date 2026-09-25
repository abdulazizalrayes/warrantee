# Searchable dropdowns

Owner requirement: every existing dropdown must allow typed search.

All native select call sites under src now use SearchableSelect: language,
coverage types, contact subjects, seller industries, team roles, administrator
configuration/invitations, ingestion status, claim decisions, warranty category,
bulk status, transfer warranty, import mapping, extensions and claim fields.

The shared component places a localized search field above the native select.
It filters labels and values, ignoring case and Arabic diacritics. It retains
the current option even when filtered out so searching never changes submitted
data. Native option restrictions, onChange handlers, required validation, names
and disabled behavior are preserved. Enter/ArrowDown focuses the select without
submitting the form; Escape clears search. No-result feedback is announced.

Checks: TypeScript, focused ESLint, unit suite, production build and English/
Arabic desktop/mobile public-contact browser tests. The browser test checks
filtering, selection preservation, no results, keyboard behavior, RTL and
horizontal overflow. A source-inventory regression test disallows new native
selects outside the shared component.

Authenticated portal journeys still require authenticated browser verification
before production release. No backend, permissions, CRM or production data was
changed. Rollback: revert this feature commit. No new dependency or paid service.
