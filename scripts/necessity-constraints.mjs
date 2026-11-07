const oldLevels = /'essential'\s*,\s*'personal_priority'\s*,\s*'flexible'(?=\s*\))/g;
const expandedLevels = "'essential', 'personal_priority', 'flexible', 'unexpected'";
const identifier = (name) => `"${name.replaceAll('"', '""')}"`;

function pendingTables(database) {
  return ["fin", "fin_items"].flatMap((name) => {
    const table = database.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
    if (!table || !database.pragma(`table_info(${name})`).some((column) => column.name === "necessity_level")) return [];
    const updated = table.sql.replace(oldLevels, expandedLevels);
    return updated !== table.sql ? [{ name, sql: updated }] : [];
  });
}

export function expandNecessityConstraints(database, dryRun = false) {
  if (dryRun) return pendingTables(database).length;
  const foreignKeys = database.pragma("foreign_keys", { simple: true });
  const legacyAlter = database.pragma("legacy_alter_table", { simple: true });
  database.pragma("foreign_keys = OFF");
  database.pragma("legacy_alter_table = ON");
  try {
    return database.transaction(() => {
      const tables = pendingTables(database);
      for (const table of tables) {
        const replacement = `__necessity_${table.name}`;
        if (database.prepare("SELECT 1 FROM sqlite_master WHERE name = ?").get(replacement)) {
          throw new Error("A spending priority replacement table already exists.");
        }
        const objects = database.prepare("SELECT sql FROM sqlite_master WHERE tbl_name = ? AND type IN ('index', 'trigger') AND sql IS NOT NULL").all(table.name);
        const columns = database.pragma(`table_info(${table.name})`).map((column) => identifier(column.name)).join(", ");
        const create = table.sql.replace(/^CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|\w+)/i,
          `CREATE TABLE ${identifier(replacement)}`);
        database.exec(create);
        database.exec(`INSERT INTO ${identifier(replacement)} (${columns}) SELECT ${columns} FROM ${identifier(table.name)}`);
        database.exec(`DROP TABLE ${identifier(table.name)}`);
        database.exec(`ALTER TABLE ${identifier(replacement)} RENAME TO ${identifier(table.name)}`);
        for (const object of objects) database.exec(object.sql);
      }
      if (tables.length && database.pragma("foreign_key_check").length) {
        throw new Error("The spending priority migration failed its foreign key check.");
      }
      return tables.length;
    }).immediate();
  } finally {
    database.pragma(`legacy_alter_table = ${legacyAlter ? "ON" : "OFF"}`);
    database.pragma(`foreign_keys = ${foreignKeys ? "ON" : "OFF"}`);
  }
}
