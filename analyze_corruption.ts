import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function analyzeCorruption() {
    const companyId = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6';
    
    // Buscar tickets que tengan close_date hoy (2026-03-21) pero entry_date sea anterior
    const { data: tickets, error } = await supabase
        .from('garage_tickets')
        .select('id, entry_date, close_date')
        .eq('company_id', companyId)
        .gte('close_date', '2026-03-21T00:00:00')
        .lt('close_date', '2026-03-22T00:00:00');

    if (error) {
        console.error(error);
        return;
    }

    const corrupted = tickets.filter(t => {
        const entry = new Date(t.entry_date);
        const close = new Date(t.close_date);
        // Si entry_date es de un año/mes distinto a close_date, es sospechoso
        return entry.getFullYear() < 2026 || (entry.getFullYear() === 2026 && entry.getMonth() < 2);
    });

    console.log(`Tickets con close_date hoy: ${tickets.length}`);
    console.log(`De los cuales son sospechosos (entry_date antigua): ${corrupted.length}`);
    
    if (corrupted.length > 0) {
        console.log('Ejemplo sospechoso:');
        console.log(corrupted[0]);
    }
}

analyzeCorruption();
