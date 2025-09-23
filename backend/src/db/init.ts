import { supabaseAdmin } from "../lib/supabaseAdmin";
import { createTables, setupRLS, seedData } from "./schema";


/*
Perfect 👍 you’re basically asking me to condense this controller vs service architecture into crisp “revision notes” — the kind of points you’d keep in mind for an interview or repo review.
Here’s a structured note format you can revise quickly:

📝 Supabase Project — Controller/Service Separation (Revision Notes)
1️⃣ Controllers (HTTP layer only)

Location: backend/src/controllers.ts

Responsibilities:

Accept HTTP request (req/res).

Validate body/params (zod/Joi/simple checks).

Assume req.user is already set by auth.ts middleware.

Call services for actual logic.

Map service result → HTTP response (200/201, 4xx/5xx).

🚫 Should NOT:

Query Supabase directly.

Contain business logic.

2️⃣ Services (business logic + DB access)

Location: backend/src/services/*.ts

Responsibilities:

Contain all Supabase queries (supabaseAdmin.from('...').select/insert).

Encapsulate domain logic (e.g., compute totals, validate holdings).

Call stored functions via supabaseAdmin.rpc('exec_sql', ...).

Handle consistency (transactions/policies).

Uses: backend/src/lib/supabaseAdmin.ts

Service role key → server-only.

Example:

const { data, error } = await supabaseAdmin
  .from('transactions')
  .insert(payload)
  .select();

3️⃣ Why separation matters (esp. with Supabase)

Single responsibility: Controllers handle HTTP, Services handle Supabase/logic.

Replaceability: Easy to swap persistence (Supabase → Postgres/ORM).

Security: service_role usage centralized in services (never exposed frontend).

Clarity: All Supabase semantics (RLS, RPC, functions) live in one place.

4️⃣ Practical rules / patterns

✅ Use supabaseAdmin only in services.

✅ Controllers never touch Supabase directly.

✅ Auth middleware verifies token:

const { data } = await supabaseAdmin.auth.getUser(token);
req.user = { id: data.user.id, ... };


✅ Pass req.user.id into services for per-user ops.

✅ Adjust RLS if errors like "new row violates row-level security" appear.

✅ Use service_role for:

Admin-only ops (migrations, seeding).

Backend tasks bypassing RLS.

5️⃣ Refactor checklist (repo-specific)

🔲 Remove Sequelize model calls in controllers.

🔲 Replace with Service.method(...).

🔲 Ensure all services use Supabase queries.

🔲 Auth middleware sets req.user.

🔲 Migration SQL matches table/service expectations.

🔲 Remove legacy utils (JWT generation, old ORM code).

6️⃣ Example (minimal pattern)

Service (TransactionService.ts):

export const createTransaction = async (payload) => {
  return await supabaseAdmin.from('transactions').insert(payload).select();
};


Controller (TransactionController.ts):

export const create = async (req, res) => {
  try {
    const data = await TransactionService.createTransaction({
      ...req.body,
      user_id: req.user.id,
    });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

7️⃣ Testing & QA

Unit test services (mock supabaseAdmin).

Integration test with migrations + RLS policies.

Frontend must send Authorization: Bearer <token>.

✅ Quick recall tagline:
👉 Controllers = HTTP wrappers | Services = Supabase + rules | Auth middleware = attach req.user | Migrations = structure + RLS.
*/

export const initializeDatabase = async () => {
  try {
    console.log("Starting database initialization...");

    // Create tables
    await createTables(supabaseAdmin);

    // Setup Row Level Security policies
    await setupRLS(supabaseAdmin);

    // Seed initial data if needed
    await seedData(supabaseAdmin);

    console.log("Database initialization completed successfully");
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
};

// Function to check if tables exist
export const checkDatabaseSetup = async () => {
  try {
    const { data: tables, error } = await supabaseAdmin
      .from("securities_master")
      .select("id")
      .limit(1);

    if (error) {
      // If there's an error, tables might not exist
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};
