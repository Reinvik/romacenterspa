import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

const COMPANY_ID = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6';
const TODAY_START = '2026-03-21T00:00:00';
const TODAY_END   = '2026-03-22T00:00:00';
const PAGE_SIZE = 100;

async function repairDates() {
    console.log('--- Iniciando reparación de close_date corrupted ---');
    
    let page = 0;
    let totalFixed = 0;
    let hasMore = true;

    while (hasMore) {
        // Fetch tickets whose close_date is today but whose entry_date is older
        const { data: tickets, error } = await supabase
            .from('garage_tickets')
            .select('id, entry_date, close_date')
            .eq('company_id', COMPANY_ID)
            .gte('close_date', TODAY_START)
            .lt('close_date', TODAY_END)
            .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

        if (error) {
            console.error('Error fetching tickets:', error.message);
            break;
        }

        if (!tickets || tickets.length === 0) {
            hasMore = false;
            break;
        }

        // Filter only those where entry_date is clearly older than today
        const corrupted = tickets.filter(t => {
            return new Date(t.entry_date) < new Date(TODAY_START);
        });

        // Batch update: set close_date = entry_date for corrupted tickets
        for (const t of corrupted) {
            const { error: updateError } = await supabase
                .from('garage_tickets')
                .update({ close_date: t.entry_date })
                .eq('id', t.id)
                .eq('company_id', COMPANY_ID);

            if (updateError) {
                console.error(`Error updating ticket ${t.id}:`, updateError.message);
            } else {
                totalFixed++;
            }
        }

        console.log(`Página ${page + 1}: ${tickets.length} tickets revisados, ${corrupted.length} corregidos (total: ${totalFixed})`);
        
        if (tickets.length < PAGE_SIZE) {
            hasMore = false;
        } else {
            page++;
        }
    }

    console.log(`\n✅ Reparación completada. Total de tickets corregidos: ${totalFixed}`);
}

repairDates().catch(console.error);
