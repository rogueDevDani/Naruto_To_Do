const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

//database config
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "naruto_db",
  password: process.env.DB_PASSWORD || "TODOGROUPID2",
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_HOST ? { rejectUnauthorized: false } : false
});

const GAME_STATE_ID = 1;

//----------------TASKS-----------------
// GET all tasks
app.get("/tasks", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching tasks:", err);
    res.status(500).send("Error fetching tasks");
  }
});

// CREATE task
app.post("/tasks", async (req, res) => {
  try {
    const { name, priority, duedate, completed } = req.body;

    const result = await pool.query(
      `INSERT INTO tasks (name, priority, duedate, completed)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [
        name,
        priority || "D",
        duedate || null,
        completed ?? false
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error creating task:", err);
    res.status(500).send("Error creating task");
  }
});

// UPDATE task
app.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, priority, duedate, completed } = req.body;

    const result = await pool.query(
      `UPDATE tasks
       SET name=$1, priority=$2, duedate=$3, completed=$4
       WHERE id=$5
       RETURNING *`,
      [
        name,
        priority || "D",
        duedate || null,
        completed ?? false,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error updating task:", err);
    res.status(500).send("Error updating task");
  }
});

// DELETE task
app.delete("/tasks/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM tasks WHERE id=$1", [req.params.id]);
    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error("❌ Error deleting task:", err);
    res.status(500).send("Error deleting task");
  }
});

//-----------------GAMESTATE--------------------

// GET gamestate
app.get("/gamestate", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM gamestate WHERE id=$1", [GAME_STATE_ID]);

    if (!result.rows.length) {
      return res.json({
        player_progress_percentage: 50,
        level_index: 0,
        opponent_index: 0,
        current_streak: 0,
        total_completed_missions: 0,
        xp: 0,
        level: 1,
        is_immune: false,
        rewards_state: [],
        shop_items: [],
        equipped_skin_id: "default"
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching gamestate:", err);
    res.status(500).send("Error fetching gamestate");
  }
});

// SAVE gamestate
app.post("/gamestate", async (req, res) => {
  try {
    let {
      player_progress_percentage,
      level_index,
      opponent_index,
      current_streak,
      total_completed_missions,
      xp,
      level,
      is_immune,
      rewards_state,
      shop_items,
      equipped_skin_id
    } = req.body;

    // DEFAULT VALUES
    player_progress_percentage ??= 50;
    level_index ??= 0;
    opponent_index ??= 0;
    current_streak ??= 0;
    total_completed_missions ??= 0;
    xp ??= 0;
    level ??= 1;
    is_immune ??= false;

    // ALWAYS SAFE JSON
    rewards_state = Array.isArray(rewards_state) ? rewards_state : [];
    shop_items = Array.isArray(shop_items) ? shop_items : [];
    equipped_skin_id ||= "default";

    const result = await pool.query(
      `INSERT INTO gamestate
        (id, player_progress_percentage, level_index, opponent_index, current_streak,
         total_completed_missions, xp, level, is_immune, rewards_state, shop_items, equipped_skin_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12)
       ON CONFLICT (id)
       DO UPDATE SET
         player_progress_percentage=$2,
         level_index=$3,
         opponent_index=$4,
         current_streak=$5,
         total_completed_missions=$6,
         xp=$7,
         level=$8,
         is_immune=$9,
         rewards_state=$10::jsonb,
         shop_items=$11::jsonb,
         equipped_skin_id=$12
       RETURNING *`,
      [
        GAME_STATE_ID,
        player_progress_percentage,
        level_index,
        opponent_index,
        current_streak,
        total_completed_missions,
        xp,
        level,
        is_immune,
        JSON.stringify(rewards_state),
        JSON.stringify(shop_items),
        equipped_skin_id
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error("❌ Error saving gamestate:", err);
    res.status(500).json({ error: "Error saving gamestate" });
  }
});


//------------Start Server-------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔥 Server running on port " + PORT);
});

