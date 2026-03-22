import { supabaseGarage } from './src/lib/supabase';
import { parseISO, isSameDay, format } from 'date-fns';

async function checkDates() {
    const companyId = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6'; // Roma Center SPA
    const { data: tickets, error } = await supabaseGarage
        .from('garage_tickets')
        .select('id, entry_date, last_status_change, close_date, status')
        .eq('company_id', companyId)
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Sample Tickets Analysis:');
    tickets.forEach(t => {
        const dateStr = t.close_date || t.last_status_change || t.entry_date;
        const d = parseISO(dateStr);
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const targetDate = parseISO(todayStr); // This is how Mechanics.tsx does it
        
        console.log(`ID: ${t.id}, Status: ${t.status}`);
        console.log(`  Entry: ${t.entry_date}`);
        console.log(`  Close: ${t.close_date}`);
        console.log(`  Last: ${t.last_status_change}`);
        console.log(`  Chosen Date Str: ${dateStr}`);
        console.log(`  Parsed Date Object (d): ${d.toISOString()}`);
        console.log(`  Target Date Object: ${targetDate.toISOString()}`);
        console.log(`  isSameDay(d, targetDate): ${isSameDay(d, targetDate)}`);
    });
}

checkDates();
