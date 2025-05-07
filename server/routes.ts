import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertLogEntrySchema, insertTagSchema, insertMessageTemplateSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);

  // Log Entries API
  app.get("/api/log-entries", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const logEntries = await storage.getLogEntries(req.user.id);
      res.json(logEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch log entries" });
    }
  });

  app.get("/api/log-entries/favorites", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const favorites = await storage.getFavoriteLogEntries(req.user.id);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorite log entries" });
    }
  });

  app.post("/api/log-entries", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { tagIds, ...logEntryData } = req.body;
      
      // Validate log entry data
      const validatedData = insertLogEntrySchema.parse({
        ...logEntryData,
        user_id: req.user.id,
      });

      const logEntry = await storage.createLogEntry(validatedData, tagIds);
      res.status(201).json(logEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid log entry data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create log entry" });
      }
    }
  });

  app.get("/api/log-entries/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const logEntry = await storage.getLogEntryById(req.params.id);
      
      if (!logEntry) {
        return res.status(404).json({ message: "Log entry not found" });
      }
      
      // Check authorization
      if (logEntry.user_id !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to access this log entry" });
      }
      
      res.json(logEntry);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch log entry" });
    }
  });

  app.put("/api/log-entries/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const logEntry = await storage.getLogEntryById(req.params.id);
      
      if (!logEntry) {
        return res.status(404).json({ message: "Log entry not found" });
      }
      
      // Check authorization
      if (logEntry.user_id !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this log entry" });
      }
      
      const { tagIds, ...logEntryData } = req.body;
      
      const updatedLogEntry = await storage.updateLogEntry(req.params.id, logEntryData, tagIds);
      res.json(updatedLogEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid log entry data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update log entry" });
      }
    }
  });

  app.delete("/api/log-entries/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const logEntry = await storage.getLogEntryById(req.params.id);
      
      if (!logEntry) {
        return res.status(404).json({ message: "Log entry not found" });
      }
      
      // Check authorization
      if (logEntry.user_id !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this log entry" });
      }
      
      await storage.deleteLogEntry(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete log entry" });
    }
  });

  app.put("/api/log-entries/:id/favorite", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const logEntry = await storage.getLogEntryById(req.params.id);
      
      if (!logEntry) {
        return res.status(404).json({ message: "Log entry not found" });
      }
      
      // Check authorization
      if (logEntry.user_id !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this log entry" });
      }
      
      const { is_favorite } = req.body;
      
      if (typeof is_favorite !== 'boolean') {
        return res.status(400).json({ message: "is_favorite must be a boolean" });
      }
      
      const updatedLogEntry = await storage.toggleFavoriteLogEntry(req.params.id, is_favorite);
      res.json(updatedLogEntry);
    } catch (error) {
      res.status(500).json({ message: "Failed to update favorite status" });
    }
  });

  // Tags API
  app.get("/api/tags", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const tags = await storage.getTags(req.user.id);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  app.post("/api/tags", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Validate tag data
      const validatedData = insertTagSchema.parse({
        name: req.body.name,
        user_id: req.user.id,
      });

      const tag = await storage.createTag(validatedData);
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid tag data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create tag" });
      }
    }
  });

  app.delete("/api/tags/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const tag = await storage.getTagById(req.params.id);
      
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      
      // Check authorization
      if (tag.user_id !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this tag" });
      }
      
      await storage.deleteTag(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete tag" });
    }
  });

  app.get("/api/tags/:id/log-entries", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const tag = await storage.getTagById(req.params.id);
      
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      
      // Check authorization
      if (tag.user_id !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to access logs with this tag" });
      }
      
      const logEntries = await storage.getLogEntriesByTag(req.params.id);
      res.json(logEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch log entries by tag" });
    }
  });

  // Contacts API
  app.get("/api/contacts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const contacts = await storage.getContacts(req.user.id);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  // Message Templates API
  app.get("/api/message-templates", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const template = await storage.getMessageTemplate(req.user.id);
      res.json(template || {
        user_id: req.user.id,
        email_template: "Hi [Name], It was great meeting you at [Event]. I'd love to connect and discuss [Topic] further. Best regards, [Your Name]",
        sms_template: "Hi [Name], it's [Your Name] from [Event]. Great meeting you! Let's connect soon."
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch message templates" });
    }
  });

  app.put("/api/message-templates", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Validate template data
      const validatedData = insertMessageTemplateSchema.parse({
        user_id: req.user.id,
        email_template: req.body.email_template,
        sms_template: req.body.sms_template,
      });

      const template = await storage.createOrUpdateMessageTemplate(validatedData);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid template data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update message templates" });
      }
    }
  });

  // Search API
  app.get("/api/search", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const results = await storage.searchLogEntries(req.user.id, query);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
