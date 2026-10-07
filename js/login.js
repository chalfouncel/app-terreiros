// 1. LIGA A CONEXÃO COM O BANCO DE DADOS
// Usamos as variáveis supabaseUrl e supabaseKey que já estão na memória do seu site!
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. O CÓDIGO DO FORMULÁRIO 
document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const identificacao = document.getElementById('identificacao').value.trim();
    const senha = document.getElementById('senha').value;
    
    const btnSubmit = document.querySelector('button[type="submit"]');
    // CORREÇÃO: Usando o ID exato que está no HTML
    const msgErro = document.getElementById('msgErro');
    
    if(msgErro) {
        msgErro.style.display = 'none';
        msgErro.classList.add('hidden');
    }
    btnSubmit.innerHTML = 'Processando...';
    btnSubmit.disabled = true;

    try {
        // >>> MATADOR DE SESSÕES FANTASMAS <<<
        // Se você estava logado antes (como admin, etc), isso força o navegador a esquecer
        // antes de processar o novo login ou ID.
        await db.auth.signOut();
        localStorage.removeItem('novo_acesso_id');
        localStorage.removeItem('novo_acesso_nome');

        // REGRA 1: É O PRIMEIRO ACESSO? (Testa se digitaram um ID numérico curto)
        const isId = /^\d+$/.test(identificacao) && identificacao.length < 5;

        if (isId) {
            if (senha !== '123456') {
                throw new Error('Para o primeiro acesso, use a senha padrão: 123456');
            }

            // NOVA FORMA: Bate na Função (RPC) que burla o RLS para checar o ID
            const { data: medium, error: dbError } = await db.rpc('validar_primeiro_acesso', {
                id_buscado: parseInt(identificacao)
            });

            if (dbError || !medium) {
                throw new Error('ID não encontrado no sistema. Procure a administração.');
            }

            // >>> SUPER TRAVA DE SEGURANÇA <<<
            if (medium.auth_id || medium.cadastro_completo || medium.senha_cadastrada) {
                throw new Error('Seu cadastro já está ativo! Feche este aviso e faça o login normal usando seu Nome ou Telefone e a sua Nova Senha.');
            }

            // SUCESSO DO PRIMEIRO ACESSO! Salva os dados na memória para a próxima tela
            localStorage.setItem('novo_acesso_id', medium.id);
            localStorage.setItem('novo_acesso_nome', medium.nome_completo);
            
            // Joga para a tela de completar o cadastro
            window.location.href = 'cadastro.html'; 
            return; 
        }

        let emailParaLogin = "";

        // REGRA ESPECIAL: É UM E-MAIL DIRETO? (Para o Admin)
        if (identificacao.includes('@')) {
            emailParaLogin = identificacao;
        } else {
            // REGRA 2: ACESSO NORMAL (NOME OU TELEFONE + NOVA SENHA)
            let telefoneParaLogin = "";
            
            // Verifica se tem letras (se digitou o Nome em vez do WhatsApp)
            const contemLetras = /[a-zA-Z]/.test(identificacao);

            if (contemLetras) {
                // Busca o telefone desse médium pelo nome no banco
                const { data: mediumData, error: errMedium } = await db
                    .from('mediuns')
                    .select('telefone')
                    .ilike('nome_completo', `%${identificacao}%`)
                    .limit(1)
                    .single();

                if (errMedium || !mediumData || !mediumData.telefone) {
                    throw new Error('Médium não encontrado. Tente digitar o nome mais completo ou use o número do seu WhatsApp.');
                }
                telefoneParaLogin = mediumData.telefone.replace(/\D/g, '');
            } else {
                // Se digitou o número direto, só tira os parênteses e traços
                telefoneParaLogin = identificacao.replace(/\D/g, ''); 
                if (telefoneParaLogin.length < 10) {
                    throw new Error('Digite seu ID (1º acesso) ou seu Telefone com DDD completo.');
                }
            }
            
            // Monta o email fantasma debaixo dos panos para o Supabase validar
            emailParaLogin = `${telefoneParaLogin}@terreiro.app`;
        }

        if (!senha) {
            throw new Error('A senha é obrigatória.');
        }

        // Tenta logar usando o 'db'
        const { data, error } = await db.auth.signInWithPassword({
            email: emailParaLogin,
            password: senha,
        });

        if (error) {
            throw new Error('Identificação ou senha incorretos.');
        }

        // LOGIN FEITO COM SUCESSO! Decide pra onde mandar:
        if (identificacao.includes('@')) {
            // Se logou com e-mail, é Administrador/Master
            window.location.href = 'admin.html';
        } else {
            // Se logou com ID, Nome ou Telefone, é Médium
            window.location.href = 'presenca.html'; 
        }

    } catch (erro) {
        if (msgErro) {
            msgErro.textContent = erro.message;
            msgErro.style.display = 'block';
            msgErro.classList.remove('hidden');
        } else {
            alert(erro.message); 
        }
    } finally {
        btnSubmit.innerHTML = 'Entrar no Sistema';
        btnSubmit.disabled = false;
    }
});
