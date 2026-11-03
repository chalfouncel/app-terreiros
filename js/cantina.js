// ==========================================
// CONFIGURAÇÃO INICIAL E SEGURANÇA
// ==========================================
// Substitua pelas suas credenciais reais
const SUPABASE_URL = 'https://pbjwqhfzsvdougeksztq.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_Ri0hesG16fjM1mxdk2LoLQ_zLFbAmLT'; 
const supabaseCantina = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioLogadoId = null;
let mediumLogadoInfo = null;
let idTerreiroGlobal = null;
let informacoesTerreiro = null;
let ehAdmin = false;
let ehGestor = false;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verifica se tem alguém logado no Auth do Supabase
    const { data: { session } } = await supabaseCantina.auth.getSession();
    
    if (!session) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = 'index.html'; // Redireciona pro login
        return;
    }

    usuarioLogadoId = session.user.id;

    // 2. Busca os dados do Médium Logado
    const { data: medium } = await supabaseCantina
        .from('mediuns')
        .select('id, nome_completo, is_admin, is_master, terreiro_id')
        .eq('auth_id', usuarioLogadoId)
        .single();

    if (!medium) {
        alert("Usuário não encontrado.");
        window.location.href = 'index.html';
        return;
    }

    mediumLogadoInfo = medium;
    idTerreiroGlobal = medium.terreiro_id;
    ehAdmin = (medium.is_admin === true || medium.is_master === true);

    // 3. Busca os dados do Terreiro para descobrir quem é o Gestor da Cantina
    const { data: terreiro } = await supabaseCantina
        .from('terreiros')
        .select('cantina_gestor_id')
        .eq('id', idTerreiroGlobal)
        .single();

    if (terreiro) {
        informacoesTerreiro = terreiro;
        // Verifica se o ID do médium bate com o id do gestor da cantina
        ehGestor = (String(medium.id) === String(terreiro.cantina_gestor_id));
    }

    // 4. REGRA DE SEGURANÇA (A Mágica acontece aqui)
    if (!ehAdmin && !ehGestor) {
        alert("Acesso Negado! Apenas o gestor da cantina ou a diretoria podem acessar este módulo.");
        window.history.back(); // Joga o enxerido de volta pra onde veio
        return;
    }

    // Se chegou até aqui, tem permissão! Carrega a tela.
    carregarExtratoCantina();
});


// ==========================================
// FUNÇÕES DE DADOS E TELA
// ==========================================

