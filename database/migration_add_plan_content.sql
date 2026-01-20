-- Migration to add plan_content column for ProjectPlan storage
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS plan_content TEXT;
