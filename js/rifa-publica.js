/**
 * rifa-publica.js
 * Gerenciamento da cartela unificada e checkout da Rifa com Asaas
 */

// 1. Configuração do Supabase com as suas credenciais oficiais
const SUPABASE_URL = 'https://pbjwqhfzsvdougeksztq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ri0hesG16fjM1mxdk2LoLQ_zLFbAmLT';

// Inicializa o cliente na window APENAS se ainda não existir
if (!window.supabaseClient && window.supabase) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// 2. Parâmetros e Estado da Aplicação
const urlParams = new URLSearchParams(window.location.search);
const rifaId = urlParams.get('r') || urlParams.get('id');

let rifaAtual = null;
let terreiroAtual = null;
let numerosOcupados = new Map(); // numero -> { status, nome }
let numerosSelecionados = new Set(); // Set de números escolhidos pelo usuário

// Taxa fixa operacional do Asaas definida para o SaaS
const TAXA_FIXA_ASAAS = 1.99; // R$ 1,99 fixo

// 3. Inicialização ao carregar a página
async function iniciarApp() {
    if (!rifaId) {
        renderizarErro('Rifa não encontrada', 'O link informado não contém o identificador da rifa. Abra o link completo com "?r=ID".');
        return;
    }

    await carregarDadosRifa();
    configurarRealtime();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarApp);
} else {
    iniciarApp();
}

// 4. Buscar dados da Rifa e do Terreiro
async function carregarDadosRifa() {
    try {
        if (!window.supabaseClient) {
            console.error('Supabase client não inicializado.');
            renderizarErro('Erro de Conexão', 'Não foi possível conectar ao banco de dados.');
            return;
        }

        // Buscar dados da rifa
        const { data: rifa, error: errRifa } = await window.supabaseClient
            .from('rifas')
            .select('*')
            .eq('id', rifaId)
            .single();

        if (errRifa || !rifa) {
            throw new Error('Rifa não localizada ou já encerrada.');
        }

        rifaAtual = rifa;

        // Buscar dados do terreiro correspondente
        if (rifa.terreiro_id) {
            const { data: terreiro } = await window.supabaseClient
                .from('terreiros')
                .select('*')
                .eq('id', rifa.terreiro_id)
                .single();
            terreiroAtual = terreiro;
        }

        preencherDadosCabecalho();
        await carregarNumerosCartela();

    } catch (err) {
        console.error('Erro ao carregar rifa:', err);
        renderizarErro('Ops!', err.message || 'Erro ao carregar dados da rifa.');
    }
}

// 5. Preencher dados visuais no HTML
function preencherDadosCabecalho() {
    if (terreiroAtual) {
        document.getElementById('terreiroNome').textContent = terreiroAtual.nome || 'Terreiro Solidário';
        if (terreiroAtual.logo_url) {
            document.getElementById('terreiroLogo').innerHTML = `<img src="${terreiroAtual.logo_url}" class="w-full h-full object-cover rounded-full" alt="Logo">`;
        }
    }

    if (rifaAtual) {
        document.getElementById('rifaTitulo').textContent = rifaAtual.titulo;
        document.getElementById('rifaDescricao').textContent = rifaAtual.descricao || 'Participe da nossa campanha solidária.';
        if (rifaAtual.imagem_url) {
            document.getElementById('rifaImagem').src = rifaAtual.imagem_url;
        }
        document.getElementById('rifaValorUnitario').textContent = formatarMoeda(rifaAtual.valor_numero);
    }
}

// 6. Carregar números já vendidos ou reservados
async function carregarNumerosCartela() {
    try {
        const { data: registros, error } = await window.supabaseClient
            .from('rifa_numeros')
            .select('numero, status_pagamento, nome_comprador')
            .eq('rifa_id', rifaId);

        if (error) throw error;

        numerosOcupados.clear();
        (registros || []).forEach(reg => {
            numerosOcupados.set(reg.numero, {
                status: reg.status_pagamento || 'reservado',
                nome: reg.nome_comprador || 'Comprador'
            });
        });

        renderizarGradeNumeros();
        atualizarContadores();

    } catch (err) {
        console.error('Erro ao carregar números:', err);
    }
}

