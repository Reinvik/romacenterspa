import { isSameDay, parseISO } from 'date-fns';

/**
 * Listado de feriados nacionales en Chile (2025-2027)
 * Nota: Algunos feriados religiosos o civiles pueden variar un día según la legislación.
 */
export const CHILEAN_HOLIDAYS = [
    // 2026 (Año actual del sistema)
    { date: '2026-01-01', name: 'Año Nuevo' },
    { date: '2026-04-03', name: 'Viernes Santo' },
    { date: '2026-04-04', name: 'Sábado Santo' },
    { date: '2026-05-01', name: 'Día del Trabajo' },
    { date: '2026-05-21', name: 'Día de las Glorias Navales' },
    { date: '2026-06-29', name: 'San Pedro y San Pablo' },
    { date: '2026-07-16', name: 'Día de la Virgen del Carmen' },
    { date: '2026-08-15', name: 'Asunción de la Virgen' },
    { date: '2026-09-18', name: 'Fiestas Patrias' },
    { date: '2026-09-19', name: 'Glorias del Ejército' },
    { date: '2026-10-12', name: 'Encuentro de Dos Mundos' },
    { date: '2026-10-31', name: 'Día de las Iglesias Evangélicas' },
    { date: '2026-11-01', name: 'Día de Todos los Santos' },
    { date: '2026-12-08', name: 'Inmaculada Concepción' },
    { date: '2026-12-25', name: 'Navidad' },

    // Algunos de 2025
    { date: '2025-01-01', name: 'Año Nuevo' },
    { date: '2025-05-01', name: 'Día del Trabajo' },
    { date: '2025-09-18', name: 'Fiestas Patrias' },
    { date: '2025-09-19', name: 'Glorias del Ejército' },
    { date: '2025-12-25', name: 'Navidad' },

    // Algunos de 2027
    { date: '2027-01-01', name: 'Año Nuevo' },
    { date: '2027-12-25', name: 'Navidad' },
];

/**
 * Verifica si una fecha dada es feriado en Chile
 */
export function getChileanHoliday(date: Date) {
    return CHILEAN_HOLIDAYS.find(h => isSameDay(parseISO(h.date), date));
}

export function isChileanHoliday(date: Date): boolean {
    return !!getChileanHoliday(date);
}
