// Runs CRUD commands in a temporary table, then rolls them back.

const { pool } = require("./config/db");

async function testCRUD() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. CREATE temporary test table
    await client.query(`
      CREATE TEMP TABLE crud_test (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        status VARCHAR(50)
      )
    `);
    console.log("1. CREATE TABLE: SUCCESS");

    // 2. INSERT
    const inserted = await client.query(
      `INSERT INTO crud_test (name, status)
       VALUES ($1, $2) RETURNING *`,
      ["Sweety Test", "Active"]
    );
    const id = inserted.rows[0].id;
    console.log("2. INSERT: SUCCESS", inserted.rows[0]);

    // 3. SELECT
    const selected = await client.query(
      "SELECT * FROM crud_test WHERE id = $1",
      [id]
    );
    console.log("3. SELECT: SUCCESS", selected.rows);

    // 4. UPDATE
    const updated = await client.query(
      `UPDATE crud_test
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      ["Completed", id]
    );
    console.log("4. UPDATE: SUCCESS", updated.rows[0]);

    // 5. DELETE
    const deleted = await client.query(
      "DELETE FROM crud_test WHERE id = $1 RETURNING *",
      [id]
    );
    console.log("5. DELETE: SUCCESS", deleted.rows[0]);

    await client.query("ROLLBACK");

    console.log("\nALL CRUD OPERATIONS PASSED!");
    console.log("Temporary test data rolled back.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("CRUD TEST FAILED:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testCRUD();
