import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoService } from './todo.service';
import { firstValueFrom } from 'rxjs';

interface GameState {
  level_index: number;
  opponent_index: number;
  player_progress_percentage: number;
  xp: number;
  level: number;
  current_streak: number;
  total_completed_missions: number;
  is_immune: boolean;
  rewards_state: { id: number; unlocked: boolean }[];
  shop_items: { id: string; owned: boolean }[];
}

type Priority = 'D' | 'C' | 'B' | 'A' | 'S';

type Task = {
  id: number;
  name: string;
  priority: Priority;
  duedate?: string;
  completed: boolean;
  editing?: boolean;
};

type Reward = {
  id: number;
  name: string;
  milestone: number;
  unlocked: boolean;
  description: string;
  effect: string;
};

type ShopItem = {
  id: string;
  displayName: string;
  fileName: string;
  cost: number;
  owned?: boolean;
};

const LEVEL_OPPONENTS: { name: string }[][] = [
  [{ name: 'Mizuki' }, { name: 'Zabuza' }],
  [{ name: 'Neji' }, { name: 'Gaara' }],
  [{ name: 'Kabuto' }, { name: 'Kakuzu' }],
  [{ name: 'Pain' }, { name: 'Obito' }],
  [{ name: 'Madara' }, { name: 'Kaguya' }]
];

const DEFAULT_REWARDS: Reward[] = [
  { id: 1, name: 'Enhanced Kunai', milestone: 10, unlocked: false, description: 'Naruto throws better kunai.', effect: 'Permanently increases D-Rank task damage by 2 HP (New D: 12).' },
  { id: 2, name: 'Shadow Clone Training', milestone: 25, unlocked: false, description: 'Efficient learning by using clones.', effect: 'Every 5-Task streak grants 10 bonus XP.' },
  { id: 3, name: 'Chakra Control Mastery', milestone: 50, unlocked: false, description: 'Better chakra flow reduces wasted energy.', effect: 'Reduces player loss on unchecked tasks from 3% to 1%.' },
  { id: 4, name: 'Nine-Tails Chakra Buff', milestone: 75, unlocked: false, description: 'Temporary chakra boost from Kurama.', effect: 'Every 5-Task streak grants 1-Mission Immunity.' },
  { id: 5, name: 'Rasengan Optimization', milestone: 100, unlocked: false, description: 'A more focused Rasengan.', effect: 'Increases B-Rank task damage by 5 HP (New B: 35).' },
  { id: 6, name: 'Sage Mode Skin/Buff', milestone: 150, unlocked: false, description: 'Naruto unlocks the power of the Sages! (Cosmetic + Buff)', effect: 'Increases A-Rank task damage by 10 HP (New A: 50).' },
  { id: 7, name: 'Hokage Foresight', milestone: 200, unlocked: false, description: 'Foresight of a Kage protects you.', effect: 'Reduces overdue task damage from 5% to 4%.' },
  { id: 8, name: 'Wind Release Mastery', milestone: 300, unlocked: false, description: 'Wind chakra enhances speed and focus.', effect: 'All task damage +2 HP.' },
  { id: 9, name: 'Jinchuriki Healing', milestone: 400, unlocked: false, description: 'Kurama’s healing rate.', effect: 'Player heals 5% progress upon defeating an opponent (Base win heal now 15%).' },
  { id: 10, name: 'Six Paths Power', milestone: 500, unlocked: false, description: 'Legendary power.', effect: 'Reduces overdue task damage to 2%.' }
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.css']
})
export class TodoComponent implements OnInit {
  // --- Form & UI ---
  constructor(private todoService: TodoService) {}
  newTask = '';
  newDueDate = '';
  newPriority: string = 'D'; 
  showRewardsOverlay = false;
  showShopOverlay = false;

  // --- Tasks ---
  tasks: Task[] = [];

  // --- Shop ---
  shopItems: ShopItem[] = [
  { id: 'default', displayName: 'Default Naruto', fileName: 'naruto_sprite.png', cost: 0, owned: true },
  { id: 'sage', displayName: 'to be added', fileName: 'naruto_sage_sprite.PNG', cost: 10 },
  { id: 'kurama', displayName: 'to be added', fileName: 'naruto_kurama_sprite.PNG', cost: 20 },
  { id: 'hokage', displayName: 'to be added', fileName: 'naruto_hokage_sprite.PNG', cost: 30 },
  { id: 'sage_necklace', displayName: 'to be added', fileName: 'sage_necklace.PNG', cost: 5 },
  { id: 'hokage_hat', displayName: 'Hokage Hat', fileName: 'hokage_hat.PNG', cost: 8 },
  { id: 'anbu_mask', displayName: 'to be added', fileName: 'anbu_mask.PNG', cost: 12 }
];
  equippedSkinId = 'default';

