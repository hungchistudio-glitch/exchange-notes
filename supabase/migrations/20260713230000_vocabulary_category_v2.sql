-- Map old categories to the new 4-category scheme.
-- food/transportation/daily_objects/animals all become 'objects';
-- old 'other' stays 'other'.
update vocabulary_items
set category = case
  when category in ('food', 'transportation', 'daily_objects', 'animals') then 'objects'
  when category = 'other' then 'other'
  else category
end;

alter table vocabulary_items
  alter column category set default 'other';

alter table vocabulary_items
  drop constraint if exists vocabulary_items_category_check;

alter table vocabulary_items
  add constraint vocabulary_items_category_check
  check (category in ('people', 'objects', 'actions', 'other'));
