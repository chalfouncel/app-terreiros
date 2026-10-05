document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault(); 
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    loginBtn.textContent = 'Entrando...';
    loginBtn.disabled = true;
    errorMessage.classList.add('hidden');

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;
        
        const { data: perfilData, error: perfilError } = await supabaseClient
            .from('perfis')
            .select('cadastro_completo')
            .eq('id', data.user.id)
            .single();

        if (perfilError) throw perfilError;

        if (perfilData.cadastro_completo === false) {
            window.location.href = 'cadastro.html'; 
        } else {
            window.location.href = 'presenca.html'; 
        }

    } catch (error) {
        errorMessage.textContent = 'Erro ao fazer login: ' + error.message;
        errorMessage.classList.remove('hidden');
    } finally {
        loginBtn.textContent = 'Entrar';
        loginBtn.disabled = false;
    }
});