  // --- Game State ---
  levelIndex = 0;
  currentOpponentIndex = 0;
  playerProgressPercentage = 50;

  damageValues = { D: 10, C: 20, B: 30, A: 40, S: 50 };
  opponentDamageLoss = 5;
  uncheckLoss = 3;
  winHealGain = 10;

  xp = 0;
  level = 1;

  currentStreak = 0;
  totalCompletedMissions = 0;
  isImmune = false;

  rewards: Reward[] = DEFAULT_REWARDS.map(r => ({ ...r }));

  // --- Reminder ---
  reminderTimerFirstMs = 1 * 60 * 1000;
  reminderIntervalMs = 30 * 60 * 1000;
  reminderMessages = [
    '💧 Hydration Mission: Please drink your water!',
    '🍜 Fuel Check: Please eat your food or have a snack.',
    '🚶 Movement Scroll: Time to go for a quick walk or stand up.',
    '🧘 Stretch Jutsu: Do a quick stretch break—30 seconds!',
    '👀 Focus Technique: Close your eyes and rest them for 20 seconds.',
    '🧠 Chakra Regeneration: Take a 5-minute mental break.'
  ];

  // --- Animation & Popup ---
  showAttack = false;
  attackGifUrl = '';
  attackText = '';
  popupText = '';

  async ngOnInit() {
  // 1️⃣ Wait for backend to load real values BEFORE doing anything
  await this.loadFromBackend();

  // 2️⃣ Apply rewards AFTER real gamestate is loaded
  this.applyPermanentEffects();

  // 3️⃣ Load opponent & derived values AFTER the backend data is present
  setTimeout(() => {
    this.loadOpponentForLevel();
    this.updateDerived();
  }, 0);

  // 4️⃣ Start reminders (these do NOT affect gamestate)
  setTimeout(() => this.randomReminder(), this.reminderTimerFirstMs);
  setInterval(() => this.randomReminder(), this.reminderIntervalMs);
  setInterval(() => this.checkOverdueTasks(), 60 * 60 * 1000);
}


  // ---------------- Opponent / Level ----------------
  loadOpponentForLevel(): void {
    const opponents = LEVEL_OPPONENTS[this.levelIndex] || [];
    if (!opponents.length) return;
    if (this.currentOpponentIndex < 0 || this.currentOpponentIndex >= opponents.length) {
      this.currentOpponentIndex = Math.floor(Math.random() * opponents.length);
    }
    this.save();
  }

  get currentOpponentName(): string {
    const opponents = LEVEL_OPPONENTS[this.levelIndex] || [];
    return opponents[this.currentOpponentIndex]?.name ?? '—';
  }

  get currentOpponentImage(): string {
    return `/${this.currentOpponentName.toLowerCase()}_sprite.png`;
  }

  // ---------------- Shop ----------------
  toggleShopOverlay(): void { this.showShopOverlay = !this.showShopOverlay; }

  get currentPlayerImage(): string {
    return this.shopItems.find(s => s.id === this.equippedSkinId)?.fileName || 'naruto_sprite.png';
  }

  buyOrEquipSkin(itemId: string) {
    const item = this.shopItems.find(s => s.id === itemId);
    if (!item) return;

    if (item.owned) {
      this.equippedSkinId = item.id;
      this.triggerPopup(`✅ Equipped ${item.displayName}`);
    } else if (this.currentStreak >= item.cost) {
      this.currentStreak -= item.cost;
      item.owned = true;
      this.equippedSkinId = item.id;
      this.triggerPopup(`🛒 Purchased & equipped ${item.displayName} for ${item.cost} streak(s).`);
    } else {
      this.triggerPopup(`❌ Not enough streaks to buy ${item.displayName}. Need ${item.cost}.`);
    }
    this.save();
  }

  // ---------------- Popups & Reminder ----------------
  triggerPopup(text: string, duration = 3000): void {
    this.popupText = text;
    setTimeout(() => this.popupText = '', duration);
  }

  randomReminder(): void {
    const idx = Math.floor(Math.random() * this.reminderMessages.length);
    this.triggerPopup(this.reminderMessages[idx]);
  }

