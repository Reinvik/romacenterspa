import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { parseISO, isSameDay, format } from 'date-fns';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabaseGarage = createClient(supabaseUrl, supabaseAnonKey);

async function checkDates() {
    const companyId = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6'; // Roma Center SPA
    const { data: tickets, error } = await supabaseGarage
        .from('garage_tickets')
        .select('id, entry_date, last_status_change, close_date, status, cost')
        .eq('company_id', companyId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total Tickets: ${tickets.length}`);
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const targetDate = parseISO(todayStr);
    
    console.log(`Target Date (Today): ${targetDate.toISOString()}`);

    let matchCount = 0;
    let totalRevenue = 0;

    tickets.forEach(t => {
        const dateStr = t.close_date || t.last_status_change || t.entry_date;
        const d = parseISO(dateStr);
        const match = isSameDay(d, targetDate);
        
        if (match) {
            matchCount++;
            if (t.status === 'Finalizado' || t.status === 'Entregado') {
                totalRevenue += (t.cost || 0);
            }
        }
    });

    console.log(`Matches for today: ${matchCount}`);
    console.log(`Total Revenue for matched tickets: ${totalRevenue}`);

    // If matches are too high, let's see why.
    if (matchCount > 100) {
        console.log('Sample of matches:');
        tickets.filter(t => isSameDay(parseISO(t.close_date || t.last_status_change || t.entry_date), targetDate))
               .slice(0, 5)
               .forEach(t => {
                   console.log(`ID: ${t.id}, Close: ${t.close_date}, Last: ${t.last_status_change}, Entry: ${t.entry_date}`);
               });
    }
}

checkDates();
