import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function totalCorruptionCount() {
    const companyId = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6';
    let totalCorrupted = 0;
    let pageSize = 1000;
    let from = 0;
    let hasMore = true;

    console.log('Counting corrupted tickets...');
    
    while (hasMore) {
        const { data: tickets, error } = await supabase
            .from('garage_tickets')
            .select('id, entry_date, close_date')
            .eq('company_id', companyId)
            .gte('close_date', '2026-03-21T00:00:00')
            .lt('close_date', '2026-03-22T00:00:00')
            .range(from, from + pageSize - 1);

        if (error) {
            console.error(error);
            break;
        }

        if (!tickets || tickets.length === 0) {
            hasMore = false;
            break;
        }

        const count = tickets.filter(t => {
            const entry = new Date(t.entry_date);
            const close = new Date(t.close_date);
            return entry < new Date('2026-03-21T00:00:00Z');
        }).length;

        totalCorrupted += count;
        from += pageSize;
        if (tickets.length < pageSize) hasMore = false;
    }

    console.log(`Total corrupted tickets: ${totalCorrupted}`);
}

totalCorruptionCount();