  toggleRewardsOverlay(): void {
  this.showRewardsOverlay = !this.showRewardsOverlay;
}


  // ---------------- Rewards ----------------
  applyPermanentEffects(): void {
    let D = 10, C = 20, B = 30, A = 40, S = 50;
    let overdueDmg = 5, uncheckLoss = 3, winHeal = 10;

    this.rewards.forEach(r => {
      if (!r.unlocked) return;
      switch (r.id) {
        case 1: D += 2; break;
        case 3: uncheckLoss = 1; break;
        case 5: B += 5; break;
        case 6: A += 10; break;
        case 7: overdueDmg = Math.min(overdueDmg, 4); break;
        case 8: D += 2; C += 2; B += 2; A += 2; S += 2; break;
        case 9: winHeal = 15; break;
        case 10: overdueDmg = Math.min(overdueDmg, 2); break;
      }
    });

    this.damageValues = { D, C, B, A, S };
    this.opponentDamageLoss = overdueDmg;
    this.uncheckLoss = uncheckLoss;
    this.winHealGain = winHeal;
  }

  checkForRewards(): void {
    this.rewards.forEach(r => {
      if (!r.unlocked && this.totalCompletedMissions >= r.milestone) {
        r.unlocked = true;
        this.triggerPopup(`🌟 REWARD UNLOCKED: ${r.name}! ${r.effect}`);
        this.applyPermanentEffects();
      }
    });
  }

  // ---------------- Tasks ----------------
async addTask() {
  if (!this.newTask || !this.newTask.trim()) return;

  const body = {
    name: this.newTask.trim(),
    priority: this.newPriority || 'D',
    duedate: this.newDueDate || null,
    completed: false
  };

  try {
    const created = await firstValueFrom(this.todoService.createTask(body));

    // Push new task into UI
    this.tasks.unshift({
      id: created.id,
      name: created.name,
      priority: created.priority,
      duedate: created.duedate, 
      completed: created.completed
    });
  } catch (err) {
    console.error('Error creating task:', err);
  }

  // Reset input fields
  this.newTask = '';
  this.newDueDate = '';
  this.newPriority = 'D'; 

  // Optional: only run these if they don't break UI
  this.save?.();
  this.updateDerived?.();
}


  editTask(t: Task) { t.editing = !t.editing; this.save(); }
  async saveEdit(t: Task) {
  try {
    await firstValueFrom(this.todoService.updateTask(t.id, {
      name: t.name,
      priority: t.priority,
      duedate: t.duedate || null,
      completed: t.completed
    }));
  } catch (err) {
    console.error('Error updating task:', err);
  }

  t.editing = false;
  await firstValueFrom(this.todoService.updateTask(t.id, {
  name: t.name,
  priority: t.priority,
  duedate: t.duedate || null,
  completed: t.completed
}));

this.save();

  this.updateDerived();
}

  cancelEdit(t: Task) { t.editing = false; this.save(); }
  async removeTask(id: number) {
  try {
    await firstValueFrom(this.todoService.deleteTask(id));
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.save();
    this.updateDerived();
  } catch (err) {
    console.error('Error deleting task:', err);
  }
}

// robust toggleComplete with optimistic update + rollback and logging
async toggleComplete(t: Task) {
  //basic sanity check
  if (!t || typeof t.id === 'undefined') {
    console.error('toggleComplete: invalid task or missing id', t);
    this.triggerPopup('⚠️ Could not update task (invalid id).');
    return;
  }

  // the checkbox two-way binding already flipped `t.completed` before this runs.
  const newCompleted = !!t.completed;
  const oldCompleted = !newCompleted; // the previous state

  console.log(`toggleComplete: taskId=${t.id} newCompleted=${newCompleted}`);

  // Optimistically save locally (your UI already shows the change),
  // but also persist to localStorage immediately so refresh won't wipe it
  try {
    this.save(); 
  } catch (err) {
    console.warn('toggleComplete: local save failed', err);
  }

  //Build payload using the same shape your backend expects
  const payload = {
    name: t.name,
    priority: t.priority,
    duedate: (t as any).duedate ?? null,
    completed: newCompleted
  };

  console.log('toggleComplete: sending payload to backend', payload);

  //Send to backend and await response. On failure, revert the UI and localStorage.
  try {
    const updated = await firstValueFrom(this.todoService.updateTask(t.id, payload));
    console.log('toggleComplete: backend response', updated);

    // Optionally reconcile fields if backend returns a normalized object
    if (updated && typeof updated.completed !== 'undefined') {
      t.completed = !!updated.completed;
      (t as any).duedate = updated.duedate ?? (t as any).duedate ?? null;
    }

    // run game logic after successful confirm, so we don't double-count progress if server fails
    setTimeout(() => {
      if (t.completed) {
        const progressGain = this.damageForPriority(t.priority) / 2;
        this.attackOpponent(progressGain);
        this.gainXP(Math.round(progressGain));
        this.totalCompletedMissions++;
        this.updateCurrentStreak(true);
        this.checkForRewards();
      } else {
        this.playerProgressPercentage = Math.max(0, this.playerProgressPercentage - this.uncheckLoss);
        this.triggerPopup(`📉 Unchecked task! You lost ${this.uncheckLoss}% control.`);
        this.updateCurrentStreak(false);
      }
      this.save();
      this.updateDerived();
    }, 0);

  } catch (err) {
    console.error('toggleComplete: error updating task on backend', err);

    // rollback UI state and local save
    t.completed = oldCompleted;
    try { this.save(); } catch (e) { console.warn('toggleComplete: rollback save failed', e); }

    // show error to the user
    this.triggerPopup('❌ Failed to persist task change. Check console & network tab.');
  }
}


