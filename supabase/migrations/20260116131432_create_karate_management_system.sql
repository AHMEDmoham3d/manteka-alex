/*
  # إنشاء نظام إدارة الكاراتيه - Alexandria Karate Management System

  ## الجداول الجديدة

  ### 1. organizations (النوادي ومراكز الشباب)
    - `id` (uuid, primary key)
    - `name` (text) - اسم النادي أو المركز
    - `type` (text) - نوع المؤسسة (club أو youth_center)
    - `created_at` (timestamp)

  ### 2. profiles (الملفات الشخصية)
    - `id` (uuid, primary key) - ربط بجدول auth.users
    - `full_name` (text) - الاسم الكامل
    - `role` (text) - الدور (admin أو coach)
    - `organization_id` (uuid, nullable) - ربط بالنادي/المركز (للمدربين فقط)
    - `created_at` (timestamp)

  ### 3. players (اللاعبين)
    - `id` (uuid, primary key)
    - `full_name` (text) - الاسم الكامل
    - `age` (integer, nullable) - العمر
    - `belt` (text, nullable) - مستوى الحزام
    - `coach_id` (uuid) - ربط بالمدرب (profiles)
    - `created_at` (timestamp)

  ## الأمان (RLS Policies)
    - المدربين يستطيعون رؤية لاعبيهم فقط
    - الأدمن لديه صلاحيات كاملة على جميع البيانات
    - كل جدول محمي بـ RLS
*/

-- إنشاء جدول المؤسسات (النوادي ومراكز الشباب)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('club', 'youth_center')),
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول الملفات الشخصية (profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'coach')),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT role_organization_check CHECK (
    (role = 'admin' AND organization_id IS NULL) OR
    (role = 'coach' AND organization_id IS NOT NULL)
  )
);

-- إنشاء جدول اللاعبين
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  age integer,
  belt text,
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- إنشاء دالة للتحقق من دور المدرب
CREATE OR REPLACE FUNCTION check_coach_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.coach_id AND role = 'coach'
  ) THEN
    RAISE EXCEPTION 'coach_id must reference a profile with role coach';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للتحقق من دور المدرب قبل الإدراج أو التحديث
CREATE TRIGGER ensure_player_has_coach
  BEFORE INSERT OR UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION check_coach_role();

-- تفعيل RLS على جميع الجداول
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للمؤسسات (organizations)
CREATE POLICY "Admin can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- سياسات الأمان للملفات الشخصية (profiles)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- سياسات الأمان للاعبين (players)
CREATE POLICY "Admin can view all players"
  ON players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Coach can view own players"
  ON players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
      AND profiles.id = players.coach_id
    )
  );

CREATE POLICY "Admin can insert players"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update players"
  ON players FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete players"
  ON players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- إنشاء indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_players_coach_id ON players(coach_id);
