 async function apiFetch(path, options={}){
            const res = await fetch('/api' + path, {
                method: options.method || 'GET',
                headers: { 'Content-Type': 'application/json', ...(options.headers||{}) },
                credentials: 'include',
                body: options.body ? JSON.stringify(options.body) : undefined
            });
            const ct = res.headers.get('content-type') || '';
            const data = ct.includes('application/json') ? await res.json() : await res.text();
            if(!res.ok){
                const msg = (data && data.message) ? data.message : (typeof data === 'string' ? data : 'Request failed');
                throw new Error(msg);
            }
            return data;
        }
        function authHeaders(){
            try { const t = localStorage.getItem('site-access-token'); if (t) return { Authorization: 'Bearer ' + t }; } catch(e){}
            return {};
        }
        const form = document.getElementById('login-form');
        const msg = document.getElementById('login-message');
        form.addEventListener('submit', async (e)=>{
            e.preventDefault();
            msg.textContent = 'Signing in...';
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            try{
                const tokens = await apiFetch('/auth/login',{ method:'POST', body:{ email, password }});
                try {
                    if (tokens && tokens.access) localStorage.setItem('site-access-token', tokens.access);
                    if (tokens && tokens.refresh) localStorage.setItem('site-refresh-token', tokens.refresh);
                } catch(e){}
                // try to fetch profile for name/email
                try {
                    const me = await apiFetch('/users/me', { headers: authHeaders() });
                    if (me && me.name) localStorage.setItem('site-user-name', me.name);
                    if (me && me.email) localStorage.setItem('site-user-email', me.email);
                } catch(e){}
                msg.textContent = 'Logged in successfully. Redirecting...';
                try { localStorage.setItem('site-logged-in','1'); } catch(e){}
                window.location.href = '/';
            }catch(err){
                msg.textContent = 'Login failed: ' + err.message;
            }
        });