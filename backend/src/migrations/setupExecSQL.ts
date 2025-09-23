// import { supabaseAdmin } from "../lib/supabaseAdmin";
// // setupExecSQL.ts is problematic and should be removed — it calls supabaseAdmin.rpc("exec_sql_setup", ...) but that RPC does not exist, so it’s a circular/unused bootstrapping attempt.

// export const setupExecSQL = async () => {
//   try {
//     console.log("Setting up exec_sql function...");

//     // Create exec_sql function with SECURITY DEFINER
//     const { error } = await supabaseAdmin.rpc("exec_sql_setup", {
//       sql: `
//         CREATE OR REPLACE FUNCTION exec_sql(query text)
//         RETURNS void
//         LANGUAGE plpgsql
//         SECURITY DEFINER
//         SET search_path = public
//         AS $$
//         BEGIN
//           EXECUTE query;
//         END;
//         $$;

//         -- Grant execute permission to authenticated users
//         GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
//         GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
//       `,
//     });

//     if (error) throw error;
//     console.log("exec_sql function created successfully");
//   } catch (error) {
//     console.error("Failed to set up exec_sql function:", error);
//     throw error;
//   }
// };
