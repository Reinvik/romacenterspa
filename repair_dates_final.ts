import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

const COMPANY_ID = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6';
const TODAY_START = '2026-03-21T00:00:00';
const TODAY_END   = '2026-03-22T00:00:00';

async function repairDatesById() {
    console.log('--- Reparación final: obteniendo todos los IDs afectados ---');

    // Fetch ALL matching records at once (up to 10000)
    let allCorrupted: {id: string, entry_date: string}[] = [];
    let from = 0;
    let hasMore = true;
    while (hasMore) {
        const { data: tickets, error } = await supabase
            .from('garage_tickets')
            .select('id, entry_date, close_date')
            .eq('company_id', COMPANY_ID)
            .gte('close_date', TODAY_START)
            .lt('close_date', TODAY_END)
            .range(from, from + 999);

        if (error) { console.error(error); break; }
        if (!tickets || tickets.length === 0) { hasMore = false; break; }

        const corrupted = tickets.filter(t => new Date(t.entry_date) < new Date(TODAY_START));
        allCorrupted.push(...corrupted.map(t => ({ id: t.id, entry_date: t.entry_date })));

        if (tickets.length < 1000) hasMore = false;
        else from += 1000;
    }

    console.log(`Found ${allCorrupted.length} corrupted tickets to fix.`);

    let fixed = 0;
    // Update them individually
    for (const t of allCorrupted) {
        const { error } = await supabase
            .from('garage_tickets')
            .update({ close_date: t.entry_date })
            .eq('id', t.id)
            .eq('company_id', COMPANY_ID);
        if (!error) fixed++;
        else console.error(`Error updating ${t.id}:`, error.message);
    }

    console.log(`\n✅ Reparación final completada. Tickets corregidos: ${fixed}`);
}

repairDatesById().catch(console.error);