// 7. Renderizar a grade de números na tela
function renderizarGradeNumeros() {
    const grid = document.getElementById('gridNumerosRifa');
    if (!grid || !rifaAtual) return;

    const total = rifaAtual.quantidade_numeros || 100;
    let html = '';

    for (let i = 1; i <= total; i++) {
        const ocupado = numerosOcupados.get(i);
        const isSelecionado = numerosSelecionados.has(i);

        let classes = 'h-12 rounded-xl font-black text-sm flex items-center justify-center transition-all duration-200 select-none ';
        let disabledAttr = '';
        let badgeContent = i < 10 ? `0${i}` : `${i}`;

        if (ocupado) {
            // Número ocupado
            disabledAttr = 'disabled';
            if (ocupado.status === 'pago') {
                classes += 'bg-emerald-500 text-white cursor-not-allowed shadow-inner';
            } else {
                // Reservado / Aguardando pagamento
                classes += 'bg-amber-400 text-amber-950 cursor-not-allowed shadow-inner';
            }
        } else if (isSelecionado) {
            // Selecionado pelo usuário agora
            classes += 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400 scale-95';
        } else {
            // Livre para compra
            classes += 'bg-white hover:bg-indigo-50 border border-gray-200 text-gray-800 hover:border-indigo-300 cursor-pointer active:scale-95 shadow-sm';
        }

        html += `
            <button type="button" 
                    ${disabledAttr} 
                    onclick="alternarSelecaoNumero(${i})" 
                    class="${classes}">
                ${badgeContent}
            </button>
        `;
    }

    grid.innerHTML = html;
}

// 8. Seleção / Deseleção de Números
function alternarSelecaoNumero(numero) {
    if (numerosOcupados.has(numero)) return;

    if (numerosSelecionados.has(numero)) {
        numerosSelecionados.delete(numero);
    } else {
        numerosSelecionados.add(numero);
    }

    renderizarGradeNumeros();
    atualizarBarraFlutuante();
}

// 9. Atualizar contadores de disponíveis
function atualizarContadores() {
    const total = rifaAtual?.quantidade_numeros || 100;
    const ocupadosCount = numerosOcupados.size;
    const livresCount = Math.max(0, total - ocupadosCount);

    const el = document.getElementById('rifaContadorDisponiveis');
    if (el) el.textContent = `${livresCount} de ${total} livres`;
}

// 10. Atualizar a Barra Inferior Flutuante
function atualizarBarraFlutuante() {
    const barra = document.getElementById('barraResumoFlutuante');
    const txtQtd = document.getElementById('txtQtdSelecionados');
    const txtTotal = document.getElementById('txtTotalCompra');

    const qtd = numerosSelecionados.size;

    if (qtd === 0) {
        barra.classList.add('translate-y-full');
        setTimeout(() => barra.classList.add('hidden'), 300);
        return;
    }

    barra.classList.remove('hidden');
    setTimeout(() => barra.classList.remove('translate-y-full'), 10);

    const valorUnitario = Number(rifaAtual?.valor_numero || 0);
    const subtotal = qtd * valorUnitario;

    // Cálculo da taxa fixa de R$ 1,99
    const taxa = calcularTaxaAsaas(subtotal);
    const totalComTaxa = subtotal + taxa;

    txtQtd.textContent = `${qtd} número${qtd > 1 ? 's' : ''} escolhido${qtd > 1 ? 's' : ''}`;
    txtTotal.textContent = formatarMoeda(totalComTaxa);
}

// 11. Função de Cálculo da Taxa do Asaas (R$ 1,99 fixo)
function calcularTaxaAsaas(subtotal) {
    if (subtotal <= 0) return 0;
    return TAXA_FIXA_ASAAS;
}

