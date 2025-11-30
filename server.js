const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "naruto_db",
  password: "TODOGROUPID2",
  port: 5432
});

const GAME_STATE_ID = 1;

/* TASK ENDPOINTS*/

// GET all tasks
app.get('/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching tasks");
  }
});

// CREATE task
app.post('/tasks', async (req, res) => {
  let { name, priority, duedate, completed } = req.body;
  if (completed === undefined) completed = false;

  try {
    const result = await pool.query(
      `INSERT INTO tasks (name, priority, duedate, completed) 
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, priority, duedate, completed]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating task");
  }
});

// UPDATE task
app.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { name, priority, duedate, completed } = req.body;

  try {
    // Check previous completion
    const prev = await pool.query('SELECT completed FROM tasks WHERE id=$1', [id]);
    if (!prev.rows.length) return res.status(404).send("Task not found");
    const wasCompleted = prev.rows[0].completed;

    const result = await pool.query(
      `UPDATE tasks 
       SET name=$1, priority=$2, duedate=$3, completed=$4 
       WHERE id=$5 RETURNING *`,
      [name, priority, duedate, completed, id]
    );

    // Update gamestate on newly completed task
    if (!wasCompleted && completed) {
      await pool.query(
        `UPDATE gamestate
         SET xp = xp + 10,
             current_streak = current_streak + 1,
             total_completed_missions = total_completed_missions + 1,
             player_progress_percentage = LEAST(player_progress_percentage + 5, 100)
         WHERE id=$1`,
        [GAME_STATE_ID]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating task");
  }
});

// DELETE task
app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id=$1 RETURNING *', [id]);
    if (!result.rows.length) return res.status(404).send("Task not found");
    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting task");
  }
});

/*  GAME STATE ENDPOINTS */

// GET gamestate
app.get('/gamestate', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gamestate WHERE id=$1', [GAME_STATE_ID]);
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
        equipped_skin_id: 'default'
      });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching game state");
  }
});

// SAVE/UPSERT gamestate
app.post('/gamestate', async (req, res) => {
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

  // Default values
  if (player_progress_percentage === undefined) player_progress_percentage = 50;
  if (level_index === undefined) level_index = 0;
  if (opponent_index === undefined) opponent_index = 0;
  if (current_streak === undefined) current_streak = 0;
  if (total_completed_missions === undefined) total_completed_missions = 0;
  if (xp === undefined) xp = 0;
  if (level === undefined) level = 1;
  if (is_immune === undefined) is_immune = false;
  if (!rewards_state) rewards_state = [];
  if (!shop_items) shop_items = [];
  if (!equipped_skin_id) equipped_skin_id = 'default';

  try {
    const result = await pool.query(
      `INSERT INTO gamestate
      (id, player_progress_percentage, level_index, opponent_index, current_streak, total_completed_missions, xp, level, is_immune, rewards_state, shop_items, equipped_skin_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (id)
      DO UPDATE SET
        player_progress_percentage = $2,
        level_index = $3,
        opponent_index = $4,
        current_streak = $5,
        total_completed_missions = $6,
        xp = $7,
        level = $8,
        is_immune = $9,
        rewards_state = $10,
        shop_items = $11,
        equipped_skin_id = $12
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
        rewards_state,
        shop_items,
        equipped_skin_id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving game state");
  }
});

/* START SERVER*/
app.listen(3000, () => {
  console.log("Ultimate NarutoDB backend running on port 3000");
});