  updateCurrentStreak(isCompleted: boolean): void {
    const chakraBuff = this.rewards.find(r => r.id === 4 && r.unlocked);
    const shadowClone = this.rewards.find(r => r.id === 2 && r.unlocked);

    if (isCompleted) {
      this.currentStreak++;
      if (this.currentStreak % 5 === 0) {
        if (shadowClone) { this.gainXP(10); this.triggerPopup('✨ Shadow Clone Bonus: +10 XP!'); }
        if (chakraBuff) { this.isImmune = true; this.triggerPopup('✨ Chakra Surge: 1-Mission Immunity!'); }
      }
    } else {
      this.currentStreak = 0;
      this.isImmune = false;
    }
  }

  checkOverdueTasks(): void {
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = this.tasks.filter(t => !t.completed && t.duedate && t.duedate < today && !t.editing);

    if (!overdueTasks.length) return;

    if (this.isImmune) {
      this.isImmune = false;
      this.triggerPopup(`🛡️ Immunity Shield blocked ${overdueTasks.length} overdue mission attack!`);
    } else {
      const progressLoss = overdueTasks.length * this.opponentDamageLoss;
      this.playerProgressPercentage = Math.max(0, this.playerProgressPercentage - progressLoss);
      this.triggerPopup(`💥 You missed ${overdueTasks.length} mission(s)! ${this.currentOpponentName} gained ${progressLoss}% control!`);
      this.checkOpponentDefeated();
    }
    this.currentStreak = 0;
    this.save();
  }

  damageForPriority(p: Priority): number { return this.damageValues[p]; }

  // ---------------- Game / Combat ----------------
  resetLevel() {
    this.playerProgressPercentage = 50;
    this.currentStreak = 0;
    this.isImmune = false;
    this.triggerPopup(`🔄 Battle with ${this.currentOpponentName} reset.`);
    this.save();
    this.updateDerived();
  }

  startNewGame() {
    this.levelIndex = 0;
    this.playerProgressPercentage = 50;
    this.tasks = [];
    this.currentStreak = 0;
    this.totalCompletedMissions = 0;
    this.isImmune = false;
    this.rewards = DEFAULT_REWARDS.map(r => ({ ...r }));
    this.applyPermanentEffects();
    this.currentOpponentIndex = Math.floor(Math.random() * LEVEL_OPPONENTS[0].length);
    if (!this.shopItems.some(s => s.owned)) this.equippedSkinId = 'default';
    this.triggerPopup(`⚔️ New Game started! Facing ${this.currentOpponentName}.`);
    this.save();
    this.updateDerived();
  }

  attackOpponent(progressGain: number) {
    this.attackGifUrl = 'https://media.giphy.com/media/3o6ZtpxSZbQRRnwCKQ/giphy.gif';
    this.attackText = `Naruto used Rasengan! Gained ${progressGain.toFixed(0)}% control!`;
    this.showAttack = true;

    setTimeout(() => {
      this.playerProgressPercentage = Math.min(100, this.playerProgressPercentage + progressGain);
      this.showAttack = false;
      this.checkOpponentDefeated();
      this.save();
    }, 650);
  }

  getWinProgressReset(): number { return 50 + this.winHealGain; }

