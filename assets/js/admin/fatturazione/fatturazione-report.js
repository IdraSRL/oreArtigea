// fatturazione-report.js - Adattato dal modulo report.js originale
import { readCatalogues, getMonthEmployeeCantiereMapOptimized, readEmployeeCosts, readJobSiteCosts, slug } from './fatturazione-data-readers.js';

export async function generateMonthlyDashboardModel(year, month) {
    console.groupCollapsed(`📈 Generating Dashboard model for ${year}-${String(month).padStart(2, '0')}`);
    console.time('generateMonthlyDashboardModel');
    
    try {
        // Read catalogues
        console.debug('🔍 Step 1: Reading catalogues...');
        const catalogues = await readCatalogues();
        console.debug('📚 Catalogues loaded:', catalogues);
        
        // Read costs
        console.debug('🔍 Step 2: Reading costs...');
        const [empMap, employeeCosts, jobSiteCosts] = await Promise.all([
            getMonthEmployeeCantiereMapOptimized(year, month),
            readEmployeeCosts(),
            readJobSiteCosts()
        ]);
        console.debug('👥 Employee map loaded, employees:', Object.keys(empMap).length);
        console.debug('💰 Employee costs loaded:', Object.keys(employeeCosts).length);
        console.debug('🏗️ Job site costs loaded:', Object.keys(jobSiteCosts).length);
        
        // Build unique cantieri set
        console.debug('🔍 Step 3: Building unique cantieri set...');
        const cantieriSet = new Set();
        
        // Add all cantieri from catalogues
        let catalogueCount = 0;
        Object.entries(catalogues).forEach(([type, names]) => {
            console.debug(`📚 Adding ${names.length} cantieri from ${type} catalogue:`, names.map(item => item.name));
            names.forEach(item => {
                const key = `${type}__${slug(item.name)}`;
                console.debug(`📚 Catalogue item: "${item.name}" -> key: "${key}"`);
                const cantiereData = JSON.stringify({ key, type, name: item.name });
                cantieriSet.add(cantiereData);
                catalogueCount++;
            });
        });
        
        console.debug(`📚 Total cantieri from catalogues: ${catalogueCount}`);
        
        // Add cantieri actually worked during the month
        let workedCount = 0;
        Object.values(empMap).forEach(employee => {
            console.debug(`👤 Processing worked cantieri for ${employee.name}:`, Object.keys(employee.cantieri));
            Object.entries(employee.cantieri).forEach(([key, cantiere]) => {
                console.debug(`🏗️ Work item: "${cantiere.name}" -> key: "${key}"`);
                const cantiereData = JSON.stringify({
                    key,
                    type: cantiere.type,
                    name: cantiere.name
                });
                
                if (!cantieriSet.has(cantiereData)) {
                    console.debug(`🏗️ NEW from work: ${key} (${cantiere.name})`);
                    workedCount++;
                } else {
                    console.debug(`🏗️ EXISTING from work: ${key} (${cantiere.name})`);
                }
                cantieriSet.add(cantiereData);
            });
        });
        
        console.debug(`🏗️ Additional cantieri from actual work: ${workedCount}`);
        console.debug(`📊 Total unique cantieri: ${cantieriSet.size}`);
        
        // Convert back to objects and sort
        const cantieri = Array.from(cantieriSet)
            .map(str => {
                const parsed = JSON.parse(str);
                return parsed;
            })
            .reduce((unique, cantiere) => {
                // Additional deduplication by key to ensure no duplicates
                const existing = unique.find(c => c.key === cantiere.key);
                if (!existing) {
                    unique.push(cantiere);
                    console.debug(`📊 Final cantiere: ${cantiere.key} -> "${cantiere.name}"`);
                } else {
                    console.debug(`📊 DUPLICATE REMOVED: ${cantiere.key} -> "${cantiere.name}"`);
                }
                return unique;
            }, [])
            .sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type.localeCompare(b.type);
                }
                return a.name.localeCompare(b.name);
            });
        
        console.debug(`📊 Final unique cantieri (${cantieri.length}):`, cantieri.map(c => `${c.key} -> "${c.name}"`));
        
        // Build rows with real calculations
        const rows = cantieri.map(({ key, type, name }) => {
            console.debug(`📊 Calculating metrics for cantiere: ${key}`);
            
            let totalActivities = 0;
            let totalMinutesEffective = 0;
            let laborCost = 0;
            
            // Calculate totals from all employees for this cantiere
            Object.entries(empMap).forEach(([employeeId, employee]) => {
                const cantiere = employee.cantieri[key];
                if (cantiere) {
                    totalActivities += cantiere.activities || 0;
                    totalMinutesEffective += cantiere.minutesEff || 0;
                    
                    // Calculate labor cost for this employee based on effective minutes
                    const employeeCostPerHour = employeeCosts[employeeId] || 0;
                    const employeeMinutesEff = cantiere.minutesEff || 0;
                    const employeeLaborCost = (employeeMinutesEff * employeeCostPerHour) / 60;
                    laborCost += employeeLaborCost;
                    
                    console.debug(`👤 ${employee.name} on ${key}: ${cantiere.activities} attività, ${employeeMinutesEff.toFixed(1)} min eff, €${employeeCostPerHour}/ora, €${employeeLaborCost.toFixed(2)} labor cost`);
                }
            });
            
            // Get job site costs
            const siteCosts = jobSiteCosts[key] || { 
                biancheria: 0,
                prodotti: 0,
                fatturato_mensile: 0, 
                fatturato_intervento: 0 
            };
            
            // Costo biancheria = costo_biancheria_per_attività × totale_attività_del_mese
            const costoBiancheria = siteCosts.biancheria * totalActivities;
            // Costo prodotti = costo_prodotti_per_attività × totale_attività_del_mese
            const costoProdotti = siteCosts.prodotti * totalActivities;
            
            // Totale ricavi = (fatturato_intervento × Totale Attività del mese) + fatturato_mensile
            const fatturatoMensile = siteCosts.fatturato_mensile || 0;
            const fatturatoIntervento = (siteCosts.fatturato_intervento || 0) * totalActivities;
            const totaleRicavi = fatturatoMensile + fatturatoIntervento;
            
            // Margine = Totale ricavi - Costo biancheria - Costo prodotti - Costo mano d'opera
            const totaleCosti = costoBiancheria + costoProdotti + laborCost;
            const margine = totaleRicavi - totaleCosti;
            
            const row = {
                key,
                type,
                name,
                totalActivities,
                totalMinutesEffective,
                laborCost,
                costoBiancheria,
                costoProdotti,
                totaleRicavi,
                margine
            };
            
            console.debug(`📊 Final row for ${key}:`, {
                totalActivities: totalActivities,
                totalMinutesEffective: totalMinutesEffective,
                labor: `€${laborCost.toFixed(2)}`,
                biancheria: `€${siteCosts.biancheria}/att × ${totalActivities} = €${costoBiancheria.toFixed(2)}`,
                prodotti: `€${siteCosts.prodotti}/att × ${totalActivities} = €${costoProdotti.toFixed(2)}`,
                ricavi: `€${totaleRicavi.toFixed(2)}`,
                margine: `€${margine.toFixed(2)}`
            });
            
            return row;
        });
        
        const typeCounts = {};
        rows.forEach(row => {
            typeCounts[row.type] = (typeCounts[row.type] || 0) + 1;
        });
        
        console.debug(`📊 Final dashboard summary:`);
        console.debug(`📊 Total cantieri: ${rows.length}`);
        console.debug('📊 By type:', typeCounts);
        console.debug('📊 Sample rows:', rows.slice(0, 5));
        
        const result = {
            year,
            month,
            rows: rows.filter(row => row.totalActivities > 0)
        };
        
        console.log('📊 Dashboard data generated for cantieri:', result.rows.length);
        console.timeEnd('generateMonthlyDashboardModel');
        console.groupEnd();
        
        return result;
        
    } catch (error) {
        console.error('❌ Error generating dashboard model:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
        console.timeEnd('generateMonthlyDashboardModel');
        console.groupEnd();
        
        return {
            year,
            month,
            rows: []
        };
    }
}