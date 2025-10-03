// fatturazione-data-readers.js - Adattato dal modulo data-readers.js originale
import { db } from '../../common/firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Global cache to reduce Firestore calls
const cache = {
    employees: null,
    catalogues: null,
    employeeCosts: null,
    jobSiteCosts: null,
    lastCacheTime: 0,
    CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

function isCacheValid() {
    return Date.now() - cache.lastCacheTime < cache.CACHE_DURATION;
}

function clearCache() {
    cache.employees = null;
    cache.catalogues = null;
    cache.employeeCosts = null;
    cache.jobSiteCosts = null;
    cache.lastCacheTime = 0;
}

export function employeeIdFromName(name) {
    return name.replaceAll(' ', '_');
}

export function slug(s) {
    return s.toLowerCase()
        .replace(/\s+/g, '_')           // spaces to underscores
        .replace(/[àáâãäå]/g, 'a')      // normalize accented characters
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ç]/g, 'c')
        .replace(/[ñ]/g, 'n')
        .replace(/[^\w]/g, '')          // remove all special chars except letters, numbers, underscore
        .replace(/_{2,}/g, '_')         // multiple underscores to single
        .replace(/^_+|_+$/g, '');       // trim leading/trailing underscores
}

export function normalizeActivityIT(a) {
    return {
        type: a.tipo || a.type || '',
        name: a.nome || a.name || '',
        minutes: Number(a.minuti || a.minutes) || 0,
        people: Number(a.persone || a.people) || 1,
        multiplier: Number(a.moltiplicatore || a.multiplier) || 1
    };
}

// Read employees
export async function readEmployees() {
    if (cache.employees && isCacheValid()) {
        console.log('📋 Using cached employees data');
        return cache.employees;
    }
    
    console.groupCollapsed('📋 Lettura dipendenti');
    console.time('readEmployees');
    
    try {
        const docRef = doc(db, 'Data', 'employees');
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            console.warn('Documento Data/employees non trovato');
            console.timeEnd('readEmployees');
            console.groupEnd();
            return [];
        }
        
        const data = docSnap.data();
        console.debug('Dati grezzi employees:', data);
        
        let employees = [];
        if (Array.isArray(data.employees)) {
            employees = data.employees.map(emp => {
                if (typeof emp === 'string') {
                    return emp.trim();
                } else if (emp && emp.name) {
                    return emp.name.trim();
                }
                return null;
            }).filter(name => name && name.length > 0);
        }
        
        // Cache the result
        cache.employees = employees;
        cache.lastCacheTime = Date.now();
        
        console.debug(`✅ Trovati ${employees.length} dipendenti:`, employees.slice(0, 3));
        console.timeEnd('readEmployees');
        console.groupEnd();
        
        return employees;
    } catch (error) {
        console.error('❌ Errore lettura dipendenti:', error);
        console.timeEnd('readEmployees');
        console.groupEnd();
        return [];
    }
}

