-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum for User Roles
CREATE TYPE user_role AS ENUM ('cutting_supervisor', 'cutting_verifier', 'sewing_supervisor');

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Recipes Table
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    std_fabric_yards NUMERIC(10, 2) NOT NULL,
    wastage_cap NUMERIC(5, 2) NOT NULL
);

-- 3. Recipe Components Table
CREATE TABLE recipe_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    component_name VARCHAR(255) NOT NULL,
    pieces_per_garment INTEGER NOT NULL,
    image_url TEXT,
    UNIQUE(recipe_id, component_name)
);

-- Enum for Order Status
CREATE TYPE order_status AS ENUM ('CUTTING_IN_PROGRESS', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');

-- 4. Cutting Orders Table
CREATE TABLE cutting_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(100) UNIQUE NOT NULL,
    recipe_id UUID NOT NULL REFERENCES recipes(id),
    target_qty INTEGER NOT NULL,
    fabric_roll_id VARCHAR(100) NOT NULL,
    actual_fabric_yds NUMERIC(10, 2) NOT NULL,
    status order_status NOT NULL DEFAULT 'CUTTING_IN_PROGRESS',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enum for Verification Item Status
CREATE TYPE verification_item_status AS ENUM ('GREEN', 'YELLOW', 'RED');

-- 5. Verification Items Table
CREATE TABLE verification_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES cutting_orders(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES recipe_components(id),
    expected_qty INTEGER NOT NULL,
    actual_qty INTEGER,
    status verification_item_status
);

-- Enum for Verification Decision
CREATE TYPE verification_decision AS ENUM ('APPROVED', 'REJECTED');

-- 6. Verification Logs Table
CREATE TABLE verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES cutting_orders(id) ON DELETE CASCADE,
    verifier_id UUID NOT NULL REFERENCES users(id),
    decision verification_decision NOT NULL,
    rejection_note TEXT,
    wastage_pct NUMERIC(10, 2),
    component_variances JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Sample Data (Recipes and Components as per PDF)
INSERT INTO recipes (id, recipe_code, name, category, std_fabric_yards, wastage_cap)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'REC-BL01', 'Casual Blouse', 'Blouse', 1.8, 5.0),
    ('22222222-2222-2222-2222-222222222222', 'REC-CT02', 'Crop Top', 'Crop Top', 1.1, 8.0);

INSERT INTO recipe_components (recipe_id, component_name, pieces_per_garment)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Front Body Panel', 1),
    ('11111111-1111-1111-1111-111111111111', 'Back Body Panel', 1),
    ('11111111-1111-1111-1111-111111111111', 'Sleeves (Left & Right)', 2),
    ('11111111-1111-1111-1111-111111111111', 'Collar & Stand', 1),
    ('11111111-1111-1111-1111-111111111111', 'Sleeve Cuffs', 2),
    
    ('22222222-2222-2222-2222-222222222222', 'Front Chest Panel', 1),
    ('22222222-2222-2222-2222-222222222222', 'Back Support Panel', 1),
    ('22222222-2222-2222-2222-222222222222', 'Neck Binding Strip', 1),
    ('22222222-2222-2222-2222-222222222222', 'Hem Elastic Casing', 1),
    ('22222222-2222-2222-2222-222222222222', 'Side Strap Accents', 2);

-- Insert Demo Users
-- Note: In a real scenario, use supabase auth, but for this demo, keeping it in users table is enough for testing RBAC
INSERT INTO users (id, email, password_hash, role, full_name)
VALUES 
    ('33333333-3333-3333-3333-333333333333', 'supervisor@apparelflow.com', 'hashed_pwd', 'cutting_supervisor', 'John Supervisor'),
    ('44444444-4444-4444-4444-444444444444', 'verifier@apparelflow.com', 'hashed_pwd', 'cutting_verifier', 'Alice Verifier'),
    ('55555555-5555-5555-5555-555555555555', 'sewing@apparelflow.com', 'hashed_pwd', 'sewing_supervisor', 'Bob Sewing');

-- Performance Indexes (Optimizations)
CREATE INDEX IF NOT EXISTS idx_cutting_orders_status ON cutting_orders(status);
CREATE INDEX IF NOT EXISTS idx_cutting_orders_updated_at ON cutting_orders(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_items_order_id ON verification_items(order_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_verifier_timestamp ON verification_logs(verifier_id, timestamp DESC);
