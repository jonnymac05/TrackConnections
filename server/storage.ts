import {
  User,
  InsertUser,
  LogEntry,
  InsertLogEntry,
  Tag,
  InsertTag,
  LogEntryTag,
  InsertLogEntryTag,
  Media,
  InsertMedia,
  MessageTemplate,
  InsertMessageTemplate,
  LogEntryWithRelations,
  Contact,
  InsertContact,
  ContactWithRelations
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { v4 as uuidv4 } from "uuid";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<User>): Promise<User | undefined>;
  updateStripeCustomerId(id: string, stripeCustomerId: string): Promise<User | undefined>;
  updateUserStripeInfo(id: string, stripeInfo: { 
    stripe_customer_id: string; 
    stripe_subscription_id?: string; 
  }): Promise<User | undefined>;
  
  // Log entry methods
  getLogEntries(userId: string): Promise<LogEntryWithRelations[]>;
  getLogEntryById(id: string): Promise<LogEntryWithRelations | undefined>;
  createLogEntry(logEntry: InsertLogEntry, tagIds?: string[]): Promise<LogEntryWithRelations>;
  updateLogEntry(id: string, logEntryData: Partial<LogEntry>, tagIds?: string[]): Promise<LogEntryWithRelations | undefined>;
  deleteLogEntry(id: string): Promise<boolean>;
  getFavoriteLogEntries(userId: string): Promise<LogEntryWithRelations[]>;
  toggleFavoriteLogEntry(id: string, isFavorite: boolean): Promise<LogEntry | undefined>;
  enrichLogEntry(entry: LogEntry): Promise<LogEntryWithRelations>;
  
  // Tag methods
  getTags(userId: string): Promise<Tag[]>;
  getTagById(id: string): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  deleteTag(id: string): Promise<boolean>;
  getLogEntriesByTag(tagId: string): Promise<LogEntryWithRelations[]>;
  
  // Log entry tag methods
  addTagToLogEntry(logEntryTagData: InsertLogEntryTag): Promise<LogEntryTag>;
  removeTagFromLogEntry(logEntryId: string, tagId: string): Promise<boolean>;
  
  // Media methods
  getMediaForLogEntry(logEntryId: string): Promise<Media[]>;
  getMediaById(id: string): Promise<Media | undefined>;
  addMediaToLogEntry(media: InsertMedia): Promise<Media>;
  updateMedia(id: string, mediaData: Partial<Media>): Promise<Media | undefined>;
  getUnassignedMedia(userId: string): Promise<Media[]>;
  deleteMedia(id: string): Promise<boolean>;
  
  // Message template methods
  getMessageTemplate(userId: string): Promise<MessageTemplate | undefined>;
  createOrUpdateMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate>;
  
  // Contact methods
  // Legacy contact methods (deprecated)
  getContacts(userId: string): Promise<Contact[]>;
  getContactById(id: string): Promise<Contact | undefined>;
  
  // New contact methods
  getAllContacts(userId: string): Promise<ContactWithRelations[]>;
  getContactByIdNew(id: string): Promise<ContactWithRelations | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, contactData: Partial<Contact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<boolean>;
  getFavoriteContacts(userId: string): Promise<ContactWithRelations[]>;
  toggleFavoriteContact(id: string, isFavorite: boolean): Promise<Contact | undefined>;
  enrichContact(contact: Contact): Promise<ContactWithRelations>;
  
  // Search methods
  searchLogEntries(userId: string, query: string): Promise<LogEntryWithRelations[]>;
  searchContacts(userId: string, query: string): Promise<Contact[]>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private logEntries: Map<string, LogEntry>;
  private tags: Map<string, Tag>;
  private logEntriesTags: Map<string, LogEntryTag>;
  private mediaItems: Map<string, Media>;
  private messageTemplates: Map<string, MessageTemplate>;
  private contacts: Map<string, Contact>;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.logEntries = new Map();
    this.tags = new Map();
    this.logEntriesTags = new Map();
    this.mediaItems = new Map();
    this.messageTemplates = new Map();
    this.contacts = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const timestamp = new Date();
    const id = uuidv4();
    const user: User = {
      id,
      name: userData.name ?? null,
      email: userData.email,
      password: userData.password,
      roles: userData.roles ?? ["user"],
      stripe_customer_id: userData.stripe_customer_id ?? null,
      stripe_subscription_id: userData.stripe_subscription_id ?? null,
      created_at: timestamp,
      updated_at: timestamp
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      ...userData,
      updated_at: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateStripeCustomerId(id: string, stripeCustomerId: string): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      stripe_customer_id: stripeCustomerId,
      updated_at: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateUserStripeInfo(id: string, stripeInfo: { 
    stripe_customer_id: string; 
    stripe_subscription_id?: string;
  }): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      stripe_customer_id: stripeInfo.stripe_customer_id,
      stripe_subscription_id: stripeInfo.stripe_subscription_id || null,
      updated_at: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Log entry methods
  async getLogEntries(userId: string): Promise<LogEntryWithRelations[]> {
    const entries = Array.from(this.logEntries.values())
      .filter(entry => entry.user_id === userId)
      .sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    
    return Promise.all(entries.map(entry => this.enrichLogEntry(entry)));
  }

  async getLogEntryById(id: string): Promise<LogEntryWithRelations | undefined> {
    const entry = this.logEntries.get(id);
    if (!entry) return undefined;
    
    return this.enrichLogEntry(entry);
  }

  async createLogEntry(logEntryData: InsertLogEntry, tagIds: string[] = []): Promise<LogEntryWithRelations> {
    const timestamp = new Date();
    const id = uuidv4();
    
    // Handle optional fields to avoid undefined values
    const logEntry: LogEntry = {
      id,
      name: logEntryData.name || null,
      email: logEntryData.email || null,
      company: logEntryData.company || null,
      title: logEntryData.title || null,
      phone: logEntryData.phone || null,
      notes: logEntryData.notes || null,
      is_favorite: logEntryData.is_favorite ?? false,
      where_met: logEntryData.where_met || null,
      contact_id: logEntryData.contact_id || null,
      user_id: logEntryData.user_id,
      created_at: timestamp,
      updated_at: timestamp
    };
    
    this.logEntries.set(id, logEntry);
    
    // Add tags if provided
    for (const tagId of tagIds) {
      await this.addTagToLogEntry({
        log_entry_id: id,
        tag_id: tagId
      });
    }
    
    // If this log entry is associated with a contact, make sure the contact exists
    if (logEntry.contact_id) {
      const contact = this.contacts.get(logEntry.contact_id);
      if (!contact) {
        // The contact doesn't exist yet, we can create it with basic info from the log entry
        await this.createContact({
          created_by: logEntry.user_id,
          name: logEntry.name || null,
          email: logEntry.email || null,
          company: logEntry.company || null,
          title: logEntry.title || null,
          phone: logEntry.phone || null,
          notes: logEntry.notes || null,
          is_favorite: false,
          where_met: logEntry.where_met || null
        });
      }
    }
    
    return this.enrichLogEntry(logEntry);
  }

  async updateLogEntry(id: string, logEntryData: Partial<LogEntry>, tagIds?: string[]): Promise<LogEntryWithRelations | undefined> {
    const logEntry = this.logEntries.get(id);
    if (!logEntry) return undefined;
    
    const updatedLogEntry: LogEntry = {
      ...logEntry,
      ...logEntryData,
      updated_at: new Date()
    };
    
    this.logEntries.set(id, updatedLogEntry);
    
    // If tagIds is provided, update tags
    if (tagIds) {
      // Remove existing tags
      const existingLogEntryTags = Array.from(this.logEntriesTags.values())
        .filter(entry => entry.log_entry_id === id);
      
      for (const entry of existingLogEntryTags) {
        await this.removeTagFromLogEntry(id, entry.tag_id);
      }
      
      // Add new tags
      for (const tagId of tagIds) {
        await this.addTagToLogEntry({
          log_entry_id: id,
          tag_id: tagId
        });
      }
    }
    
    return this.enrichLogEntry(updatedLogEntry);
  }

  async deleteLogEntry(id: string): Promise<boolean> {
    // Delete related entities first
    // 1. Delete media items
    const mediaItems = await this.getMediaForLogEntry(id);
    for (const media of mediaItems) {
      await this.deleteMedia(media.id);
    }
    
    // 2. Delete log entry tag relationships
    const logEntryTags = Array.from(this.logEntriesTags.values())
      .filter(entry => entry.log_entry_id === id);
    
    for (const entry of logEntryTags) {
      this.logEntriesTags.delete(entry.id);
    }
    
    // 3. Delete the log entry itself
    return this.logEntries.delete(id);
  }

  async getFavoriteLogEntries(userId: string): Promise<LogEntryWithRelations[]> {
    const favorites = Array.from(this.logEntries.values())
      .filter(entry => entry.user_id === userId && entry.is_favorite)
      .sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    
    return Promise.all(favorites.map(entry => this.enrichLogEntry(entry)));
  }

  async toggleFavoriteLogEntry(id: string, isFavorite: boolean): Promise<LogEntry | undefined> {
    const logEntry = this.logEntries.get(id);
    if (!logEntry) return undefined;
    
    const updatedLogEntry: LogEntry = {
      ...logEntry,
      is_favorite: isFavorite,
      updated_at: new Date()
    };
    
    this.logEntries.set(id, updatedLogEntry);
    return updatedLogEntry;
  }

  // Tag methods
  async getTags(userId: string): Promise<Tag[]> {
    return Array.from(this.tags.values())
      .filter(tag => tag.user_id === userId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTagById(id: string): Promise<Tag | undefined> {
    return this.tags.get(id);
  }

  async createTag(tagData: InsertTag): Promise<Tag> {
    const timestamp = new Date();
    const id = uuidv4();
    const tag: Tag = {
      id,
      ...tagData,
      created_at: timestamp,
      updated_at: timestamp
    };
    
    this.tags.set(id, tag);
    return tag;
  }

  async deleteTag(id: string): Promise<boolean> {
    // Delete tag relationships first
    const relationships = Array.from(this.logEntriesTags.values())
      .filter(entry => entry.tag_id === id);
    
    for (const rel of relationships) {
      this.logEntriesTags.delete(rel.id);
    }
    
    // Delete the tag
    return this.tags.delete(id);
  }

  async getLogEntriesByTag(tagId: string): Promise<LogEntryWithRelations[]> {
    // Find all log entry IDs that have this tag
    const logEntryIds = Array.from(this.logEntriesTags.values())
      .filter(entry => entry.tag_id === tagId)
      .map(entry => entry.log_entry_id);
    
    // Get those log entries
    const entries = Array.from(this.logEntries.values())
      .filter(entry => logEntryIds.includes(entry.id))
      .sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    
    return Promise.all(entries.map(entry => this.enrichLogEntry(entry)));
  }

  // Log entry tag methods
  async addTagToLogEntry(logEntryTagData: InsertLogEntryTag): Promise<LogEntryTag> {
    const id = uuidv4();
    const timestamp = new Date();
    const logEntryTag: LogEntryTag = {
      id,
      ...logEntryTagData,
      created_at: timestamp
    };
    
    this.logEntriesTags.set(id, logEntryTag);
    return logEntryTag;
  }

  async removeTagFromLogEntry(logEntryId: string, tagId: string): Promise<boolean> {
    const relationship = Array.from(this.logEntriesTags.values())
      .find(entry => entry.log_entry_id === logEntryId && entry.tag_id === tagId);
    
    if (!relationship) return false;
    return this.logEntriesTags.delete(relationship.id);
  }

  // Media methods
  async getMediaForLogEntry(logEntryId: string): Promise<Media[]> {
    return Array.from(this.mediaItems.values())
      .filter(media => media.log_entry_id === logEntryId)
      .sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }
  
  async getMediaById(id: string): Promise<Media | undefined> {
    return this.mediaItems.get(id);
  }

  async addMediaToLogEntry(mediaData: InsertMedia): Promise<Media> {
    const timestamp = new Date();
    const id = uuidv4();
    const media: Media = {
      id,
      user_id: mediaData.user_id,
      log_entry_id: mediaData.log_entry_id ?? null,
      url: mediaData.url,
      filename: mediaData.filename,
      file_key: mediaData.file_key,
      file_type: mediaData.file_type,
      file_size: mediaData.file_size ?? null,
      created_at: timestamp,
      updated_at: timestamp
    };
    
    this.mediaItems.set(id, media);
    return media;
  }

  async updateMedia(id: string, mediaData: Partial<Media>): Promise<Media | undefined> {
    const media = this.mediaItems.get(id);
    if (!media) return undefined;
    
    const updatedMedia: Media = {
      ...media,
      ...mediaData,
      updated_at: new Date()
    };
    
    this.mediaItems.set(id, updatedMedia);
    return updatedMedia;
  }
  
  async getUnassignedMedia(userId: string): Promise<Media[]> {
    return Array.from(this.mediaItems.values())
      .filter(media => media.user_id === userId && !media.log_entry_id)
      .sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }

  async deleteMedia(id: string): Promise<boolean> {
    return this.mediaItems.delete(id);
  }

  // Message template methods
  async getMessageTemplate(userId: string): Promise<MessageTemplate | undefined> {
    return Array.from(this.messageTemplates.values())
      .find(template => template.user_id === userId);
  }

  async createOrUpdateMessageTemplate(templateData: InsertMessageTemplate): Promise<MessageTemplate> {
    // Check if template exists for this user
    const existingTemplate = await this.getMessageTemplate(templateData.user_id);
    
    if (existingTemplate) {
      // Update existing template
      const updatedTemplate: MessageTemplate = {
        ...existingTemplate,
        user_id: templateData.user_id,
        email_template: templateData.email_template || null,
        sms_template: templateData.sms_template || null,
        updated_at: new Date()
      };
      
      this.messageTemplates.set(existingTemplate.id, updatedTemplate);
      return updatedTemplate;
    } else {
      // Create new template
      const timestamp = new Date();
      const id = uuidv4();
      const template: MessageTemplate = {
        id,
        user_id: templateData.user_id,
        email_template: templateData.email_template || null,
        sms_template: templateData.sms_template || null,
        created_at: timestamp,
        updated_at: timestamp
      };
      
      this.messageTemplates.set(id, template);
      return template;
    }
  }

  // Contact methods (Legacy)
  async getContacts(userId: string): Promise<Contact[]> {
    // Fetch contacts from new method
    return this.getAllContacts(userId);
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    // Use the new method directly
    return this.getContactByIdNew(id);
  }

  // New contact methods
  async getAllContacts(userId: string): Promise<ContactWithRelations[]> {
    return Array.from(this.contacts.values())
      .filter(contact => contact.created_by === userId)
      .sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      })
      .map(contact => this.enrichContact(contact));
  }

  async getContactByIdNew(id: string): Promise<ContactWithRelations | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    
    return this.enrichContact(contact);
  }

  async createContact(contactData: InsertContact): Promise<Contact> {
    const timestamp = new Date();
    const id = uuidv4();
    const contact: Contact = {
      id,
      name: contactData.name ?? null,
      email: contactData.email ?? null,
      phone: contactData.phone ?? null,
      company: contactData.company ?? null,
      title: contactData.title ?? null,
      where_met: contactData.where_met ?? null,
      notes: contactData.notes ?? null,
      is_favorite: contactData.is_favorite ?? false,
      created_by: contactData.created_by,
      created_at: timestamp,
      updated_at: timestamp
    };
    
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: string, contactData: Partial<Contact>): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    
    const updatedContact: Contact = {
      ...contact,
      ...contactData,
      updated_at: new Date()
    };
    
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async deleteContact(id: string): Promise<boolean> {
    return this.contacts.delete(id);
  }

  async getFavoriteContacts(userId: string): Promise<ContactWithRelations[]> {
    return Array.from(this.contacts.values())
      .filter(contact => contact.created_by === userId && contact.is_favorite)
      .sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      })
      .map(contact => this.enrichContact(contact));
  }

  async toggleFavoriteContact(id: string, isFavorite: boolean): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    
    const updatedContact: Contact = {
      ...contact,
      is_favorite: isFavorite,
      updated_at: new Date()
    };
    
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  // Method to enrich a contact with its related data
  async enrichContact(contact: Contact): Promise<ContactWithRelations> {
    const relatedEntries = Array.from(this.logEntries.values())
      .filter(entry => entry.contact_id === contact.id)
      .sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    
    const enrichedEntries = await Promise.all(relatedEntries.map(entry => this.enrichLogEntry(entry)));
    
    return {
      ...contact,
      logEntries: enrichedEntries
    };
  }

  // Search method
  async searchLogEntries(userId: string, query: string): Promise<LogEntryWithRelations[]> {
    query = query.toLowerCase();
    
    const entries = Array.from(this.logEntries.values())
      .filter(entry => entry.user_id === userId)
      .filter(entry => {
        // Check each searchable field for the query
        return (
          (entry.name?.toLowerCase().includes(query)) ||
          (entry.company?.toLowerCase().includes(query)) ||
          (entry.title?.toLowerCase().includes(query)) ||
          (entry.notes?.toLowerCase().includes(query)) ||
          (entry.where_met?.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    
    // Enrich entries with tags
    const enrichedEntries = await Promise.all(entries.map(entry => this.enrichLogEntry(entry)));
    
    // Also search for entries with matching tags
    const tags = await this.getTags(userId);
    const matchingTags = tags.filter(tag => tag.name.toLowerCase().includes(query));
    
    for (const tag of matchingTags) {
      const entriesWithTag = await this.getLogEntriesByTag(tag.id);
      
      // Add entries that weren't already found by other criteria
      for (const entry of entriesWithTag) {
        if (!enrichedEntries.some(e => e.id === entry.id)) {
          enrichedEntries.push(entry);
        }
      }
    }
    
    return enrichedEntries;
  }

  async searchContacts(userId: string, query: string): Promise<Contact[]> {
    // Case-insensitive search
    query = query.toLowerCase();
    
    return Array.from(this.contacts.values())
      .filter(contact => contact.created_by === userId)
      .filter(contact => {
        // Only return contacts that match the search query
        return (
          (contact.name?.toLowerCase().includes(query)) ||
          (contact.company?.toLowerCase().includes(query)) ||
          (contact.title?.toLowerCase().includes(query)) ||
          (contact.email?.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  // Helper method to enrich a log entry with its related entities
  async enrichLogEntry(entry: LogEntry): Promise<LogEntryWithRelations> {
    // Get tags for this entry
    const logEntryTags = Array.from(this.logEntriesTags.values())
      .filter(item => item.log_entry_id === entry.id);
    
    const tagIds = logEntryTags.map(item => item.tag_id);
    const tags = await Promise.all(tagIds.map(id => this.getTagById(id)));
    
    // Get media for this entry
    const media = await this.getMediaForLogEntry(entry.id);
    
    // Get associated contact if any
    let contact = undefined;
    if (entry.contact_id) {
      contact = this.contacts.get(entry.contact_id);
    }
    
    return {
      ...entry,
      tags: tags.filter(Boolean) as Tag[],
      media,
      contact: contact
    };
  }
}

// You can toggle between memory storage and database storage
// For development, you can use MemStorage, for production use DatabaseStorage
import { DatabaseStorage } from "./database-storage";
export const storage = new DatabaseStorage();