// Read catalogues
export async function readCatalogues() {
    if (cache.catalogues && isCacheValid()) {
        console.log('📚 Using cached catalogues data');
        return cache.catalogues;
    }
    
    console.groupCollapsed('📚 Lettura cataloghi');
    console.time('readCatalogues');
    
    const types = ['uffici', 'appartamenti', 'bnb', 'pst'];
    const result = {};
    
    try {
        // Batch read all catalogues in parallel to reduce sequential calls
        const cataloguePromises = types.map(async (type) => {
            const docRef = doc(db, 'Data', type);
            const docSnap = await getDoc(docRef);
            return { type, docSnap };
        });
        
        const catalogueResults = await Promise.all(cataloguePromises);
        
        catalogueResults.forEach(({ type, docSnap }) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                let items = data[type] || [];
                
                // Handle both string and object formats
                result[type] = items.map(item => {
                    if (typeof item === 'string') {
                        // Parse format "NAME|MINUTES" or just "NAME"
                        const parts = item.split('|');
                        const name = parts[0].trim();
                        return {
                            name: name,
                            biancheria: 0,
                            prodotti: 0,
                            fatturato_mensile: 0,
                            fatturato_intervento: 0
                        };
                    } else if (item && typeof item === 'object') {
                        return {
                            name: item.nome || item.name || '',
                            biancheria: parseFloat(item.biancheria) || 0,
                            prodotti: parseFloat(item.prodotti) || 0,
                            fatturato_mensile: parseFloat(item.fatturato_mensile) || 0,
                            fatturato_intervento: parseFloat(item.fatturato_intervento) || 0
                        };
                    }
                    return null;
                }).filter(item => item && item.name && item.name.length > 0);
                
                console.debug(`${type}: ${result[type].length} elementi`);
            } else {
                result[type] = [];
                console.warn(`Documento Data/${type} non trovato`);
            }
        });
        
        // Cache the result
        cache.catalogues = result;
        cache.lastCacheTime = Date.now();
        
        console.timeEnd('readCatalogues');
        console.groupEnd();
        return result;
    } catch (error) {
        console.error('❌ Errore lettura cataloghi:', error);
        console.timeEnd('readCatalogues');
        console.groupEnd();
        return { uffici: [], appartamenti: [], bnb: [], pst: [] };
    }
}

// Read employee costs
export async function readEmployeeCosts() {
    if (cache.employeeCosts && isCacheValid()) {
        console.log('💰 Using cached employee costs data');
        return cache.employeeCosts;
    }
    
    console.groupCollapsed('💰 Lettura costi dipendenti dal catalogo employees');
    console.time('readEmployeeCosts');
    
    try {
        const docRef = doc(db, 'Data', 'employees');
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            console.warn('Documento Data/employees non trovato');
            console.timeEnd('readEmployeeCosts');
            console.groupEnd();
            return {};
        }
        
        const data = docSnap.data();
        const costs = {};
        
        // Handle employees array - check if cost information exists
        if (Array.isArray(data.employees)) {
            data.employees.forEach(emp => {
                if (typeof emp === 'object' && emp.name) {
                    const employeeId = emp.name.replaceAll(' ', '_');
                    // Use cost from database, no default
                    costs[employeeId] = parseFloat(emp.cost) || 0;
                }
            });
        }
        
        // Cache the result
        cache.employeeCosts = costs;
        cache.lastCacheTime = Date.now();
        
        console.debug(`✅ Costi trovati per ${Object.keys(costs).length} dipendenti`);
        console.timeEnd('readEmployeeCosts');
        console.groupEnd();
        
        return costs;
    } catch (error) {
        console.error('❌ Errore lettura costi dipendenti:', error);
        console.timeEnd('readEmployeeCosts');
        console.groupEnd();
        return {};
    }
}

// Read jobsite costs
export async function readJobSiteCosts() {
    if (cache.jobSiteCosts && isCacheValid()) {
        console.log('🏗️ Using cached jobsite costs data');
        return cache.jobSiteCosts;
    }
    
    console.groupCollapsed('🏗️ Lettura costi cantieri dai cataloghi');
    console.time('readJobSiteCosts');
    
    try {
        // Read from catalogues instead of separate document
        const catalogues = await readCatalogues();
        const costs = {};
        
        Object.entries(catalogues).forEach(([type, items]) => {
            items.forEach(item => {
                const key = `${type}__${slug(item.name)}`;
                costs[key] = {
                    biancheria: item.biancheria,
                    prodotti: item.prodotti,
                    fatturato_mensile: item.fatturato_mensile,
                    fatturato_intervento: item.fatturato_intervento
                };
            });
        });
        
        // Cache the result
        cache.jobSiteCosts = costs;
        cache.lastCacheTime = Date.now();
        
        console.debug(`✅ Costi trovati per ${Object.keys(costs).length} cantieri`);
        console.timeEnd('readJobSiteCosts');
        console.groupEnd();
        
        return costs;
    } catch (error) {
        console.error('❌ Errore lettura costi cantieri:', error);
        console.timeEnd('readJobSiteCosts');
        console.groupEnd();
        return {};
    }
}

