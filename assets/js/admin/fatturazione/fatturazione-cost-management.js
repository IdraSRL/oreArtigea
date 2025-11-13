// fatturazione-cost-management.js - Adattato dal modulo cost-management.js originale
import { db } from '../../common/firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { slug } from './fatturazione-data-readers.js';

/**
 * Get all employees with their associated costs from Data/employees
 * @returns {Promise<Array>} Array of employee objects with cost data
 */
export async function getEmployeesWithCosts() {
  console.log('🔍 Loading employees with costs from Data/employees');
  
  try {
    const docRef = doc(db, 'Data', 'employees');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.warn('Document Data/employees not found');
      return [];
    }
    
    const data = docSnap.data();
    const employees = [];
    
    console.log('📋 Raw employees data:', data);
    
    if (Array.isArray(data.employees)) {
      data.employees.forEach((emp, index) => {
        console.log(`👤 Processing employee ${index}:`, emp);
        
        if (typeof emp === 'object' && emp.name) {
          // Skip test employees that start with * but include all others
          if (!emp.name.startsWith('*')) {
            employees.push({
              id: emp.name.replaceAll(' ', '_'),
              name: emp.name,
              // Use cost if present, otherwise default to 15.00
              cost: parseFloat(emp.cost) || 15.00
            });
            console.log(`✅ Added employee: ${emp.name} - €${parseFloat(emp.cost) || 15.00}/ora`);
          } else {
            console.log(`⏭️ Skipped test employee: ${emp.name}`);
          }
        }
      });
    }
    
    console.log(`✅ Found ${employees.length} employees with costs`);
    return employees;
    
  } catch (error) {
    console.error('❌ Error fetching employees with costs:', error);
    return [];
  }
}

/**
 * Get all job sites with their associated costs from main catalogues
 * @returns {Promise<Array>} Array of job site objects with cost data
 */
export async function getJobSitesWithCosts() {
  console.log('🔍 Loading job sites with costs from main catalogues (Data/uffici, Data/appartamenti, Data/bnb, Data/pst)');
  
  try {
    const types = ['uffici', 'appartamenti', 'bnb', 'pst'];
    const jobSites = [];
    
    for (const type of types) {
      console.log(`📚 Loading catalogue: Data/${type}`);
      const docRef = doc(db, 'Data', type);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const items = data[type] || [];
        
        console.log(`📚 Raw data for ${type}:`, items);
        
        items.forEach((item, index) => {
          console.log(`🏗️ Processing ${type} item ${index}:`, item);
          
          if (typeof item === 'string') {
            // String format - parse "NAME|MINUTES" or just "NAME"
            const parts = item.split('|');
            const itemName = parts[0].trim();
            
            if (itemName) {
              const jobSite = {
                key: `${type}__${itemName.toLowerCase().replace(/\s+/g, '_').replace(/[^\w\-]/g, '')}`,
                type: type,
                name: itemName,
                biancheria: 0,
                prodotti: 0,
                fatturato_mensile: 0,
                fatturato_intervento: 0
              };
              jobSites.push(jobSite);
              console.log(`✅ Added jobsite with defaults: ${itemName} (${jobSite.key})`);
            }
          } else if (item && typeof item === 'object' && (item.nome || item.name)) {
            // Object format with cost data
            const name = item.nome || item.name;
            const jobSite = {
              key: `${type}__${name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w\-]/g, '')}`,
              type: type,
              name: name,
              biancheria: parseFloat(item.biancheria) || 0,
              prodotti: parseFloat(item.prodotti) || 0,
              fatturato_mensile: parseFloat(item.fatturato_mensile) || 0,
              fatturato_intervento: parseFloat(item.fatturato_intervento) || 0
            };
            jobSites.push(jobSite);
            console.log(`✅ Added jobsite with costs: ${name} - B:€${jobSite.biancheria}, P:€${jobSite.prodotti}, M:€${jobSite.fatturato_mensile}, I:€${jobSite.fatturato_intervento}`);
          }
        });
      } else {
        console.warn(`📚 Document Data/${type} not found`);
      }
    }
    
    // Sort by type and name for better organization
    jobSites.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      return a.name.localeCompare(b.name);
    });
    
    console.log(`✅ Found ${jobSites.length} job sites with costs from main catalogues`);
    return jobSites;
    
  } catch (error) {
    console.error('❌ Error fetching job sites with costs:', error);
    return [];
  }
}

/**
 * Write/update employee cost data to Data/employees
 * @param {Object} costsMap - Map of employeeId -> cost
 * @returns {Promise<boolean>} Success status
 */
export async function writeEmployeeCosts(costsMap) {
  console.log('💾 Writing employee costs to Data/employees', costsMap);
  
  try {
    const docRef = doc(db, 'Data', 'employees');
    const docSnap = await getDoc(docRef);
    
    let currentData = {};
    if (docSnap.exists()) {
      currentData = docSnap.data();
      console.log('📋 Current employees data:', currentData);
    } else {
      console.warn('Document Data/employees not found, cannot update costs');
      return false;
    }
    
    // Update existing employees array with cost data
    const updatedEmployees = [];
    
    if (Array.isArray(currentData.employees)) {
      currentData.employees.forEach(emp => {
        if (typeof emp === 'object' && emp.name) {
          const employeeId = emp.name.replaceAll(' ', '_');
          const newCost = costsMap[employeeId] !== undefined ? costsMap[employeeId] : parseFloat(emp.cost) || 15.00;
          
         // Preserve all existing fields and add/update cost only if different
          updatedEmployees.push({
            ...emp, // Keep all existing fields (urlParam, password, etc.)
            name: emp.name,
           cost: parseFloat(emp.cost) !== newCost ? newCost : parseFloat(emp.cost) || 0
          });
          console.log(`🔄 Updated employee: ${emp.name} - €${newCost}/ora`);
        }
      });
    }
    
    // Preserve all other fields from original document
    const dataToSave = {
      ...currentData,
      employees: updatedEmployees
    };
    
    console.log('💾 Saving to Data/employees:', dataToSave);
    await setDoc(docRef, dataToSave);
    
    console.log('✅ Employee costs saved successfully to Data/employees');
    return true;
    
  } catch (error) {
    console.error('❌ Error writing employee costs to Data/employees:', error);
    return false;
  }
}

