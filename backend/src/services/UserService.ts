import { Service } from "typedi";
import { supabase } from "../lib/supabase";
import { comparePassword, generateJWTToken, hashPassword } from "../utils/utils";

@Service({ id: "user.service" })
export class UserService {
  // ----------------- SIGN UP -----------------
  async signUp(username: string, password: string): Promise<[boolean, string]> {
    try {
      // Check if user already exists
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      if (existingUser) {
        return [false, "User already exists"];
      }

      const passwordHash = await hashPassword(password);

      // Insert new user
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          username,
          password_hash: passwordHash,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return [true, "User created"];
    } catch (error: any) {
      console.error("[signUp] error:", error);
      return [false, error.message || "Unknown error"];
    }
  }

  // ----------------- LOGIN -----------------
  async login(username: string, password: string): Promise<[boolean, any]> {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows found
          return [false, "User does not exist"];
        }
        throw error;
      }

      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        return [false, "Incorrect password"];
      }

      const token = generateJWTToken(user.id, username);

      return [true, { token, user: { id: user.id, username } }];
    } catch (error: any) {
      console.error("[login] error:", error);
      return [false, error.message || "Unknown error"];
    }
  }
}
