ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student';

CREATE TABLE IF NOT EXISTS classrooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classroom_members (
  class_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('owner', 'admin', 'student')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending')),
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (class_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_class_members_user ON classroom_members(user_id, status);

CREATE TABLE IF NOT EXISTS class_assignments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  deck_name TEXT NOT NULL,
  due_date TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_class_assignments_class ON class_assignments(class_id, due_date);

CREATE TABLE IF NOT EXISTS assignment_progress (
  assignment_id TEXT NOT NULL REFERENCES class_assignments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  completed_at DATETIME,
  PRIMARY KEY (assignment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_card_states_user_deck ON card_states(user_id, deck_id);
