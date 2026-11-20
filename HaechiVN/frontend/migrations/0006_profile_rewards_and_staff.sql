ALTER TABLE users ADD COLUMN active_frame TEXT;
ALTER TABLE users ADD COLUMN active_background TEXT;

DROP INDEX IF EXISTS idx_class_members_user;
ALTER TABLE classroom_members RENAME TO classroom_members_old;
CREATE TABLE classroom_members (
  class_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('owner', 'admin', 'staff', 'student')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending')),
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (class_id, user_id)
);
INSERT INTO classroom_members (class_id, user_id, role, status, joined_at)
SELECT class_id, user_id, role, status, joined_at FROM classroom_members_old;
DROP TABLE classroom_members_old;
CREATE INDEX idx_class_members_user ON classroom_members(user_id, status);