// 12. Modal de Checkout
function abrirModalCheckout() {
    if (numerosSelecionados.size === 0) return;

    const modal = document.getElementById('modalCheckout');
    const subtotal = numerosSelecionados.size * Number(rifaAtual.valor_numero);
    const taxa = calcularTaxaAsaas(subtotal);
    const totalFinal = subtotal + taxa;

    const listaNums = Array.from(numerosSelecionados).sort((a, b) => a - b).join(', ');
    document.getElementById('resumoNumerosEscolhidos').textContent = listaNums;
    document.getElementById('resumoSubtotal').textContent = formatarMoeda(subtotal);
    document.getElementById('resumoTaxa').textContent = `+ ${formatarMoeda(taxa)}`;
    document.getElementById('resumoTotalFinal').textContent = formatarMoeda(totalFinal);

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('translate-y-full');
    }, 10);
}

function fecharModalCheckout() {
    const modal = document.getElementById('modalCheckout');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// 13. Submissão do Formulário de Checkout chamando a Edge Function Asaas
async function processarPagamentoAsaas(event) {
    event.preventDefault();

    const nome = document.getElementById('chkNome').value.trim();
    const telefone = document.getElementById('chkTelefone').value.trim();
    const cpf = document.getElementById('chkCPF').value.trim();

    if (!nome || !telefone || !cpf) {
        alert('Por favor, preencha todos os campos obrigatórios (Nome, WhatsApp e CPF).');
        return;
    }

    const btn = document.getElementById('btnConfirmarPagamento');
    const btnOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Gerando cobrança segura Asaas...';

    const subtotal = numerosSelecionados.size * Number(rifaAtual.valor_numero);
    const taxa = calcularTaxaAsaas(subtotal);
    const valorCobrado = Number((subtotal + taxa).toFixed(2));
    const arrayNumeros = Array.from(numerosSelecionados);

    try {
        const payload = {
            rifa_id: rifaAtual.id,
            terreiro_id: rifaAtual.terreiro_id,
            numeros: arrayNumeros,
            comprador_nome: nome,
            comprador_telefone: telefone,
            comprador_cpf: cpf,
            valor_total: valorCobrado
        };

        const response = await fetch('https://pbjwqhfzsvdougeksztq.supabase.co/functions/v1/asaas-gerar-cobranca-rifa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify(payload)
        });

        const resultado = await response.json();

        if (!response.ok || resultado.error) {
            throw new Error(resultado.error || 'Erro ao gerar cobrança no Asaas.');
        }

        // Sucesso: Redireciona o comprador diretamente para a página de pagamento oficial do Asaas
        const urlDestino = resultado.invoice_url || resultado.invoiceUrl;
        if (urlDestino) {
            fecharModalCheckout();
            window.location.href = urlDestino;
        } else {
            alert('Cobrança gerada com sucesso!');
        }

    } catch (err) {
        console.error('Erro no checkout:', err);
        alert('Atenção: ' + (err.message || 'Não foi possível gerar a cobrança. Tente novamente.'));
    } finally {
        btn.disabled = false;
        btn.innerHTML = btnOriginal;
    }
}

// 14. Realtime do Supabase: Atualizar cartela se outra pessoa comprar
function configurarRealtime() {
    if (!window.supabaseClient || !rifaId) return;

    window.supabaseClient
        .channel(`rifa_realtime_${rifaId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'rifa_numeros', filter: `rifa_id=eq.${rifaId}` },
            (payload) => {
                if (payload.new && numerosSelecionados.has(payload.new.numero)) {
                    numerosSelecionados.delete(payload.new.numero);
                    atualizarBarraFlutuante();
                }
                carregarNumerosCartela();
            }
        )
        .subscribe();
}

// 15. Utilitários
function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderizarErro(titulo, msg) {
    const main = document.querySelector('main');
    if (main) {
        main.innerHTML = `
            <div class="bg-white rounded-2xl p-8 border border-red-100 shadow-sm text-center my-8">
                <i class="fas fa-exclamation-triangle text-3xl text-amber-500 mb-3"></i>
                <h3 class="font-bold text-gray-800 text-lg mb-1">${titulo}</h3>
                <p class="text-xs text-gray-500">${msg}</p>
            </div>
        `;
    }
}
