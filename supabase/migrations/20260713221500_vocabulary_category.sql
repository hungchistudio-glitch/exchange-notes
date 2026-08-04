alter table vocabulary_items
  add column category text not null default 'other';
alter table vocabulary_items
  add constraint vocabulary_items_category_check
  check (category in ('food', 'transportation', 'daily_objects', 'animals', 'other'));
