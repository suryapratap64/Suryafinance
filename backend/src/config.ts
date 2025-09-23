import { Service } from "typedi";
import path from "path";
import { configDotenv } from "dotenv";

configDotenv({ path: path.join(__dirname, "..", ".env") });
@Service()
export class Config {
  public static readonly SUPABASE_URL = process.env.SUPABASE_URL || "";
  public static readonly SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY || "";
  public static readonly SUPABASE_SERVICE_KEY =
    process.env.SUPABASE_SERVICE_KEY || "";

  public static readonly ALPHA_VANTAGE_API_KEY =
    process.env.ALPHA_VANTAGE_API_KEY || "";
  public static readonly INDIAN_API_KEY = process.env.INDIAN_API_KEY || "";
  public static readonly MOTILAL_OSWAL_API_KEY =
    process.env.MOTILAL_OSWAL_API_KEY || "";
  public static readonly MOTILAL_OSWAL_API_SECRET =
    process.env.MOTILAL_OSWAL_API_SECRET || "";

  public static readonly PORT = parseInt(process.env.PORT || "4200", 10);
  public static readonly NODE_ENV = process.env.NODE_ENV || "development";
  public static readonly CLIENT_URL =
    process.env.CLIENT_URL || "http://localhost:4200";

  public static readonly RATE_LIMIT_WINDOW_MS = parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || "900000",
    10
  );
  public static readonly RATE_LIMIT_MAX_REQUESTS = parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || "100",
    10
  );
}

// 1. typedi
// typedi is a dependency injection (DI) framework for Node.js/TypeScript.
// It allows you to define classes as services, which can be injected into other classes instead of manually creating new instances everywhere.
// 🔹 Why use @Service()?
// ✅ Cleaner code – You don’t repeat new Class() everywhere.
// ✅ Singletons by default – Only one instance of a service is created (unless you configure otherwise).
// ✅ Testability – Easier to swap implementations (e.g., mock service in unit tests).
// ✅ Scalability – Big apps stay organized because dependencies are injected, not hard-coded.
