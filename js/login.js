// 1. CONEXÃO COM O SUPABASE (Com seus dados reais)
const supabaseUrl = 'https://pbjwqhfzsvdougeksztq.supabase.co';
const supabaseKey = 'sb_publishable_Ri0hesG16fjM1mxdk2LoLQ_zLFbAmLT';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. O CÓDIGO DO FORMULÁRIO COM O NOVO FLUXO (ID + SENHA 123456)
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
            // Se digitou ID, a senha TEM QUE SER 123456
            if (senha !== '123456') {
                throw new Error('Para o primeiro acesso, use a senha padrão: 123456');
            }

            // Busca o médium pelo ID
            const { data: medium, error: dbError } = await supabase
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
            
            // Joga para a tela de completar o cadastro (Ficha de Médium)
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

        // Monta o e-mail fantasma para logar no Supabase
        const emailFantasma = `${telefoneFormatado}@terreiro.app`;

        // Tenta logar no Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailFantasma,
            password: senha,
        });

        if (error) {
            throw new Error('Telefone ou senha incorretos.');
        }

        // LOGIN NORMAL FEITO COM SUCESSO!
        // Redireciona para a tela de presença (ajuste se a sua tela principal tiver outro nome)
        window.location.href = 'presenca.html';

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
