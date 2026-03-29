const SUPABASE_URL = "https://qtzpzgwyjptbnipvyjdu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu";

// DOM Elements
const screens = {
  loading: document.getElementById('loading'),
  login: document.getElementById('login-screen'),
  main: document.getElementById('main-screen')
};

const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const dataForm = document.getElementById('data-form');
const notPatenteMsg = document.getElementById('not-patente-msg');
const saveBtn = document.getElementById('save-btn');
const saveMsg = document.getElementById('save-msg');

let session = null;

// Routing logic
function showScreen(screenId) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[screenId].classList.remove('hidden');
}

// Check session on load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await chrome.storage.local.get(['session']);
        if (data.session && data.session.access_token) {
            session = data.session;
            showScreen('main');
            extractCurrentPageData();
        } else {
            showScreen('login');
        }
    } catch (err) {
        showScreen('login');
    }
});

// Auth Logic
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    loginBtn.disabled = true;
    loginBtn.textContent = "Conectando...";

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // 1. Sign In
        const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const authData = await authRes.json();
        
        if (!authRes.ok) {
            throw new Error(authData.error_description || "Credenciales inválidas");
        }

        const accessToken = authData.access_token;
        const userId = authData.user.id;

        // 2. Fetch company_id from profiles
        const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=company_id`, {
             headers: {
                 'apikey': SUPABASE_ANON_KEY,
                 'Authorization': `Bearer ${accessToken}`
             }
        });

        const profiles = await profileRes.json();
        if (!profiles || profiles.length === 0 || !profiles[0].company_id) {
            throw new Error("No se encontró compañía para este usuario");
        }

        // 3. Save Session
        session = {
            access_token: accessToken,
            user_id: userId,
            company_id: profiles[0].company_id
        };

        await chrome.storage.local.set({ session });
        
        showScreen('main');
        extractCurrentPageData();

    } catch (err) {
        loginError.textContent = err.message;
        loginError.classList.remove('hidden');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Ingresar";
    }
});

logoutBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove(['session']);
    session = null;
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    showScreen('login');
});

// Scraping Logic
async function extractCurrentPageData() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || (!tab.url.includes("patentechile.com") && !tab.url.includes("volanteomaleta.com"))) {
            notPatenteMsg.classList.remove('hidden');
            return;
        }

        notPatenteMsg.classList.add('hidden');
        
        // Ejecutar script si no lo inyectó el manifest o mensajear
        chrome.tabs.sendMessage(tab.id, { action: "getVehicleData" }, (response) => {
            if (chrome.runtime.lastError) {
                console.log("Error comunicando con content script:", chrome.runtime.lastError);
                return;
            }
            if (response) {
                if (response.patente) document.getElementById('patente').value = response.patente;
                if (response.owner) document.getElementById('owner').value = response.owner;
                if (response.brand) document.getElementById('brand').value = response.brand;
                if (response.model) document.getElementById('model').value = response.model;
            }
        });
    } catch (err) {
        console.error("Error al extraer:", err);
    }
}

// Generador de UUID para compatibilidad
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Guardar Datos
dataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveMsg.className = 'hidden';
    saveBtn.disabled = true;
    saveBtn.textContent = "Guardando...";

    const patente = document.getElementById('patente').value.trim().toUpperCase();
    const owner = document.getElementById('owner').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const brand = document.getElementById('brand').value.trim();
    const model = document.getElementById('model').value.trim();

    const lastModel = `${brand} ${model}`.trim();

    const payload = {
        id: uuidv4(),
        name: owner,
        phone: phone || "Sin teléfono",
        last_model: lastModel,
        vehicles: [patente],
        last_visit: new Date().toISOString(),
        company_id: session.company_id
    };

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/romaspa_customers`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
                'Content-Profile': 'client_romaspa',
                'Accept-Profile': 'client_romaspa',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || "Error al guardar en la base de datos");
        }

        saveMsg.textContent = "¡Cliente guardado exitosamente!";
        saveMsg.className = 'success';
        
        // Reset form for next use or close
        setTimeout(() => {
            window.close();
        }, 1500);

    } catch (err) {
        saveMsg.textContent = err.message;
        saveMsg.className = 'error';
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Guardar Cliente";
    }
});