  checkOpponentDefeated() {
    if (this.playerProgressPercentage >= 100) {
      this.triggerPopup(`🎉 You defeated ${this.currentOpponentName}!`);
      this.levelIndex++;
      this.currentStreak = 0;
      this.isImmune = false;

      if (this.levelIndex >= LEVEL_OPPONENTS.length) {
        this.triggerPopup('🏆 You defeated all opponents! Play again?');
        this.levelIndex = LEVEL_OPPONENTS.length - 1;
      }

      this.currentOpponentIndex = Math.floor(Math.random() * LEVEL_OPPONENTS[this.levelIndex].length);
      this.playerProgressPercentage = 50;
      this.save();

    } else if (this.playerProgressPercentage <= 0) {
      this.triggerPopup(`💀 ${this.currentOpponentName} defeated you! Resetting battle...`);
      this.resetLevel();
    }
  }

  gainXP(amount: number) {
    this.xp += amount;
    while (this.xp >= 100) {
      this.xp -= 100;
      this.level++;
      this.triggerPopup(`⚡ Level up! Now level ${this.level}`);
    }
  }

  updateDerived() {
    this.playerProgressPercentage = Math.min(100, Math.max(0, this.playerProgressPercentage));
    this.checkOpponentDefeated();
  }

  // ---------------- Save / Load ----------------
async save() {
  const gs = {
    player_progress_percentage: this.playerProgressPercentage,
    level_index: this.levelIndex,
    opponent_index: this.currentOpponentIndex,
    current_streak: this.currentStreak,
    total_completed_missions: this.totalCompletedMissions,
    xp: this.xp,
    level: this.level,
    is_immune: this.isImmune,
    rewards_state: this. rewards.map(r => ({ id: r.id, unlocked: r.unlocked })),
    shop_items: this.shopItems.map(s => ({ id: s.id, owned: !!s.owned })),
    equipped_skin_id: this.equippedSkinId
  };

  localStorage.setItem("naruto_todo_v2", JSON.stringify({
    tasks: this.tasks,
    ...gs
  }));

  try {
    await firstValueFrom(this.todoService.updateGameState(gs));
    console.log("GameState saved.", gs);
  } catch (error) {
    console.error("SAVE FAILED:", error);
  }
}

  //load
  async loadFromBackend() {
  try {
    const tasks: any[] = await firstValueFrom(this.todoService.getTasks());
    const gs: any = await firstValueFrom(this.todoService.getGameState());

    //load tasks
    this.tasks = (tasks || []).map(t => ({
      id: t.id,
      name: t.name,
      priority: t.priority,
      duedate: t.duedate ?? null,
      completed: !!t.completed
    }));


// Load Basic Game State Values
    this.levelIndex = gs.level_index ?? 0;
    this.currentOpponentIndex = gs.opponent_index ?? 0;
    this.playerProgressPercentage = gs.player_progress_percentage ?? 50;
    this.xp = gs.xp ?? 0;
    this.level = gs.level ?? 1;
    this.currentStreak = gs.current_streak ?? 0;
    this.totalCompletedMissions = gs.total_completed_missions ?? 0;
    this.isImmune = gs.is_immune ?? false;

    const safeParse = (value: any): any[] => {
      if (!value) return [];

      if (Array.isArray(value)) return value;

      // If DB returns string like "[{...},{...}]"
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          console.warn("⚠️ JSON parsing failed:", value);
          return [];
        }
      }

      return [];
    };

//load rewards safely
    const loadedRewards = safeParse(gs.rewards_state);

    this.rewards = DEFAULT_REWARDS.map(r => {
      const found = loadedRewards.find((x: any) => x.id === r.id);
      return found
        ? { ...r, unlocked: !!found.unlocked }
        : { ...r };
    });

//load shop items safely
    const loadedShop = safeParse(gs.shop_items);

    loadedShop.forEach((saved: any) => {
      const item = this.shopItems.find(i => i.id === saved.id);
      if (item) item.owned = !!saved.owned;
    });

    // Ensure default skin exists
    if (!this.shopItems.some(s => s.owned)) {
      this.equippedSkinId = "default";
    } else {
      this.equippedSkinId = gs.equipped_skin_id ?? "default";
    }

    console.log("Backend load complete:", {
      progress: this.playerProgressPercentage,
      streak: this.currentStreak,
      tasks: this. tasks.length,
      rewards: this.rewards,
      shop: this.shopItems
    });

  } catch (error) {
    console.error("❌ Backend load failed:", error);
  }
}
}
