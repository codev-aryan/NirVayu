import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: "nirvayu-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore, // I need to add this to storage
    cookie: {
      secure: false, // development
      maxAge: 24 * 60 * 60 * 1000,
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    if (sessionSettings.cookie) {
      sessionSettings.cookie.secure = true;
    }
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Hardcoded authority account — works on serverless (no DB needed)
  const AUTHORITY_ACCOUNTS: Record<string, { id: string; username: string; password: string; role: string }> = {
    admin: { id: "authority-admin", username: "admin", password: "password123", role: "authority" },
  };

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Check hardcoded authority accounts first (works on serverless)
        const hardcoded = AUTHORITY_ACCOUNTS[username];
        if (hardcoded) {
          if (hardcoded.password === password) {
            return done(null, hardcoded as any);
          } else {
            return done(null, false, { message: "Invalid username or password" });
          }
        }

        // Fall back to in-memory storage for regular users
        const user = await storage.getUserByUsername(username);
        if (!user || user.password !== password) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, (user as any).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      // Check hardcoded authority accounts first
      const hardcodedValues = Object.values(AUTHORITY_ACCOUNTS);
      const hardcoded = hardcodedValues.find(u => u.id === id);
      if (hardcoded) {
        return done(null, hardcoded as any);
      }
      // Fall back to in-memory storage
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("[Auth] Registering user:", req.body);
      
      const { insertUserSchema } = await import("@shared/schema");
      const result = insertUserSchema.safeParse(req.body);
      
      if (!result.success) {
        console.log("[Auth] Registration validation failed:", result.error.errors);
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: result.error.errors 
        });
      }

      const userData = result.data;

      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        console.log("[Auth] Username already exists:", userData.username);
        return res.status(400).json({ message: "Username already exists" });
      }

      // Restrict Authority registration
      if (userData.role === "authority") {
        console.log("[Auth] Authority registration attempt blocked");
        return res.status(403).json({ message: "Authority registration is not allowed" });
      }

      const user = await storage.createUser(userData);
      console.log("[Auth] User created:", user);
      
      req.login(user, (err) => {
        if (err) {
          console.error("[Auth] Login error after registration:", err);
          return next(err);
        }
        console.log("[Auth] User logged in successfully");
        res.status(201).json(user);
      });
    } catch (err) {
      console.error("[Auth] Registration exception:", err);
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info.message || "Login failed" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
