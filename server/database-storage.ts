import { db, pool } from "./db";
import {
  User, InsertUser, LogEntry, InsertLogEntry, Tag, InsertTag,
  LogEntryTag, InsertLogEntryTag, Media, InsertMedia,
  MessageTemplate, InsertMessageTemplate, LogEntryWithRelations,
  ContactPerson, connectUsers, logEntries, tags, logEntriesTags, media, messageTemplates,
  contacts, Contact, InsertContact, ContactWithRelations
} from "@shared/schema";
import { IStorage } from "./storage";
import { eq, and, like, or } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import crypto from "crypto";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      tableName: 'connect_sessions',
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(connectUsers).where(eq(connectUsers.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(connectUsers)
      .where(eq(connectUsers.email, email.toLowerCase()));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Use randomUUID from Node.js crypto module to generate a UUID
    const id = crypto.randomUUID();
    const now = new Date();
    
    const [user] = await db
      .insert(connectUsers)
      .values({
        id,
        ...userData,
        email: userData.email.toLowerCase(),
        roles: userData.roles || [],
        stripe_customer_id: userData.stripe_customer_id || null,
        stripe_subscription_id: userData.stripe_subscription_id || null,
        created_at: now,
        updated_at: now
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(connectUsers)
      .set({
        ...userData,
        updated_at: new Date()
      })
      .where(eq(connectUsers.id, id))
      .returning();
    return user;
  }

  async updateStripeCustomerId(id: string, stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db
      .update(connectUsers)
      .set({
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date()
      })
      .where(eq(connectUsers.id, id))
      .returning();
    return user;
  }
  
  async updateUserStripeInfo(id: string, stripeInfo: { 
    stripe_customer_id: string; 
    stripe_subscription_id?: string; 
  }): Promise<User | undefined> {
    const [user] = await db
      .update(connectUsers)
      .set({
        stripe_customer_id: stripeInfo.stripe_customer_id,
        stripe_subscription_id: stripeInfo.stripe_subscription_id || null,
        updated_at: new Date()
      })
      .where(eq(connectUsers.id, id))
      .returning();
    return user;
  }

  // Log entry methods
  async getLogEntries(userId: string): Promise<LogEntryWithRelations[]> {
    const entries = await db
      .select()
      .from(logEntries)
      .where(eq(logEntries.user_id, userId))
      .orderBy(logEntries.created_at);
    
    return await Promise.all(entries.map(entry => this.enrichLogEntry(entry)));
  }

  async getLogEntryById(id: string): Promise<LogEntryWithRelations | undefined> {
    const [entry] = await db
      .select()
      .from(logEntries)
      .where(eq(logEntries.id, id));
    
    if (!entry) return undefined;
    
    return this.enrichLogEntry(entry);
  }

  async createLogEntry(logEntryData: InsertLogEntry, tagIds: string[] = []): Promise<LogEntryWithRelations> {
    // Generate a UUID for the log entry
    const id = crypto.randomUUID();
    const now = new Date();
    
    const [entry] = await db
      .insert(logEntries)
      .values({ 
        id, 
        ...logEntryData,
        created_at: now,
        updated_at: now
      })
      .returning();
    
    // Add tags if provided
    for (const tagId of tagIds) {
      await this.addTagToLogEntry({
        log_entry_id: entry.id,
        tag_id: tagId
      });
    }
    
    return this.enrichLogEntry(entry);
  }

  async updateLogEntry(id: string, logEntryData: Partial<LogEntry>, tagIds?: string[]): Promise<LogEntryWithRelations | undefined> {
    const [entry] = await db
      .update(logEntries)
      .set({
        ...logEntryData,
        updated_at: new Date()
      })
      .where(eq(logEntries.id, id))
      .returning();
    
    if (!entry) return undefined;
    
    // If tagIds is provided, update tags
    if (tagIds) {
      // Remove existing tags
      await db
        .delete(logEntriesTags)
        .where(eq(logEntriesTags.log_entry_id, id));
      
      // Add new tags
      for (const tagId of tagIds) {
        await this.addTagToLogEntry({
          log_entry_id: id,
          tag_id: tagId
        });
      }
    }
    
    return this.enrichLogEntry(entry);
  }

  async deleteLogEntry(id: string): Promise<boolean> {
    // Delete related media
    await db
      .delete(media)
      .where(eq(media.log_entry_id, id));
    
    // Delete log entry tag relationships
    await db
      .delete(logEntriesTags)
      .where(eq(logEntriesTags.log_entry_id, id));
    
    // Delete the log entry
    const result = await db
      .delete(logEntries)
      .where(eq(logEntries.id, id));
    
    return true; // If we got here without errors, it was successful
  }

  async getFavoriteLogEntries(userId: string): Promise<LogEntryWithRelations[]> {
    const favorites = await db
      .select()
      .from(logEntries)
      .where(and(
        eq(logEntries.user_id, userId),
        eq(logEntries.is_favorite, true)
      ))
      .orderBy(logEntries.created_at);
    
    return await Promise.all(favorites.map(entry => this.enrichLogEntry(entry)));
  }

  async toggleFavoriteLogEntry(id: string, isFavorite: boolean): Promise<LogEntry | undefined> {
    const [entry] = await db
      .update(logEntries)
      .set({
        is_favorite: isFavorite,
        updated_at: new Date()
      })
      .where(eq(logEntries.id, id))
      .returning();
    
    return entry;
  }

  // Tag methods
  async getTags(userId: string): Promise<Tag[]> {
    return db
      .select()
      .from(tags)
      .where(eq(tags.user_id, userId))
      .orderBy(tags.name);
  }

  async getTagById(id: string): Promise<Tag | undefined> {
    const [tag] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, id));
    
    return tag;
  }

  async createTag(tagData: InsertTag): Promise<Tag> {
    // Generate a UUID for the tag
    const id = crypto.randomUUID();
    const now = new Date();
    
    const [tag] = await db
      .insert(tags)
      .values({ 
        id, 
        ...tagData,
        created_at: now,
        updated_at: now
      })
      .returning();
    
    return tag;
  }

  async deleteTag(id: string): Promise<boolean> {
    // Delete tag relationships first
    await db
      .delete(logEntriesTags)
      .where(eq(logEntriesTags.tag_id, id));
    
    // Delete the tag
    await db
      .delete(tags)
      .where(eq(tags.id, id));
    
    return true;
  }

  async getLogEntriesByTag(tagId: string): Promise<LogEntryWithRelations[]> {
    // Find all log entries that have this tag
    const logEntryTags = await db
      .select()
      .from(logEntriesTags)
      .where(eq(logEntriesTags.tag_id, tagId));
    
    const logEntryIds = logEntryTags.map(lt => lt.log_entry_id);
    
    if (logEntryIds.length === 0) {
      return [];
    }
    
    // Get those log entries using a simple approach - get all entries that match any ID in the array
    const entries = [];
    for (const entryId of logEntryIds) {
      const matchingEntries = await db
        .select()
        .from(logEntries)
        .where(eq(logEntries.id, entryId));
      
      entries.push(...matchingEntries);
    }
    
    // Sort by creation date
    entries.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return await Promise.all(entries.map(entry => this.enrichLogEntry(entry)));
  }

  // Log entry tag methods
  async addTagToLogEntry(logEntryTagData: InsertLogEntryTag): Promise<LogEntryTag> {
    // Generate a UUID for the log entry tag relationship
    const id = crypto.randomUUID();
    const now = new Date();
    
    const [logEntryTag] = await db
      .insert(logEntriesTags)
      .values({ 
        id, 
        ...logEntryTagData,
        created_at: now
      })
      .returning();
    
    return logEntryTag;
  }

  async removeTagFromLogEntry(logEntryId: string, tagId: string): Promise<boolean> {
    await db
      .delete(logEntriesTags)
      .where(
        and(
          eq(logEntriesTags.log_entry_id, logEntryId),
          eq(logEntriesTags.tag_id, tagId)
        )
      );
    
    return true;
  }

  // Media methods
  async getMediaForLogEntry(logEntryId: string): Promise<Media[]> {
    return db
      .select()
      .from(media)
      .where(eq(media.log_entry_id, logEntryId))
      .orderBy(media.created_at);
  }

  async addMediaToLogEntry(mediaData: InsertMedia): Promise<Media> {
    // Generate a UUID for the media
    const id = crypto.randomUUID();
    const now = new Date();
    
    const [mediaItem] = await db
      .insert(media)
      .values({ 
        id, 
        ...mediaData,
        created_at: now,
        updated_at: now
      })
      .returning();
    
    return mediaItem;
  }

  async deleteMedia(id: string): Promise<boolean> {
    await db
      .delete(media)
      .where(eq(media.id, id));
    
    return true;
  }

  // Message template methods
  async getMessageTemplate(userId: string): Promise<MessageTemplate | undefined> {
    const [template] = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.user_id, userId));
    
    return template;
  }

  async createOrUpdateMessageTemplate(templateData: InsertMessageTemplate): Promise<MessageTemplate> {
    // Check if template exists for this user
    const existingTemplate = await this.getMessageTemplate(templateData.user_id);
    
    if (existingTemplate) {
      // Update existing template
      const [template] = await db
        .update(messageTemplates)
        .set({
          ...templateData,
          updated_at: new Date()
        })
        .where(eq(messageTemplates.id, existingTemplate.id))
        .returning();
      
      return template;
    } else {
      // Create new template with UUID
      const id = crypto.randomUUID();
      const now = new Date();
      const [template] = await db
        .insert(messageTemplates)
        .values({ 
          id, 
          ...templateData,
          created_at: now,
          updated_at: now
        })
        .returning();
      
      return template;
    }
  }

  // Contact methods
  async getContacts(userId: string): Promise<ContactPerson[]> {
    const userLogEntries = await this.getLogEntries(userId);
    
    // Group log entries by email or phone
    const contactMap = new Map<string, LogEntry[]>();
    
    for (const entry of userLogEntries) {
      // Skip entries with no contact info
      if (!entry.email && !entry.phone) continue;
      
      // Use email as primary key, fall back to phone
      const key = entry.email || entry.phone!;
      
      if (!contactMap.has(key)) {
        contactMap.set(key, []);
      }
      
      contactMap.get(key)!.push(entry);
    }
    
    // Convert map to array of contacts
    const contacts: ContactPerson[] = [];
    
    // Get the entries from the map in a way that avoids Map iterator type issues
    const keys = Array.from(contactMap.keys());
    for (const key of keys) {
      const entries = contactMap.get(key)!;
      
      // Sort entries by date, newest first
      entries.sort((a: LogEntry, b: LogEntry) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      // Use the most recent entry for contact info
      const mostRecent = entries[0];
      
      // Get all tags for this contact
      const tagIds = new Set<string>();
      for (const entry of entries) {
        const entryWithTags = await this.enrichLogEntry(entry);
        entryWithTags.tags?.forEach(tag => tagIds.add(tag.id));
      }
      
      const contactTags = await Promise.all(
        Array.from(tagIds).map(id => this.getTagById(id))
      );
      
      contacts.push({
        id: key, // Using email/phone as ID
        name: mostRecent.name,
        company: mostRecent.company,
        title: mostRecent.title,
        email: mostRecent.email,
        phone: mostRecent.phone,
        logEntries: entries,
        tags: contactTags.filter(Boolean) as Tag[]
      });
    }
    
    // Sort contacts by name
    contacts.sort((a: ContactPerson, b: ContactPerson) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
    
    return contacts;
  }

  async getContactById(id: string): Promise<ContactPerson | undefined> {
    const contacts = await this.getContacts(id.split(':')[0]); // Extract user ID from contact ID
    return contacts.find(contact => contact.id === id);
  }

  // Search method
  async searchLogEntries(userId: string, query: string): Promise<LogEntryWithRelations[]> {
    query = `%${query.toLowerCase()}%`;
    
    const entries = await db
      .select()
      .from(logEntries)
      .where(
        and(
          eq(logEntries.user_id, userId),
          or(
            like(logEntries.name, query),
            like(logEntries.company, query),
            like(logEntries.title, query),
            like(logEntries.notes, query),
            like(logEntries.where_met, query)
          )
        )
      )
      .orderBy(logEntries.created_at);
    
    return await Promise.all(entries.map(entry => this.enrichLogEntry(entry)));
  }

  // Helper method to enrich a log entry with its related data
  private async enrichLogEntry(entry: LogEntry): Promise<LogEntryWithRelations> {
    const entryTags = await db
      .select()
      .from(logEntriesTags)
      .where(eq(logEntriesTags.log_entry_id, entry.id));
    
    const tagIds = entryTags.map(et => et.tag_id);
    
    let entryTagsData: Tag[] = [];
    // Get tags one by one instead of using the OR condition with reduce
    if (tagIds.length > 0) {
      for (const tagId of tagIds) {
        const [tag] = await db
          .select()
          .from(tags)
          .where(eq(tags.id, tagId));
        
        if (tag) {
          entryTagsData.push(tag);
        }
      }
    }
    
    const entryMedia = await db
      .select()
      .from(media)
      .where(eq(media.log_entry_id, entry.id));
    
    return {
      ...entry,
      tags: entryTagsData,
      media: entryMedia
    };
  }
}