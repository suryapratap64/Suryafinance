// // backend/src/db.ts
// import { Client } from "pg";

// const client = new Client({
//   connectionString: process.env.SUPABASE_DATABASE_URL, // Supabase Postgres URL
// });

// export const connectDB = async () => {
//   try {
//     await client.connect();
//     console.log("Postgres connected");
//   } catch (err) {
//     console.error("DB connection error:", err);
//     throw err;
//   }
// };

// export const db = client;
