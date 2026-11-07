-- Backfill: colunas já chamadas "Agendado" ganham automaticamente o power-up
-- "Abrir agendamento de publicação", para que o gatilho de arrastar-para-agendar
-- continue funcionando sem esforço extra e apareça visível/editável na lista
-- de power-ups da coluna.
INSERT INTO "ColumnAutomation" ("id", "trigger", "action", "active", "position", "columnId")
SELECT
  'seed_' || lower(hex(randomblob(12))),
  'ENTER_COLUMN',
  'PROMPT_SCHEDULE',
  1,
  0,
  "id"
FROM "KanbanColumn"
WHERE lower(trim("name")) = 'agendado'
  AND "id" NOT IN (
    SELECT "columnId" FROM "ColumnAutomation" WHERE "action" = 'PROMPT_SCHEDULE' AND "cardId" IS NULL
  );