// Optimized monthly data reading
export async function getMonthEmployeeCantiereMapOptimized(year, month) {
    console.groupCollapsed(`📊 Aggregazione dati ${year}-${String(month).padStart(2, '0')}`);
    console.time('getMonthEmployeeCantiereMapOptimized');
    
    try {
        // Read employees
        const employees = await readEmployees();
        if (employees.length === 0) {
            console.warn('Nessun dipendente trovato');
            console.timeEnd('getMonthEmployeeCantiereMapOptimized');
            console.groupEnd();
            return {};
        }
        
        console.debug(`👥 Elaborazione ${employees.length} dipendenti`);
        
        // Calculate date range for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        console.debug(`📅 Range date: ${startDateStr} - ${endDateStr}`);
        
        const result = {};
        
        // Process employees in batches to avoid overwhelming Firestore
        const batchSize = 3;
        for (let i = 0; i < employees.length; i += batchSize) {
            const batch = employees.slice(i, i + batchSize);
            console.debug(`🔄 Elaborazione batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(employees.length/batchSize)}`);
            
            const batchPromises = batch.map(async (employeeName) => {
                const employeeId = employeeIdFromName(employeeName);
                console.debug(`👤 Elaborazione ${employeeName} (${employeeId})`);
                
                try {
                    // Query all documents for this employee in the date range
                    const oreCollectionRef = collection(db, 'dipendenti', employeeId, 'ore');
                    const q = query(
                        oreCollectionRef,
                        where('__name__', '>=', startDateStr),
                        where('__name__', '<=', endDateStr)
                    );
                    
                    const querySnapshot = await getDocs(q);
                    console.debug(`📄 Trovati ${querySnapshot.size} documenti per ${employeeName}`);
                    
                    const employeeData = {
                        name: employeeName,
                        totalMinutesRaw: 0,
                        totalMinutesEff: 0,
                        cantieri: {}
                    };
                    
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        if (data.attività && Array.isArray(data.attività)) {
                            data.attività.forEach(activity => {
                                const normalized = normalizeActivityIT(activity);
                                if (normalized.type && normalized.name) {
                                    const key = `${normalized.type}__${slug(normalized.name)}`;
                                    
                                    if (!employeeData.cantieri[key]) {
                                        employeeData.cantieri[key] = {
                                            type: normalized.type,
                                            name: normalized.name,
                                            minutesRaw: 0,
                                            minutesEff: 0,
                                            activities: 0
                                        };
                                    }
                                    
                                    const minutesEff = (normalized.minutes * normalized.multiplier) / Math.max(1, normalized.people);
                                    
                                    employeeData.cantieri[key].minutesRaw += normalized.minutes;
                                    employeeData.cantieri[key].minutesEff += minutesEff;
                                    employeeData.cantieri[key].activities += 1;
                                    
                                    employeeData.totalMinutesRaw += normalized.minutes;
                                    employeeData.totalMinutesEff += minutesEff;
                                }
                            });
                        }
                    });
                    
                    if (Object.keys(employeeData.cantieri).length > 0) {
                        result[employeeId] = employeeData;
                        console.debug(`✅ ${employeeName}: ${Object.keys(employeeData.cantieri).length} cantieri, ${Math.round(employeeData.totalMinutesRaw)} min`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Errore elaborazione ${employeeName}:`, error);
                }
            });
            
            await Promise.all(batchPromises);
            
            // Small delay between batches to be gentle with Firestore
            if (i + batchSize < employees.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        console.debug(`🎯 Risultato finale: ${Object.keys(result).length} dipendenti con attività`);
        console.timeEnd('getMonthEmployeeCantiereMapOptimized');
        console.groupEnd();
        
        return result;
        
    } catch (error) {
        console.error('❌ Errore aggregazione dati:', error);
        console.timeEnd('getMonthEmployeeCantiereMapOptimized');
        console.groupEnd();
        return {};
    }
}