async function carregarExtratoCantina() {
    const tbody = document.getElementById('tabelaExtratoCantina');
    
    const { data: transacoes, error } = await supabaseCantina
        .from('caixa_cantina')
        .select('*')
        .eq('terreiro_id', idTerreiroGlobal)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td class="p-6 text-center text-red-500">Erro ao carregar transações.</td></tr>`;
        return;
    }

    let saldo = 0;
    let totalEntradas = 0;
    let totalSaidas = 0;

    tbody.innerHTML = '';

    if (!transacoes || transacoes.length === 0) {
        tbody.innerHTML = `<tr><td class="p-6 text-center text-gray-500 text-xs">Nenhuma movimentação na cantina ainda.</td></tr>`;
    } else {
        transacoes.forEach(t => {
            const valor = parseFloat(t.valor) || 0;
            const ehEntrada = t.tipo === 'entrada';

            // Cálculos financeiros (Só soma o que está validado/aprovado)
            if (t.status === 'aprovado') {
                if (ehEntrada) {
                    totalEntradas += valor;
                    saldo += valor;
                } else {
                    totalSaidas += valor;
                    saldo -= valor;
                }
            }

            // Renderização da Linha
            const dataFmt = new Date(t.created_at).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'});
            const valFmt = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            const icone = ehEntrada ? '<i class="fas fa-arrow-down text-green-500"></i>' : '<i class="fas fa-arrow-up text-red-500"></i>';
            const corValor = ehEntrada ? 'text-green-600' : 'text-red-600';
            const sinal = ehEntrada ? '+' : '-';

            // Status Badge
            let badge = '';
            if (t.status === 'aprovado') badge = '<span class="bg-green-100 text-green-700 text-[9px] px-2 py-0.5 rounded-full font-bold">Aprovado</span>';
            else if (t.status === 'rejeitado') badge = '<span class="bg-red-100 text-red-700 text-[9px] px-2 py-0.5 rounded-full font-bold">Rejeitado</span>';
            else badge = '<span class="bg-yellow-100 text-yellow-700 text-[9px] px-2 py-0.5 rounded-full font-bold">Em Auditoria</span>';

            // Botões de Ação (Visualizar Nota e Auditar)
            let botoes = '';
            if (t.comprovante_url) {
                botoes += `<a href="${t.comprovante_url}" target="_blank" class="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold mr-1 hover:bg-gray-200 transition">Ver Recibo</a>`;
            }

            // Admin aprova as Saídas que estão pendentes
            if (ehAdmin && !ehEntrada && t.status === 'aguardando_auditoria') {
                botoes += `<button onclick="auditarDespesa(${t.id}, 'aprovado')" class="text-[10px] bg-green-600 text-white px-2 py-1 rounded font-bold mr-1">Validar</button>`;
                botoes += `<button onclick="auditarDespesa(${t.id}, 'rejeitado')" class="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold border border-red-200">Rejeitar</button>`;
            }

            tbody.innerHTML += `
                <tr class="hover:bg-gray-50 transition border-b border-gray-100 last:border-0">
                    <td class="p-3 w-10 text-center">${icone}</td>
                    <td class="p-3">
                        <div class="text-xs font-bold text-gray-800">${t.descricao}</div>
                        <div class="text-[10px] text-gray-400 font-mono mt-0.5">${dataFmt} ${badge}</div>
                    </td>
                    <td class="p-3 text-right">
                        <div class="font-black text-sm ${corValor}">${sinal} ${valFmt}</div>
                        <div class="mt-1 flex justify-end">${botoes}</div>
                    </td>
                </tr>
            `;
        });
    }

    // Atualiza os Totais na Tela
    document.getElementById('cantinaSaldo').textContent = saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('cantinaEntradas').textContent = totalEntradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('cantinaSaidas').textContent = totalSaidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ==========================================
// REGISTRO DE TRANSAÇÕES
// ==========================================

function abrirModalNovaTransacao(tipo) {
    document.getElementById('formTipoTransacao').value = tipo;
    document.getElementById('formValorTransacao').value = '';
    document.getElementById('formDescricaoTransacao').value = '';
    document.getElementById('formArquivoTransacao').value = '';
    
    const titulo = tipo === 'entrada' ? '<i class="fas fa-arrow-down text-green-500 mr-2"></i> Registrar Entrada' : '<i class="fas fa-arrow-up text-red-500 mr-2"></i> Registrar Despesa';
    document.getElementById('tituloModalTransacao').innerHTML = titulo;
    
    // Se for Saída (Despesa), obriga a subir comprovante. Se for entrada (Doação direta), é opcional.
    if(tipo === 'saida') {
        document.getElementById('areaUploadComprovante').classList.remove('hidden');
    } else {
        document.getElementById('areaUploadComprovante').classList.add('hidden');
    }

    document.getElementById('modalTransacao').classList.remove('hidden');
}

function fecharModalTransacao() {
    document.getElementById('modalTransacao').classList.add('hidden');
}

async function salvarTransacao() {
    const tipo = document.getElementById('formTipoTransacao').value;
    const valor = parseFloat(document.getElementById('formValorTransacao').value);
    const descricao = document.getElementById('formDescricaoTransacao').value.trim();
    const arquivoInput = document.getElementById('formArquivoTransacao');
    const btn = document.getElementById('btnSalvarTransacao');

    if (!valor || isNaN(valor) || valor <= 0) return alert("Digite um valor válido.");
    if (!descricao) return alert("Digite a descrição (Ex: Compra de Gelo).");
    if (tipo === 'saida' && arquivoInput.files.length === 0) return alert("Para registrar uma despesa, é obrigatório anexar a foto da Nota Fiscal/Recibo.");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
        let urlComprovante = null;

        // Faz o Upload do Arquivo no bucket "comprovantes"
        if (arquivoInput.files.length > 0) {
            const file = arquivoInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `cantina_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabaseCantina.storage
                .from('comprovantes')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabaseCantina.storage.from('comprovantes').getPublicUrl(fileName);
            urlComprovante = publicUrlData.publicUrl;
        }

        // Regra de Status: 
        // Entrada lançada pelo gestor já entra Aprovada (pois o dinheiro tá com ele).
        // Saída (Despesa) entra como 'aguardando_auditoria' para o Admin avaliar.
        const statusTransacao = tipo === 'entrada' ? 'aprovado' : 'aguardando_auditoria';

        // Salva no Banco de Dados
        const { error: dbError } = await supabaseCantina
            .from('caixa_cantina')
            .insert([{
                terreiro_id: idTerreiroGlobal,
                tipo: tipo,
                valor: valor,
                descricao: descricao,
                comprovante_url: urlComprovante,
                status: statusTransacao,
                solicitado_por: usuarioLogadoId
            }]);

        if (dbError) throw dbError;

        alert(tipo === 'entrada' ? 'Entrada registrada com sucesso!' : 'Despesa enviada para auditoria com sucesso!');
        fecharModalTransacao();
        carregarExtratoCantina(); // Atualiza a tela

    } catch (e) {
        alert("Erro ao registrar: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Registrar';
    }
}

// Admin Audita a Despesa
async function auditarDespesa(id, novoStatus) {
    if (!ehAdmin) return alert("Você não tem permissão para auditar.");
    
    const acao = novoStatus === 'aprovado' ? 'VALIDAR e descontar o saldo' : 'REJEITAR';
    if (!confirm(`Tem certeza que deseja ${acao} esta despesa?`)) return;

    try {
        const { error } = await supabaseCantina
            .from('caixa_cantina')
            .update({ 
                status: novoStatus,
                validado_por: usuarioLogadoId,
                data_validacao: new Date().toISOString()
            })
            .eq('id', id)
            .eq('terreiro_id', idTerreiroGlobal);

        if (error) throw error;
        
        alert("Auditado com sucesso!");
        carregarExtratoCantina();
    } catch(e) {
        alert("Erro ao auditar: " + e.message);
    }
}
