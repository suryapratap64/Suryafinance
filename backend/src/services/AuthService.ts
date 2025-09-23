import { Service } from "typedi";
import { supabase } from "../lib/supabase";

@Service()
export class AuthService {
  // ----------------- SIGN UP -----------------
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { email }, // You can store additional user metadata here
      },
    });

    if (error) throw new Error(error.message);
    return data;
  }

  // ----------------- SIGN IN -----------------
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  // ----------------- SIGN OUT -----------------
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  // ----------------- GET CURRENT USER -----------------
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw new Error(error.message);
    return user;
  }

  // ----------------- UPDATE USER -----------------
  async updateUser(userData: { email?: string; password?: string }) {
    const { data, error } = await supabase.auth.updateUser({
      email: userData.email,
      password: userData.password,
    });

    if (error) throw new Error(error.message);
    return data;
  }
}
