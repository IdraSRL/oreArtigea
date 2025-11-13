// fatturazione-annual-report.js - Adattato dal modulo annual-report.js originale
import { generateMonthlyDashboardModel } from './fatturazione-report.js';

/**
 * Generate annual report data for a specific year
 */
export async function generateAnnualReport(year) {
    console.groupCollapsed(`📊 Generating Annual Report for year ${year}`);
    console.time('generateAnnualReport');
    
    try {
        // Check cache first
        const cachedData = getCachedAnnualData(year);
        if (cachedData) {
            console.log('📦 Using cached annual data');
            console.timeEnd('generateAnnualReport');
            console.groupEnd();
            return cachedData;
        }
        
        // Generate data for all 12 months
        const months = [];
        for (let month = 1; month <= 12; month++) {
            months.push({ year, month });
        }
        
        console.log(`📅 Loading data for ${months.length} months of year ${year}`);
        
        // Load dashboard data for all months in parallel
        const monthlyDataPromises = months.map(async ({ year: y, month: m }) => {
            const dashboardData = await generateMonthlyDashboardModel(y, m);
            return {
                year: y,
                month: m,
                data: dashboardData
            };
        });
        
        const monthlyData = await Promise.all(monthlyDataPromises);
        console.log(`✅ Loaded ${monthlyData.length} months of data`);
        
        // Build annual summary
        const annualSummary = buildAnnualSummary(monthlyData);
        
        // Build cantieri details
        const cantieriDetails = buildCantieriDetails(monthlyData);
        
        const result = {
            year: year,
            summary: annualSummary,
            cantieri: cantieriDetails,
            months: monthlyData
        };
        
        // Cache the result
        cacheAnnualData(year, result);
        
        console.log('📊 Annual report generated successfully');
        console.timeEnd('generateAnnualReport');
        console.groupEnd();
        
        return result;
        
    } catch (error) {
        console.error('❌ Error generating annual report:', error);
        console.timeEnd('generateAnnualReport');
        console.groupEnd();
        return null;
    }
}

function buildAnnualSummary(monthlyData) {
    console.log('🔧 Building annual summary');
    
    let totalRicavi = 0;
    let totalManodopera = 0;
    let totalBiancheria = 0;
    let totalProdotti = 0;
    let totalCosti = 0;
    let totalMargine = 0;
    
    monthlyData.forEach(({ year, month, data }) => {
        if (!data.rows) return;
        
        // Only include cantieri with activities > 0
        const activeCantieri = data.rows.filter(row => 
            row.totalActivities > 0
        );
        
        activeCantieri.forEach(row => {
            totalRicavi += row.totaleRicavi || 0;
            totalManodopera += row.laborCost || 0;
            totalBiancheria += row.costoBiancheria || 0;
            totalProdotti += row.costoProdotti || 0;
            totalMargine += row.margine || 0;
        });
    });
    
    totalCosti = totalManodopera + totalBiancheria + totalProdotti;
    
    console.log(`📊 Annual summary: R:€${totalRicavi.toFixed(2)}, C:€${totalCosti.toFixed(2)}, M:€${totalMargine.toFixed(2)}`);
    
    return {
        ricavi: totalRicavi,
        manodopera: totalManodopera,
        biancheria: totalBiancheria,
        prodotti: totalProdotti,
        costiTotali: totalCosti,
        margine: totalMargine
    };
}