/**
 * Write/update job site cost data to main catalogues
 * @param {Object} costsMap - Map of jobSiteKey -> cost data
 * @returns {Promise<boolean>} Success status
 */
export async function writeJobSiteCosts(costsMap) {
  console.log('💾 Writing job site costs to main catalogues (Data/uffici, Data/appartamenti, Data/bnb, Data/pst)', costsMap);
  
  try {
    const types = ['uffici', 'appartamenti', 'bnb', 'pst'];
    
    for (const type of types) {
      console.log(`💾 Processing catalogue: Data/${type}`);
      const docRef = doc(db, 'Data', type);
      const docSnap = await getDoc(docRef);
      
      let currentData = {};
      
      if (docSnap.exists()) {
        currentData = docSnap.data();
        console.log(`📚 Current data for ${type}:`, currentData);
      } else {
        // Initialize with empty array if document doesn't exist
        currentData[type] = [];
      }
      
      const items = currentData[type] || [];
      const updatedItems = [];
      
      // Process existing items
      items.forEach(item => {
        let itemName = '';
        let originalMinutes = null;
        
        if (typeof item === 'string') {
          // Parse format "NAME|MINUTES" or just "NAME"
          const parts = item.split('|');
          itemName = parts[0].trim();
          originalMinutes = parts[1] ? parts[1].trim() : null;
        } else if (item && typeof item === 'object' && (item.nome || item.name)) {
          itemName = item.nome || item.name;
        }
        
        if (itemName) {
          const key = `${type}__${itemName.toLowerCase().replace(/\s+/g, '_').replace(/[^\w\-]/g, '')}`;
          const costs = costsMap[key];
          
          if (costs) {
            // Update with new costs - use object format
            const updatedItem = typeof item === 'object' ? { ...item } : { nome: itemName };
            
            // Preserve existing fields and add/update cost fields only if different
            updatedItem.nome = itemName; // Ensure nome is always present
            
            // Only update if values are different
            if (parseFloat(updatedItem.biancheria) !== costs.biancheria) {
              updatedItem.biancheria = costs.biancheria;
            }
            if (parseFloat(updatedItem.prodotti) !== costs.prodotti) {
              updatedItem.prodotti = costs.prodotti;
            }
            if (parseFloat(updatedItem.fatturato_mensile) !== costs.fatturato_mensile) {
              updatedItem.fatturato_mensile = costs.fatturato_mensile;
            }
            if (parseFloat(updatedItem.fatturato_intervento) !== costs.fatturato_intervento) {
              updatedItem.fatturato_intervento = costs.fatturato_intervento;
            }
            
            updatedItems.push(updatedItem);
            console.log(`🔄 Updated existing cantiere: ${itemName} - preserved existing fields, updated costs - B:€${costs.biancheria}, P:€${costs.prodotti}, M:€${costs.fatturato_mensile}, I:€${costs.fatturato_intervento}`);
          } else {
            // Keep existing item - preserve original format if it was string
            if (typeof item === 'string') {
              // Preserve original string format with minutes if it had them
              updatedItems.push(originalMinutes ? `${itemName}|${originalMinutes}` : itemName);
              console.log(`✅ Preserved string cantiere: ${item}`);
            } else {
              updatedItems.push(item);
              console.log(`✅ Preserved object cantiere: ${itemName}`);
            }
          }
        }
      });
      
      // Add new items that don't exist yet
      Object.entries(costsMap).forEach(([key, costs]) => {
        if (key.startsWith(`${type}__`)) {
          const name = key.replace(`${type}__`, '').replace(/_/g, ' ');
          // Capitalize first letter of each word
          const capitalizedName = name.replace(/\b\w/g, l => l.toUpperCase());
          
          const exists = items.some(item => {
            const itemName = typeof item === 'string' ? item.split('|')[0].trim() : (item.nome || item.name);
            return itemName && itemName.toLowerCase() === capitalizedName.toLowerCase();
          });
          
          if (!exists) {
            const newItem = {
              nome: capitalizedName,
              biancheria: costs.biancheria,
              prodotti: costs.prodotti,
              fatturato_mensile: costs.fatturato_mensile,
              fatturato_intervento: costs.fatturato_intervento
            };
            updatedItems.push(newItem);
            console.log(`➕ Added new cantiere: ${capitalizedName} to ${type} - B:€${costs.biancheria}, P:€${costs.prodotti}, M:€${costs.fatturato_mensile}, I:€${costs.fatturato_intervento}`);
          }
        }
      });
      
      // Save updated data
      const dataToSave = {
        ...currentData, // Preserve any other fields in the document
      };
      dataToSave[type] = updatedItems;
      
      console.log(`💾 Saving to Data/${type}:`, dataToSave);
      await setDoc(docRef, dataToSave);
      console.log(`✅ Updated Data/${type} with ${updatedItems.length} items`);
    }
    
    console.log('✅ Job site costs saved successfully to main catalogues');
    return true;
    
  } catch (error) {
    console.error('❌ Error writing job site costs to main catalogues:', error);
    return false;
  }
}