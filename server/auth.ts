import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "track-connections-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password"
      },
      async (email, password, done) => {
        try {
          console.log('LocalStrategy authenticating user with email:', email);
          
          if (!email || !password) {
            console.log('LocalStrategy failed: Missing email or password');
            return done(null, false);
          }
          
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            console.log('LocalStrategy failed: No user found with email:', email);
            return done(null, false);
          }
          
          const passwordMatches = await comparePasswords(password, user.password);
          if (!passwordMatches) {
            console.log('LocalStrategy failed: Password does not match for user:', email);
            return done(null, false);
          }
          
          console.log('LocalStrategy successful for user:', user.id);
          return done(null, user);
        } catch (error) {
          console.error('LocalStrategy error:', error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log('Deserializing user with ID:', id);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.log('Deserialization failed: No user found with ID:', id);
        return done(null, false);
      }
      
      console.log('User deserialized successfully:', id);
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log('Registration request received:', {
        name: req.body.name,
        email: req.body.email,
        passwordLength: req.body.password ? req.body.password.length : 0
      });
      
      // Validate required fields
      if (!req.body.name || !req.body.email || !req.body.password) {
        console.log('Registration validation failed: missing required fields');
        return res.status(400).json({ message: "Name, email and password are required" });
      }

      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        console.log('Registration failed: email already in use', req.body.email);
        return res.status(400).json({ message: "Email already in use" });
      }

      console.log('Creating new user...');
      const user = await storage.createUser({
        name: req.body.name,
        email: req.body.email,
        password: await hashPassword(req.body.password),
        roles: ['user']
      });
      console.log('User created with ID:', user.id);

      // Create default message templates for new user
      console.log('Creating default message templates...');
      await storage.createOrUpdateMessageTemplate({
        user_id: user.id,
        email_template: "Hi [Name], It was great meeting you at [Event]. I'd love to connect and discuss [Topic] further. Best regards, [Your Name]",
        sms_template: "Hi [Name], it's [Your Name] from [Event]. Great meeting you! Let's connect soon."
      });
      console.log('Message templates created');

      req.login(user, (err) => {
        if (err) {
          console.error('Login after registration failed:', err);
          return next(err);
        }
        
        console.log('User logged in after registration');
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error('Registration error:', error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('Login attempt:', { email: req.body.email });
    
    if (!req.body.email || !req.body.password) {
      console.log('Login validation failed: missing email or password');
      return res.status(400).json({ message: "Email and password are required" });
    }
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error('Login authentication error:', err);
        return next(err);
      }
      
      if (!user) {
        console.log('Login failed: Invalid credentials for', req.body.email);
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      console.log('User authenticated successfully:', user.id);
      req.login(user, (err) => {
        if (err) {
          console.error('Login session creation error:', err);
          return next(err);
        }
        
        console.log('Login successful for user:', user.id);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
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
    
    // Return user without password
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}
