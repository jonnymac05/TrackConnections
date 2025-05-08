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
      
      console.log("Creating log entry with data:", JSON.stringify(logEntryData, null, 2));
      
      // Validate log entry data
      try {
        const validatedData = insertLogEntrySchema.parse({
          ...logEntryData,
          user_id: req.user.id,
        });
        
        console.log("Validated data:", JSON.stringify(validatedData, null, 2));
        
        try {
          const logEntry = await storage.createLogEntry(validatedData, tagIds);
          console.log("Log entry created successfully:", logEntry.id);
          res.status(201).json(logEntry);
        } catch (storageError) {
          console.error("Storage error creating log entry:", storageError);
          console.error(storageError instanceof Error ? storageError.stack : "Unknown error type");
          res.status(500).json({ 
            message: "Failed to create log entry in storage", 
            error: storageError instanceof Error ? storageError.message : String(storageError) 
          });
        }
      } catch (validationError) {
        console.error("Validation error:", validationError);
        if (validationError instanceof z.ZodError) {
          res.status(400).json({ message: "Invalid log entry data", errors: validationError.errors });
        } else {
          res.status(400).json({ 
            message: "Validation error", 
            error: validationError instanceof Error ? validationError.message : String(validationError) 
          });
        }
      }
    } catch (error) {
      console.error("Unexpected error in log entry creation:", error);
      console.error(error instanceof Error ? error.stack : "Unknown error type");
      res.status(500).json({ 
        message: "Failed to create log entry", 
        error: error instanceof Error ? error.message : String(error) 
      });
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
      const contacts = await storage.getAllContacts(req.user.id);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get("/api/contacts/favorites", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const favorites = await storage.getFavoriteContacts(req.user.id);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorite contacts" });
    }
  });

  app.post("/api/contacts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const contactData = req.body;
      // Add user ID to contact data
      contactData.created_by = req.user.id;
      
      const contact = await storage.createContact(contactData);
      res.status(201).json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.get("/api/contacts/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const contact = await storage.getContactByIdNew(req.params.id);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Verify the contact belongs to the user
      if (contact.created_by !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });

  app.put("/api/contacts/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // First get the contact to verify ownership
      const contact = await storage.getContactByIdNew(req.params.id);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Verify the contact belongs to the user
      if (contact.created_by !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const contactData = req.body;
      // Prevent changing created_by
      delete contactData.created_by;
      
      const updatedContact = await storage.updateContact(req.params.id, contactData);
      res.json(updatedContact);
    } catch (error) {
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // First get the contact to verify ownership
      const contact = await storage.getContactByIdNew(req.params.id);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Verify the contact belongs to the user
      if (contact.created_by !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await storage.deleteContact(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  app.put("/api/contacts/:id/favorite", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // First get the contact to verify ownership
      const contact = await storage.getContactByIdNew(req.params.id);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Verify the contact belongs to the user
      if (contact.created_by !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { isFavorite } = req.body;
      const updatedContact = await storage.toggleFavoriteContact(req.params.id, isFavorite);
      res.json(updatedContact);
    } catch (error) {
      res.status(500).json({ message: "Failed to update contact favorite status" });
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
