import { db, pool } from "./db";
import {
  User, InsertUser, LogEntry, InsertLogEntry, Tag, InsertTag,
  LogEntryTag, InsertLogEntryTag, Media, InsertMedia,
  MessageTemplate, InsertMessageTemplate, LogEntryWithRelations,
  connectUsers, logEntries, tags, logEntriesTags, media, messageTemplates,
  contacts, Contact, InsertContact, ContactWithRelations
} from "@shared/schema";
import { IStorage } from "./storage";
import { eq, and, like, or, desc, isNull } from "drizzle-orm";
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
    try {
      console.log("Getting log entries for user:", userId);
      
      const entries = await db
        .select()
        .from(logEntries)
        .where(eq(logEntries.user_id, userId))
        .orderBy(desc(logEntries.created_at));
      
      console.log(`Found ${entries.length} log entries for user ${userId}`);
      
      if (entries.length === 0) {
        return [];
      }
      
      try {
        // Enrich each entry with its related data
        const enrichedEntries = await Promise.all(
          entries.map(async (entry) => {
            try {
              return await this.enrichLogEntry(entry);
            } catch (enrichError) {
              console.error(`Error enriching log entry ${entry.id}:`, enrichError);
              // Return basic entry if enrichment fails
              return { ...entry, tags: [], media: [], contact: undefined };
            }
          })
        );
        
        console.log(`Successfully enriched ${enrichedEntries.length} entries`);
        return enrichedEntries;
      } catch (enrichError) {
        console.error("Error enriching log entries:", enrichError);
        // Return basic entries if enrichment fails
        return entries.map(entry => ({ ...entry, tags: [], media: [], contact: undefined }));
      }
    } catch (error) {
      console.error("Error in getLogEntries:", error);
      console.error(error instanceof Error ? error.stack : "Unknown error type");
      throw error;
    }
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
    try {
      console.log("Starting createLogEntry in database-storage with data:", JSON.stringify(logEntryData, null, 2));
      
      // Generate UUIDs for the entries
      const logEntryId = crypto.randomUUID();
      const now = new Date();
      
      // First, check if we have a contact or need to create one
      let contactId = logEntryData.contact_id || null;
      
      // If a contact ID wasn't provided but we have contact info, try to find or create a contact
      if (!contactId && (logEntryData.name || logEntryData.email || logEntryData.phone)) {
        try {
          console.log("Checking for existing contacts with matching email or phone");
          
          // Build a query to find existing contacts
          let query = db
            .select()
            .from(contacts)
            .where(eq(contacts.created_by, logEntryData.user_id));
          
          // Add email condition if provided
          if (logEntryData.email) {
            query = query.where(eq(contacts.email, logEntryData.email));
          } 
          // If no email, try phone number if provided
          else if (logEntryData.phone) {
            query = query.where(eq(contacts.phone, logEntryData.phone));
          }
          
          // Execute the query
          const existingContacts = await query;
          console.log(`Found ${existingContacts.length} existing contacts`);
          
          if (existingContacts.length > 0) {
            // Use the first matching contact
            contactId = existingContacts[0].id;
            console.log("Using existing contact with ID:", contactId);
          } else {
            // No match found, create a new contact
            console.log("No matching contact found, creating new contact");
            const contactData = {
              id: crypto.randomUUID(),
              created_by: logEntryData.user_id,
              name: logEntryData.name || null,
              email: logEntryData.email || null,
              company: logEntryData.company || null,
              title: logEntryData.title || null,
              phone: logEntryData.phone || null,
              notes: logEntryData.notes || null,
              where_met: logEntryData.where_met || null,
              is_favorite: logEntryData.is_favorite ?? false,
              created_at: now,
              updated_at: now
            };
            
            const [contact] = await db
              .insert(contacts)
              .values(contactData)
              .returning();
              
            contactId = contact.id;
            console.log("Created new contact with ID:", contactId);
          }
        } catch (contactError) {
          console.error("Error finding/creating contact:", contactError);
          // Continue creating the log entry even if contact handling fails
        }
      }
      
      // Now create the log entry with reference to the contact if it was created
      const dataToInsert = {
        id: logEntryId,
        user_id: logEntryData.user_id,
        contact_id: contactId, // Link to the contact we just created
        name: logEntryData.name || null,
        email: logEntryData.email || null,
        company: logEntryData.company || null,
        title: logEntryData.title || null,
        phone: logEntryData.phone || null,
        notes: logEntryData.notes || null,
        is_favorite: logEntryData.is_favorite ?? false,
        where_met: logEntryData.where_met || null,
        created_at: now,
        updated_at: now
      };
      
      console.log("Prepared data for insertion:", JSON.stringify(dataToInsert, null, 2));
      
      try {
        const [entry] = await db
          .insert(logEntries)
          .values(dataToInsert)
          .returning();
        
        console.log("Entry inserted successfully:", entry.id);
        
        // Add tags if provided
        if (tagIds && tagIds.length > 0) {
          console.log("Adding tags to log entry:", tagIds);
          
          for (const tagId of tagIds) {
            try {
              await this.addTagToLogEntry({
                log_entry_id: entry.id,
                tag_id: tagId
              });
            } catch (tagError) {
              console.error(`Error adding tag ${tagId} to log entry:`, tagError);
              // Continue with other tags even if one fails
            }
          }
        }
        
        try {
          const enrichedEntry = await this.enrichLogEntry(entry);
          console.log("Log entry enriched successfully");
          return enrichedEntry;
        } catch (enrichError) {
          console.error("Error enriching log entry:", enrichError);
          // Return basic entry if enrichment fails
          return { ...entry, tags: [], media: [] };
        }
      } catch (dbError) {
        console.error("Database error inserting log entry:", dbError);
        throw new Error(`Database insertion error: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }
    } catch (error) {
      console.error("Unexpected error in createLogEntry:", error);
      console.error(error instanceof Error ? error.stack : "Unknown error type");
      throw error;
    }
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
  
  async getMediaById(id: string): Promise<Media | undefined> {
    const [mediaItem] = await db
      .select()
      .from(media)
      .where(eq(media.id, id));
    
    return mediaItem;
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

  async updateMedia(id: string, mediaData: Partial<Media>): Promise<Media | undefined> {
    // Ensure we don't try to update the id
    const { id: _, ...updateData } = mediaData;
    
    const now = new Date();
    
    // Update the media
    const [updatedMedia] = await db
      .update(media)
      .set({ 
        ...updateData,
        updated_at: now 
      })
      .where(eq(media.id, id))
      .returning();
    
    return updatedMedia;
  }
  
  async getUnassignedMedia(userId: string): Promise<Media[]> {
    return db
      .select()
      .from(media)
      .where(
        and(
          eq(media.user_id, userId),
          isNull(media.log_entry_id)
        )
      )
      .orderBy(media.created_at);
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

  // Legacy contact methods
  async getContacts(userId: string): Promise<Contact[]> {
    // Use the new contact methods directly
    return this.getAllContacts(userId);
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    // Use new method directly
    return this.getContactByIdNew(id);
  }
  
  // New contact methods
  async getAllContacts(userId: string): Promise<ContactWithRelations[]> {
    const contactsList = await db
      .select()
      .from(contacts)
      .where(eq(contacts.created_by, userId))
      .orderBy(contacts.name);
    
    return await Promise.all(contactsList.map(contact => this.enrichContact(contact)));
  }

  async getContactByIdNew(id: string): Promise<ContactWithRelations | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id));
    
    if (!contact) return undefined;
    
    return this.enrichContact(contact);
  }

  async createContact(contactData: InsertContact): Promise<Contact> {
    // Generate a UUID for the contact
    const id = crypto.randomUUID();
    const now = new Date();
    
    const [contact] = await db
      .insert(contacts)
      .values({ 
        id, 
        ...contactData,
        is_favorite: contactData.is_favorite || false,
        created_at: now,
        updated_at: now
      })
      .returning();
    
    return contact;
  }

  async updateContact(id: string, contactData: Partial<Contact>): Promise<Contact | undefined> {
    const [contact] = await db
      .update(contacts)
      .set({
        ...contactData,
        updated_at: new Date()
      })
      .where(eq(contacts.id, id))
      .returning();
    
    return contact;
  }

  async deleteContact(id: string): Promise<boolean> {
    // Delete the contact
    await db
      .delete(contacts)
      .where(eq(contacts.id, id));
    
    return true; // If we got here without errors, it was successful
  }

  async getFavoriteContacts(userId: string): Promise<ContactWithRelations[]> {
    const favoriteContacts = await db
      .select()
      .from(contacts)
      .where(and(
        eq(contacts.created_by, userId),
        eq(contacts.is_favorite, true)
      ))
      .orderBy(contacts.name);
    
    return await Promise.all(favoriteContacts.map(contact => this.enrichContact(contact)));
  }

  async toggleFavoriteContact(id: string, isFavorite: boolean): Promise<Contact | undefined> {
    const [contact] = await db
      .update(contacts)
      .set({
        is_favorite: isFavorite,
        updated_at: new Date()
      })
      .where(eq(contacts.id, id))
      .returning();
    
    return contact;
  }

  // Helper method to enrich a contact with its related log entries
  private async enrichContact(contact: Contact): Promise<ContactWithRelations> {
    // Find log entries for this contact
    const relatedEntries = await db
      .select()
      .from(logEntries)
      .where(eq(logEntries.contact_id, contact.id))
      .orderBy(desc(logEntries.created_at));
    
    // Enrich log entries with tags and media
    const enrichedEntries = await Promise.all(relatedEntries.map(entry => this.enrichLogEntry(entry)));
    
    return {
      ...contact,
      logEntries: enrichedEntries
    };
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
  
  async searchContacts(userId: string, query: string): Promise<Contact[]> {
    query = `%${query.toLowerCase()}%`;
    
    try {
      console.log(`Searching contacts for user ${userId} with query '${query}'`);
      
      const result = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.created_by, userId),
            or(
              like(contacts.name, query),
              like(contacts.company, query),
              like(contacts.title, query),
              like(contacts.email, query)
            )
          )
        )
        .orderBy(contacts.name);
      
      console.log(`Found ${result.length} contacts matching query`);
      return result;
    } catch (error) {
      console.error("Error searching contacts:", error);
      return [];
    }
  }

  // Helper method to enrich a log entry with its related data
  private async enrichLogEntry(entry: LogEntry): Promise<LogEntryWithRelations> {
    try {
      console.log("Starting enrichLogEntry for entry:", entry.id);
      
      // Initialize empty arrays and null values for the case of errors
      let entryTagsData: Tag[] = [];
      let entryMedia: Media[] = [];
      let contactData = undefined;
      
      try {
        // Get tags for this entry
        console.log("Getting tags for log entry:", entry.id);
        const entryTags = await db
          .select()
          .from(logEntriesTags)
          .where(eq(logEntriesTags.log_entry_id, entry.id));
        
        const tagIds = entryTags.map(et => et.tag_id);
        console.log(`Found ${tagIds.length} tags for log entry`);
        
        // Get tags one by one instead of using the OR condition with reduce
        if (tagIds.length > 0) {
          for (const tagId of tagIds) {
            try {
              const [tag] = await db
                .select()
                .from(tags)
                .where(eq(tags.id, tagId));
              
              if (tag) {
                entryTagsData.push(tag);
              }
            } catch (tagError) {
              console.error(`Error fetching tag ${tagId}:`, tagError);
              // Continue with other tags even if one fails
            }
          }
        }
      } catch (tagsError) {
        console.error("Error fetching tags for log entry:", tagsError);
        // Continue with an empty tags array
      }
      
      try {
        // Get media for this entry
        console.log("Getting media for log entry:", entry.id);
        entryMedia = await db
          .select()
          .from(media)
          .where(eq(media.log_entry_id, entry.id));
        
        console.log(`Found ${entryMedia.length} media items for log entry`);
      } catch (mediaError) {
        console.error("Error fetching media for log entry:", mediaError);
        // Continue with an empty media array
      }
      
      try {
        // Get associated contact if any
        if (entry.contact_id) {
          console.log("Getting contact for log entry:", entry.id, "Contact ID:", entry.contact_id);
          const [contact] = await db
            .select()
            .from(contacts)
            .where(eq(contacts.id, entry.contact_id));
          
          if (contact) {
            contactData = contact;
            console.log("Found contact:", contact.id);
          } else {
            console.log("No contact found with ID:", entry.contact_id);
          }
        }
      } catch (contactError) {
        console.error("Error fetching contact for log entry:", contactError);
        // Continue with contact as undefined
      }
      
      console.log("Completed enriching log entry:", entry.id);
      return {
        ...entry,
        tags: entryTagsData,
        media: entryMedia,
        contact: contactData
      };
    } catch (error) {
      console.error("Unexpected error in enrichLogEntry:", error);
      console.error(error instanceof Error ? error.stack : "Unknown error type");
      
      // In case of error, return the entry with empty arrays
      return {
        ...entry,
        tags: [],
        media: [],
        contact: undefined
      };
    }
  }
}