function buildCantieriDetails(monthlyData) {
    console.log('🔧 Building cantieri details');
    
    const cantieriMap = new Map();
    
    monthlyData.forEach(({ year, month, data }) => {
        if (!data.rows) return;
        
        // Only include cantieri with activities > 0
        const activeCantieri = data.rows.filter(row => 
            row.totalActivities > 0
        );
        
        activeCantieri.forEach(row => {
            const key = row.key;
            
            if (!cantieriMap.has(key)) {
                cantieriMap.set(key, {
                    key: key,
                    type: row.type,
                    name: row.name,
                    ricavi: 0,
                    manodopera: 0,
                    biancheria: 0,
                    prodotti: 0,
                    costiTotali: 0,
                    margine: 0,
                    monthlyData: []
                });
            }
            
            const cantiere = cantieriMap.get(key);
            cantiere.ricavi += row.totaleRicavi || 0;
            cantiere.manodopera += row.laborCost || 0;
            cantiere.biancheria += row.costoBiancheria || 0;
            cantiere.prodotti += row.costoProdotti || 0;
            cantiere.margine += row.margine || 0;
            
            cantiere.monthlyData.push({
                year,
                month,
                ricavi: row.totaleRicavi || 0,
                manodopera: row.laborCost || 0,
                biancheria: row.costoBiancheria || 0,
                prodotti: row.costoProdotti || 0,
                margine: row.margine || 0,
                activities: row.totalActivities || 0
            });
        });
    });
    
    // Calculate total costs for each cantiere
    cantieriMap.forEach(cantiere => {
        cantiere.costiTotali = cantiere.manodopera + cantiere.biancheria + cantiere.prodotti;
    });
    
    // Convert to array and sort
    const cantieri = Array.from(cantieriMap.values()).sort((a, b) => {
        if (a.type !== b.type) {
            return a.type.localeCompare(b.type);
        }
        return a.name.localeCompare(b.name);
    });
    
    console.log(`📊 Built details for ${cantieri.length} cantieri`);
    return cantieri;
}

// Cache management
const CACHE_KEY_PREFIX = 'annual_report_';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCachedAnnualData(year) {
    try {
        const cacheKey = `${CACHE_KEY_PREFIX}${year}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            const data = JSON.parse(cached);
            const now = Date.now();
            
            // Check if cache is still valid (7 days)
            if (data.timestamp && (now - data.timestamp) < CACHE_DURATION) {
                console.log(`📦 Found valid cache for year ${year}`);
                return data.report;
            } else {
                console.log(`🗑️ Cache expired for year ${year}, removing`);
                localStorage.removeItem(cacheKey);
            }
        }
    } catch (error) {
        console.error('❌ Error reading cache:', error);
    }
    
    return null;
}

function cacheAnnualData(year, reportData) {
    try {
        const cacheKey = `${CACHE_KEY_PREFIX}${year}`;
        const cacheData = {
            timestamp: Date.now(),
            report: reportData
        };
        
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log(`💾 Cached annual report for year ${year}`);
        
        // Clean old cache entries
        cleanOldCache();
        
    } catch (error) {
        console.error('❌ Error caching data:', error);
        // If localStorage is full, try to clean and retry
        if (error.name === 'QuotaExceededError') {
            cleanOldCache();
            try {
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                console.log(`💾 Cached annual report for year ${year} after cleanup`);
            } catch (retryError) {
                console.error('❌ Failed to cache even after cleanup:', retryError);
            }
        }
    }
}

function cleanOldCache() {
    try {
        const keysToRemove = [];
        const now = Date.now();
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_KEY_PREFIX)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (!data.timestamp || (now - data.timestamp) > CACHE_DURATION) {
                        keysToRemove.push(key);
                    }
                } catch (parseError) {
                    // Invalid cache entry, mark for removal
                    keysToRemove.push(key);
                }
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`🗑️ Removed expired cache: ${key}`);
        });
        
        if (keysToRemove.length > 0) {
            console.log(`🧹 Cleaned ${keysToRemove.length} old cache entries`);
        }
        
    } catch (error) {
        console.error('❌ Error cleaning cache:', error);
    }
}

// Export function to clear cache manually
export function clearAnnualCache(year = null) {
    try {
        if (year) {
            const cacheKey = `${CACHE_KEY_PREFIX}${year}`;
            localStorage.removeItem(cacheKey);
            console.log(`🗑️ Cleared cache for year ${year}`);
        } else {
            // Clear all annual caches
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(CACHE_KEY_PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            console.log(`🗑️ Cleared all annual caches (${keysToRemove.length} entries)`);
        }
    } catch (error) {
        console.error('❌ Error clearing cache:', error);
    }
}