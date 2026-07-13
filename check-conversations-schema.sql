select column_name, data_type, column_default
from information_schema.columns
where table_name = 'conversations';
