// 1. LIGA A CONEXÃO COM O BANCO DE DADOS
// Usamos as variáveis supabaseUrl e supabaseKey que já estão na memória do seu site!
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. O CÓDIGO DO FORMULÁRIO 
document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const identificacao = document.getElementById('identificacao').value.trim();
    const senha = document.getElementById('senha').value;
    
    const btnSubmit = document.querySelector('button[type="submit"]');
    const msgErro = document.getElementById('msg-erro');
    
    if(msgErro) msgErro.style.display = 'none';
    btnSubmit.innerHTML = 'Processando...';
    btnSubmit.disabled = true;

    try {
        // REGRA 1: É O PRIMEIRO ACESSO? (Testa se digitaram um ID numérico curto)
        const isId = /^\d+$/.test(identificacao) && identificacao.length < 5;

        if (isId) {
            if (senha !== '123456') {
                throw new Error('Para o primeiro acesso, use a senha padrão: 123456');
            }

            // AQUI ESTÁ A MÁGICA: Usamos o 'db' que criamos ali em cima!
            const { data: medium, error: dbError } = await db
                .from('mediuns')
                .select('*')
                .eq('id', parseInt(identificacao))
                .single();

            if (dbError || !medium) {
                throw new Error('ID não encontrado no sistema. Procure a administração.');
            }

            if (medium.senha_cadastrada) {
                throw new Error('Seu cadastro já foi ativado! Use seu Telefone e a Nova Senha que você criou para entrar.');
            }

            // SUCESSO DO PRIMEIRO ACESSO! Salva os dados na memória para a próxima tela
            localStorage.setItem('novo_acesso_id', medium.id);
            localStorage.setItem('novo_acesso_nome', medium.nome_completo);
            
            // Joga para a tela de completar o cadastro
            window.location.href = 'cadastro.html'; 
            return; 
        }

        // REGRA 2: ACESSO NORMAL (TELEFONE + NOVA SENHA)
        let telefoneFormatado = identificacao.replace(/\D/g, ''); 

        if (telefoneFormatado.length < 10) {
            throw new Error('Digite seu ID (1º acesso) ou seu Telefone com DDD.');
        }

        if (!senha) {
            throw new Error('A senha é obrigatória.');
        }

        const emailFantasma = `${telefoneFormatado}@terreiro.app`;

        // Tenta logar usando o 'db'
        const { data, error } = await db.auth.signInWithPassword({
            email: emailFantasma,
            password: senha,
        });

        if (error) {
            throw new Error('Telefone ou senha incorretos.');
        }

        // LOGIN NORMAL FEITO COM SUCESSO!
        window.location.href = 'painel.html';

    } catch (erro) {
        if(msgErro) {
            msgErro.textContent = erro.message;
            msgErro.style.display = 'block';
        } else {
            alert(erro.message); 
        }
    } finally {
        btnSubmit.innerHTML = 'Entrar no Sistema';
        btnSubmit.disabled = false;
    }
});
