/**
 * Base Service for Firestore Operations
 * Provides common CRUD operations to reduce code duplication
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export class BaseService {
  /**
   * @param {Object} db - Firestore database instance
   * @param {string} collectionName - Collection name
   */
  constructor(db, collectionName) {
    this.db = db;
    this.collectionName = collectionName;
  }

  /**
   * Get collection reference
   * @returns {Object} Collection reference
   */
  getCollectionRef() {
    return collection(this.db, this.collectionName);
  }

  /**
   * Get document reference
   * @param {string} id - Document ID
   * @returns {Object} Document reference
   */
  getDocRef(id) {
    return doc(this.db, this.collectionName, id);
  }

  /**
   * Get all documents from collection
   * @param {Object} options - Query options (where, orderBy, limit)
   * @returns {Promise<Array>} Array of documents with IDs
   */
  async getAll(options = {}) {
    try {
      const collectionRef = this.getCollectionRef();
      let q = collectionRef;

      if (options.where) {
        for (const condition of options.where) {
          q = query(q, where(...condition));
        }
      }

      if (options.orderBy) {
        const [field, direction = 'asc'] = options.orderBy;
        q = query(q, orderBy(field, direction));
      }

      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting all documents from ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Document data with ID or null
   */
  async getById(id) {
    try {
      const docRef = this.getDocRef(id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }

      return null;
    } catch (error) {
      console.error(`Error getting document ${id} from ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find documents matching criteria
   * @param {Array} conditions - Array of where conditions [[field, operator, value], ...]
   * @param {Object} options - Additional query options (orderBy, limit)
   * @returns {Promise<Array>} Array of matching documents
   */
  async find(conditions, options = {}) {
    try {
      return await this.getAll({
        where: conditions,
        ...options
      });
    } catch (error) {
      console.error(`Error finding documents in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find one document matching criteria
   * @param {Array} conditions - Array of where conditions [[field, operator, value], ...]
   * @returns {Promise<Object|null>} First matching document or null
   */
  async findOne(conditions) {
    try {
      const results = await this.find(conditions, { limit: 1 });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Error finding document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Create new document
   * @param {Object} data - Document data
   * @param {boolean} addTimestamp - Add createdAt timestamp (default: true)
   * @returns {Promise<Object>} Created document with ID
   */
  async create(data, addTimestamp = true) {
    try {
      const collectionRef = this.getCollectionRef();
      const docData = addTimestamp
        ? { ...data, createdAt: Timestamp.now() }
        : data;

      const docRef = await addDoc(collectionRef, docData);

      return {
        id: docRef.id,
        ...docData
      };
    } catch (error) {
      console.error(`Error creating document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update document by ID
   * @param {string} id - Document ID
   * @param {Object} data - Updated data
   * @param {boolean} addTimestamp - Add updatedAt timestamp (default: true)
   * @returns {Promise<Object>} Updated document
   */
  async update(id, data, addTimestamp = true) {
    try {
      const docRef = this.getDocRef(id);
      const updateData = addTimestamp
        ? { ...data, updatedAt: Timestamp.now() }
        : data;

      await updateDoc(docRef, updateData);

      return {
        id,
        ...updateData
      };
    } catch (error) {
      console.error(`Error updating document ${id} in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Save document (create if ID doesn't exist, update if exists)
   * @param {Object} data - Document data
   * @param {string} id - Document ID (optional)
   * @returns {Promise<Object>} Saved document
   */
  async save(data, id = null) {
    try {
      if (id) {
        const exists = await this.getById(id);
        if (exists) {
          return await this.update(id, data);
        }
      }

      return await this.create(data);
    } catch (error) {
      console.error(`Error saving document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete document by ID
   * @param {string} id - Document ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      const docRef = this.getDocRef(id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document ${id} from ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Count documents in collection
   * @param {Array} conditions - Optional where conditions
   * @returns {Promise<number>} Document count
   */
  async count(conditions = null) {
    try {
      const docs = conditions
        ? await this.find(conditions)
        : await this.getAll();

      return docs.length;
    } catch (error) {
      console.error(`Error counting documents in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Check if document exists
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} True if exists
   */
  async exists(id) {
    try {
      const doc = await this.getById(id);
      return doc !== null;
    } catch (error) {
      console.error(`Error checking if document ${id} exists in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Batch create multiple documents
   * @param {Array<Object>} documents - Array of document data
   * @returns {Promise<Array>} Array of created documents
   */
  async batchCreate(documents) {
    try {
      const promises = documents.map(doc => this.create(doc));
      return await Promise.all(promises);
    } catch (error) {
      console.error(`Error batch creating documents in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Batch update multiple documents
   * @param {Array<Object>} updates - Array of {id, data} objects
   * @returns {Promise<Array>} Array of updated documents
   */
  async batchUpdate(updates) {
    try {
      const promises = updates.map(({ id, data }) => this.update(id, data));
      return await Promise.all(promises);
    } catch (error) {
      console.error(`Error batch updating documents in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Batch delete multiple documents
   * @param {Array<string>} ids - Array of document IDs
   * @returns {Promise<void>}
   */
  async batchDelete(ids) {
    try {
      const promises = ids.map(id => this.delete(id));
      await Promise.all(promises);
    } catch (error) {
      console.error(`Error batch deleting documents from ${this.collectionName}:`, error);
      throw error;
    }
  }
}
