const w = window;
let idTerreiroGlobal = null; 
let mediunsGrauCache = []; 
let perfilAdminLogado = null; 

let nomeTerreiroGlobal = "";
let logoTerreiroGlobal = "";
let mapaGlobal = null;
let marcadorGlobal = null;
let circuloGlobal = null;
let listaMediunsGlobal = []; 

window.comprovanteAtualId = null;

const GRAUS_PADRAO = ['I', 'IJ', 'B', 'BJ', 'T', 'TJ', 'SCT', 'Escola de CT', 'CT', 'SCCT', 'Escola de CCT', 'CCT', 'Dirigente', 'Outros'];
const FUNCOES_PADRAO = ['MG', 'MGA', 'MC', 'MCA', 'MD', 'MDA', 'CC', 'CAC', 'Cantina', 'Dirigente'];

let opcoesGrau = ['-', ...GRAUS_PADRAO];
let opcoesFuncao = ['-', ...FUNCOES_PADRAO];
let grausAtuaisTerreiro = [...GRAUS_PADRAO];
let funcoesAtuaisTerreiro = [...FUNCOES_PADRAO];

function renderizarOpcoes(lista, valorAtual) { 
    return lista.map(op => `<option value="${op === '-' ? '' : op}" ${op === valorAtual ? 'selected' : ''}>${op}</option>`).join(''); 
}

function comprimirImagem(file, maxWidth = 1200, maxHeight = 1200, quality = 0.82) {
    return new Promise((resolve) => {
        if (!file || !file.type || !file.type.match(/image.*/)) {
            return resolve(file);
        }

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const image = new Image();
            image.onload = () => {
                let width = image.width;
                let height = image.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) return resolve(file);
                    const ext = file.name.split('.').pop() || 'jpg';
                    const novoArquivo = new File([blob], file.name.replace(/\.[^/.]+$/, `.${ext}`), {
                        type: file.type.includes('png') ? 'image/png' : 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(novoArquivo);
                }, file.type.includes('png') ? 'image/png' : 'image/jpeg', quality);
            };
            image.onerror = () => resolve(file);
            image.src = readerEvent.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    let emModoMasterPuro = false;
    let terreiroSaaSForcado = null;

    try {
        const dataOpcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dataStr = new Date().toLocaleDateString('pt-BR', dataOpcoes);
        const elDataHoje = document.getElementById('dataHoje');
        if (elDataHoje) elDataHoje.textContent = dataStr;
        const elDataMobile = document.getElementById('dataHojeMobile');
        if (elDataMobile) elDataMobile.textContent = dataStr;

        const sidebar = document.getElementById('sidebar');
        const overlayMobile = document.getElementById('overlayMobile');
        const btnAbrirMenu = document.getElementById('btnAbrirMenu');
        const btnFecharMenu = document.getElementById('btnFecharMenu');

        function toggleMenu() {
            if (!sidebar || !overlayMobile) return;
            const isOpen = !sidebar.classList.contains('-translate-x-full');
            if (isOpen) {
                sidebar.classList.add('-translate-x-full');
                overlayMobile.classList.add('hidden');
            } else {
                sidebar.classList.remove('-translate-x-full');
                overlayMobile.classList.remove('hidden');
            }
        }

        if(btnAbrirMenu) btnAbrirMenu.addEventListener('click', toggleMenu);
        if(btnFecharMenu) btnFecharMenu.addEventListener('click', toggleMenu);
        if(overlayMobile) overlayMobile.addEventListener('click', toggleMenu);

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return w.location.replace('index.html');

        const btnSair = document.getElementById('btnSair');
        if (btnSair) {
            btnSair.addEventListener('click', async () => {
                btnSair.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saindo...';
                await supabaseClient.auth.signOut(); 
                localStorage.clear(); 
                w.location.replace('index.html'); 
            });
        }

        const { data: perfil, error: erroPerfil } = await supabaseClient
            .from('mediuns')
            .select('nome_completo, is_admin, terreiro_id, perm_agenda, perm_grau, perm_financeiro, perm_doacoes, perm_admin, is_master, perm_visao_geral, perm_ata, perm_quadro_mediuns, perm_guias, perm_ia, perm_escalas')
            .eq('auth_id', session.user.id)
            .single();

        if (erroPerfil) throw erroPerfil;
        perfilAdminLogado = perfil;

        const temAcessoPainel = perfil.is_admin || perfil.perm_visao_geral || perfil.perm_quadro_mediuns || perfil.perm_guias || perfil.perm_agenda || perfil.perm_grau || perfil.perm_financeiro || perfil.perm_doacoes || perfil.perm_admin || perfil.perm_ata || perfil.perm_ia || perfil.perm_escalas || perfil.is_master;

        if (!temAcessoPainel) {
            alert('Acesso negado. Você não possui permissão para acessar o Painel de Gestão.');
            return w.location.replace('presenca.html');
        }
        
        if (perfil.is_master) {
            const menuMaster = document.getElementById('menuMaster');
            if (menuMaster) menuMaster.classList.remove('hidden');
            
            terreiroSaaSForcado = localStorage.getItem('terreiroAtivoSaaS');
            
            if (terreiroSaaSForcado) {
                idTerreiroGlobal = terreiroSaaSForcado;
                perfil.is_admin = true; perfil.perm_visao_geral = true; perfil.perm_agenda = true;
                perfil.perm_ata = true; perfil.perm_grau = true; perfil.perm_financeiro = true;
                perfil.perm_doacoes = true; perfil.perm_admin = true; perfil.perm_quadro_mediuns = true; 
                perfil.perm_guias = true; perfil.perm_ia = true; perfil.perm_escalas = true;
            } else {
                emModoMasterPuro = true;
                idTerreiroGlobal = null;
            }
        } else {
            idTerreiroGlobal = perfil.terreiro_id;
        }

        if (emModoMasterPuro) {
            ['menuVisaoGeral', 'menuQuadroMediuns', 'menuGuiasMediuns', 'menuIA', 'menuAgendaGiras', 'menuLivroAta', 'menuEscalas', 'menuGrau', 'menuFinanceiro', 'menuComprovantes', 'menuDoacoes', 'menuAdmin'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
            // ... (código existente) ...
        } else {
            if (!perfil.is_admin) {
                if (!perfil.perm_visao_geral && document.getElementById('menuVisaoGeral')) document.getElementById('menuVisaoGeral').classList.add('hidden');
                if (!perfil.perm_quadro_mediuns && document.getElementById('menuQuadroMediuns')) document.getElementById('menuQuadroMediuns').classList.add('hidden');
                if (!perfil.perm_guias && document.getElementById('menuGuiasMediuns')) document.getElementById('menuGuiasMediuns').classList.add('hidden');
                if (!perfil.perm_ia && document.getElementById('menuIA')) document.getElementById('menuIA').classList.add('hidden');
                if (!perfil.perm_agenda && document.getElementById('menuAgendaGiras')) document.getElementById('menuAgendaGiras').classList.add('hidden');
                if (!perfil.perm_ata && document.getElementById('menuLivroAta')) document.getElementById('menuLivroAta').classList.add('hidden');
                if (!perfil.perm_escalas && document.getElementById('menuEscalas')) document.getElementById('menuEscalas').classList.add('hidden');
                if (!perfil.perm_grau && document.getElementById('menuGrau')) document.getElementById('menuGrau').classList.add('hidden');
                if (!perfil.perm_doacoes && document.getElementById('menuDoacoes')) document.getElementById('menuDoacoes').classList.add('hidden');
                if (!perfil.perm_admin && document.getElementById('menuAdmin')) document.getElementById('menuAdmin').classList.add('hidden');
                
                if (!perfil.perm_financeiro) {
                    if (document.getElementById('menuFinanceiro')) document.getElementById('menuFinanceiro').classList.add('hidden');
                    if (document.getElementById('menuComprovantes')) document.getElementById('menuComprovantes').classList.add('hidden');
                }
            }
        }

        const primeiroNome = perfil.nome_completo ? perfil.nome_completo.split(' ')[0] : 'Admin';
        const elNomeAdmin = document.getElementById('nomeAdmin');
        if (elNomeAdmin) elNomeAdmin.textContent = 'Olá, ' + primeiroNome;
        const nomeMobileEl = document.getElementById('nomeAdminMobile');
        if (nomeMobileEl) nomeMobileEl.textContent = primeiroNome;
        
        if (idTerreiroGlobal) {
            const { data: terreiro } = await supabaseClient
                .from('terreiros')
                .select('nome, logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto, lista_graus, lista_funcoes, status_bloqueado')
                .eq('id', idTerreiroGlobal)
                .single();
            
            if (terreiro) {
                if (terreiro.status_bloqueado === true && !perfil.is_master) {
                    alert('Acesso Suspenso: O sistema deste Terreiro encontra-se temporariamente bloqueado. Entre em contato com o suporte da plataforma.');
                    await supabaseClient.auth.signOut();
                    localStorage.clear();
                    return w.location.replace('index.html');
                }
                nomeTerreiroGlobal = terreiro.nome;
                if (terreiro.lista_graus && terreiro.lista_graus.length > 0) {
                    grausAtuaisTerreiro = [...terreiro.lista_graus];
                    opcoesGrau = ['-', ...grausAtuaisTerreiro];
                }
                if (terreiro.lista_funcoes && terreiro.lista_funcoes.length > 0) {
                    funcoesAtuaisTerreiro = [...terreiro.lista_funcoes];
                    opcoesFuncao = ['-', ...funcoesAtuaisTerreiro];
                }
                logoTerreiroGlobal = terreiro.logo_url;
                const elSide = document.getElementById('nomeTerreiroSidebar');
                if (elSide) elSide.textContent = terreiro.nome;
                
                const root = document.documentElement;
                if(terreiro.cor_primaria) root.style.setProperty('--cor-primaria', terreiro.cor_primaria);
                if(terreiro.cor_secundaria) root.style.setProperty('--cor-secundaria', terreiro.cor_secundaria);
                if(terreiro.cor_fundo) root.style.setProperty('--cor-fundo', terreiro.cor_fundo);
                if(terreiro.cor_texto) root.style.setProperty('--cor-texto', terreiro.cor_texto);

                if(terreiro.logo_url) {
                    const img = document.getElementById('logoSidebar');
                    if (img) {
                        img.src = terreiro.logo_url;
                        img.classList.remove('hidden');
                    }
                }
            }
        }

        if (idTerreiroGlobal) {
            const { data: listaBase } = await supabaseClient
                .from('mediuns')
                .select('id, auth_id, nome_completo, nome_social, grau, funcao, data_nascimento, telefone, palavra, cadastro_completo, status_ativo, data_batismo')
                .eq('terreiro_id', idTerreiroGlobal)
                .neq('nome_completo', 'Administrador Sistema')
                .order('nome_completo');
            listaMediunsGlobal = listaBase || [];
        }

        const menus = document.querySelectorAll('.menu-item');
        const secoes = document.querySelectorAll('.secao-painel');

        menus.forEach(menu => {
            menu.addEventListener('click', (e) => {
                e.preventDefault();
                menus.forEach(m => m.classList.replace('bg-white/20', 'hover:bg-white/10'));
                menu.classList.replace('hover:bg-white/10', 'bg-white/20');
                
                secoes.forEach(s => s.classList.add('hidden'));
                const titulo = document.getElementById('tituloSecao');
                const tituloMobile = document.getElementById('tituloMobile');
                
                const aplicarTitulos = (texto) => {
                    if (titulo) titulo.textContent = texto;
                    if (tituloMobile) tituloMobile.textContent = texto;
                };

                if (menu.id === 'menuVisaoGeral') {
                    document.getElementById('secVisaoGeral')?.classList.remove('hidden');
                    aplicarTitulos('Visão Geral');
                    carregarPainelInicial();
                } else if (menu.id === 'menuQuadroMediuns') {
                    document.getElementById('secQuadroMediuns')?.classList.remove('hidden');
                    aplicarTitulos('Quadro de Médiuns');
                    carregarQuadroMediuns();
                } else if (menu.id === 'menuGuiasMediuns') {
                    document.getElementById('secGuiasMediuns')?.classList.remove('hidden');
                    aplicarTitulos('Guias dos Médiuns');
                    if (typeof carregarGuiasMediuns === 'function') carregarGuiasMediuns();
                } else if (menu.id === 'menuIA') {
                    document.getElementById('secIA')?.classList.remove('hidden');
                    aplicarTitulos('Assistente IA');
                } else if (menu.id === 'menuAgendaGiras') {
                    document.getElementById('secAgendaGiras')?.classList.remove('hidden');
                    aplicarTitulos('Agenda de Eventos');
                    carregarAgenda();
                } else if (menu.id === 'menuLivroAta') {
                    document.getElementById('secLivroAta')?.classList.remove('hidden');
                    aplicarTitulos('Livro de Presença (ATA)');
                    if (typeof carregarLivroAta === 'function') carregarLivroAta();
                } else if (menu.id === 'menuEscalas') {
                    document.getElementById('secEscalas')?.classList.remove('hidden');
                    aplicarTitulos('Escalas e Missões');
                    if (typeof window.carregarEventosEscalas === 'function') window.carregarEventosEscalas();
                } else if (menu.id === 'menuGrau') {
                    document.getElementById('secGrau')?.classList.remove('hidden');
                    aplicarTitulos('Alteração de Grau');
                    carregarTabelaGraus();
                } else if (menu.id === 'menuFinanceiro') {
                    document.getElementById('secFinanceiro')?.classList.remove('hidden');
                    aplicarTitulos('Controle Financeiro');
                    carregarFinanceiro();
                } else if (menu.id === 'menuComprovantes') {
                    document.getElementById('secComprovantes')?.classList.remove('hidden');
                    aplicarTitulos('Validar Pagamentos');
                    carregarValidadorPagamentos();
                } else if (menu.id === 'menuDoacoes') {
                    document.getElementById('secDoacoes')?.classList.remove('hidden');
                    aplicarTitulos('Doações e Campanhas');
                    if (typeof carregarDoacoesPrometidas === 'function') carregarDoacoesPrometidas();
                    if (typeof carregarDoacoesCatalogo === 'function') carregarDoacoesCatalogo();
                } else if (menu.id === 'menuAdmin') {
                    document.getElementById('secAdministracao')?.classList.remove('hidden');
                    aplicarTitulos('Configurações da Casa');
                    carregarConfiguracoesCasa();
                } else if (menu.id === 'menuMaster') {
                    document.getElementById('secMaster')?.classList.remove('hidden');
                    aplicarTitulos('Gestão da Plataforma (SaaS)');
                    if (typeof carregarGestaoPlataforma === 'function') carregarGestaoPlataforma();
                }

                if (w.innerWidth < 768 && sidebar && overlayMobile) {
                    sidebar.classList.add('-translate-x-full');
                    overlayMobile.classList.add('hidden');
                }
            });
        });
                if (!emModoMasterPuro) {
                    setTimeout(() => {
                        const urlParams = new URLSearchParams(window.location.search);
                        const secaoParam = urlParams.get('secao');
                        const menuAlvo = secaoParam ? document.getElementById(secaoParam) : null;

                        if (menuAlvo && !menuAlvo.classList.contains('hidden')) {
                            menuAlvo.click();
                        } else {
                            const primeiroMenuVisivel = Array.from(menus).find(menu => !menu.classList.contains('hidden'));
                            if (primeiroMenuVisivel) {
                                primeiroMenuVisivel.click();
                            } else {
                                secoes.forEach(s => s.classList.add('hidden'));
                            }
                        }
                    }, 100);
                }

        // === INTEGRAÇÃO: BARRA DE BUSCA RÁPIDA DA IA (VISÃO GERAL) ===
        const inputIARapida = document.getElementById('inputBuscaRapidaIA');
        const btnIARapida = document.getElementById('btnBuscaRapidaIA');

        const dispararConsultaIARapida = () => {
            if (!inputIARapida) return;
            const pergunta = inputIARapida.value.trim();
            if (!pergunta) return;

            // 1. Simula o clique no menu lateral para abrir a aba IA
            const menuAlvoIA = document.getElementById('menuIA');
            if (menuAlvoIA) menuAlvoIA.click();
            
            // 2. Aguarda a transição de tela (200ms) e aciona o motor da IA
            setTimeout(() => {
                const inputIAReal = document.getElementById('inputPergunta');
                const formIAReal = document.getElementById('formChat');
                
                if (inputIAReal && formIAReal) {
                    inputIAReal.value = pergunta; // Insere a pergunta no chat real
                    inputIARapida.value = '';     // Limpa a barra da visão geral
                    
                    // Dispara o envio nativo do formulário do chat
                    formIAReal.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
            }, 200);
        };

        if (btnIARapida) {
            // Failsafe: Remove o onclick do HTML para o JS assumir o controle total
            btnIARapida.removeAttribute('onclick');
            btnIARapida.addEventListener('click', dispararConsultaIARapida);
        }

        if (inputIARapida) {
            // Failsafe: Ouve a tecla Enter dentro do campo
            inputIARapida.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Impede que a página recarregue
                    dispararConsultaIARapida();
                }
            });
        }
        // === FIM INTEGRAÇÃO IA ===
        
        const formNovaGira = document.getElementById('formNovaGira');
        if (formNovaGira) {
            formNovaGira.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('btnSalvarGira');
                const msg = document.getElementById('msgGira');
                
                const titulo = document.getElementById('giraTitulo').value.trim();
                const inicio = document.getElementById('giraInicio').value;
                const fim = document.getElementById('giraFim').value;
                const informativo = document.getElementById('giraInformativo')?.checked || false;
                const geraAta = informativo ? false : (document.getElementById('giraGeraAta')?.checked || false);
                const especial = document.getElementById('giraEspecial')?.checked || false;
                
                // NOVO: Lê as checboxs de escalas do HTML
                const reqEscalaExu = informativo ? false : (document.getElementById('giraReqExu')?.checked || false);
                const reqEscalaCorrente = informativo ? false : (document.getElementById('giraReqCorrente')?.checked || false);
                
                const fileInput = document.getElementById('giraArquivo');

                if (!titulo || !inicio || !fim) {
                    alert('Preencha os campos obrigatórios do evento.');
                    return;
                }

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando Evento...';
                if (msg) msg.classList.add('hidden');

                try {
                    let imagemUrl = null;

                    if (fileInput && fileInput.files && fileInput.files.length > 0) {
                        const arquivoOriginal = fileInput.files[0];
                        const arquivoComprimido = await comprimirImagem(arquivoOriginal, 1200, 1200, 0.85);
                        const nomeArquivo = `gira_${idTerreiroGlobal}_${Date.now()}.${arquivoComprimido.name.split('.').pop()}`;
                        
                        const { error: errUp } = await supabaseClient.storage.from('logos').upload(nomeArquivo, arquivoComprimido);
                        if (!errUp) {
                            const { data: urlData } = supabaseClient.storage.from('logos').getPublicUrl(nomeArquivo);
                            imagemUrl = urlData.publicUrl;
                        }
                    }

                    const convocados = especial ? (w['selecionados_listaCheckConvocados'] || []) : [];
                    
                    const batizados = document.getElementById('giraReqBatismo')?.checked ? (w['selecionados_listaCheckBatismo'] || []) : [];
                    const consagrados = document.getElementById('giraReqConsagracao')?.checked ? (w['selecionados_listaCheckConsagracao'] || []) : [];
                    const coroados = document.getElementById('giraReqCoroacao')?.checked ? (w['selecionados_listaCheckCoroacao'] || []) : [];

                    const novoEvento = {
                        terreiro_id: idTerreiroGlobal,
                        titulo: titulo,
                        tipo: informativo ? 'informativo' : (especial ? 'especial' : 'normal'),
                        data_hora_inicio: inicio,
                        data_hora_fim: fim,
                        gera_ata: geraAta,
                        especial: especial,
                        req_escala_exu: reqEscalaExu,
                        req_escala_corrente: reqEscalaCorrente,
                        escalas: informativo ? {} : { batizados, consagrados, coroados }, 
                        convocados: convocados,
                        imagem_url: imagemUrl
                    };

                    const { error: errInsert } = await supabaseClient
                        .from('agenda')
                        .insert([novoEvento]);

                    if (errInsert) throw errInsert;

                    formNovaGira.reset();
                    w['selecionados_listaCheckConvocados'] = [];
                    document.getElementById('boxConvocados')?.classList.add('hidden');

                    if (msg) {
                        msg.textContent = 'Evento cadastrado com sucesso!';
                        msg.className = 'text-xs md:text-sm font-bold mt-2 text-green-600 block';
                        msg.classList.remove('hidden');
                        setTimeout(() => msg.classList.add('hidden'), 4000);
                    }

                    carregarAgenda();

                } catch (err) {
                    console.error('Erro ao salvar evento:', err);
                    if (msg) {
                        msg.textContent = 'Erro ao salvar: ' + err.message;
                        msg.className = 'text-xs md:text-sm font-bold mt-2 text-red-600 block';
                        msg.classList.remove('hidden');
                    }
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = 'Salvar Evento';
                }
            });
        }

        const formEditarGira = document.getElementById('formEditarGira');
        if (formEditarGira) {
            formEditarGira.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('editGiraId').value;
                const titulo = document.getElementById('editGiraTitulo').value.trim();
                const inicio = document.getElementById('editGiraInicio').value;
                const fim = document.getElementById('editGiraFim').value;
                const informativo = document.getElementById('editGiraInformativo')?.checked || false;
                const geraAta = informativo ? false : (document.getElementById('editGiraGeraAta')?.checked || false);
                const especial = document.getElementById('editGiraEspecial')?.checked || false;
                
                // NOVO: Pega o estado das checboxs de escalas do modal HTML
                const reqEscalaExu = informativo ? false : (document.getElementById('editGiraReqExu')?.checked || false);
                const reqEscalaCorrente = informativo ? false : (document.getElementById('editGiraReqCorrente')?.checked || false);
                
                const convocados = especial ? (w['selecionados_editListaCheckConvocados'] || []) : [];
                
                const batizados = document.getElementById('editGiraReqBatismo')?.checked ? (w['selecionados_editListaCheckBatismo'] || []) : [];
                const consagrados = document.getElementById('editGiraReqConsagracao')?.checked ? (w['selecionados_editListaCheckConsagracao'] || []) : [];
                const coroados = document.getElementById('editGiraReqCoroacao')?.checked ? (w['selecionados_editListaCheckCoroacao'] || []) : [];
                
                const escalasAtuais = window.escalasEditAtual || {};
                escalasAtuais.batizados = batizados;
                escalasAtuais.consagrados = consagrados;
                escalasAtuais.coroados = coroados;

                const btn = document.getElementById('btnSalvarEditGira');
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';

                try {
                    const { error } = await supabaseClient.from('agenda')
                        .update({
                            titulo,
                            tipo: informativo ? 'informativo' : (especial ? 'especial' : 'normal'),
                            data_hora_inicio: inicio,
                            data_hora_fim: fim,
                            gera_ata: geraAta,
                            especial: especial,
                            req_escala_exu: reqEscalaExu,
                            req_escala_corrente: reqEscalaCorrente,
                            convocados: convocados,
                            escalas: informativo ? {} : escalasAtuais
                        })
                        .eq('id', id)
                        .eq('terreiro_id', idTerreiroGlobal);

                    if (error) throw error;

                    w.fecharModalEditarGira();
                    carregarAgenda();
                } catch (err) {
                    alert('Erro ao atualizar: ' + err.message);
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = 'Salvar Alterações';
                }
            });
        }

        const formEscreverAta = document.getElementById('formEscreverAta');
        if (formEscreverAta) {
            formEscreverAta.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('ataEventoId').value;
                const texto = document.getElementById('ataTexto').value;
                const btn = document.getElementById('btnSalvarTextoAta');
                const msg = document.getElementById('msgEscreverAta');

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Gravando...';

                try {
                    const { error } = await supabaseClient
                        .from('agenda')
                        .update({ texto_ata: texto })
                        .eq('id', id)
                        .eq('terreiro_id', idTerreiroGlobal);

                    if (error) throw error;

                    if (msg) {
                        msg.textContent = 'Texto da Ata salvo com sucesso!';
                        msg.className = 'text-center mt-2 text-xs md:text-sm font-bold text-green-600 block';
                        msg.classList.remove('hidden');
                        setTimeout(() => {
                            w.fecharModalEscreverAta();
                            if (typeof w.carregarLivroAta === 'function') w.carregarLivroAta();
                        }, 1200);
                    }
                } catch (err) {
                    if (msg) {
                        msg.textContent = 'Erro ao salvar: ' + err.message;
                        msg.className = 'text-center mt-2 text-xs md:text-sm font-bold text-red-600 block';
                        msg.classList.remove('hidden');
                    }
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = 'Salvar Texto da Ata';
                }
            });
        }

        const formNovoMedium = document.getElementById('formNovoMedium');
        if (formNovoMedium) {
            formNovoMedium.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('btnSalvarNovoMedium');
                const msg = document.getElementById('msgNovoMedium');
                const resultado = document.getElementById('resultadoNovoMedium');
                const inputNome = document.getElementById('novoMediumNome');
                const nomeCompleto = inputNome ? inputNome.value.trim() : '';

                if (!nomeCompleto) return;
                if (!idTerreiroGlobal) {
                    alert('Erro: ID do terreiro não identificado.');
                    return;
                }

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Cadastrando...';
                if (msg) msg.classList.add('hidden');

                try {
                    const { data: listaExistente, error: errBusca } = await supabaseClient
                        .from('mediuns')
                        .select('id')
                        .order('id', { ascending: false })
                        .limit(1);

                    if (errBusca) throw errBusca;

                    const proximoId = (listaExistente && listaExistente.length > 0) ? (listaExistente[0].id + 1) : 1;

                    const novoRegistro = {
                        id: proximoId,
                        terreiro_id: idTerreiroGlobal,
                        nome_completo: nomeCompleto,
                        cadastro_completo: false,
                        status_ativo: true,
                        is_admin: false,
                        isento_mensalidade: false
                    };

                    const { error: errInsert } = await supabaseClient
                        .from('mediuns')
                        .insert([novoRegistro]);

                    if (errInsert) throw errInsert;

                    formNovoMedium.classList.add('hidden');
                    if (resultado) {
                        const elId = document.getElementById('idGeradoNovoMedium');
                        if (elId) elId.textContent = String(proximoId).padStart(2, '0');
                        
                        // Injeta o nome do médium recém-cadastrado no modal de sucesso
                        const tituloSucesso = resultado.querySelector('h4');
                        if (tituloSucesso) tituloSucesso.innerHTML = `Médium Cadastrado!<br><span class="text-sm font-normal text-gray-500">${nomeCompleto}</span>`;
                        
                        resultado.classList.remove('hidden');
                    }

                    carregarQuadroMediuns();

                } catch (err) {
                    console.error('Erro ao cadastrar novo médium:', err);
                    if (msg) {
                        msg.textContent = 'Erro ao cadastrar: ' + err.message;
                        msg.className = 'text-xs text-red-600 block mt-2 font-bold';
                        msg.classList.remove('hidden');
                    }
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = 'Cadastrar Médium';
                }
            });
        }

        const formEditarMedium = document.getElementById('formEditarMedium');
        if (formEditarMedium) {
            formEditarMedium.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('editMediumId').value;
                const nomeCompleto = document.getElementById('editMediumNome').value.trim();
                const nomeSocial = document.getElementById('editMediumNomeSocial').value.trim();
                const telefone = document.getElementById('editMediumTelefone').value.trim();
                const nascimento = document.getElementById('editMediumNascimento').value;
                const grau = document.getElementById('editMediumGrau').value;
                const funcao = document.getElementById('editMediumFuncao').value;

                const cpf = (document.getElementById('editMediumCpf')?.value || '').replace(/\D/g, '') || null;
                const estadoCivil = document.getElementById('editMediumEstadoCivil')?.value || null;
                const profissao = document.getElementById('editMediumProfissao')?.value.trim() || null;
                const emergNome = document.getElementById('editMediumEmergNome')?.value.trim() || null;
                const emergTel = (document.getElementById('editMediumEmergTel')?.value || '').replace(/\D/g, '') || null;
                const planoTxt = document.getElementById('editMediumPlano')?.value.trim() || null;
                const tipoSang = document.getElementById('editMediumTipoSang')?.value.trim() || null;
                const comorbidades = document.getElementById('editMediumComorbidades')?.value.trim() || null;

                const btn = document.getElementById('btnSalvarEditMedium');
                const msg = document.getElementById('msgEditMedium');

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
                if (msg) msg.classList.add('hidden');

                try {
                    const { error } = await supabaseClient
                        .from('mediuns')
                        .update({
                            nome_completo: nomeCompleto,
                            nome_social: nomeSocial,
                            telefone: telefone,
                            data_nascimento: nascimento || null,
                            grau: grau,
                            funcao: funcao,
                            cpf: cpf,
                            estado_civil: estadoCivil,
                            profissao: profissao,
                            emergencia_nome: emergNome,
                            emergencia_telefone: emergTel,
                            possui_plano_saude: Boolean(planoTxt),
                            qual_plano_saude: planoTxt,
                            tipo_sanguineo: tipoSang,
                            comorbidades_alergias: comorbidades
                        })
                        .eq('id', id)
                        .eq('terreiro_id', idTerreiroGlobal);

                    if (error) throw error;

                    w.fecharModalEditarMedium();
                    carregarQuadroMediuns();
                } catch (err) {
                    if (msg) {
                        msg.textContent = 'Erro ao salvar: ' + err.message;
                        msg.className = 'text-xs text-red-600 block mt-2 font-bold text-center';
                        msg.classList.remove('hidden');
                    }
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = 'Salvar Alterações';
                }
            });
        }

        const btnSalvarPermissoes = document.getElementById('btnSalvarPermissoes');
        if (btnSalvarPermissoes) {
            btnSalvarPermissoes.addEventListener('click', async () => {
                const idMedium = document.getElementById('idMediumPermissao').value;
                if (!idMedium) return;

                const btnHtml = btnSalvarPermissoes.innerHTML;
                btnSalvarPermissoes.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
                btnSalvarPermissoes.disabled = true;

                const payload = {
                    perm_visao_geral: document.getElementById('chkPermVisao')?.checked || false,
                    perm_quadro_mediuns: document.getElementById('chkPermQuadro')?.checked || false,
                    perm_guias: document.getElementById('chkPermGuias')?.checked || false,
                    perm_ia: document.getElementById('chkPermIA')?.checked || false,
                    perm_agenda: document.getElementById('chkPermAgenda')?.checked || false,
                    perm_ata: document.getElementById('chkPermAta')?.checked || false,
                    perm_grau: document.getElementById('chkPermGrau')?.checked || false,
                    perm_financeiro: document.getElementById('chkPermFinanceiro')?.checked || false,
                    perm_doacoes: document.getElementById('chkPermDoacoes')?.checked || false,
                    perm_admin: document.getElementById('chkPermAdmin')?.checked || false,
                    perm_escalas: document.getElementById('chkPermEscalas')?.checked || false // <-- LINHA ADICIONADA
                };
                try {
                    const { error } = await supabaseClient
                        .from('mediuns')
                        .update(payload)
                        .eq('id', idMedium)
                        .eq('terreiro_id', idTerreiroGlobal);

                    if (error) throw error;

                    document.getElementById('modalPermissoes').classList.add('hidden');
                    alert('Permissões atualizadas com sucesso!');
                    carregarQuadroMediuns();
                } catch (err) {
                    console.error('Erro ao salvar permissões:', err);
                    alert('Erro ao salvar permissões: ' + err.message);
                } finally {
                    btnSalvarPermissoes.innerHTML = btnHtml;
                    btnSalvarPermissoes.disabled = false;
                }
            });
        }

        const btnFecharPermissoes = document.getElementById('btnFecharPermissoes');
        if (btnFecharPermissoes) {
            btnFecharPermissoes.addEventListener('click', () => {
                document.getElementById('modalPermissoes').classList.add('hidden');
            });
        }

        const btnAprovarModal = document.getElementById('btnAprovarModal');
        const btnRejeitarModal = document.getElementById('btnRejeitarModal');

        if (btnAprovarModal) {
            btnAprovarModal.addEventListener('click', async () => {
                if (!w.comprovanteAtualId && !w.comprovanteRifaItemAtual) return;
                if (!confirm("Aprovar este comprovante e confirmar a baixa do pagamento?")) return;

                const btnHtml = btnAprovarModal.innerHTML;
                btnAprovarModal.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
                btnAprovarModal.disabled = true;
                if (btnRejeitarModal) btnRejeitarModal.disabled = true;

                try {
                    if (w.comprovanteRifaItemAtual) {
                        const item = w.comprovanteRifaItemAtual;
                        const { error: err1 } = await supabaseClient
                            .from('rifa_numeros')
                            .update({ status_pagamento: 'aprovado' })
                            .eq('id', item.id);
                        if (err1) throw err1;

                        const { error: err2 } = await supabaseClient.from('caixa_terreiro').insert([{
                            terreiro_id: idTerreiroGlobal,
                            tipo_transacao: 'RIFA',
                            descricao: `Venda Rifa - ${item.subtitulo} (${item.nome})`,
                            valor: item.valor,
                            metodo_pagamento: 'pix',
                            pagador_nome: item.nome,
                            status: 'pago',
                            referencia_id: item.id
                        }]);
                        if (err2) throw err2;

                        alert("✅ Pagamento da Rifa aprovado com sucesso!");
                        window.fecharModalVerComprovante();
                        carregarValidadorPagamentos();

                        if (window.rifaAtivaId && typeof abrirCartelaAdmin === 'function') {
                            const tituloAtual = document.getElementById('cartelaTituloRifa').textContent;
                            const qtdNum = document.querySelectorAll('#gridNumerosRifa button').length;
                            abrirCartelaAdmin(window.rifaAtivaId, tituloAtual, qtdNum, item.valor);
                        }
                    } else if (w.comprovanteAtualId) {
                        const { data: comp, error: errComp } = await supabaseClient
                            .from('comprovantes_mensalidade')
                            .select('detalhes_pagamento')
                            .eq('id', w.comprovanteAtualId)
                            .eq('terreiro_id', idTerreiroGlobal)
                            .single();

                        if (errComp) throw errComp;

                        let upserts = [];
                        if (comp.detalhes_pagamento && Array.isArray(comp.detalhes_pagamento)) {
                            comp.detalhes_pagamento.forEach(det => {
                                if (det.meses && Array.isArray(det.meses)) {
                                    det.meses.forEach(mes => {
                                        upserts.push({
                                            medium_id: det.medium_id,
                                            mes: mes,
                                            ano: det.ano,
                                            pago: true,
                                            isento: false,
                                            origem: 'pix_sistema'
                                        });
                                    });
                                }
                            });
                        }

                        if (upserts.length > 0) {
                            const { error: errUpsert } = await supabaseClient
                                .from('financeiro')
                                .upsert(upserts, { onConflict: 'medium_id,mes,ano' });
                            if (errUpsert) throw errUpsert;
                        }

                        const { error: errStatus } = await supabaseClient
                            .from('comprovantes_mensalidade')
                            .update({ status: 'aprovado' })
                            .eq('id', window.comprovanteAtualId)
                            .eq('terreiro_id', idTerreiroGlobal);
                        if (errStatus) throw errStatus;

                        alert("✅ Comprovante aprovado com sucesso! Baixas realizadas.");
                        window.fecharModalVerComprovante();
                        carregarValidadorPagamentos();
                    }
                } catch (err) {
                    console.error(err);
                    alert("Erro ao aprovar comprovante: " + err.message);
                } finally {
                    btnRejeitarModal.innerHTML = btnHtml;
                    btnRejeitarModal.disabled = false;
                    if (btnAprovarModal) btnAprovarModal.disabled = false;
                }
            });
        }

        if (btnRejeitarModal) {
            btnRejeitarModal.addEventListener('click', async () => {
                if (!window.comprovanteAtualId) return;
                if (!confirm("Rejeitar este comprovante? As mensalidades continuarão pendentes.")) return;

                const btnHtml = btnRejeitarModal.innerHTML;
                btnRejeitarModal.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rejeitando...';
                btnRejeitarModal.disabled = true;

                try {
                    const { error } = await supabaseClient
                        .from('comprovantes_mensalidade')
                        .update({ status: 'rejeitado' })
                        .eq('id', window.comprovanteAtualId)
                        .eq('terreiro_id', idTerreiroGlobal);

                    if (error) throw error;
                    
                    alert("Comprovante rejeitado.");
                    window.fecharModalVerComprovante();
                    carregarValidadorPagamentos();
                } catch (err) {
                    console.error(err);
                    alert("Erro ao rejeitar comprovante: " + err.message);
                } finally {
                    btnRejeitarModal.innerHTML = btnHtml;
                    btnRejeitarModal.disabled = false;
                }
            });
        }

        if (document.getElementById('formConfigMensalidade')) {
            document.getElementById('formConfigMensalidade').addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('btnSalvarConfigMensalidade');
                const msg = document.getElementById('msgConfigMensalidade');
                
                btn.disabled = true; 
                btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando configurações...';
                if (msg) msg.classList.add('hidden');
                
                try {
                    let gateway = 'manual';
                    document.getElementsByName('gatewayPagamento').forEach(r => { if(r.checked) gateway = r.value; });
                    
                    const chavePix = document.getElementById('chavePixManual') ? document.getElementById('chavePixManual').value.trim() : '';
                    const asaasKey = document.getElementById('asaasApiKey') ? document.getElementById('asaasApiKey').value.trim() : '';
                                                          
                    const { error: errT } = await supabaseClient.from('terreiros').update({
                        gateway_pagamento: gateway, 
                        chave_pix_manual: chavePix, 
                        asaas_api_key: asaasKey
                    }).eq('id', idTerreiroGlobal);
                    
                    if (errT) throw errT;
                    
                    const inputs = document.querySelectorAll('.input-valor-grau');
                    const upserts = Array.from(inputs).map(inp => {
                        return { terreiro_id: idTerreiroGlobal, grau: inp.getAttribute('data-grau'), valor: parseFloat(inp.value) || 0 };
                    });
                    
                    if(upserts.length > 0){
                        const { error: errM } = await supabaseClient.from('config_mensalidades').upsert(upserts, { onConflict: 'terreiro_id,grau' });
                        if(errM) throw errM;
                    }
                    
                    if (msg) {
                        msg.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Configurações e subconta Asaas salvas com sucesso!';
                        msg.className = 'text-sm text-green-600 block mb-4 border border-green-200 bg-green-50 p-2 rounded';
                        msg.classList.remove('hidden');
                        setTimeout(() => msg.classList.add('hidden'), 5000);
                    }
                } catch(error) {
                    if (msg) {
                        msg.textContent = '❌ Erro: ' + error.message;
                        msg.className = 'text-sm text-red-600 block mb-4 border border-red-200 bg-red-50 p-2 rounded';
                        msg.classList.remove('hidden');
                    }
                } finally {
                    btn.disabled = false; 
                    btn.innerHTML = '<i class="fas fa-save"></i> Salvar Tesouraria';
                }
            });
        }

        setTimeout(() => {
            const btnPDFDoacoes = document.getElementById('btnGerarPDF_doacoes');
            if (btnPDFDoacoes) {
                const novoBtn = btnPDFDoacoes.cloneNode(true);
                btnPDFDoacoes.parentNode.replaceChild(novoBtn, btnPDFDoacoes);

                novoBtn.addEventListener('click', () => {
                    if (!window.dadosDoacoesParaPDF || !window.dadosDoacoesParaPDF.doacoes || window.dadosDoacoesParaPDF.doacoes.length === 0) {
                        alert('Nenhuma doação registrada para exportar.');
                        return;
                    }

                    const { doacoes, mediuns, itens } = window.dadosDoacoesParaPDF;
                    const dados = doacoes.map(d => {
                        const mdEncontrado = mediuns?.find(m => m.auth_id === d.medium_auth_id || String(m.id) === String(d.medium_auth_id));
                        const medium = mdEncontrado ? mdEncontrado.nome_completo : 'Médium Desconhecido';
                        const itemObj = itens?.find(i => String(i.id) === String(d.item_id));
                        const itemNome = itemObj ? itemObj.nome : 'Item Desconhecido';
                        const dataFormatada = new Date(d.data_registro).toLocaleDateString('pt-BR');
                        const status = d.entregue ? 'Entregue' : 'Pendente';
                        return [medium, itemNome, String(d.quantidade), dataFormatada, status];
                    });

                    const btnPDFCantina = document.getElementById('btnGerarPDF_cantina');
            if (btnPDFCantina) {
                const novoBtnCantina = btnPDFCantina.cloneNode(true);
                btnPDFCantina.parentNode.replaceChild(novoBtnCantina, btnPDFCantina);

                novoBtnCantina.addEventListener('click', () => {
                    if (!window.dadosCantinaParaPDF || !window.dadosCantinaParaPDF.doacoes || window.dadosCantinaParaPDF.doacoes.length === 0) {
                        alert('Nenhum pedido da cantina para exportar.');
                        return;
                    }

                    const { doacoes, mediuns, itens } = window.dadosCantinaParaPDF;
                    const dados = doacoes.map(d => {
                        const mdEncontrado = mediuns?.find(m => m.auth_id === d.medium_auth_id || String(m.id) === String(d.medium_auth_id));
                        const medium = mdEncontrado ? mdEncontrado.nome_completo : 'Médium Desconhecido';
                        const itemObj = itens?.find(i => String(i.id) === String(d.item_id));
                        const itemNome = itemObj ? itemObj.nome : 'Item Desconhecido';
                        const dataFormatada = new Date(d.data_registro).toLocaleDateString('pt-BR');
                        const status = d.entregue ? 'Entregue' : 'Pendente';
                        return [medium, itemNome, String(d.quantidade), dataFormatada, status];
                    });

                    dados.sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));

                    window.gerarPDFRelatorio('Relatório de Pedidos da Cantina', ['Médium / Cliente', 'Produto', 'Qtd', 'Data', 'Status'], dados);
                });
            }

                    dados.sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));

                    window.gerarPDFRelatorio('Relatório de Doações Registradas', ['Médium', 'Item', 'Qtd', 'Data', 'Status'], dados);
                });
            }
        }, 800);

        async function carregarPainelInicial() {
            if(!idTerreiroGlobal) return; 
            
            try {
                // 1. Total Cadastrados
                const { count: totalMediuns } = await supabaseClient.from('mediuns')
                    .select('*', { count: 'exact', head: true })
                    .eq('terreiro_id', idTerreiroGlobal)
                    .neq('nome_completo', 'Administrador Sistema');
                    
                const elTotalMed = document.getElementById('totalMediuns');
                if (elTotalMed) elTotalMed.textContent = totalMediuns || '0';

                // 2. Próximo Evento (Gira)
                const agora = new Date().toISOString();
                const { data: agendaData } = await supabaseClient.from('agenda').select('*').eq('terreiro_id', idTerreiroGlobal).gte('data_hora_fim', agora).order('data_hora_inicio').limit(1);

                let giraAtualId = null;
                const elProxGira = document.getElementById('proximaGira');

                if (agendaData && agendaData.length > 0) {
                    giraAtualId = agendaData[0].id;
                    const dataObj = new Date(agendaData[0].data_hora_inicio);
                    const dataGira = dataObj.toLocaleString('pt-BR', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit' 
                    });
                    const badgeRestrita = agendaData[0].especial ? '<span class="ml-2 bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider relative -top-0.5">Restrita</span>' : '';
                    if (elProxGira) elProxGira.innerHTML = `${agendaData[0].titulo} ${badgeRestrita} <br><span class="text-[11px] font-bold text-purple-600 mt-1 block">${dataGira}</span>`;
                } else {
                    if (elProxGira) elProxGira.textContent = 'Nenhum evento agendado';
                }

                // 3. Tabela de Presenças Hoje
                const tabelaPresencas = document.getElementById('tabelaPresencas');
                const { data: todosMediuns } = await supabaseClient.from('mediuns').select('id, auth_id, nome_completo, nome_social, grau, funcao, status_ativo').eq('terreiro_id', idTerreiroGlobal);

                if (giraAtualId) {
                    const { data: presencas } = await supabaseClient.from('presencas').select('usuario_id, data_hora_checkin').eq('evento_id', giraAtualId).order('data_hora_checkin', { ascending: false });
                    
                    const elTotPres = document.getElementById('totalPresentes');
                    if (elTotPres) elTotPres.textContent = presencas ? presencas.length : '0';

                    if (tabelaPresencas) {
                        if (presencas && presencas.length > 0) {
                            let arrayPresencasVisuais = [];
                            
                            presencas.forEach(p => {
                                const md = todosMediuns?.find(m => m.auth_id === p.usuario_id || String(m.id) === String(p.usuario_id));
                                if (md && md.status_ativo === false) return;
                                const nome = md ? md.nome_completo : 'Médium Excluído';
                                const hora = new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                arrayPresencasVisuais.push({ nome, hora });
                            });

                            arrayPresencasVisuais.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

                            tabelaPresencas.innerHTML = ''; 
                            arrayPresencasVisuais.forEach(p => {
                                tabelaPresencas.innerHTML += `
                                    <tr class="border-b border-gray-50 hover:bg-gray-50 transition">
                                        <td class="p-3 text-xs text-gray-800 font-bold">${p.nome}</td>
                                        <td class="p-3 text-xs text-gray-600 text-center font-mono">${p.hora}</td>
                                    </tr>
                                `;
                            });
                        } else {
                            tabelaPresencas.innerHTML = `<tr><td colspan="2" class="p-6 text-center text-gray-400 text-xs">Nenhum check-in ainda.</td></tr>`;
                        }
                    }
                } else {
                    const elTotPres = document.getElementById('totalPresentes');
                    if (elTotPres) elTotPres.textContent = '0';
                    if(tabelaPresencas) tabelaPresencas.innerHTML = `<tr><td colspan="2" class="p-6 text-center text-gray-400 text-xs">Nenhum evento agendado para o momento.</td></tr>`;
                }

                // 4. Carregar Select de Relatório Avulso
                const selectRelatorio = document.getElementById('selectEventoRelatorio');
                const btnGerarHistorico = document.getElementById('btnBaixarPdfEvento');

                if (selectRelatorio) {
                    const { data: historicoEventosRaw } = await supabaseClient
                        .from('agenda')
                        .select('id, titulo, tipo, data_hora_inicio, especial')
                        .eq('terreiro_id', idTerreiroGlobal)
                        .order('data_hora_inicio', { ascending: false });

                    const historicoEventos = (historicoEventosRaw || []).filter(ev => ev.tipo !== 'informativo');

                    selectRelatorio.innerHTML = '<option value="">Selecione um evento...</option>';
                    
                    if (historicoEventos.length > 0) {
                        historicoEventos.forEach(ev => {
                            const dataFormatada = new Date(ev.data_hora_inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                            const tipoEvento = ev.especial ? ' [Restrita]' : ' [Aberta]';
                            selectRelatorio.innerHTML += `<option value="${ev.id}">${dataFormatada} - ${ev.titulo}${tipoEvento}</option>`;
                        });
                    } else {
                        selectRelatorio.innerHTML = '<option value="">Nenhum evento encontrado no histórico.</option>';
                    }
                }

                if (btnGerarHistorico && selectRelatorio && btnGerarHistorico.parentNode) {
                    const novoBtn = btnGerarHistorico.cloneNode(true);
                    btnGerarHistorico.parentNode.replaceChild(novoBtn, btnGerarHistorico);

                    novoBtn.addEventListener('click', async () => {
                        const eventoIdSelecionado = selectRelatorio.value;
                        if (!eventoIdSelecionado) {
                            alert('Por favor, selecione um evento na lista antes de clicar em Baixar.');
                            return;
                        }

                        const originalHtml = novoBtn.innerHTML;
                        novoBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Gerando Documento...';
                        novoBtn.disabled = true;

                        try {
                            const textoOption = selectRelatorio.options[selectRelatorio.selectedIndex].text;
                            const tituloEvStr = textoOption.split(' - ')[1] || 'Evento';

                            const { data: presencasHist } = await supabaseClient
                                .from('presencas')
                                .select('usuario_id, data_hora_checkin')
                                .eq('evento_id', eventoIdSelecionado);

                            if (!presencasHist || presencasHist.length === 0) {
                                alert('Nenhum check-in foi registrado para este evento.');
                                return;
                            }

                            const dadosParaPDF = [];
                            presencasHist.forEach(p => {
                                const md = todosMediuns?.find(m => m.auth_id === p.usuario_id || String(m.id) === String(p.usuario_id));
                                const nome = md ? md.nome_completo : 'Médium Excluído';
                                const hora = new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                
                                let cargoExibicao = '-';
                                if (md) {
                                    const g = md.grau && md.grau !== '-' ? md.grau : '';
                                    const f = md.funcao && md.funcao !== '-' ? md.funcao : '';
                                    if (g && f) cargoExibicao = `${g}/${f}`;
                                    else cargoExibicao = g || f || '-';
                                }
                                
                                dadosParaPDF.push([nome, cargoExibicao, hora]);
                            });

                            dadosParaPDF.sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));

                            window.gerarPDFRelatorio(
                                `Relação de Presentes - ${tituloEvStr}`, 
                                ['Nome Completo', 'Grau / Função', 'Hora Check-in'], 
                                dadosParaPDF
                            );

                        } catch (error) {
                            console.error('Erro na geração da relação de presença:', error);
                            alert('Erro inesperado ao gerar o relatório.');
                        } finally {
                            novoBtn.innerHTML = originalHtml;
                            novoBtn.disabled = false;
                        }
                    });
                }

                // 5. WIDGET: Pagamentos Pendentes
                const widgetPendencias = document.getElementById('widgetQtdPendencias');
                if (widgetPendencias) {
                    const { count: countMensalidades } = await supabaseClient.from('comprovantes_mensalidade')
                        .select('*', { count: 'exact', head: true })
                        .eq('terreiro_id', idTerreiroGlobal)
                        .eq('status', 'pendente');
                        
                    const { count: countCaixa } = await supabaseClient.from('caixa_terreiro')
                        .select('*', { count: 'exact', head: true })
                        .eq('terreiro_id', idTerreiroGlobal)
                        .eq('status', 'pendente');

                    const { count: countRifas } = await supabaseClient.from('rifa_numeros')
                        .select('*', { count: 'exact', head: true })
                        .eq('terreiro_id', idTerreiroGlobal)
                        .eq('status_pagamento', 'pendente')
                        .not('comprovante_url', 'is', null)
                        .neq('comprovante_url', '');

                    const totalPendencias = (countMensalidades || 0) + (countCaixa || 0) + (countRifas || 0);
                    widgetPendencias.textContent = totalPendencias;
                }

                // 6. WIDGET: Rifas Ativas
                const widgetRifas = document.getElementById('widgetQtdRifas');
                if (widgetRifas) {
                    const { count: totalRifas } = await supabaseClient.from('rifas')
                        .select('*', { count: 'exact', head: true })
                        .eq('terreiro_id', idTerreiroGlobal)
                        .eq('status', 'aberta');
                        
                    widgetRifas.textContent = totalRifas || '0';
                }

            } catch (err) {
                console.error('Erro ao carregar painel inicial:', err);
            }
        }

        async function carregarQuadroMediuns() {
            if(!idTerreiroGlobal) return;
            const tbody = document.getElementById('tabelaTodosMediuns');
            if (!tbody) return;
            
            // Loading Skeleton Moderno
            let skeletonHtml = '';
            for(let i=0; i<5; i++) {
                skeletonHtml += `
                    <tr class="animate-pulse border-b border-gray-100">
                        <td class="p-4"><div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div><div class="h-2 bg-gray-100 rounded w-1/2"></div></td>
                        <td class="p-4"><div class="h-4 bg-gray-200 rounded w-full"></div></td>
                        <td class="p-4"><div class="h-4 bg-gray-200 rounded w-2/3"></div></td>
                        <td class="p-4"><div class="h-4 bg-gray-200 rounded w-full"></div></td>
                        <td class="p-4 text-center"><div class="h-6 bg-gray-200 rounded-full w-16 mx-auto"></div></td>
                        <td class="p-4 text-center"><div class="flex justify-center gap-3"><div class="h-6 w-6 bg-gray-200 rounded-full"></div><div class="h-6 w-6 bg-gray-200 rounded-full"></div><div class="h-6 w-6 bg-gray-200 rounded-full"></div></div></td>
                    </tr>
                `;
            }
            tbody.innerHTML = skeletonHtml;
            try {
                const { data, error } = await supabaseClient
                .from('mediuns')
                .select('id, nome_completo, nome_social, data_nascimento, grau, funcao, telefone, palavra, cadastro_completo, is_admin, perm_agenda, perm_grau, perm_financeiro, perm_doacoes, perm_admin, perm_visao_geral, perm_ata, perm_quadro_mediuns, perm_guias, perm_ia, status_ativo, isento_mensalidade, perm_escalas, cpf, estado_civil, profissao, emergencia_nome, emergencia_telefone, tipo_sanguineo, possui_plano_saude, qual_plano_saude, comorbidades_alergias')
                .eq('terreiro_id', idTerreiroGlobal)
                .neq('nome_completo', 'Administrador Sistema')
                .order('nome_completo');
                
                if (error) throw error;

                if (data) {
                    data.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'));
                }

                listaMediunsGlobal = data || [];
                window.aplicarFiltrosMediuns();
                renderizarAniversariantes(listaMediunsGlobal);
                
            } catch (err) {
                console.error('Erro ao buscar:', err);
                tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-red-500 font-bold">Erro ao carregar dados.</td></tr>`;
            }
        }

        function renderizarTabelaMediuns(lista) {
            const tbody = document.getElementById('tabelaTodosMediuns');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500 font-medium">Nenhum médium encontrado com estes filtros.</td></tr>';
                return;
            }

            lista.forEach(m => {
                let dataNascFormatada = '-';
                if (m.data_nascimento) {
                    if (m.data_nascimento.includes('-')) {
                        const partes = m.data_nascimento.split('-');
                        if(partes.length === 3) dataNascFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
                    } else {
                        dataNascFormatada = m.data_nascimento; 
                    }
                }

                const cargo = [m.grau, m.funcao].filter(Boolean).join(' / ') || '-';
                
                let status = m.cadastro_completo ? '<span class="text-green-600 font-bold">Ativo</span>' : '<span class="text-yellow-600 font-bold">Pendente</span>';
                if (m.status_ativo === false) {
                    status = '<span class="text-red-600 font-bold">Inativo</span>';
                }
                
                let acoesHtml = '<span class="text-gray-400 text-xs">Sem acesso</span>';
                
                if (perfilAdminLogado && perfilAdminLogado.is_admin) {
                    const perms = `${m.perm_agenda || false},${m.perm_grau || false},${m.perm_financeiro || false},${m.perm_doacoes || false},${m.perm_admin || false},${m.perm_visao_geral || false},${m.perm_ata || false},${m.perm_quadro_mediuns || false},${m.perm_guias || false},${m.perm_ia || false},${m.perm_escalas || false}`;
                    
                    const isAtivo = m.status_ativo !== false;
                    const iconInativar = isAtivo ? 'fa-user-times' : 'fa-user-check';
                    const colorInativar = isAtivo ? 'text-orange-500 hover:text-orange-700' : 'text-green-500 hover:text-green-700';
                    const titleInativar = isAtivo ? 'Inativar Médium' : 'Reativar Médium';
                    
                    acoesHtml = `
                        <div class="flex items-center justify-center space-x-4">
                            <button onclick="alternarStatusAtivoMedium(${m.id}, ${isAtivo})" class="${colorInativar} transition" title="${titleInativar}"><i class="fas ${iconInativar}"></i></button>
                            <button onclick="abrirModalEditarMedium(${m.id})" class="text-purple-500 hover:text-purple-700 transition" title="Editar Médium"><i class="fas fa-user-edit"></i></button>
                            <button onclick="abrirModalPermissoes(${m.id}, '${m.nome_completo.replace(/'/g, "\\'")}', '${perms}')" class="text-blue-500 hover:text-blue-700 transition" title="Permissões de Acesso"><i class="fas fa-key"></i></button>
                            <button onclick="excluirMedium(${m.id}, '${m.nome_completo.replace(/'/g, "\\'")}')" class="text-red-500 hover:text-red-700 transition" title="Excluir Médium"><i class="fas fa-trash"></i></button>
                        </div>
                    `;
                }

                let linkWhats = '-';
                if (m.telefone) {
                    const numeroLimpo = m.telefone.replace(/\D/g, '');
                    const ddi = numeroLimpo.startsWith('55') ? '' : '55';
                    linkWhats = `<a href="https://wa.me/${ddi}${numeroLimpo}" target="_blank" class="text-green-600 hover:text-green-700 hover:underline inline-flex items-center gap-1 font-medium" title="Chamar no WhatsApp"><i class="fab fa-whatsapp text-lg"></i> ${m.telefone}</a>`;
                }

                const temDadosMedicos = Boolean(m.emergencia_telefone || m.emergencia_nome || m.comorbidades_alergias || m.qual_plano_saude || m.tipo_sanguineo);
                if (temDadosMedicos) {
                    linkWhats += `
                        <button type="button" onclick="verFichaEmergencia(${m.id})" class="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-300 transition shadow-sm active:scale-95" title="Ficha Médica e Contato de Emergência">
                            <i class="fas fa-notes-medical"></i> SOS
                        </button>
                    `;
                }

                // Identificação visual de permissões ativas
                const badgesPermissao = (() => {
                    if (m.is_admin === true || m.is_master === true) {
                        return `
                            <div class="flex flex-wrap gap-1 mt-1.5">
                                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-sm">
                                    <i class="fas fa-crown text-[9px] text-amber-600"></i> Admin Geral
                                </span>
                            </div>
                        `;
                    }

                    const b = [];
                    if (m.perm_visao_geral) b.push('<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Visão Geral</span>');
                    if (m.perm_quadro_mediuns) b.push('<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Quadro</span>');
                    if (m.perm_guias) b.push('<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200">Guias</span>');
                    if (m.perm_ia) b.push('<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-200"><i class="fas fa-brain mr-1"></i> IA</span>'); // NOVA LINHA AQUI
                    if (m.perm_agenda) b.push('<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Agenda</span>');
                    if (m.perm_ata) b.push('<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-200">Livro Ata</span>');
                    if (m.perm_grau) b.push('<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">Graus</span>');
                    if (m.perm_financeiro) b.push('<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Financeiro</span>');
                    if (m.perm_doacoes) b.push('<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Campanhas</span>');
                    if (m.perm_admin) b.push('<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Config Casa</span>');
                    if (m.perm_escalas) b.push('<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">Escalas</span>');


                    return b.length > 0 ? `<div class="flex flex-wrap gap-1 mt-1.5 max-w-[280px]">${b.join('')}</div>` : '';
                })();

                const socialHtml = m.nome_social 
                    ? `<span class="text-[10px] text-gray-500 block">Social: ${m.nome_social}</span>` 
                    : '';

                const nomeHtml = `
                    <div class="font-bold text-gray-800 leading-snug">${m.nome_completo}</div>
                    ${socialHtml}
                    ${badgesPermissao}
                `;

                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50 transition-colors group">
                        <td class="p-4 align-top">${nomeHtml}</td>
                        <td class="p-4 text-gray-600 text-center whitespace-nowrap align-top">${dataNascFormatada}</td>
                        <td class="p-4 text-gray-600 whitespace-nowrap align-top">${cargo}</td>
                        <td class="p-4 text-gray-600 align-top">${linkWhats}</td>
                        <td class="p-4 text-center align-top">${status}</td>
                        <td class="p-4 text-center no-print align-top">${acoesHtml}</td>
                    </tr>`;
            });
        }

        function renderizarAniversariantes(lista) {
            const ul = document.getElementById('listaAniversariantes');
            const titulo = document.getElementById('tituloAniversariantesMes');
            if (!ul) return;

            const dataAtual = new Date();
            const mesAtualNum = (dataAtual.getMonth() + 1).toString().padStart(2, '0');
            const nomeMesAtual = dataAtual.toLocaleString('pt-BR', { month: 'long' });
            
            if(titulo) titulo.textContent = `Aniversariantes de ${nomeMesAtual.charAt(0).toUpperCase() + nomeMesAtual.slice(1)}`;

            const aniversariantes = lista.filter(m => {
                if (!m.data_nascimento) return false;
                let mesNasc = '';
                if (m.data_nascimento.includes('-')) mesNasc = m.data_nascimento.split('-')[1];
                else if (m.data_nascimento.includes('/')) mesNasc = m.data_nascimento.split('/')[1];
                return mesNasc === mesAtualNum;
            });

            aniversariantes.sort((a, b) => {
                let diaA = 0, diaB = 0;
                if(a.data_nascimento.includes('-')) diaA = parseInt(a.data_nascimento.split('-')[2]);
                if(b.data_nascimento.includes('-')) diaB = parseInt(b.data_nascimento.split('-')[2]);
                return diaA - diaB;
            });

            window.aniversariantesAtuais = aniversariantes; 

            ul.innerHTML = '';

            if (aniversariantes.length === 0) {
                ul.innerHTML = `
                    <li class="p-6 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                        <i class="fas fa-calendar-times text-2xl mb-1"></i>
                        <span class="text-sm">Nenhum médium faz aniversário<br>neste mês.</span>
                    </li>`;
                return;
            }

            aniversariantes.forEach(m => {
                let dia = '00';
                let mes = '00';
                if (m.data_nascimento.includes('-')) {
                    const p = m.data_nascimento.split('-');
                    dia = p[2]; mes = p[1];
                }

                const nomeExibicao = m.nome_social ? m.nome_social : (m.nome_completo ? m.nome_completo.split(' ')[0] : 'Médium');

                ul.innerHTML += `
                    <li class="p-3 hover:bg-gray-50 flex items-center justify-between transition-colors border-l-4 border-transparent hover:border-blue-500">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-extrabold shadow-inner border border-blue-200">
                                ${dia}
                            </div>
                            <div>
                                <p class="text-sm font-bold text-gray-800">${nomeExibicao}</p>
                                <p class="text-[10px] text-gray-500 uppercase">${m.grau || 'Médium'}</p>
                            </div>
                        </div>
                        <span class="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded shadow-sm">${dia}/${mes}</span>
                    </li>
                `;
            });
        }

        window.aplicarFiltrosMediuns = () => {
    const nomeFiltro = (document.getElementById('filtroNomeMedium')?.value || '').trim().toLowerCase();
    const grauFiltro = (document.getElementById('filtroGrauMedium')?.value || '').trim().toUpperCase();
    const statusFiltro = (document.getElementById('filtroStatusMedium')?.value || '').trim().toLowerCase();
    const permFiltro = (document.getElementById('filtroPermissaoMedium')?.value || '').trim();
    const mesFiltro = (document.getElementById('filtroMesNascimento')?.value || '').trim();

    const filtrados = (listaMediunsGlobal || []).filter(m => {
        // 1. Filtro por Nome Completo ou Social
        if (nomeFiltro) {
            const nomeComp = (m.nome_completo || '').toLowerCase();
            const nomeSoc = (m.nome_social || '').toLowerCase();
            if (!nomeComp.includes(nomeFiltro) && !nomeSoc.includes(nomeFiltro)) {
                return false;
            }
        }

        // 2. Filtro por Grau / Função
        if (grauFiltro && grauFiltro !== 'TODOS' && grauFiltro !== 'TODOS OS GRAUS') {
            const grau = (m.grau || '').trim().toUpperCase();
            const funcao = (m.funcao || '').trim().toUpperCase();
            const cargoCompleto = `${grau} ${funcao}`.trim();

            if (['I', 'B', 'T', 'SCT', 'CT', 'CCT', 'DIRIGENTE'].includes(grauFiltro)) {
                const bateGrau = grau === grauFiltro || grau.split(' ').includes(grauFiltro);
                const bateFuncao = funcao === grauFiltro || funcao.split(' ').includes(grauFiltro);
                if (!bateGrau && !bateFuncao) return false;
            } else {
                if (!cargoCompleto.includes(grauFiltro)) return false;
            }
        }

        // 3. Filtro por Status (baseado nas colunas reais: status_ativo e cadastro_completo)
        if (statusFiltro && statusFiltro !== 'todos') {
            let statusMedium = 'pendente';
            if (m.status_ativo === false) {
                statusMedium = 'inativo';
            } else if (m.cadastro_completo) {
                statusMedium = 'ativo';
            }

            if (statusMedium !== statusFiltro) return false;
        }

        // 4. Filtro por Mês de Nascimento
        if (mesFiltro && mesFiltro !== 'todos') {
            const dataNasc = m.data_nascimento || '';
            if (!dataNasc) return false;

            let mesMedium = '';
            if (dataNasc.includes('-')) {
                mesMedium = dataNasc.split('-')[1];
            } else if (dataNasc.includes('/')) {
                mesMedium = dataNasc.split('/')[1];
            }

            if (parseInt(mesMedium, 10) !== parseInt(mesFiltro, 10)) {
                return false;
            }
        }

        // 5. Filtro por Permissões de Acesso
        if (permFiltro && permFiltro !== 'todos') {
            const temAlgumaPerm = m.is_admin === true || m.is_master === true ||
                m.perm_visao_geral === true || m.perm_quadro_mediuns === true ||
                m.perm_guias === true || m.perm_ia === true || m.perm_agenda === true ||
                m.perm_ata === true || m.perm_escalas === true || m.perm_grau === true ||
                m.perm_financeiro === true || m.perm_doacoes === true || m.perm_admin === true;

            if (permFiltro === 'com_acesso') {
                if (!temAlgumaPerm) return false;
            } else if (permFiltro === 'sem_acesso') {
                if (temAlgumaPerm) return false;
            } else if (permFiltro === 'is_admin') {
                if (m.is_admin !== true && m.is_master !== true) return false;
            } else {
                if (m[permFiltro] !== true && m.is_admin !== true && m.is_master !== true) return false;
            }
        }

        return true;
    });

    window.mediunsFiltrados = filtrados;
    renderizarTabelaMediuns(filtrados);
};
        async function carregarAgenda() {
            if(!idTerreiroGlobal) return;
            const tbody = document.getElementById('tabelaGirasCadastradas');
            if (!tbody) return;
            const agora = new Date().toISOString();
            const { data } = await supabaseClient.from('agenda').select('*').eq('terreiro_id', idTerreiroGlobal).gte('data_hora_fim', agora).order('data_hora_inicio').limit(15); 
            tbody.innerHTML = '';
            if(data && data.length > 0) {
                data.forEach(g => {
                    const inicio = new Date(g.data_hora_inicio).toLocaleString('pt-BR');
                    const imgHtml = g.imagem_url 
                        ? `<a href="${g.imagem_url}" target="_blank" class="text-blue-500 hover:bg-blue-50 p-1 rounded text-xs transition" title="Ver Cartaz"><i class="fas fa-image"></i> Cartaz</a>` 
                        : `<span class="text-gray-400 text-xs">-</span>`;
                    
                    let badgeEspecial = g.especial ? '<span class="ml-2 bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Restrita</span>' : '';
                    if (g.tipo === 'informativo') badgeEspecial += '<span class="ml-2 bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"><i class="fas fa-bullhorn mr-1"></i>Informe</span>';

                    const acoesBloco = `
                        <div class="flex items-center justify-center space-x-2">
                            ${imgHtml}
                            <div class="h-4 border-l border-gray-300 mx-2"></div>
                            <button onclick="abrirModalEditarGira('${g.id}')" class="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold py-1 px-2 rounded shadow transition" title="Editar Título/Hora"><i class="fas fa-edit"></i></button>
                            <button onclick="excluirGira('${g.id}', '${g.data_hora_inicio}')" class="text-xs bg-red-100 text-red-700 hover:bg-red-200 font-bold py-1 px-2 rounded shadow transition" title="Excluir Evento"><i class="fas fa-trash"></i></button>
                        </div>
                    `;

                    tbody.innerHTML += `
                        <tr class="border-b border-gray-100 hover:bg-gray-50">
                            <td class="p-3 text-gray-800 font-medium">${g.titulo} ${badgeEspecial}</td>
                            <td class="p-3 text-gray-600">${inicio}</td>
                            <td class="p-3 text-center">${acoesBloco}</td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center text-gray-500">Nenhum evento agendado no momento.</td></tr>';
            }
        }

        window.carregarLivroAta = async () => {
            if(!idTerreiroGlobal) return;
            const tbody = document.getElementById('tabelaLivroAta');
            if(!tbody) return;
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Buscando histórico de ATAs...</td></tr>';
            
            try {
                const { data, error } = await supabaseClient.from('agenda')
                    .select('id, titulo, data_hora_inicio, data_hora_fim, ata_encerrada, texto_ata')
                    .eq('terreiro_id', idTerreiroGlobal)
                    .eq('gera_ata', true)
                    .order('data_hora_inicio', { ascending: false }) 
                    .limit(50); 

                if (error) throw error;

                tbody.innerHTML = '';
                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Nenhum evento foi configurado para gerar ATA ainda.</td></tr>';
                    return;
                }

                const agora = new Date();

                data.forEach(g => {
                    g.status_encerrada = g.ata_encerrada;
                    if (!g.status_encerrada && g.data_hora_fim) {
                        const fim = new Date(g.data_hora_fim);
                        if (agora > fim) {
                            g.status_encerrada = true;
                            supabaseClient.from('agenda').update({ ata_encerrada: true }).eq('id', g.id).eq('terreiro_id', idTerreiroGlobal).then();
                        }
                    }
                });

                data.sort((a, b) => {
                    if (a.status_encerrada !== b.status_encerrada) return a.status_encerrada ? 1 : -1; 
                    const dataA = new Date(a.data_hora_inicio).getTime();
                    const dataB = new Date(b.data_hora_inicio).getTime();
                    if (!a.status_encerrada) return dataA - dataB;
                    else return dataB - dataA;
                });

                data.forEach(g => {
                    const inicio = new Date(g.data_hora_inicio).toLocaleString('pt-BR');
                    const encerrada = g.status_encerrada;
                    
                    const statusHtml = encerrada 
                        ? '<span class="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded font-bold"><i class="fas fa-lock mr-1"></i> Finalizada</span>' 
                        : '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold"><i class="fas fa-lock-open mr-1"></i> Em Aberto</span>';

                    let acoesHtml = '';
                    if (encerrada) {
                        acoesHtml = `<button onclick="gerarPDF_ATA('${g.id}')" class="text-xs bg-gray-800 hover:bg-gray-900 text-white font-bold py-1.5 px-3 rounded shadow transition"><i class="fas fa-file-pdf mr-1 text-red-400"></i> Baixar Documento</button>`;
                    } else {
                        const temTexto = g.texto_ata && g.texto_ata.trim() !== '';
                        const labelRedigir = temTexto ? '<i class="fas fa-edit"></i> Editar' : '<i class="fas fa-pen"></i> Redigir';
                        
                        acoesHtml = `
                            <div class="flex items-center justify-center space-x-2">
                                <button onclick="abrirModalEscreverAta('${g.id}')" class="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-bold py-1 px-3 rounded shadow transition" title="Redigir ATA">${labelRedigir}</button>
                                <button onclick="encerrarAta('${g.id}')" class="text-xs bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded shadow transition" title="Travar Check-ins e Gerar PDF"><i class="fas fa-check-double"></i> Encerrar e Gerar</button>
                            </div>
                        `;
                    }

                    tbody.innerHTML += `
                        <tr class="border-b border-gray-100 hover:bg-gray-50">
                            <td class="p-3 text-gray-800 font-medium">${g.titulo}</td>
                            <td class="p-3 text-gray-600 text-sm">${inicio}</td>
                            <td class="p-3 text-center">${statusHtml}</td>
                            <td class="p-3 text-center">${acoesHtml}</td>
                        </tr>
                    `;
                });
            } catch (error) {
                tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-red-500">Erro: ${error.message}</td></tr>`;
            }
        };

        async function carregarTabelaGraus() {
            if(!idTerreiroGlobal) return;
            const tbody = document.getElementById('tabelaGraus');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">Buscando...</td></tr>';
            const { data } = await supabaseClient.from('mediuns').select('id, nome_completo, nome_social, grau, funcao').eq('terreiro_id', idTerreiroGlobal).neq('nome_completo', 'Administrador Sistema').order('nome_completo');
            if (data) { mediunsGrauCache = data; renderizarGraus(data); }
        }

        function renderizarGraus(lista) {
            const tbody = document.getElementById('tabelaGraus');
            if (!tbody) return;
            tbody.innerHTML = '';
            
            // Oculta o cabeçalho original da tabela no celular
            const thead = document.querySelector('#tabelaGraus').closest('table').querySelector('thead');
            if(thead) {
                thead.classList.add('hidden', 'md:table-header-group');
            }

            lista.forEach(m => {
                const nomeStr = m.nome_completo;
                tbody.innerHTML += `
                    <tr class="block md:table-row border border-gray-200 md:border-0 border-b-gray-100 hover:bg-gray-50 transition p-4 md:p-0 bg-white mb-4 md:mb-0 rounded-xl md:rounded-none shadow-sm md:shadow-none">
                        
                        <!-- CAIXINHA DE SELEÇÃO (NOVA COLUNA DESKTOP) -->
                        <td class="hidden md:table-cell py-2 px-3 text-center align-middle">
                            <input type="checkbox" class="chk-medium-print w-4 h-4 rounded text-tema-primaria cursor-pointer" value="${m.id}">
                        </td>

                        <!-- NOME -->
                        <td class="block md:table-cell py-2 px-3 text-gray-800 font-bold text-base md:text-sm mb-3 md:mb-0 md:font-medium">
                            <div class="flex items-center gap-2">
                                <!-- CAIXINHA DE SELEÇÃO (CELULAR) -->
                                <input type="checkbox" class="md:hidden chk-medium-print w-5 h-5 rounded text-tema-primaria cursor-pointer" value="${m.id}">
                                
                                <div class="w-full">
                                    <span class="inline-block md:hidden text-[10px] text-gray-400 font-bold uppercase mb-1 w-full border-b border-gray-100 pb-1">Médium</span>
                                    ${nomeStr}
                                </div>
                            </div>
                        </td>
                        
                        <!-- GRAU -->
                        <td class="block md:table-cell py-2 px-3 mb-2 md:mb-0">
                            <div class="flex flex-col md:block">
                                <span class="inline-block md:hidden text-[10px] text-gray-500 font-bold uppercase mb-1">Grau</span>
                                <select id="grau_${m.id}" class="border border-gray-300 rounded md:rounded px-3 py-2 md:py-1 bg-white text-sm focus:ring-tema-primaria outline-none w-full md:max-w-[120px]">
                                    ${renderizarOpcoes(opcoesGrau, m.grau || '-')}
                                </select>
                            </div>
                        </td>
                        
                        <!-- FUNÇÃO -->
                        <td class="block md:table-cell py-2 px-3 mb-4 md:mb-0">
                            <div class="flex flex-col md:block">
                                <span class="inline-block md:hidden text-[10px] text-gray-500 font-bold uppercase mb-1">Função</span>
                                <select id="func_${m.id}" class="border border-gray-300 rounded md:rounded px-3 py-2 md:py-1 bg-white text-sm focus:ring-tema-primaria outline-none w-full md:max-w-[120px]">
                                    ${renderizarOpcoes(opcoesFuncao, m.funcao || '-')}
                                </select>
                            </div>
                        </td>
                        
                        <!-- AÇÃO (BOTÃO) -->
                        <td class="block md:table-cell py-2 px-3 text-center mt-2 md:mt-0">
                            <button onclick="salvarGrau(${m.id})" id="btnGrau_${m.id}" class="w-full md:w-auto bg-tema-primaria hover:opacity-90 text-white px-4 py-2.5 md:px-3 md:py-1 rounded md:rounded text-sm md:text-xs font-bold transition active:scale-95 flex items-center justify-center gap-2">
                                <i class="fas fa-save md:hidden"></i> Salvar
                            </button>
                        </td>
                        
                    </tr>
                `;
            });
        }

        if(document.getElementById('buscaMediumGrau')) {
            document.getElementById('buscaMediumGrau').addEventListener('input', (e) => {
                const termo = e.target.value.toLowerCase();
                const filtrado = mediunsGrauCache.filter(m => (m.nome_completo.toLowerCase().includes(termo) || (m.nome_social && m.nome_social.toLowerCase().includes(termo))));
                renderizarGraus(filtrado);
            });
        }

        window.carregarValidadorPagamentos = () => {
            carregarComprovantesPendentes();
            carregarHistoricoComprovantes();
        };

        async function carregarComprovantesPendentes() {
            if (!idTerreiroGlobal) return;
            const listaCards = document.getElementById('listaComprovantesPendentes');
            if (!listaCards) return;

            listaCards.innerHTML = '<div class="col-span-full p-8 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100"><i class="fas fa-spinner fa-spin mr-2 text-xl"></i> Buscando pendências financeiras...</div>';

            try {
                // 1. Busca Comprovantes de Mensalidade
                const { data: mensalidades } = await supabaseClient
                    .from('comprovantes_mensalidade')
                    .select('*')
                    .eq('terreiro_id', idTerreiroGlobal)
                    .eq('status', 'pendente')
                    .order('data_envio', { ascending: true });

                // 2. Busca Rifas Pendentes com Comprovante Anexado
                const { data: rifasPendentesRaw } = await supabaseClient
                    .from('rifa_numeros')
                    .select('*')
                    .eq('terreiro_id', idTerreiroGlobal)
                    .eq('status_pagamento', 'pendente');

                const { data: todasRifasCasa } = await supabaseClient
                    .from('rifas')
                    .select('id, titulo, valor_numero')
                    .eq('terreiro_id', idTerreiroGlobal);

                // 3. Busca Caixa Terreiro Pendentes (Doações, Cantina, etc.)
                const { data: caixaPendentes } = await supabaseClient
                    .from('caixa_terreiro')
                    .select('*')
                    .eq('terreiro_id', idTerreiroGlobal)
                    .eq('status', 'pendente')
                    .order('data_transacao', { ascending: true });

                const { data: mediuns } = await supabaseClient
                    .from('mediuns')
                    .select('auth_id, nome_completo, id')
                    .eq('terreiro_id', idTerreiroGlobal);

                const pendenciasGerais = [];

                // Formata Mensalidades
                (mensalidades || []).forEach(comp => {
                    const remetente = mediuns?.find(m => m.auth_id === comp.enviado_por)?.nome_completo || 'Médium Desconhecido';
                    pendenciasGerais.push({
                        tipoObj: 'mensalidade',
                        id: comp.id,
                        nomeExibicao: remetente,
                        descricao: 'Mensalidade com Comprovante Anexo',
                        valor: comp.valor_total,
                        data: comp.data_envio,
                        extra: comp 
                    });
                });

                // Formata Rifas com Comprovante Anexo
                const rifasComAnexo = (rifasPendentesRaw || []).filter(r => r.comprovante_url && r.comprovante_url.trim() !== '');
                rifasComAnexo.forEach(r => {
                    const dadosRifa = (todasRifasCasa || []).find(rf => String(rf.id) === String(r.rifa_id));
                    const valorUnit = dadosRifa ? (parseFloat(dadosRifa.valor_numero) || 0) : 0;
                    const tituloRifa = dadosRifa?.titulo || 'Rifa';
                    pendenciasGerais.push({
                        tipoObj: 'rifa_comprovante',
                        id: r.id,
                        nomeExibicao: r.nome_comprador || 'Comprador',
                        descricao: `[RIFA] ${tituloRifa} - Nº ${String(r.numero).padStart(2, '0')}`,
                        valor: valorUnit,
                        data: r.locked_at || new Date().toISOString(),
                        extra: {
                            tipo: 'rifa',
                            id: r.id,
                            referencia_id: r.rifa_id,
                            titulo: tituloRifa,
                            subtitulo: `Número: ${String(r.numero).padStart(2, '0')}`,
                            nome: r.nome_comprador || 'Comprador',
                            valor: valorUnit,
                            url: r.comprovante_url
                        }
                    });
                });

                // Formata Caixa (Doações, Cantina, etc.)
                (caixaPendentes || []).forEach(cx => {
                    pendenciasGerais.push({
                        tipoObj: 'caixa',
                        id: cx.id,
                        nomeExibicao: cx.pagador_nome || 'Visitante/Médium',
                        descricao: `[${cx.tipo_transacao}] ${cx.descricao}`,
                        valor: cx.valor,
                        data: cx.data_transacao,
                        extra: cx
                    });
                });

                pendenciasGerais.sort((a, b) => new Date(a.data) - new Date(b.data));

                if (pendenciasGerais.length === 0) {
                    listaCards.innerHTML = '<div class="col-span-full p-8 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100"><i class="fas fa-check-circle text-3xl text-green-300 mb-2 block"></i> Tudo em dia! Não há transações aguardando validação.</div>';
                    return;
                }

                listaCards.innerHTML = '';

                pendenciasGerais.forEach(item => {
                    const valFmt = Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    
                    let dataObj = new Date(item.data);
                    if (isNaN(dataObj)) dataObj = new Date();
                    
                    const dataEnvio = dataObj.toLocaleString('pt-BR', { 
                        timeZone: 'America/Sao_Paulo',
                        day: '2-digit', 
                        month: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });

                    let btnAcao = '';
                    let iconeCard = '';
                    let corBorda = '';

                    if (item.tipoObj === 'mensalidade') {
                        corBorda = 'border-t-yellow-400';
                        iconeCard = '<i class="fas fa-file-invoice text-yellow-500 mr-1.5"></i>';
                        const nomeSeguro = String(item.nomeExibicao).replace(/'/g, "\\'");
                        btnAcao = `<button onclick="abrirModalVerComprovante('${item.id}', '${item.extra.url_comprovante}', '${nomeSeguro} - ${valFmt}')" class="w-full bg-gray-800 hover:bg-gray-900 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition text-sm flex justify-center items-center gap-2">
                            <i class="fas fa-search"></i> Analisar Comprovante
                        </button>`;
                    } else if (item.tipoObj === 'rifa_comprovante') {
                        corBorda = 'border-t-indigo-500';
                        iconeCard = '<i class="fas fa-ticket-alt text-indigo-500 mr-1.5"></i>';
                        const jsonStr = JSON.stringify(item.extra).replace(/'/g, "\\'").replace(/"/g, "&quot;");
                        btnAcao = `<button onclick="abrirModalComprovante(JSON.parse('${jsonStr}'))" class="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition text-sm flex justify-center items-center gap-2">
                            <i class="fas fa-search-plus"></i> Analisar Comprovante Rifa
                        </button>`;
                    } else {
                        corBorda = 'border-t-blue-500';
                        let icn = 'fa-cash-register';
                        if(item.extra.tipo_transacao === 'RIFA') icn = 'fa-ticket-alt';
                        if(item.extra.tipo_transacao === 'CANTINA') icn = 'fa-hamburger';
                        if(item.extra.tipo_transacao === 'DOACAO') icn = 'fa-hand-holding-heart';

                        iconeCard = `<i class="fas ${icn} text-blue-500 mr-1.5"></i>`;
                        btnAcao = `
                            <div class="flex gap-2 w-full mt-1">
                                <button onclick="rejeitarCaixaPendente('${item.id}', '${item.extra.referencia_id}', '${item.extra.tipo_transacao}')" class="flex-1 bg-red-100 text-red-700 hover:bg-red-200 font-bold py-2.5 rounded-xl shadow-sm transition text-xs active:scale-95 border border-red-200">
                                    <i class="fas fa-times"></i> Rejeitar
                                </button>
                                <button onclick="aprovarCaixaPendente('${item.id}', '${item.extra.referencia_id}', '${item.extra.tipo_transacao}')" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl shadow-sm transition text-xs active:scale-95 flex items-center justify-center gap-1">
                                    <i class="fas fa-check"></i> Baixar PIX
                                </button>
                            </div>
                        `;
                    }

                    const card = `
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 border-t-4 ${corBorda} hover:shadow-md transition flex flex-col justify-between">
                            <div>
                                <div class="flex justify-between items-start mb-3">
                                    <h4 class="font-bold text-gray-800 text-sm truncate pr-2" title="${item.nomeExibicao}">${iconeCard} ${item.nomeExibicao}</h4>
                                    <span class="bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Pendente</span>
                                </div>
                                <div class="text-xs text-gray-600 mb-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                    <span class="font-bold text-gray-700">${item.descricao}</span>
                                </div>
                                <div class="flex justify-between items-end mb-4">
                                    <div>
                                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Lançado em</p>
                                        <p class="text-xs text-gray-600 font-medium">${dataEnvio}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Valor Total</p>
                                        <p class="text-lg font-black text-green-600 leading-none">${valFmt}</p>
                                    </div>
                                </div>
                            </div>
                            ${btnAcao}
                        </div>
                    `;
                    listaCards.innerHTML += card;
                });

            } catch (err) {
                console.error('Erro ao carregar pendentes:', err);
                listaCards.innerHTML = `<div class="col-span-full p-4 text-center text-red-500 text-sm font-bold border border-red-200 rounded-xl bg-red-50">Erro ao buscar pendências: ${err.message}</div>`;
            }
        }

        window.aprovarCaixaPendente = async (caixaId, referenciaId, tipoTransacao) => {
            if(!confirm("Confirmar que este PIX (Direto na Conta do Terreiro) já foi recebido e compensado?")) return;

            try {
                // 1. Atualiza o caixa para 'pago' e retorna a linha para sabermos quem foi o médium
                const { data: cxRow, error: err1 } = await supabaseClient
                    .from('caixa_terreiro')
                    .update({ status: 'pago' })
                    .eq('id', caixaId)
                    .select('*')
                    .single();
                if (err1) throw err1;

                // 2. Se for Rifa, dá baixa nos números para mudar a cor da cartela
                if (tipoTransacao === 'RIFA' && referenciaId && referenciaId !== 'null') {
                    const arrayIds = String(referenciaId).split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
                    if (arrayIds.length > 0) {
                        await supabaseClient.from('rifa_numeros').update({ status_pagamento: 'aprovado' }).in('id', arrayIds);
                    }
                } else if ((tipoTransacao === 'DOACAO' || tipoTransacao === 'CANTINA') && cxRow && cxRow.medium_responsavel_id) {
                    // Atualiza status_pagamento em doacoes_registradas do médium
                    const md = listaMediunsGlobal.find(m => m.id === cxRow.medium_responsavel_id);
                    if (md && md.auth_id) {
                        await supabaseClient.from('doacoes_registradas')
                            .update({ status_pagamento: 'aprovado' })
                            .eq('terreiro_id', idTerreiroGlobal)
                            .eq('medium_auth_id', md.auth_id)
                            .eq('status_pagamento', 'pendente');
                    }
                }

                alert("Pagamento confirmado com sucesso!");
                carregarValidadorPagamentos();
            } catch(e) {
                alert("Erro ao aprovar: " + e.message);
            }
        };

        window.rejeitarCaixaPendente = async (caixaId, referenciaId, tipoTransacao) => {
            if(!confirm("Tem certeza que deseja CANCELAR/REJEITAR esta reserva de pagamento? O registro de pendência será excluído.")) return;

            try {
                const { error: err1 } = await supabaseClient.from('caixa_terreiro').delete().eq('id', caixaId);
                if (err1) throw err1;

                if (tipoTransacao === 'RIFA' && referenciaId && referenciaId !== 'null') {
                    const arrayIds = String(referenciaId).split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
                    if (arrayIds.length > 0) {
                        await supabaseClient.from('rifa_numeros').delete().in('id', arrayIds);
                    }
                }

                alert("Transação pendente cancelada e removida com sucesso.");
                carregarValidadorPagamentos();
            } catch(e) {
                alert("Erro ao rejeitar: " + e.message);
            }
        };

        async function carregarHistoricoComprovantes() {
            if (!idTerreiroGlobal) return;
            const tbody = document.getElementById('tabelaComprovantesHistorico');
            if (!tbody) return;

            try {
                const { data: comprovantes } = await supabaseClient
                    .from('comprovantes_mensalidade')
                    .select('*')
                    .eq('terreiro_id', idTerreiroGlobal)
                    .neq('status', 'pendente')
                    .order('data_envio', { ascending: false }) 
                    .limit(10);

                const { data: caixaResolvidos } = await supabaseClient
                    .from('caixa_terreiro')
                    .select('*')
                    .eq('terreiro_id', idTerreiroGlobal)
                    .neq('status', 'pendente')
                    .order('data_transacao', { ascending: false })
                    .limit(10);

                const { data: mediuns } = await supabaseClient.from('mediuns').select('auth_id, nome_completo').eq('terreiro_id', idTerreiroGlobal);

                const historicoMisto = [];

                (comprovantes || []).forEach(comp => {
                    const remetente = mediuns?.find(m => m.auth_id === comp.enviado_por)?.nome_completo || 'Desconhecido';
                    let nomesInclusos = [];
                    let qtdMeses = 0;
                    if (comp.detalhes_pagamento && Array.isArray(comp.detalhes_pagamento)) {
                        comp.detalhes_pagamento.forEach(det => {
                            if (det.medium_nome && !nomesInclusos.includes(det.medium_nome)) nomesInclusos.push(det.medium_nome);
                            if (det.meses && Array.isArray(det.meses)) qtdMeses += det.meses.length;
                        });
                    }
                    const nomesExibicao = nomesInclusos.length > 0 ? nomesInclusos.join(', ') : remetente;
                    historicoMisto.push({
                        nome: nomesExibicao,
                        ref: qtdMeses > 0 ? `${qtdMeses} mes(es)` : 'Mensalidades',
                        valor: comp.valor_total,
                        status: comp.status,
                        data: comp.data_envio
                    });
                });

                (caixaResolvidos || []).forEach(cx => {
                    historicoMisto.push({
                        nome: cx.pagador_nome || 'Visitante/Médium',
                        ref: cx.tipo_transacao,
                        valor: cx.valor,
                        status: cx.status === 'pago' ? 'aprovado' : 'rejeitado',
                        data: cx.data_transacao
                    });
                });

                historicoMisto.sort((a, b) => new Date(b.data) - new Date(a.data));
                const finalHistorico = historicoMisto.slice(0, 15);

                if (finalHistorico.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500 text-xs">Nenhum histórico recente de validação.</td></tr>';
                    return;
                }

                tbody.innerHTML = '';
                finalHistorico.forEach(item => {
                    const valFmt = Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    let statusBadge = '';
                    if(item.status === 'aprovado') statusBadge = '<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold"><i class="fas fa-check mr-1"></i> Aprovado</span>';
                    else statusBadge = '<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold"><i class="fas fa-times mr-1"></i> Rejeitado</span>';

                    tbody.innerHTML += `
                        <tr class="hover:bg-gray-50">
                            <td class="p-3 text-[11px] font-medium text-gray-800 max-w-[150px] truncate" title="${item.nome}">${item.nome}</td>
                            <td class="p-3 text-[11px] text-gray-500">${item.ref}</td>
                            <td class="p-3 text-[11px] font-bold text-gray-800">${valFmt}</td>
                            <td class="p-3 text-center">${statusBadge}</td>
                        </tr>
                    `;
                });

            } catch (err) {
                console.error(err);
            }
        }

        window.comprovanteRifaItemAtual = null;

        window.abrirModalVerComprovante = (id, url, subtitulo) => {
            window.comprovanteAtualId = id;
            window.comprovanteRifaItemAtual = null;
            document.getElementById('modalComprovanteSubtitulo').textContent = subtitulo;
            
            const frame = document.getElementById('frameComprovante');
            const img = document.getElementById('imgComprovante');
            const loader = document.getElementById('loaderComprovante');
            
            if (loader) loader.classList.remove('hidden');
            if (frame) frame.classList.add('hidden');
            if (img) img.classList.add('hidden');
            
            if(url && url.toLowerCase().includes('.pdf')) {
                if(frame) {
                    frame.src = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
                    frame.classList.remove('hidden');
                }
            } else {
                if(img) {
                    img.src = url;
                    img.classList.remove('hidden');
                } else if(frame) { 
                    frame.src = url;
                    frame.classList.remove('hidden');
                }
            }
            
            document.getElementById('modalVerComprovante').classList.remove('hidden');
        };

        window.abrirModalComprovante = (item) => {
            window.comprovanteAtualId = null;
            window.comprovanteRifaItemAtual = item;
            const valFmt = Number(item.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('modalComprovanteSubtitulo').textContent = `${item.nome} - ${valFmt} (${item.subtitulo || ''})`;
            
            const frame = document.getElementById('frameComprovante');
            const img = document.getElementById('imgComprovante');
            const loader = document.getElementById('loaderComprovante');
            
            if (loader) loader.classList.remove('hidden');
            if (frame) frame.classList.add('hidden');
            if (img) img.classList.add('hidden');

            if (item.url && item.url.toLowerCase().includes('.pdf')) {
                if (frame) {
                    frame.src = `https://docs.google.com/viewer?url=${encodeURIComponent(item.url)}&embedded=true`;
                    frame.classList.remove('hidden');
                }
            } else if (img) {
                img.src = item.url;
                img.classList.remove('hidden');
            }
            document.getElementById('modalVerComprovante').classList.remove('hidden');
        };

        window.fecharModalVerComprovante = () => {
            document.getElementById('modalVerComprovante').classList.add('hidden');
            const frame = document.getElementById('frameComprovante');
            const img = document.getElementById('imgComprovante');
            
            if(frame) frame.src = '';
            if(img) img.src = '';
            window.comprovanteAtualId = null;
            window.comprovanteRifaItemAtual = null;
        };

        async function carregarFinanceiro(ano) {
            if(!idTerreiroGlobal) return;
            const anoBusca = ano || parseInt(document.getElementById('selectAnoFinanceiro').value);
            
            const tbody = document.getElementById('tabelaFinanceiro');
            const dashboard = document.getElementById('cardsMesesFinanceiro');
            if (!tbody) return;
            
            // Skeleton Tabela Financeira (Híbrido Mobile/Desktop)
            let skeletonFin = '';
            for(let i=0; i<4; i++) {
                skeletonFin += `
                    <tr class="animate-pulse border-b border-gray-200 md:border-gray-100 flex flex-col md:table-row p-4 md:p-0 mb-4 md:mb-0 bg-white md:bg-transparent rounded-2xl md:rounded-none shadow-sm md:shadow-none">
                        <td class="py-2 px-3 block md:table-cell w-full md:max-w-[220px]">
                            <div class="flex justify-between items-center w-full">
                                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div class="h-6 w-6 bg-gray-200 rounded-full md:hidden"></div>
                            </div>
                            <div class="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-4 md:hidden">
                                <div class="h-10 bg-gray-200 rounded-lg w-full"></div><div class="h-10 bg-gray-200 rounded-lg w-full"></div>
                                <div class="h-10 bg-gray-200 rounded-lg w-full"></div><div class="h-10 bg-gray-200 rounded-lg w-full"></div>
                            </div>
                        </td>
                        <td class="hidden md:table-cell px-1"><div class="h-4 w-4 bg-gray-200 rounded mx-auto"></div></td><td class="hidden md:table-cell px-1"><div class="h-4 w-4 bg-gray-200 rounded mx-auto"></div></td>
                        <td class="hidden md:table-cell px-1"><div class="h-4 w-4 bg-gray-200 rounded mx-auto"></div></td><td class="hidden md:table-cell px-1"><div class="h-4 w-4 bg-gray-200 rounded mx-auto"></div></td>
                        <td class="hidden md:table-cell px-1"><div class="h-4 w-4 bg-gray-200 rounded mx-auto"></div></td><td class="hidden md:table-cell px-1"><div class="h-4 w-4 bg-gray-200 rounded mx-auto"></div></td>
                        <td class="hidden md:table-cell px-1"><div class="h-4 w-4 bg-gray-200 rounded mx-auto"></div></td><td class="hidden md:table-cell px-1"><div class="h-4 w-4 bg-gray-200 rounded mx-auto"></div></td>
                        <td class="hidden md:table-cell px-1"><div class="h-4 w-4 bg-gray-200 rounded mx-auto"></div></td><td class="hidden md:table-cell px-1"><div class="h-4 w-4 bg-gray-200 rounded mx-auto"></div></td>
                        <td class="hidden md:table-cell px-1"><div class="h-4 w-4 bg-gray-200 rounded mx-auto"></div></td><td class="hidden md:table-cell px-1"><div class="h-4 w-4 bg-gray-200 rounded mx-auto"></div></td>
                        <td class="hidden md:table-cell px-2"><div class="h-5 bg-gray-200 rounded-full w-12 mx-auto"></div></td>
                    </tr>
                `;
            }
            tbody.innerHTML = skeletonFin;
            
            // Skeleton Dashboard Financeiro
            if(dashboard) {
                let skeletonDash = '';
                for(let i=0; i<6; i++) {
                    skeletonDash += `
                        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3 animate-pulse">
                            <div class="h-3 bg-gray-200 rounded w-1/3 mb-2 border-b pb-1"></div>
                            <div class="h-2 bg-gray-200 rounded w-1/2 mb-1"></div>
                            <div class="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                            <div class="flex justify-between items-center mb-1"><div class="h-2 bg-gray-200 rounded w-1/3"></div><div class="h-2 bg-gray-200 rounded w-1/4"></div></div>
                            <div class="w-full bg-gray-100 rounded-full h-1.5 mb-2"></div>
                            <div class="flex justify-between items-center"><div class="h-2 bg-gray-200 rounded w-1/3"></div><div class="h-2 bg-gray-200 rounded w-1/4"></div></div>
                        </div>
                    `;
                }
                dashboard.innerHTML = skeletonDash;
            }
            
            const { data: todosMediuns, error: errMediuns } = await supabaseClient.from('mediuns')
                .select('id, nome_completo, nome_social, isento_mensalidade, grau, funcao, status_ativo, created_at')
                .eq('terreiro_id', idTerreiroGlobal)
                .neq('nome_completo', 'Administrador Sistema')
                .order('nome_completo');

            if (errMediuns) console.error('Erro ao carregar médiuns no financeiro:', errMediuns);

            const mediuns = (todosMediuns || []).filter(m => {
                const ehDirigente = (m.grau === 'Dirigente' || m.funcao === 'Dirigente');
                const estaIsento = m.isento_mensalidade === true;
                return !(ehDirigente && estaIsento);
            });

            if(!mediuns || mediuns.length === 0) {
                tbody.innerHTML = '<tr><td colspan="14" class="p-6 text-center text-gray-500">Nenhum médium registrado.</td></tr>';
                if(dashboard) dashboard.innerHTML = '';
                return;
            }

            const idsMediuns = mediuns.map(m => m.id);

            let pgtos = [];
            let deLinha = 0;
            const tamanhoBloco = 1000;

            while (true) {
                const { data: blocoPgtos, error: errBloco } = await supabaseClient.from('financeiro')
                    .select('medium_id, mes, ano, pago, isento, origem')
                    .eq('ano', anoBusca)
                    .in('medium_id', idsMediuns)
                    .range(deLinha, deLinha + tamanhoBloco - 1);

                if (errBloco) {
                    console.error('Erro ao buscar bloco financeiro:', errBloco);
                    break;
                }

                if (blocoPgtos && blocoPgtos.length > 0) {
                    pgtos.push(...blocoPgtos);
                    if (blocoPgtos.length < tamanhoBloco) break;
                    deLinha += tamanhoBloco;
                } else {
                    break;
                }
            }

            const { data: configs } = await supabaseClient.from('config_mensalidades')
                .select('grau, valor')
                .eq('terreiro_id', idTerreiroGlobal);
                
            const valorPorGrau = {};
            if (configs) configs.forEach(c => valorPorGrau[c.grau] = parseFloat(c.valor) || 0);
            
            const statsMeses = Array.from({ length: 12 }, () => ({
                arrecadado: 0, totalMediuns: 0, adimplentes: 0, inadimplentes: 0
            }));
            
            window.cacheLinhasFinanceiro = [];
            const mesAtual = new Date().getMonth() + 1; 
            const anoAtual = new Date().getFullYear();

            mediuns.forEach(m => {
                const meusPgtos = pgtos ? pgtos.filter(p => p.medium_id === m.id) : [];
                let htmlMeses = ''; let emDia = true;
                const ehInativo = (m.status_ativo === false);
                
                const dataIngresso = m.created_at ? new Date(m.created_at) : new Date('2000-01-01');
                const mesIngresso = dataIngresso.getMonth() + 1;
                const anoIngresso = dataIngresso.getFullYear();

                for (let i = 1; i <= 12; i++) {
                    const pgto = meusPgtos.find(p => p.mes === i);
                    
                    const isAntesDoIngresso = (anoBusca < anoIngresso) || (anoBusca === anoIngresso && i < mesIngresso);
                    const isIsento = m.isento_mensalidade === true || (pgto ? pgto.isento : false);
                    const pago = pgto ? pgto.pago : false;
                    const origem = pgto ? pgto.origem : null;
                    const passou = (anoBusca < anoAtual) || (anoBusca === anoAtual && i < mesAtual);
                    
                    // Se o médium está inativo, preserva todos os pagamentos/isenções já feitos, mas não gera cobrança nova
                    if (!ehInativo && passou && !pago && !isIsento && !isAntesDoIngresso) emDia = false; 

                    if (!isAntesDoIngresso) {
                        if (pago) {
                            statsMeses[i-1].arrecadado += valorPorGrau[m.grau] || 0;
                        }
                        if (!ehInativo || pago || isIsento) {
                            statsMeses[i-1].totalMediuns++;
                            if (isIsento || pago) {
                                statsMeses[i-1].adimplentes++;
                            } else if (passou) {
                                statsMeses[i-1].inadimplentes++;
                            }
                        }
                    }

                    let corCheck = '', titleStr = '', checkedStr = '', disabledStr = '';

                    if (isAntesDoIngresso) {
                        checkedStr = 'checked'; disabledStr = 'disabled';
                        corCheck = 'accent-color: #9ca3af; opacity: 0.4; cursor: not-allowed;'; 
                        titleStr = 'Anterior ao ingresso';
                    } else if (isIsento) {
                        checkedStr = 'checked'; corCheck = 'accent-color: #a855f7;'; 
                        titleStr = ehInativo ? 'Isento (Histórico preservado - Médium Inativo)' : 'Isento (Botão direito p/ desfazer)';
                        if (ehInativo) disabledStr = 'onclick="return false;"';
                    } else if (pago && (origem === 'asaas' || origem === 'pix_sistema' || ehInativo)) {
                        checkedStr = 'checked'; disabledStr = 'onclick="return false;"'; 
                        corCheck = 'accent-color: #16a34a; cursor: not-allowed;'; 
                        titleStr = ehInativo ? 'Pago (Histórico preservado - Médium Inativo)' : 'Pago via Sistema (Irreversível)';
                    } else if (pago) {
                        checkedStr = 'checked'; corCheck = 'accent-color: #16a34a;'; 
                        titleStr = 'Pago (Manual)';
                    } else if (ehInativo) {
                        disabledStr = 'disabled';
                        corCheck = 'opacity: 0.35; cursor: not-allowed;';
                        titleStr = 'Médium Inativo (Sem cobrança)';
                    } else {
                        titleStr = 'Pendente (Esq. Pagar | Dir. Isentar)';
                    }

                    htmlMeses += `<td class="py-1 px-1 border-b border-gray-100">
                        <input type="checkbox" data-origem="${origem}" ${checkedStr} ${disabledStr} style="${corCheck}" title="${titleStr}" class="w-4 h-4 cursor-pointer" 
                        onchange="salvarPagamento(${m.id}, ${i}, ${anoBusca}, this.checked, this)"
                        oncontextmenu="toggleIsentoMes(event, ${m.id}, ${i}, ${anoBusca}, ${isAntesDoIngresso || ehInativo})">
                    </td>`;
                }
                const btnIsentarAno = ehInativo ? '' : `<button onclick="isentarAnoTodo(${m.id}, ${anoBusca})" title="Isentar ano todo (Automático)" class="ml-2 text-purple-400 hover:text-purple-600 active:scale-90 transition p-1"><i class="fas fa-magic"></i></button>`;
                const badgeInativo = ehInativo ? `<span class="ml-1.5 bg-gray-200 text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Inativo</span>` : '';
                const statusHtml = ehInativo
                    ? '<span class="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded">Inativo</span>'
                    : (emDia ? '<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">Em Dia</span>' : '<span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">Pendente</span>');
                const trHtml = `<tr class="hover:bg-gray-50 ${ehInativo ? 'bg-gray-50/60 opacity-85' : ''}"><td class="py-2 px-3 border-b border-gray-100 text-left font-medium text-gray-800 text-xs max-w-[220px]"><div class="flex items-center justify-between"><span class="truncate" title="${m.nome_completo}">${m.nome_completo}${badgeInativo}</span>${btnIsentarAno}</div></td>${htmlMeses}<td class="py-2 px-2 border-b border-gray-100 bg-gray-50">${statusHtml}</td></tr>`;

                window.cacheLinhasFinanceiro.push({
                    id: m.id,
                    nome_completo: m.nome_completo || '',
                    nome_social: m.nome_social || '',
                    grau: m.grau || '',
                    funcao: m.funcao || '',
                    emDia: emDia,
                    html: trHtml
                });
            });

            // Popula os graus no seletor de filtro do financeiro
            const selGrauFin = document.getElementById('filtroGrauFinanceiro');
            if (selGrauFin) {
                const valAtual = selGrauFin.value;
                selGrauFin.innerHTML = '<option value="">Todos os Graus</option>' + 
                    grausAtuaisTerreiro.map(g => `<option value="${g}" ${g === valAtual ? 'selected' : ''}>${g}</option>`).join('');
            }

            // Renderiza os dados filtrados
            window.aplicarFiltrosFinanceiro();
            
            if(dashboard) {
                dashboard.innerHTML = '';
                const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                
                statsMeses.forEach((stat, index) => {
                    const progresso = stat.totalMediuns > 0 ? Math.round((stat.adimplentes / stat.totalMediuns) * 100) : 0;
                    let corProgresso = progresso < 50 ? 'bg-red-500' : (progresso < 80 ? 'bg-yellow-500' : 'bg-green-500');
                    const valFmt = stat.arrecadado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    
                    dashboard.innerHTML += `
                        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3 hover:shadow-md transition">
                            <h4 class="text-xs font-black text-gray-700 uppercase mb-2 border-b pb-1">${nomesMeses[index]}</h4>
                            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Arrecadado</p>
                            <p class="text-lg font-black text-green-600 leading-none mb-3">${valFmt}</p>
                            
                            <div class="flex justify-between items-center text-[10px] text-gray-600 mb-1 font-bold">
                                <span>Adimplentes</span><span>${stat.adimplentes} / ${stat.totalMediuns}</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                                <div class="${corProgresso} h-1.5 rounded-full" style="width: ${progresso}%"></div>
                            </div>
                            <div class="flex justify-between items-center text-[10px]">
                                <span class="text-gray-500">Inadimplentes:</span>
                                <span class="font-bold ${stat.inadimplentes > 0 ? 'text-red-500' : 'text-gray-600'}">${stat.inadimplentes}</span>
                            </div>
                        </div>
                    `;
                });
            }
        }

        if(document.getElementById('selectAnoFinanceiro')) document.getElementById('selectAnoFinanceiro').addEventListener('change', (e) => carregarFinanceiro(parseInt(e.target.value)));
        window.aplicarFiltrosFinanceiro = () => {
            const tbody = document.getElementById('tabelaFinanceiro');
            if (!tbody || !window.cacheLinhasFinanceiro) return;

            const nomeFiltro = (document.getElementById('filtroNomeFinanceiro')?.value || '').trim().toLowerCase();
            const grauFiltro = (document.getElementById('filtroGrauFinanceiro')?.value || '').trim().toUpperCase();
            const statusFiltro = (document.getElementById('filtroStatusFinanceiro')?.value || '').trim().toLowerCase();

            const filtrados = window.cacheLinhasFinanceiro.filter(item => {
                if (nomeFiltro) {
                    const nComp = item.nome_completo.toLowerCase();
                    const nSoc = item.nome_social.toLowerCase();
                    if (!nComp.includes(nomeFiltro) && !nSoc.includes(nomeFiltro)) return false;
                }

                if (grauFiltro) {
                    const g = item.grau.toUpperCase();
                    const f = item.funcao.toUpperCase();
                    if (g !== grauFiltro && f !== grauFiltro) return false;
                }

                if (statusFiltro === 'em_dia' && !item.emDia) return false;
                if (statusFiltro === 'pendente' && item.emDia) return false;

                return true;
            });

            if (filtrados.length === 0) {
                tbody.innerHTML = '<tr><td colspan="14" class="p-6 text-center text-gray-500 font-medium">Nenhum médium encontrado com estes filtros.</td></tr>';
            } else {
                tbody.innerHTML = filtrados.map(f => f.html).join('');
            }
        };

        const fNomeFin = document.getElementById('filtroNomeFinanceiro');
        const fGrauFin = document.getElementById('filtroGrauFinanceiro');
        const fStatusFin = document.getElementById('filtroStatusFinanceiro');
        if (fNomeFin && !fNomeFin.dataset.bound) {
            fNomeFin.dataset.bound = 'true';
            fNomeFin.addEventListener('input', () => window.aplicarFiltrosFinanceiro());
        }
        if (fGrauFin && !fGrauFin.dataset.bound) {
            fGrauFin.dataset.bound = 'true';
            fGrauFin.addEventListener('change', () => window.aplicarFiltrosFinanceiro());
        }
        if (fStatusFin && !fStatusFin.dataset.bound) {
            fStatusFin.dataset.bound = 'true';
            fStatusFin.addEventListener('change', () => window.aplicarFiltrosFinanceiro());
        }

       async function carregarConfiguracoesCasa() {
            if (!idTerreiroGlobal) return;

            // Gera e exibe o QR Code estático da Assistência
            const linkAssistencia = `${window.location.origin}/assistencia.html?t=${idTerreiroGlobal}`;
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(linkAssistencia)}`;

            const imgQr = document.getElementById('imgQrCodeAssistencia');
            const inputLinkQr = document.getElementById('linkQrCodeAssistencia');
            if (imgQr) imgQr.src = qrCodeUrl;
            if (inputLinkQr) inputLinkQr.value = linkAssistencia;

            const btnCopiarLink = document.getElementById('btnCopiarLinkAssistencia');
            if (btnCopiarLink && !btnCopiarLink.dataset.bound) {
                btnCopiarLink.dataset.bound = 'true';
                btnCopiarLink.addEventListener('click', () => {
                    navigator.clipboard.writeText(linkAssistencia).then(() => {
                        const original = btnCopiarLink.innerHTML;
                        btnCopiarLink.innerHTML = '<i class="fas fa-check text-green-400"></i>';
                        setTimeout(() => btnCopiarLink.innerHTML = original, 2000);
                    });
                });
            }

            const btnImprimirCartaz = document.getElementById('btnImprimirCartazQR');
            if (btnImprimirCartaz && !btnImprimirCartaz.dataset.bound) {
                btnImprimirCartaz.dataset.bound = 'true';
                btnImprimirCartaz.addEventListener('click', () => {
                    const nomeTerreiro = nomeTerreiroGlobal || 'Templo';
                    const logoHtml = logoTerreiroGlobal 
                        ? `<img src="${logoTerreiroGlobal}" style="max-height: 90px; margin-bottom: 15px; object-fit: contain;">`
                        : '';

                    const janelaPrint = window.open('', '_blank');
                    janelaPrint.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Cartaz Recepção - ${nomeTerreiro}</title>
                            <style>
                                @page { size: A4 portrait; margin: 15mm; }
                                body {
                                    font-family: Arial, sans-serif;
                                    text-align: center;
                                    color: #1e293b;
                                    margin: 0;
                                    padding: 20px 10px;
                                    display: flex;
                                    flex-direction: column;
                                    justify-content: center;
                                    align-items: center;
                                    min-height: 90vh;
                                }
                                .borda {
                                    border: 3px solid #1e3a8a;
                                    border-radius: 24px;
                                    padding: 40px 30px;
                                    width: 88%;
                                    box-sizing: border-box;
                                }
                                h1 { font-size: 24pt; margin: 0 0 8px 0; text-transform: uppercase; color: #1e3a8a; }
                                h2 { font-size: 14pt; font-weight: normal; margin: 0 0 15px 0; color: #64748b; }
                                .destaque {
                                    background-color: #1e3a8a;
                                    color: #ffffff;
                                    font-size: 16pt;
                                    font-weight: bold;
                                    text-transform: uppercase;
                                    padding: 10px 30px;
                                    border-radius: 50px;
                                    display: inline-block;
                                    margin-bottom: 20px;
                                    letter-spacing: 1px;
                                }
                                .qr-box {
                                    margin: 0 auto;
                                    padding: 15px;
                                    background: #ffffff;
                                    border: 2px solid #e2e8f0;
                                    border-radius: 16px;
                                    display: inline-block;
                                }
                                img.qr { width: 280px; height: 280px; display: block; }
                                .instrucao {
                                    font-size: 16pt;
                                    font-weight: bold;
                                    margin-top: 25px;
                                    color: #0f172a;
                                }
                                .subtexto {
                                    font-size: 11pt;
                                    color: #64748b;
                                    margin-top: 8px;
                                    line-height: 1.5;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="borda">
                                ${logoHtml}
                                <h1>${nomeTerreiro}</h1>
                                <h2>Recepção e Acolhimento • Assistência</h2>
                                <div class="destaque">Registro de Presença Digital</div>
                                <div class="qr-box">
                                    <img class="qr" src="${qrCodeUrl}" alt="QR Code">
                                </div>
                                <div class="instrucao">Aponte a câmera do seu celular aqui</div>
                                <div class="subtexto">Registre a sua presença na sessão de hoje de forma rápida e segura.</div>
                            </div>
                            <script>
                                window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
                            <\/script>
                        </body>
                        </html>
                    `);
                    janelaPrint.document.close();
                });
            }
            
            // Carrega os dirigentes no select de compliance
            const selectDirigente = document.getElementById('selectDirigenteCompliance');
            if (selectDirigente) {
                const { data: listaMediuns } = await supabaseClient
                    .from('mediuns')
                    .select('id, nome_completo, grau, funcao')
                    .eq('terreiro_id', idTerreiroGlobal)
                    .order('nome_completo');

                selectDirigente.innerHTML = '<option value="">Selecione o dirigente...</option>';
                if (listaMediuns) {
                    listaMediuns.forEach(m => {
                        const cargo = [m.grau, m.funcao].filter(Boolean).join(' / ') || 'Médium';
                        selectDirigente.innerHTML += `<option value="${m.id}">${m.nome_completo} (${cargo})</option>`;
                    });
                }
            }

            const { data } = await supabaseClient.from('terreiros').select('logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto, latitude, longitude, modulo_mensalidade_ativo, gateway_pagamento, chave_pix_manual, asaas_api_key, email, cpf_cnpj, phone, postal_code, address, address_number, company_type, asaas_wallet_id, dirigente_id, tipo_chave_pix_repasse, chave_pix_repasse, lista_graus, lista_funcoes').eq('id', idTerreiroGlobal).single();
            if (data) {
                // Sincroniza listas de Graus e Funções do Terreiro
                grausAtuaisTerreiro = (data.lista_graus && data.lista_graus.length > 0) ? [...data.lista_graus] : [...GRAUS_PADRAO];
                funcoesAtuaisTerreiro = (data.lista_funcoes && data.lista_funcoes.length > 0) ? [...data.lista_funcoes] : [...FUNCOES_PADRAO];

                opcoesGrau = ['-', ...grausAtuaisTerreiro];
                opcoesFuncao = ['-', ...funcoesAtuaisTerreiro];

                renderizarTagsConfiguracao();
                if (document.getElementById('inputTerreiroEmail')) document.getElementById('inputTerreiroEmail').value = data.email || '';
                if (document.getElementById('inputTerreiroCpfCnpj')) document.getElementById('inputTerreiroCpfCnpj').value = data.cpf_cnpj || '';
                if (document.getElementById('selectDirigenteCompliance')) document.getElementById('selectDirigenteCompliance').value = data.dirigente_id || '';
                if (document.getElementById('inputTerreiroPhone')) document.getElementById('inputTerreiroPhone').value = data.phone || '';
                if (document.getElementById('inputTerreiroPostalCode')) document.getElementById('inputTerreiroPostalCode').value = data.postal_code || '';
                if (document.getElementById('inputTerreiroAddress')) document.getElementById('inputTerreiroAddress').value = data.address || '';
                if (document.getElementById('inputTerreiroAddressNumber')) document.getElementById('inputTerreiroAddressNumber').value = data.address_number || '';
                if (document.getElementById('inputTerreiroCompanyType')) document.getElementById('inputTerreiroCompanyType').value = data.company_type || 'ASSOCIATION';
                if (document.getElementById('tipoChavePixRepasse')) document.getElementById('tipoChavePixRepasse').value = data.tipo_chave_pix_repasse || 'CPF';
                if (document.getElementById('chavePixRepasse')) document.getElementById('chavePixRepasse').value = data.chave_pix_repasse || '';

                if(data.logo_url) {
                    const prev = document.getElementById('previewLogo');
                    if (prev) {
                        prev.src = data.logo_url;
                        prev.classList.remove('hidden');
                    }
                    document.getElementById('placeholderLogo')?.classList.add('hidden');
                }
                if(document.getElementById('corPrimaria')) document.getElementById('corPrimaria').value = data.cor_primaria || '#1e3a8a';
                if(document.getElementById('corSecundaria')) document.getElementById('corSecundaria').value = data.cor_secundaria || '#16a34a';
                if(document.getElementById('corFundo')) document.getElementById('corFundo').value = data.cor_fundo || '#f3f4f6';
                if(document.getElementById('corTexto')) document.getElementById('corTexto').value = data.cor_texto || '#1f2937';

                if(document.getElementById('inputLat')) {
                    document.getElementById('inputLat').value = data.latitude || '';
                    document.getElementById('inputLng').value = data.longitude || '';
                    
                    let lat = data.latitude || -14.2350; 
                    let lng = data.longitude || -51.9253;
                    let zoom = data.latitude ? 18 : 4;
                    iniciarMapa(lat, lng, zoom);
                }

                if (data.modulo_mensalidade_ativo) {
                    document.getElementById('boxConfigMensalidade')?.classList.remove('hidden');
                    
                    const radios = document.getElementsByName('gatewayPagamento');
                    radios.forEach(r => {
                        if(r.value === (data.gateway_pagamento || 'manual')) r.checked = true;
                        r.addEventListener('change', (e) => {
                            if(e.target.value === 'manual') {
                                document.getElementById('boxChavePix')?.classList.remove('hidden');
                                document.getElementById('boxChaveAsaas')?.classList.add('hidden');
                            } else {
                                document.getElementById('boxChavePix')?.classList.add('hidden');
                                document.getElementById('boxChaveAsaas')?.classList.remove('hidden');
                            }
                        });
                    });
                    
                    if(data.gateway_pagamento === 'asaas') {
                         document.getElementById('boxChavePix')?.classList.add('hidden');
                         document.getElementById('boxChaveAsaas')?.classList.remove('hidden');
                    } else {
                         document.getElementById('boxChavePix')?.classList.remove('hidden');
                         document.getElementById('boxChaveAsaas')?.classList.add('hidden');
                    }
                    
                    if(document.getElementById('chavePixManual')) document.getElementById('chavePixManual').value = data.chave_pix_manual || '';
                    
                    const { data: configVals } = await supabaseClient.from('config_mensalidades').select('*').eq('terreiro_id', idTerreiroGlobal);
                    renderizarValoresTesourariaGraus(configVals);
                } else {
                    document.getElementById('boxConfigMensalidade')?.classList.add('hidden');
                }
            }
        }

function renderizarTagsConfiguracao() {
            const containerGraus = document.getElementById('containerTagsGraus');
            const containerFuncoes = document.getElementById('containerTagsFuncoes');

            if (containerGraus) {
                containerGraus.innerHTML = grausAtuaisTerreiro.map((g, idx) => `
                    <span class="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold px-2.5 py-1 rounded-lg">
                        ${g}
                        <button type="button" onclick="removerGrauTag(${idx})" class="text-indigo-400 hover:text-red-500 transition"><i class="fas fa-times text-[10px]"></i></button>
                    </span>
                `).join('') || '<span class="text-xs text-gray-400 p-1">Nenhum grau registrado.</span>';
            }

            if (containerFuncoes) {
                containerFuncoes.innerHTML = funcoesAtuaisTerreiro.map((f, idx) => `
                    <span class="inline-flex items-center gap-1.5 bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold px-2.5 py-1 rounded-lg">
                        ${f}
                        <button type="button" onclick="removerFuncaoTag(${idx})" class="text-purple-400 hover:text-red-500 transition"><i class="fas fa-times text-[10px]"></i></button>
                    </span>
                `).join('') || '<span class="text-xs text-gray-400 p-1">Nenhuma função registrada.</span>';
            }
        }

        function renderizarValoresTesourariaGraus(configVals) {
            const containerGraus = document.getElementById('listaValoresGrau');
            if (!containerGraus) return;
            containerGraus.innerHTML = '';
            grausAtuaisTerreiro.forEach(g => {
                const conf = configVals?.find(c => c.grau === g);
                const valor = conf ? conf.valor : '0.00';
                containerGraus.innerHTML += `
                    <div class="flex flex-row items-center justify-between bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 transition">
                        <label class="text-[13px] font-bold text-gray-800 uppercase tracking-wide truncate mr-2" title="${g}">${g}</label>
                        <div class="flex items-center shrink-0">
                            <span class="text-xs font-bold text-gray-500 mr-1.5">R$</span>
                            <input type="number" step="0.01" min="0" data-grau="${g}" value="${valor}" class="input-valor-grau w-20 px-2 py-1 text-xs font-bold font-mono border border-gray-200 rounded-lg outline-none focus:border-tema-secundaria focus:ring-1 focus:ring-tema-secundaria bg-gray-50 focus:bg-white text-gray-800 text-right">
                        </div>
                    </div>
                `;
            });
        }

        window.removerGrauTag = (idx) => {
            grausAtuaisTerreiro.splice(idx, 1);
            opcoesGrau = ['-', ...grausAtuaisTerreiro];
            renderizarTagsConfiguracao();
        };

        window.removerFuncaoTag = (idx) => {
            funcoesAtuaisTerreiro.splice(idx, 1);
            opcoesFuncao = ['-', ...funcoesAtuaisTerreiro];
            renderizarTagsConfiguracao();
        };

        const inputNovoGrau = document.getElementById('novoGrauInput');
        const btnAddGrau = document.getElementById('btnAdicionarGrau');
        if (btnAddGrau && inputNovoGrau && !btnAddGrau.dataset.bound) {
            btnAddGrau.dataset.bound = 'true';
            btnAddGrau.addEventListener('click', () => {
                const val = inputNovoGrau.value.trim();
                if (val && !grausAtuaisTerreiro.includes(val)) {
                    grausAtuaisTerreiro.push(val);
                    opcoesGrau = ['-', ...grausAtuaisTerreiro];
                    inputNovoGrau.value = '';
                    renderizarTagsConfiguracao();
                }
            });
        }

        const inputNovaFuncao = document.getElementById('novaFuncaoInput');
        const btnAddFuncao = document.getElementById('btnAdicionarFuncao');
        if (btnAddFuncao && inputNovaFuncao && !btnAddFuncao.dataset.bound) {
            btnAddFuncao.dataset.bound = 'true';
            btnAddFuncao.addEventListener('click', () => {
                const val = inputNovaFuncao.value.trim();
                if (val && !funcoesAtuaisTerreiro.includes(val)) {
                    funcoesAtuaisTerreiro.push(val);
                    opcoesFuncao = ['-', ...funcoesAtuaisTerreiro];
                    inputNovaFuncao.value = '';
                    renderizarTagsConfiguracao();
                }
            });
        }

        const btnRestaurarPadrao = document.getElementById('btnRestaurarPadraoGrausFuncoes');
        if (btnRestaurarPadrao && !btnRestaurarPadrao.dataset.bound) {
            btnRestaurarPadrao.dataset.bound = 'true';
            btnRestaurarPadrao.addEventListener('click', () => {
                if (!confirm("Restaurar as denominações padrão do sistema?")) return;
                grausAtuaisTerreiro = [...GRAUS_PADRAO];
                funcoesAtuaisTerreiro = [...FUNCOES_PADRAO];
                opcoesGrau = ['-', ...grausAtuaisTerreiro];
                opcoesFuncao = ['-', ...funcoesAtuaisTerreiro];
                renderizarTagsConfiguracao();
            });
        }

        const btnSalvarGrausFuncoes = document.getElementById('btnSalvarGrausFuncoes');
        const msgGrausFuncoes = document.getElementById('msgGrausFuncoes');
        if (btnSalvarGrausFuncoes && !btnSalvarGrausFuncoes.dataset.bound) {
            btnSalvarGrausFuncoes.dataset.bound = 'true';
            btnSalvarGrausFuncoes.addEventListener('click', async () => {
                btnSalvarGrausFuncoes.disabled = true;
                btnSalvarGrausFuncoes.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> Salvando...';
                if (msgGrausFuncoes) msgGrausFuncoes.classList.add('hidden');

                try {
                    const { error } = await supabaseClient.from('terreiros')
                        .update({
                            lista_graus: grausAtuaisTerreiro,
                            lista_funcoes: funcoesAtuaisTerreiro
                        })
                        .eq('id', idTerreiroGlobal);

                    if (error) throw error;

                    if (msgGrausFuncoes) {
                        msgGrausFuncoes.textContent = '✅ Denominações salvas com sucesso!';
                        msgGrausFuncoes.className = 'text-xs font-bold text-green-600 block';
                        msgGrausFuncoes.classList.remove('hidden');
                        setTimeout(() => msgGrausFuncoes.classList.add('hidden'), 3500);
                    }

                    const { data: configVals } = await supabaseClient.from('config_mensalidades').select('*').eq('terreiro_id', idTerreiroGlobal);
                    renderizarValoresTesourariaGraus(configVals);

                } catch (err) {
                    if (msgGrausFuncoes) {
                        msgGrausFuncoes.textContent = 'Erro ao salvar: ' + err.message;
                        msgGrausFuncoes.className = 'text-xs font-bold text-red-600 block';
                        msgGrausFuncoes.classList.remove('hidden');
                    }
                } finally {
                    btnSalvarGrausFuncoes.disabled = false;
                    btnSalvarGrausFuncoes.innerHTML = '<i class="fas fa-save"></i> Salvar Graus e Funções';
                }
            });
        }

        
        function iniciarMapa(lat, lng, zoomLvl) {
            const mapEl = document.getElementById('mapaLocalizacao');
            const overlay = document.getElementById('mapaOverlay');
            if(!mapaGlobal && mapEl && typeof L !== 'undefined') {
                if(overlay) overlay.classList.add('hidden');
                mapaGlobal = L.map('mapaLocalizacao').setView([lat, lng], zoomLvl);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapaGlobal);
                
                marcadorGlobal = L.marker([lat, lng]).addTo(mapaGlobal);
                circuloGlobal = L.circle([lat, lng], { color: 'green', fillColor: '#22c55e', fillOpacity: 0.2, radius: 30 }).addTo(mapaGlobal);

                mapaGlobal.on('click', function(e) {
                    if (document.getElementById('inputLat')) document.getElementById('inputLat').value = e.latlng.lat;
                    if (document.getElementById('inputLng')) document.getElementById('inputLng').value = e.latlng.lng;
                    marcadorGlobal.setLatLng([e.latlng.lat, e.latlng.lng]);
                    circuloGlobal.setLatLng([e.latlng.lat, e.latlng.lng]);
                });
            } else if(mapaGlobal) {
                if(overlay) overlay.classList.add('hidden');
                mapaGlobal.setView([lat, lng], zoomLvl);
                marcadorGlobal.setLatLng([lat, lng]);
                circuloGlobal.setLatLng([lat, lng]);
            }
            setTimeout(() => { if(mapaGlobal) mapaGlobal.invalidateSize(); }, 300);
        }

        if (document.getElementById('btnGravarLocalizacao')) {
            document.getElementById('btnGravarLocalizacao').addEventListener('click', async () => {
                const msg = document.getElementById('msgLocalizacao');
                if(msg) {
                    msg.classList.remove('hidden');
                    msg.className = 'mt-4 text-sm font-bold text-blue-600 block';
                    msg.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Lendo GPS do celular...';
                }
                
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        const lat = pos.coords.latitude, lon = pos.coords.longitude;
                        if(idTerreiroGlobal) {
                            const { data, error } = await supabaseClient.from('terreiros')
                                .update({ latitude: lat, longitude: lon })
                                .eq('id', idTerreiroGlobal)
                                .select(); 

                            if(error) {
                                if(msg) { msg.className = 'mt-4 text-sm font-bold text-red-600 block'; msg.textContent = 'Erro ao salvar no banco: ' + error.message; }
                            } else if (!data || data.length === 0) {
                                if(msg) { msg.className = 'mt-4 text-sm font-bold text-red-600 block'; msg.textContent = 'ERRO: O Banco de Dados recusou a alteração.'; }
                            } else {
                                if(msg) { msg.className = 'mt-4 text-sm font-bold text-green-600 block'; msg.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Ponto Registrado!'; setTimeout(() => msg.classList.add('hidden'), 3000); }
                                if(document.getElementById('inputLat')) {
                                    document.getElementById('inputLat').value = lat;
                                    document.getElementById('inputLng').value = lon;
                                }
                                if (typeof iniciarMapa === 'function') iniciarMapa(lat, lon, 18);
                            }
                        }
                    },
                    (err) => {
                        if(msg) { msg.className = 'mt-4 text-sm font-bold text-red-600 block'; msg.textContent = 'Erro no GPS: Libere a permissão de localização do seu navegador.'; }
                    },
                    { enableHighAccuracy: true }
                );
            });
        }

        if (document.getElementById('btnSalvarLocalizacaoManual')) {
            document.getElementById('btnSalvarLocalizacaoManual').addEventListener('click', async () => {
                const btn = document.getElementById('btnSalvarLocalizacaoManual');
                const msg = document.getElementById('msgLocalizacao');
                const lat = parseFloat(document.getElementById('inputLat').value);
                const lng = parseFloat(document.getElementById('inputLng').value);
                
                if(isNaN(lat) || isNaN(lng)) {
                    alert("Por favor, digite latitude e longitude válidas ou clique no mapa para marcar.");
                    return;
                }

                btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
                
                const { data, error } = await supabaseClient.from('terreiros')
                    .update({ latitude: lat, longitude: lng })
                    .eq('id', idTerreiroGlobal)
                    .select(); 
                    
                btn.disabled = false; btn.innerHTML = '<i class="fas fa-save mr-2"></i> Salvar Manualmente';
                
                if(error) {
                    if(msg) { msg.textContent = "Erro: " + error.message; msg.className = "mt-4 text-sm font-bold text-red-600 block"; msg.classList.remove('hidden'); }
                } else if (!data || data.length === 0) {
                    if(msg) { msg.textContent = "ERRO: O Banco de Dados recusou a alteração. Regra RLS bloqueou a gravação."; msg.className = "mt-4 text-sm font-bold text-red-600 block"; msg.classList.remove('hidden'); }
                } else {
                    if(msg) { msg.textContent = "Localização salva com sucesso!"; msg.className = "mt-4 text-sm font-bold text-green-600 block"; msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 3000); }
                    if (typeof iniciarMapa === 'function') iniciarMapa(lat, lng, 18);
                }
            });
        }

        if(document.getElementById('uploadLogo')) {
            document.getElementById('uploadLogo').addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(evt) {
                        const prev = document.getElementById('previewLogo');
                        if (prev) {
                            prev.src = evt.target.result;
                            prev.classList.remove('hidden');
                        }
                        document.getElementById('placeholderLogo')?.classList.add('hidden');
                    }
                    reader.readAsDataURL(file);
                }
            });
        }

        if(document.getElementById('btnSalvarLogo')) {
            document.getElementById('btnSalvarLogo').addEventListener('click', async () => {
                const btnLogo = document.getElementById('btnSalvarLogo');
                const input = document.getElementById('uploadLogo');
                const msg = document.getElementById('msgLogo');
                if(!input.files || input.files.length === 0) { alert('Selecione uma imagem.'); return; }
                btnLogo.disabled = true; btnLogo.textContent = 'Otimizando e enviando...'; msg?.classList.remove('hidden');
                if (msg) { msg.textContent = 'Processando arquivo...'; msg.className = 'text-xs font-bold mt-2 text-tema-primaria'; }
                
                try {
                    const arquivoOriginal = input.files[0];
                    const arquivoComprimido = await comprimirImagem(arquivoOriginal, 600, 600, 0.90);

                    const nomeArquivo = `logo_${idTerreiroGlobal}_${Date.now()}.${arquivoComprimido.name.split('.').pop()}`;
                    const { error: errUp } = await supabaseClient.storage.from('logos').upload(nomeArquivo, arquivoComprimido);
                    if (errUp) throw errUp;
                    const { data: urlData } = supabaseClient.storage.from('logos').getPublicUrl(nomeArquivo);
                    const { error: errBd } = await supabaseClient.from('terreiros').update({ logo_url: urlData.publicUrl }).eq('id', idTerreiroGlobal);
                    if (errBd) throw errBd;
                    
                    logoTerreiroGlobal = urlData.publicUrl;
                    
                    const sideLogo = document.getElementById('logoSidebar');
                    if (sideLogo) {
                        sideLogo.src = urlData.publicUrl;
                        sideLogo.classList.remove('hidden');
                    }

                    let linkFavicon = document.querySelector("link[rel~='icon']");
                    if (!linkFavicon) {
                        linkFavicon = document.createElement('link');
                        linkFavicon.rel = 'icon';
                        document.head.appendChild(linkFavicon);
                    }
                    linkFavicon.href = urlData.publicUrl;

                    if (msg) { msg.textContent = '✅ Logo salva com sucesso!'; msg.className = 'text-xs font-bold mt-2 text-tema-secundaria'; }
                } catch (error) {
                    if (msg) { msg.textContent = '❌ Erro: ' + error.message; msg.className = 'text-xs font-bold mt-2 text-red-600'; }
                } finally { btnLogo.disabled = false; btnLogo.textContent = 'Salvar Imagem'; }
            });
        }

        if(document.getElementById('btnSalvarCores')) {
            document.getElementById('btnSalvarCores').addEventListener('click', async () => {
                const btn = document.getElementById('btnSalvarCores');
                const msg = document.getElementById('msgCores');
                const cor1 = document.getElementById('corPrimaria').value;
                const cor2 = document.getElementById('corSecundaria').value;
                const corF = document.getElementById('corFundo').value;
                const corT = document.getElementById('corTexto').value;
                btn.disabled = true; btn.textContent = 'Salvando...';
                
                try {
                    const { error } = await supabaseClient.from('terreiros').update({ cor_primaria: cor1, cor_secundaria: cor2, cor_fundo: corF, cor_texto: corT }).eq('id', idTerreiroGlobal);
                    if (error) throw error;
                    const root = document.documentElement;
                    root.style.setProperty('--cor-primaria', cor1); root.style.setProperty('--cor-secundaria', cor2);
                    root.style.setProperty('--cor-fundo', corF); root.style.setProperty('--cor-texto', corT);
                    if (msg) { msg.textContent = '✅ Tema atualizado!'; msg.className = 'text-sm font-bold mt-3 text-tema-secundaria block'; setTimeout(() => msg.classList.add('hidden'), 5000); }
                } catch (error) {
                    if (msg) { msg.textContent = '❌ Erro: ' + error.message; msg.className = 'text-sm font-bold mt-3 text-red-600 block'; }
                } finally { btn.disabled = false; btn.textContent = 'Salvar e Aplicar Cores'; }
            });
        }

        window.carregarDoacoesPrometidas = async () => {
            if (!idTerreiroGlobal) return;
            const tbodyDoacoes = document.getElementById('tabelaDoacoesPrometidas');
            const tbodyCantina = document.getElementById('tabelaPedidosCantina');
            
            if (tbodyDoacoes) tbodyDoacoes.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500">Buscando doações...</td></tr>';
            if (tbodyCantina) tbodyCantina.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Buscando pedidos...</td></tr>';

            try {
                const { data: registrosGlobais, error: errD } = await supabaseClient.from('doacoes_registradas').select('*').eq('terreiro_id', idTerreiroGlobal).order('entregue', { ascending: true }).order('data_registro', { ascending: false }); 
                if (errD) throw errD;
                
                const { data: mediuns } = await supabaseClient.from('mediuns').select('id, auth_id, nome_completo, nome_social').eq('terreiro_id', idTerreiroGlobal);
                const { data: itens } = await supabaseClient.from('itens_doacao').select('id, nome, descricao, categoria').eq('terreiro_id', idTerreiroGlobal);
                
                window.dadosDoacoesParaPDF = { doacoes: [], mediuns, itens };
                window.dadosCantinaParaPDF = { doacoes: [], mediuns, itens };

                if (!registrosGlobais || registrosGlobais.length === 0) {
                    if (tbodyDoacoes) tbodyDoacoes.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500">Nenhuma doação da casa registrada.</td></tr>';
                    if (tbodyCantina) tbodyCantina.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Nenhum pedido da cantina registrado.</td></tr>';
                    return;
                }

                if (tbodyDoacoes) tbodyDoacoes.innerHTML = '';
                if (tbodyCantina) tbodyCantina.innerHTML = '';

                let countDoacoes = 0;
                let countCantina = 0;

                registrosGlobais.forEach(d => {
                    const mdEncontrado = mediuns?.find(m => m.auth_id === d.medium_auth_id || String(m.id) === String(d.medium_auth_id));
                    const medium = mdEncontrado ? mdEncontrado.nome_completo : 'Médium Desconhecido';
                    const itemObj = itens?.find(i => String(i.id) === String(d.item_id));
                    const itemNome = itemObj ? `${itemObj.nome}` : 'Item Excluído';
                    
                    // Lógica para separar Doações (Terreiro) da Cantina
                    const isCantina = itemObj && itemObj.categoria && itemObj.categoria.toLowerCase().trim() === 'cantina';

                    if (isCantina) {
                        window.dadosCantinaParaPDF.doacoes.push(d);
                    } else {
                        window.dadosDoacoesParaPDF.doacoes.push(d);
                    }

                    const dataRegistro = new Date(d.data_registro).toLocaleDateString('pt-BR');
                    
                    // Na cantina mudamos o texto de status: "Pendente" ou "Entregue"
                    const statusText = d.entregue ? 'Entregue' : 'Pendente';
                    const bgStatus = d.entregue ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
                    const statusHtml = `<span class="text-xs ${bgStatus} px-2 py-1 rounded font-bold">${statusText}</span>`;
                    
                    const acaoBaixaHtml = d.entregue 
                        ? `<button onclick="marcarDoacao('${d.id}', false)" class="text-[10px] text-gray-400 hover:text-gray-800 underline mt-1 block w-full text-center">Desfazer</button>` 
                        : `<button onclick="marcarDoacao('${d.id}', true)" class="${isCantina ? 'bg-orange-500' : 'bg-tema-secundaria'} hover:opacity-90 text-white text-[10px] font-bold py-1.5 px-3 rounded shadow-sm mt-1 w-full">Dar Baixa</button>`;
                    
                    const btnExcluirHtml = `<button onclick="excluirDoacao('${d.id}')" class="text-xs text-red-500 hover:text-red-700 ml-2 shrink-0" title="Excluir Registro"><i class="fas fa-trash"></i></button>`;

                    const estiloLinha = d.entregue ? 'bg-gray-50 opacity-80' : 'bg-white';
                    
                    const trHtml = `
                        <tr class="border-b border-gray-100 ${estiloLinha} hover:bg-gray-50 transition-colors">
                            <td class="p-3 text-sm text-gray-800 font-medium">${medium}</td>
                            <td class="p-3 text-xs text-gray-600">${itemNome}<br><span class="text-[9px] text-gray-400">${dataRegistro}</span></td>
                            <td class="p-3 text-center font-bold text-gray-800">${d.quantidade}</td>
                            <td class="p-3 text-center">
                                <div class="flex items-center justify-center gap-2">
                                    <div class="flex flex-col items-center w-20">
                                        ${statusHtml}
                                        ${acaoBaixaHtml}
                                    </div>
                                    ${btnExcluirHtml}
                                </div>
                            </td>
                        </tr>
                    `;

                    if (isCantina) {
                        if (tbodyCantina) tbodyCantina.innerHTML += trHtml;
                        countCantina++;
                    } else {
                        if (tbodyDoacoes) tbodyDoacoes.innerHTML += trHtml;
                        countDoacoes++;
                    }
                });

                if (countDoacoes === 0 && tbodyDoacoes) tbodyDoacoes.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500 text-sm">Nenhuma doação pendente.</td></tr>';
                if (countCantina === 0 && tbodyCantina) tbodyCantina.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500 text-sm">Nenhum pedido pendente.</td></tr>';

            } catch (error) {
                console.error("Erro ao carregar doações:", error);
                if (tbodyDoacoes) tbodyDoacoes.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500 text-xs">Erro: ${error.message}</td></tr>`;
                if (tbodyCantina) tbodyCantina.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500 text-xs">Erro: ${error.message}</td></tr>`;
            }
        };
        let cacheTerreirosSaaS = [];

        function renderizarCardsTerreirosSaaS(lista) {
            const container = document.getElementById('gridMasterTerreiros');
            if (!container) return;

            if (lista.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
                        <i class="fas fa-search text-3xl mb-2 block text-gray-300"></i>
                        <span class="text-sm">Nenhum terreiro encontrado.</span>
                    </div>
                `;
                return;
            }

            container.innerHTML = '';
            lista.forEach(t => {
                const bloqueado = !!t.status_bloqueado;
                const tesourariaAtiva = !!t.modulo_mensalidade_ativo;
                const nomeEscapado = (t.nome || '').replace(/'/g, "\\'");

                const statusBadge = bloqueado
                    ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> Bloqueado</span>`
                    : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Ativo</span>`;

                const tesourariaBadge = tesourariaAtiva
                    ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="Módulo Financeiro Habilitado"><i class="fas fa-coins text-amber-500"></i> Tesouraria On</span>`
                    : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-500" title="Módulo Financeiro Desabilitado"><i class="fas fa-coins text-gray-400"></i> Tesouraria Off</span>`;

                const btnBloqueio = bloqueado
                    ? `<button onclick="alternarBloqueioTerreiro('${t.id}', false)" class="flex-1 py-2 px-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-1.5" title="Desbloquear acesso"><i class="fas fa-lock-open text-emerald-400"></i> Desbloquear</button>`
                    : `<button onclick="alternarBloqueioTerreiro('${t.id}', true)" class="flex-1 py-2 px-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5" title="Bloquear acesso à plataforma"><i class="fas fa-lock"></i> Bloquear</button>`;

const livroCurimbaAtivo = !!t.modulo_livro_curimba_ativo;
                const btnMensalidade = `
                    <button onclick="alternarModuloMensalidade('${t.id}', ${!tesourariaAtiva})" class="p-2 border border-gray-200 hover:border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition" title="${tesourariaAtiva ? 'Desativar Módulo Financeiro' : 'Ativar Módulo Financeiro'}"><i class="fas fa-hand-holding-usd ${tesourariaAtiva ? 'text-amber-500' : 'text-gray-400'}"></i></button>
                    <button onclick="alternarModuloLivroCurimba('${t.id}', ${!livroCurimbaAtivo})" class="p-2 border border-gray-200 hover:border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition" title="${livroCurimbaAtivo ? 'Desativar Livro da Curimba' : 'Ativar Livro da Curimba'}"><i class="fas fa-drum ${livroCurimbaAtivo ? 'text-indigo-600' : 'text-gray-400'}"></i></button>
                `;
                const logoOuIniciais = t.logo_url
                    ? `<img src="${t.logo_url}" class="w-11 h-11 rounded-xl object-cover border border-gray-200 bg-white shadow-sm flex-shrink-0" alt="Logo">`
                    : `<div class="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-base flex items-center justify-center shadow-sm flex-shrink-0">${(t.nome || 'T').substring(0, 2).toUpperCase()}</div>`;

                container.innerHTML += `
                    <div class="bg-white rounded-2xl border ${bloqueado ? 'border-red-200 bg-red-50/20' : 'border-gray-200'} p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                        <div>
                            <!-- Topo do Card -->
                            <div class="flex items-start justify-between gap-3 mb-3">
                                <div class="flex items-center gap-3 min-w-0">
                                    ${logoOuIniciais}
                                    <div class="min-w-0">
                                        <h4 class="font-bold text-gray-900 text-base leading-snug truncate" title="${t.nome}">${t.nome}</h4>
                                        <div class="flex items-center gap-1.5 mt-0.5">
                                            <span class="text-[11px] font-mono text-gray-400 font-semibold truncate" title="${t.id}">ID: ${String(t.id).substring(0, 8)}...</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex-shrink-0">
                                    ${statusBadge}
                                </div>
                            </div>

                            <!-- Badges de Status e Funcionalidades -->
                            <div class="flex flex-wrap items-center gap-2 mb-4 pt-2 border-t border-gray-100">
                                ${tesourariaBadge}
                                ${t.asaas_wallet_id ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200"><i class="fas fa-wallet text-blue-500"></i> Split Configurado</span>' : ''}
                            </div>
                        </div>

                        <!-- Ações do Card -->
                        <div class="pt-3 border-t border-gray-100 flex flex-col gap-2">
                            <!-- Botão Principal: Acesso Suporte -->
                            <button onclick="acessarTerreiroSaaS('${t.id}')" class="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-2">
                                <i class="fas fa-sign-in-alt"></i> Acessar Painel (Suporte)
                            </button>

                            <!-- Botões de Gestão Rápida -->
                            <div class="flex items-center gap-2">
                                ${btnBloqueio}
                                <button onclick="abrirModalFinanceiroMaster('${t.id}', '${nomeEscapado}')" class="p-2 border border-gray-200 hover:border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition" title="Configurações de Taxas e Split Asaas"><i class="fas fa-cog text-blue-600"></i></button>
                                <button onclick="abrirModalImportacao('${t.id}', '${nomeEscapado}')" class="p-2 border border-gray-200 hover:border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition" title="Importar Médiuns via CSV"><i class="fas fa-file-csv text-emerald-600"></i></button>
                                ${btnMensalidade}
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        async function carregarGestaoPlataforma() {
            const container = document.getElementById('gridMasterTerreiros');
            if (!container) return;

            container.innerHTML = `
                <div class="col-span-full p-8 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <i class="fas fa-spinner fa-spin text-xl text-blue-600 mr-2"></i> Carregando terreiros da plataforma...
                </div>
            `;

            const { data, error } = await supabaseClient.from('terreiros').select('*').order('id', { ascending: true });
            if (error) {
                container.innerHTML = `<div class="col-span-full p-4 text-center text-red-500 font-bold bg-white rounded-xl border border-red-200">Erro: ${error.message}</div>`;
                return;
            }

            cacheTerreirosSaaS = data || [];
            renderizarCardsTerreirosSaaS(cacheTerreirosSaaS);

            const inputBusca = document.getElementById('filtroBuscaTerreiroSaaS');
            if (inputBusca && !inputBusca.dataset.listenerAtivo) {
                inputBusca.dataset.listenerAtivo = 'true';
                inputBusca.addEventListener('input', (e) => {
                    const termo = (e.target.value || '').toLowerCase().trim();
                    const filtrados = cacheTerreirosSaaS.filter(t => {
                        const nome = (t.nome || '').toLowerCase();
                        const id = String(t.id || '').toLowerCase();
                        return nome.includes(termo) || id.includes(termo);
                    });
                    renderizarCardsTerreirosSaaS(filtrados);
                });
            }
        }

        const urlParams = new URLSearchParams(window.location.search);
        const secaoParam = urlParams.get('secao');
        const menuAlvo = secaoParam ? document.getElementById(secaoParam) : null;

        if (menuAlvo && !menuAlvo.classList.contains('hidden')) {
            menuAlvo.click();
        } else if (emModoMasterPuro) {
            document.getElementById('menuMaster')?.click();
        } else if (perfilAdminLogado.is_admin || perfilAdminLogado.perm_visao_geral) {
            document.getElementById('menuVisaoGeral')?.click();
        } else {
            if (perfilAdminLogado.perm_agenda) document.getElementById('menuAgendaGiras')?.click();
            else if (perfilAdminLogado.perm_ata) document.getElementById('menuLivroAta')?.click();
            else document.getElementById('menuQuadroMediuns')?.click(); 
        }

    } catch (error) {
        console.error('Erro de inicialização:', error);
    }

    const formMasterFin = document.getElementById('formMasterFinanceiro');
    if (formMasterFin) {
        formMasterFin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idT = document.getElementById('idTerreiroFinanceiroMaster').value;
            const btn = document.getElementById('btnSalvarFinanceiroMaster');
            const msg = document.getElementById('msgFinanceiroMaster');
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            
            const payload = {
                mensalidade_saas: parseFloat(document.getElementById('inputMensalidadeSaas').value) || 0,
                taxa_plataforma_percentual: parseFloat(document.getElementById('inputTaxaPercentual').value) || 0,
                taxa_plataforma_fixa: parseFloat(document.getElementById('inputTaxaFixa').value) || 0,
                asaas_wallet_id: document.getElementById('inputAsaasWalletId').value.trim()
            };

            const { error } = await supabaseClient.from('terreiros').update(payload).eq('id', idT);
            
            btn.disabled = false;
            btn.innerHTML = 'Salvar Regras de Cobrança';
            
            if (error) {
                msg.textContent = 'Erro: ' + error.message;
                msg.className = 'text-red-600 text-xs mt-2 text-center font-bold block';
                msg.classList.remove('hidden');
            } else {
                msg.innerHTML = '<i class="fas fa-check"></i> Salvo com sucesso!';
                msg.className = 'text-green-600 text-xs mt-2 text-center font-bold block';
                msg.classList.remove('hidden');
                setTimeout(() => document.getElementById('modalMasterFinanceiro').classList.add('hidden'), 1500);
            }
        });
    }

    const formDadosCadastrais = document.getElementById('formDadosCadastraisTerreiro');
    if (formDadosCadastrais) {
        formDadosCadastrais.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msg = document.getElementById('msgDadosCadastrais');
            const btn = formDadosCadastrais.querySelector('button[type="submit"]');

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
            if (msg) msg.classList.add('hidden');

            try {
            const cpfBruto = document.getElementById('inputTerreiroCpfCnpj').value || '';
            const elChavePix = document.getElementById('chavePixRepasse');
            const elTipoChave = document.getElementById('tipoChavePixRepasse');
            
            const chaveBruta = elChavePix ? elChavePix.value : '';
            const tipoChave = elTipoChave ? elTipoChave.value : 'CPF';
            
            // Limpa formatação (remove pontos e traços) que causam bloqueio na base de dados
            const cpfLimpo = cpfBruto.replace(/\D/g, ''); 
            const chaveLimpa = (tipoChave === 'CPF' || tipoChave === 'CNPJ') ? chaveBruta.replace(/\D/g, '') : chaveBruta.trim();

            const payload = {
                email: document.getElementById('inputTerreiroEmail').value.trim(),
                cpf_cnpj: cpfLimpo,
                dirigente_id: document.getElementById('selectDirigenteCompliance').value ? parseInt(document.getElementById('selectDirigenteCompliance').value) : null,
                phone: document.getElementById('inputTerreiroPhone').value.trim(),
                postal_code: document.getElementById('inputTerreiroPostalCode').value.trim(),
                address: document.getElementById('inputTerreiroAddress').value.trim(),
                address_number: document.getElementById('inputTerreiroAddressNumber').value.trim(),
                company_type: document.getElementById('inputTerreiroCompanyType').value,
                tipo_chave_pix_repasse: tipoChave,
                chave_pix_repasse: chaveLimpa
            };
                const { error } = await supabaseClient
                    .from('terreiros')
                    .update(payload)
                    .eq('id', idTerreiroGlobal);

                if (error) throw error;

                if (msg) {
                    msg.textContent = 'Dados cadastrais salvos com sucesso!';
                    msg.className = 'text-xs font-bold text-green-600 block';
                    msg.classList.remove('hidden');
                    setTimeout(() => msg.classList.add('hidden'), 4000);
                }
            } catch (err) {
                if (msg) {
                    msg.textContent = 'Erro ao salvar: ' + err.message;
                    msg.className = 'text-xs font-bold text-red-600 block';
                    msg.classList.remove('hidden');
                }
             } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Salvar Dados Cadastrais';
            }
        });
    }

    const formNovoTerreiro = document.getElementById('formNovoTerreiro');
    if (formNovoTerreiro) {
        formNovoTerreiro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputNome = document.getElementById('novoTerreiroNome');
            const btn = document.getElementById('btnSalvarTerreiro');
            const msg = document.getElementById('msgNovoTerreiro');

            const nome = (inputNome ? inputNome.value : '').trim();
            if (!nome) return;

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> Cadastrando...';
            if (msg) msg.classList.add('hidden');

            try {
                const { error } = await supabaseClient
                    .from('terreiros')
                    .insert([{ 
                        nome: nome,
                        modulo_mensalidade_ativo: false,
                        status_bloqueado: false
                    }]);

                if (error) throw error;

                if (inputNome) inputNome.value = '';

                if (msg) {
                    msg.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Terreiro cadastrado com sucesso!';
                    msg.className = 'text-xs font-bold text-emerald-600 block mt-2 text-center';
                    msg.classList.remove('hidden');
                    setTimeout(() => msg.classList.add('hidden'), 4000);
                }

                if (typeof carregarGestaoPlataforma === 'function') {
                    carregarGestaoPlataforma();
                }
            } catch (err) {
                if (msg) {
                    msg.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> Erro: ' + err.message;
                    msg.className = 'text-xs font-bold text-red-600 block mt-2 text-center';
                    msg.classList.remove('hidden');
                }
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-plus"></i> Cadastrar Terreiro';
            }
        });
    }

});
    
window.gerarPDFRelatorio = (titulo, colunas, dados, orientacao = 'portrait') => {
    if (!dados || dados.length === 0) {
        alert('Não há dados para gerar o relatório.');
        return;
    }

    const isLandscape = orientacao === 'landscape';
    const larguraPdfPx = isLandscape ? 1045 : 718;

    // 1. TAMANHO DE FONTE E ESPAÇAMENTO AUTOAJUSTÁVEIS
    const totalCols = colunas.length;
    let fontSize = '9pt';
    let cellPadding = '5px 6px';
    let headerFontSize = '9.5pt';

    if (totalCols >= 14) {
        fontSize = isLandscape ? '8pt' : '6.5pt';
        headerFontSize = isLandscape ? '8.5pt' : '7pt';
        cellPadding = isLandscape ? '4px 3px' : '3px 2px';
    } else if (totalCols >= 6) {
        fontSize = '7.5pt';
        headerFontSize = '8pt';
        cellPadding = '4px 3px';
    } else if (totalCols >= 4) {
        fontSize = '8.2pt';
        headerFontSize = '8.7pt';
        cellPadding = '4px 5px';
    } else {
        fontSize = '9.5pt';
        headerFontSize = '10pt';
        cellPadding = '6px 8px';
    }

    const watermarkHtml = logoTerreiroGlobal
        ? `<div style="position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; z-index: 0; pointer-events: none;">
             <img src="${logoTerreiroGlobal}" style="width: 320px; max-width: 80%;">
           </div>`
        : '';

    const theadHtml = `
        <thead>
            <tr>
                ${colunas.map((c, idx) => {
                    let larguraEstilo = '';
                    if (totalCols >= 14) {
                        larguraEstilo = idx === 0 ? 'width: 22%;' : (idx === totalCols - 1 ? 'width: 8%;' : 'width: 5.8%;');
                    }
                    const align = idx === 0 ? 'left' : 'center';
                    return `
                        <th style="background-color: #f1f5f9; color: #1e293b; font-weight: bold; border: 1px solid #cbd5e1; padding: ${cellPadding}; text-align:${align}; font-size: ${headerFontSize};${larguraEstilo}">
                            ${c}
                        </th>
                    `;
                }).join('')}
            </tr>
        </thead>
    `;

    // 2. PRÉ-CÁLCULO E MEDIÇÃO EM CONTAINER OCULTO
    const stage = document.createElement('div');
    stage.style.cssText = `position: absolute; left: -9999px; top: 0; width: ${larguraPdfPx}px; font-family: Arial, sans-serif; visibility: hidden;`;
    
    stage.innerHTML = `
        <div id="test-header" style="padding-bottom: 8px; margin-bottom: 12px; border-bottom: 2px solid #2563eb;">
            <div style="height: 55px;"></div>
        </div>
        <table id="test-table" style="width: 100%; border-collapse: collapse; table-layout: ${totalCols >= 14 ? 'fixed' : 'auto'};">
            ${theadHtml}
            <tbody>
                ${dados.map(linha => `
                    <tr>${linha.map((celula, idx) => `<td style="padding: ${cellPadding}; font-size: ${fontSize}; border: 1px solid #e2e8f0; word-break: break-word; text-align: ${idx === 0 ? 'left' : 'center'};">${celula || '-'}</td>`).join('')}</tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.body.appendChild(stage);

    const alturaHeaderPag1 = stage.querySelector('#test-header').offsetHeight + 20;
    const alturaThead = stage.querySelector('thead').offsetHeight;
    const linhasElements = stage.querySelectorAll('tbody tr');
    const alturasLinhas = Array.from(linhasElements).map(tr => tr.offsetHeight);
    document.body.removeChild(stage);

    // 3. SEPARAÇÃO DAS LINHAS EM PÁGINAS SEM CORTAR NENHUMA
    const ALTURA_BASE = isLandscape ? 660 : 980;
    const ALTURA_MAX_PAG1 = ALTURA_BASE - alturaHeaderPag1 - alturaThead;
    const ALTURA_MAX_OUTRAS = ALTURA_BASE - 45 - alturaThead;

    const paginas = [];
    let linhasPaginaAtual = [];
    let alturaAcumulada = 0;
    let limiteAtual = ALTURA_MAX_PAG1;

    dados.forEach((linha, idx) => {
        const alturaLinha = alturasLinhas[idx] || 25;

        if (alturaAcumulada + alturaLinha > limiteAtual && linhasPaginaAtual.length > 0) {
            paginas.push(linhasPaginaAtual);
            linhasPaginaAtual = [linha];
            limiteAtual = ALTURA_MAX_OUTRAS;
            alturaAcumulada = alturaLinha;
        } else {
            linhasPaginaAtual.push(linha);
            alturaAcumulada += alturaLinha;
        }
    });

    if (linhasPaginaAtual.length > 0) {
        paginas.push(linhasPaginaAtual);
    }

    // 4. CONSTRUÇÃO DO HTML FINAL PAGINADO
    const containerPDF = document.createElement('div');
    containerPDF.style.cssText = `width: ${larguraPdfPx}px; font-family: Arial, sans-serif; color: #333;`;

    const dataAtual = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    let htmlFinal = '';

    paginas.forEach((grupoLinhas, numPag) => {
        const ehPrimeira = numPag === 0;
        const pageBreak = ehPrimeira ? '' : 'page-break-before: always;';

        htmlFinal += `
            <div class="pagina-relatorio" style="position: relative; ${pageBreak} padding: 4px 0;">
                ${watermarkHtml}
                <div style="position: relative; z-index: 1;">
        `;

        if (ehPrimeira) {
            htmlFinal += `
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 12px;">
                    <div style="width: 70px;">
                        ${logoTerreiroGlobal ? `<img src="${logoTerreiroGlobal}" style="max-height: 50px; max-width: 70px; object-fit: contain;">` : ''}
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <h2 style="margin: 0; color: #1e3a8a; font-size: 13pt; text-transform: uppercase;">${nomeTerreiroGlobal || 'Templo'}</h2>
                        <h3 style="margin: 3px 0 0 0; color: #475569; font-size: 10.5pt;">${titulo}</h3>
                        <p style="margin: 3px 0 0 0; color: #64748b; font-size: 7.5pt;">Emitido em: ${dataAtual} | Registros: ${dados.length}</p>
                    </div>
                    <div style="width: 70px; text-align: right; font-size: 8pt; color: #94a3b8;">Pág. 1/${paginas.length}</div>
                </div>
            `;
        } else {
            htmlFinal += `
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 10px;">
                    <span style="font-size: 8pt; color: #475569; font-weight: bold;">${nomeTerreiroGlobal || 'Templo'} — ${titulo} (Continuação)</span>
                    <span style="font-size: 8pt; color: #94a3b8;">Pág. ${numPag + 1}/${paginas.length}</span>
                </div>
            `;
        }

        htmlFinal += `
            <table style="width: 100%; border-collapse: collapse; table-layout: ${totalCols >= 14 ? 'fixed' : 'auto'};">
                ${theadHtml}
                <tbody>
        `;

        grupoLinhas.forEach((linha, i) => {
            const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
            htmlFinal += `
                <tr style="background-color: ${bg};">
                    ${linha.map((celula, idx) => `
                        <td style="border: 1px solid #e2e8f0; padding: ${cellPadding}; color: #334155; font-size: ${fontSize}; vertical-align: middle; word-break: break-word; text-align:${idx === 0 ? 'left' : 'center'};">
                            ${celula || '-'}
                        </td>
                    `).join('')}
                </tr>
            `;
        });

        htmlFinal += `
                </tbody>
            </table>
            </div>
            </div>
        `;
    });

    containerPDF.innerHTML = htmlFinal;

    const opt = {
        margin:       [10, 10, 15, 10], // Deixa uma margem maior embaixo para o rodapé
        filename:     `${titulo.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: orientacao },
        pagebreak:    { mode: ['css', 'legacy'] }
    };

    // Adiciona o rodapé automático com o total de páginas (Pág. X de Y) em cada página gerada
    html2pdf().set(opt).from(containerPDF).toPdf().get('pdf').then((pdf) => {
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            
            // Texto centralizado ou à direita no rodapé
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            const textoRodapé = `Página ${i} de ${totalPages}`;
            pdf.text(textoRodapé, pageWidth - 15, pageHeight - 8, { align: 'right' });
            
            // Opcional: Nome da instituição ou data à esquerda no rodapé
            pdf.text(`${nomeTerreiroGlobal || 'Templo'} — Documento Oficial`, 15, pageHeight - 8, { align: 'left' });
        }
    }).save();
};
setTimeout(() => {
    const elNome = document.getElementById('filtroNomeMedium');
    const elGrau = document.getElementById('filtroGrauMedium');
    const elStatus = document.getElementById('filtroStatusMedium');
    const elPerm = document.getElementById('filtroPermissaoMedium');
    const elMes = document.getElementById('filtroMesNascimento');

    if (elNome) {
        elNome.addEventListener('input', () => window.aplicarFiltrosMediuns());
        elNome.addEventListener('keyup', () => window.aplicarFiltrosMediuns());
    }
    if (elGrau) elGrau.addEventListener('change', () => window.aplicarFiltrosMediuns());
    if (elStatus) elStatus.addEventListener('change', () => window.aplicarFiltrosMediuns());
    if (elPerm) elPerm.addEventListener('change', () => window.aplicarFiltrosMediuns());
    if (elMes) elMes.addEventListener('change', () => window.aplicarFiltrosMediuns());
    
    document.getElementById('filtroConvocadosNome')?.addEventListener('input', () => window.filtrarConvocados('listaCheckConvocados', 'filtroConvocadosNome', 'filtroConvocadosGrau'));
    document.getElementById('filtroConvocadosGrau')?.addEventListener('change', () => window.filtrarConvocados('listaCheckConvocados', 'filtroConvocadosNome', 'filtroConvocadosGrau'));
    document.getElementById('editFiltroConvocadosNome')?.addEventListener('input', () => window.filtrarConvocados('editListaCheckConvocados', 'editFiltroConvocadosNome', 'editFiltroConvocadosGrau'));
    document.getElementById('editFiltroConvocadosGrau')?.addEventListener('change', () => window.filtrarConvocados('editListaCheckConvocados', 'editFiltroConvocadosNome', 'editFiltroConvocadosGrau'));

    document.getElementById('btnImprimirMediuns')?.addEventListener('click', () => {
        const btn = document.getElementById('btnImprimirMediuns');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Gerando...';
        btn.disabled = true;
        
        const lista = window.mediunsFiltrados || listaMediunsGlobal;
        const dados = lista.map(m => {
            let dataNasc = '-';
            if (m.data_nascimento) {
                if (m.data_nascimento.includes('-')) {
                    const p = m.data_nascimento.split('-');
                    if(p.length === 3) dataNasc = `${p[2]}/${p[1]}/${p[0]}`;
                } else dataNasc = m.data_nascimento;
            }
            const nomeStr = m.nome_completo;
            const whats = m.telefone || '-';
            const palavra = m.palavra || '-';
            return [nomeStr, dataNasc, m.grau || '-', m.funcao || '-', whats, palavra];
        });
        
        dados.sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
        
        window.gerarPDFRelatorio('Quadro Oficial de Médiuns', ['Nome Completo', 'Nascimento', 'Grau', 'Função', 'WhatsApp', 'Palavra'], dados);
        setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
    });

    document.getElementById('btnImprimirAniversariantes')?.addEventListener('click', () => {
        const btn = document.getElementById('btnImprimirAniversariantes');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
        
        const dataAtual = new Date();
        const mesAtualNum = (dataAtual.getMonth() + 1).toString().padStart(2, '0');
        
        const lista = listaMediunsGlobal.filter(m => {
            if (!m.data_nascimento) return false;
            let mesNasc = '';
            if (m.data_nascimento.includes('-')) mesNasc = m.data_nascimento.split('-')[1];
            else if (m.data_nascimento.includes('/')) mesNasc = m.data_nascimento.split('/')[1];
            return mesNasc === mesAtualNum;
        });
        
        if(lista.length === 0) {
            alert("Nenhum aniversariante neste mês para gerar relatório.");
            btn.innerHTML = originalHtml; btn.disabled = false;
            return;
        }
        
        lista.sort((a, b) => {
            let diaA = 0, diaB = 0;
            if(a.data_nascimento.includes('-')) diaA = parseInt(a.data_nascimento.split('-')[2]);
            if(b.data_nascimento.includes('-')) diaB = parseInt(b.data_nascimento.split('-')[2]);
            return diaA - diaB;
        });
        
        const dados = lista.map(m => {
            let diaMes = '-';
            if (m.data_nascimento) {
                if (m.data_nascimento.includes('-')) {
                    const p = m.data_nascimento.split('-');
                    if(p.length === 3) diaMes = `${p[2]}/${p[1]}`;
                } else {
                    const dataNasc = m.data_nascimento;
                    if(dataNasc.includes('/')) diaMes = dataNasc.substring(0, 5);
                }
            }

            const nomeExibicao = m.nome_completo || 'Médium';
            const g = m.grau && m.grau !== '-' ? m.grau : '';
            const f = m.funcao && m.funcao !== '-' ? m.funcao : '';
            let grauFuncao = '-';
            if (g && f) grauFuncao = `${g}/${f}`;
            else grauFuncao = g || f || '-';

            return [diaMes, nomeExibicao, grauFuncao];
        });
        
        const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long' });
        const titulo = `Aniversariantes de ${mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1)}`;
        
        window.gerarPDFRelatorio(titulo, ['Data', 'Nome', 'Grau'], dados);
        setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
    });

    document.getElementById('btnImprimirFinanceiro')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnImprimirFinanceiro');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Gerando...';
        btn.disabled = true;

        try {
            const anoBusca = parseInt(document.getElementById('selectAnoFinanceiro').value) || new Date().getFullYear();

            const { data: todosMediuns, error: errMediuns } = await supabaseClient.from('mediuns')
                .select('id, nome_completo, isento_mensalidade, grau, funcao')
                .eq('terreiro_id', idTerreiroGlobal)
                .neq('nome_completo', 'Administrador Sistema')
                .order('nome_completo');

            if (errMediuns) throw errMediuns;

            const mediuns = (todosMediuns || []).filter(m => {
                const ehDirigente = (m.grau === 'Dirigente' || m.funcao === 'Dirigente');
                return !(ehDirigente && m.isento_mensalidade === true);
            });

            if (mediuns.length === 0) {
                alert('Nenhum médium registrado para gerar o relatório financeiro.');
                return;
            }

            const idsMediuns = mediuns.map(m => m.id);

            let pgtos = [];
            let deLinha = 0;
            const tamanhoBloco = 1000;

            while (true) {
                const { data: blocoPgtos, error: errBloco } = await supabaseClient.from('financeiro')
                    .select('medium_id, mes, ano, pago, isento')
                    .eq('ano', anoBusca)
                    .in('medium_id', idsMediuns)
                    .range(deLinha, deLinha + tamanhoBloco - 1);

                if (errBloco) throw errBloco;

                if (blocoPgtos && blocoPgtos.length > 0) {
                    pgtos.push(...blocoPgtos);
                    if (blocoPgtos.length < tamanhoBloco) break;
                    deLinha += tamanhoBloco;
                } else {
                    break;
                }
            }

            const mesAtual = new Date().getMonth() + 1;
            const anoAtual = new Date().getFullYear();

            const dados = mediuns.map(m => {
                const meusPgtos = pgtos ? pgtos.filter(p => p.medium_id === m.id) : [];
                let emDia = true;

                const dataIngresso = m.created_at ? new Date(m.created_at) : new Date('2000-01-01');
                const mesIngresso = dataIngresso.getMonth() + 1;
                const anoIngresso = dataIngresso.getFullYear();

                const linha = [m.nome_completo];

                for (let i = 1; i <= 12; i++) {
                    const pgto = meusPgtos.find(p => p.mes === i);
                    const isAntesDoIngresso = (anoBusca < anoIngresso) || (anoBusca === anoIngresso && i < mesIngresso);
                    const isIsento = m.isento_mensalidade === true || (pgto ? pgto.isento : false);
                    const pago = pgto ? pgto.pago : false;
                    const passou = (anoBusca < anoAtual) || (anoBusca === anoAtual && i < mesAtual);

                    if (passou && !pago && !isIsento && !isAntesDoIngresso) emDia = false;

                    if (isAntesDoIngresso) {
                        linha.push('<span style="color: #cbd5e1;">-</span>');
                    } else if (isIsento) {
                        linha.push('<span style="color: #9333ea; font-weight: bold;">Isento</span>');
                    } else if (pago) {
                        linha.push('<span style="color: #16a34a; font-weight: bold;">Pago</span>');
                    } else {
                        linha.push(passou ? '<span style="color: #dc2626; font-weight: bold;">Pend.</span>' : '<span style="color: #94a3b8;">Aber.</span>');
                    }
                }

                linha.push(emDia ? '<span style="color: #16a34a; font-weight: bold;">Em Dia</span>' : '<span style="color: #dc2626; font-weight: bold;">Pendente</span>');
                return linha;
            });

            dados.sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));

            const colunas = ['Médium', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Status'];
            window.gerarPDFRelatorio(`Relatório Financeiro Anual - ${anoBusca}`, colunas, dados, 'landscape');

        } catch (err) {
            console.error(err);
            alert('Erro ao gerar relatório financeiro: ' + err.message);
        } finally {
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }, 2000);
        }
    });
}, 500);

window.abrirModalNovoMedium = () => {
    document.getElementById('msgNovoMedium')?.classList.add('hidden');
    document.getElementById('resultadoNovoMedium')?.classList.add('hidden');
    const f = document.getElementById('formNovoMedium');
    if (f) {
        f.reset();
        f.classList.remove('hidden');
    }
    document.getElementById('modalNovoMedium')?.classList.remove('hidden');
};

window.fecharModalNovoMedium = () => {
    document.getElementById('modalNovoMedium')?.classList.add('hidden');
    document.getElementById('menuQuadroMediuns')?.click();
};

window.verFichaEmergencia = (id) => {
    const m = listaMediunsGlobal.find(x => x.id === id);
    if (!m) return;

    const plano = m.possui_plano_saude ? (m.qual_plano_saude || 'Sim (Não especificado)') : 'Não possui';
    const sangue = m.tipo_sanguineo || 'Não informado';
    const comorb = m.comorbidades_alergias || 'Nenhuma relatada';
    const contNome = m.emergencia_nome || 'Não informado';
    const contTel = m.emergencia_telefone || '';

    const resumo = `🏥 FICHA DE EMERGÊNCIA E SAÚDE\n` +
                   `Médium: ${m.nome_completo}\n` +
                   `──────────────────────────────\n` +
                   `• Contato de Emergência: ${contNome}\n` +
                   `• Tel. Emergência: ${contTel || 'Não informado'}\n` +
                   `• Tipo Sanguíneo: ${sangue}\n` +
                   `• Plano de Saúde: ${plano}\n` +
                   `• Comorbidades / Alergias:\n  ${comorb}\n` +
                   `──────────────────────────────` +
                   (contTel ? `\n\nDeseja abrir o WhatsApp do contato de emergência agora?` : '');

    if (contTel) {
        if (confirm(resumo)) {
            const num = contTel.replace(/\D/g, '');
            const ddi = num.startsWith('55') ? '' : '55';
            window.open(`https://wa.me/${ddi}${num}`, '_blank');
        }
    } else {
        alert(resumo);
    }
};

window.abrirModalEditarMedium = async (id) => {
    const medium = listaMediunsGlobal.find(m => m.id === id);
    if (!medium) return alert("Médium não encontrado.");

    document.getElementById('editMediumId').value = medium.id;
    document.getElementById('editMediumNome').value = medium.nome_completo || '';
    document.getElementById('editMediumNomeSocial').value = medium.nome_social || '';
    document.getElementById('editMediumTelefone').value = medium.telefone || '';
    document.getElementById('editMediumNascimento').value = medium.data_nascimento || '';
    if (document.getElementById('editMediumCpf')) document.getElementById('editMediumCpf').value = medium.cpf || '';
    if (document.getElementById('editMediumEstadoCivil')) document.getElementById('editMediumEstadoCivil').value = medium.estado_civil || '';
    if (document.getElementById('editMediumProfissao')) document.getElementById('editMediumProfissao').value = medium.profissao || '';
    if (document.getElementById('editMediumEmergNome')) document.getElementById('editMediumEmergNome').value = medium.emergencia_nome || '';
    if (document.getElementById('editMediumEmergTel')) document.getElementById('editMediumEmergTel').value = medium.emergencia_telefone || '';
    if (document.getElementById('editMediumPlano')) document.getElementById('editMediumPlano').value = medium.qual_plano_saude || '';
    if (document.getElementById('editMediumTipoSang')) document.getElementById('editMediumTipoSang').value = medium.tipo_sanguineo || '';
    if (document.getElementById('editMediumComorbidades')) document.getElementById('editMediumComorbidades').value = medium.comorbidades_alergias || '';

    const selGrau = document.getElementById('editMediumGrau');
    const selFuncao = document.getElementById('editMediumFuncao');
    if (selGrau) selGrau.innerHTML = renderizarOpcoes(opcoesGrau, medium.grau || '-');
    if (selFuncao) selFuncao.innerHTML = renderizarOpcoes(opcoesFuncao, medium.funcao || '-');
    document.getElementById('msgEditMedium')?.classList.add('hidden');
    document.getElementById('modalEditarMedium')?.classList.remove('hidden');

    // Carregamento dos familiares vinculados
    const boxFam = document.getElementById('editMediumFamiliares');
    if (boxFam) {
        boxFam.innerHTML = '<span class="text-gray-400"><i class="fas fa-spinner fa-spin mr-1"></i> Buscando familiares...</span>';
        try {
            const { data: vinculos, error } = await supabaseClient
                .from('vinculos_familiares')
                .select('*')
                .or(`solicitante_id.eq.${id},familiar_id.eq.${id}`)
                .eq('status', 'aprovado');

            if (error) throw error;

            if (!vinculos || vinculos.length === 0) {
                boxFam.innerHTML = '<span class="text-gray-400">Nenhum familiar vinculado.</span>';
                return;
            }

            const idsFamiliares = vinculos.map(v => v.solicitante_id === id ? v.familiar_id : v.solicitante_id);
            const parentes = listaMediunsGlobal.filter(m => idsFamiliares.includes(m.id));

            if (parentes.length === 0) {
                boxFam.innerHTML = '<span class="text-gray-400">Nenhum familiar encontrado na lista.</span>';
            } else {
                boxFam.innerHTML = `
                    <ul class="space-y-1">
                        ${parentes.map(p => `
                            <li class="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                                <span><strong>${p.nome_completo}</strong> <span class="text-gray-400">(${p.grau || '-'})</span></span>
                                <span class="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Ativo</span>
                            </li>
                        `).join('')}
                    </ul>
                `;
            }
        } catch (err) {
            boxFam.innerHTML = `<span class="text-red-500">Erro ao carregar: ${err.message}</span>`;
        }
    }
};

window.fecharModalEditarMedium = () => {
    document.getElementById('modalEditarMedium')?.classList.add('hidden');
};

window.excluirMedium = async (id, nome) => {
    if(!confirm(`ATENÇÃO: Deseja excluir DEFINITIVAMENTE o médium ${nome}?`)) return;
    const { error } = await supabaseClient.from('mediuns').delete().eq('id', id).eq('terreiro_id', idTerreiroGlobal);
    if (error) alert('Erro ao excluir: ' + error.message);
    else { alert('Médium excluído!'); document.getElementById('menuQuadroMediuns')?.click(); }
};

window.alternarStatusAtivoMedium = async (id, statusAtual) => {
    const novoStatus = !statusAtual;
    const msg = novoStatus ? "Deseja REATIVAR o acesso deste médium?" : "Deseja INATIVAR este médium? Ele não poderá mais acessar a plataforma.";
    if(!confirm(msg)) return;
    
    const { error } = await supabaseClient.from('mediuns').update({ status_ativo: novoStatus }).eq('id', id).eq('terreiro_id', idTerreiroGlobal);
    if (error) alert('Erro ao alterar status: ' + error.message);
    else document.getElementById('menuQuadroMediuns')?.click();
};

window.abrirModalPermissoes = (id, nome, permsString) => {
    document.getElementById('idMediumPermissao').value = id;
    document.getElementById('nomeMediumPermissao').textContent = nome;
    
    // Agora desestrutura também o pEscalas no final
    const [pAgenda, pGrau, pFin, pDoa, pAdmin, pVisao, pAta, pQuadro, pGuias, pIA, pEscalas] = permsString.split(','); 
    
    document.getElementById('chkPermAgenda').checked = pAgenda === 'true';
    document.getElementById('chkPermGrau').checked = pGrau === 'true';
    document.getElementById('chkPermFinanceiro').checked = pFin === 'true';
    document.getElementById('chkPermDoacoes').checked = pDoa === 'true';
    document.getElementById('chkPermAdmin').checked = pAdmin === 'true';
    if (document.getElementById('chkPermVisao')) document.getElementById('chkPermVisao').checked = pVisao === 'true';
    if (document.getElementById('chkPermAta')) document.getElementById('chkPermAta').checked = pAta === 'true';
    if (document.getElementById('chkPermQuadro')) document.getElementById('chkPermQuadro').checked = pQuadro === 'true';
    if (document.getElementById('chkPermGuias')) document.getElementById('chkPermGuias').checked = pGuias === 'true';
    if (document.getElementById('chkPermIA')) document.getElementById('chkPermIA').checked = pIA === 'true';
    
    // NOVA LINHA QUE LÊ A VARIÁVEL pEscalas E MARCA NA TELA
    if (document.getElementById('chkPermEscalas')) document.getElementById('chkPermEscalas').checked = pEscalas === 'true'; 
    
    document.getElementById('modalPermissoes').classList.remove('hidden');
};

window.renderizarCheckboxesConvocados = (containerId, listaSelecionadosIniciais = []) => {
    window['selecionados_' + containerId] = Array.isArray(listaSelecionadosIniciais) ? [...listaSelecionadosIniciais].map(String) : [];
    
    if (!listaMediunsGlobal || listaMediunsGlobal.length === 0) {
        supabaseClient.from('mediuns')
            .select('id, auth_id, nome_completo, nome_social, grau, funcao')
            .eq('terreiro_id', idTerreiroGlobal)
            .neq('nome_completo', 'Administrador Sistema')
            .order('nome_completo')
            .then(({ data }) => {
                listaMediunsGlobal = data || [];
                window.filtrarConvocados(containerId, containerId === 'editListaCheckConvocados' ? 'editFiltroConvocadosNome' : 'filtroConvocadosNome', containerId === 'editListaCheckConvocados' ? 'editFiltroConvocadosGrau' : 'filtroConvocadosGrau');
            });
    } else {
        window.filtrarConvocados(containerId, containerId === 'editListaCheckConvocados' ? 'editFiltroConvocadosNome' : 'filtroConvocadosNome', containerId === 'editListaCheckConvocados' ? 'editFiltroConvocadosGrau' : 'filtroConvocadosGrau');
    }
};

document.addEventListener('change', (e) => {
    if (e.target.id === 'giraInformativo' && e.target.checked) {
        if (document.getElementById('giraGeraAta')) document.getElementById('giraGeraAta').checked = false;
    }
    if (e.target.id === 'editGiraInformativo' && e.target.checked) {
        if (document.getElementById('editGiraGeraAta')) document.getElementById('editGiraGeraAta').checked = false;
    }
    if(e.target.id === 'giraEspecial') {
        const box = document.getElementById('boxConvocados');
        if(e.target.checked) {
            box?.classList.remove('hidden');
            window.renderizarCheckboxesConvocados('listaCheckConvocados', []);
        } else box?.classList.add('hidden');
    }
    if(e.target.id === 'editGiraEspecial') {
        const box = document.getElementById('editBoxConvocados');
        if(e.target.checked) {
            box?.classList.remove('hidden');
            window.renderizarCheckboxesConvocados('editListaCheckConvocados', []);
        } else box?.classList.add('hidden');
    }
    
    // Novas checkboxes criação
    if (e.target.id === 'giraReqBatismo') {
        const box = document.getElementById('boxBatismo');
        if(e.target.checked) { box?.classList.remove('hidden'); window.renderizarSacramentos('batismo', 'listaCheckBatismo'); } else box?.classList.add('hidden');
    }
    if (e.target.id === 'giraReqConsagracao') {
        const box = document.getElementById('boxConsagracao');
        if(e.target.checked) { box?.classList.remove('hidden'); window.renderizarSacramentos('consagracao', 'listaCheckConsagracao'); } else box?.classList.add('hidden');
    }
    if (e.target.id === 'giraReqCoroacao') {
        const box = document.getElementById('boxCoroacao');
        if(e.target.checked) { box?.classList.remove('hidden'); window.renderizarSacramentos('coroacao', 'listaCheckCoroacao'); } else box?.classList.add('hidden');
    }

    // Novas checkboxes edição
    if (e.target.id === 'editGiraReqBatismo') {
        const box = document.getElementById('editBoxBatismo');
        if(e.target.checked) { box?.classList.remove('hidden'); window.renderizarSacramentos('batismo', 'editListaCheckBatismo', window.escalasEditAtual?.batizados); } else box?.classList.add('hidden');
    }
    if (e.target.id === 'editGiraReqConsagracao') {
        const box = document.getElementById('editBoxConsagracao');
        if(e.target.checked) { box?.classList.remove('hidden'); window.renderizarSacramentos('consagracao', 'editListaCheckConsagracao', window.escalasEditAtual?.consagrados); } else box?.classList.add('hidden');
    }
    if (e.target.id === 'editGiraReqCoroacao') {
        const box = document.getElementById('editBoxCoroacao');
        if(e.target.checked) { box?.classList.remove('hidden'); window.renderizarSacramentos('coroacao', 'editListaCheckCoroacao', window.escalasEditAtual?.coroados); } else box?.classList.add('hidden');
    }
});

// Função para buscar e renderizar os aptos
window.renderizarSacramentos = async (tipo, containerId, listaSelecionadosIniciais = []) => {
    window['selecionados_' + containerId] = Array.isArray(listaSelecionadosIniciais) ? [...listaSelecionadosIniciais].map(String) : [];
    
    if (!listaMediunsGlobal || listaMediunsGlobal.length === 0) {
        const { data } = await supabaseClient.from('mediuns').select('id, auth_id, nome_completo, nome_social, grau, funcao, data_batismo').eq('terreiro_id', idTerreiroGlobal).neq('nome_completo', 'Administrador Sistema').order('nome_completo');
        listaMediunsGlobal = data || [];
    }

    let cands = [];
    if (tipo === 'batismo') {
        cands = listaMediunsGlobal.filter(m => !m.data_batismo);
    } else if (tipo === 'consagracao') {
        cands = listaMediunsGlobal.filter(m => {
            const g = (m.grau || '').toUpperCase();
            const f = (m.funcao || '').toUpperCase();
            return ['SCT', 'ESCOLA DE CT', 'CT'].includes(g) || f === 'MGA';
        });
    } else if (tipo === 'coroacao') {
        cands = listaMediunsGlobal.filter(m => {
            const g = (m.grau || '').toUpperCase();
            const f = (m.funcao || '').toUpperCase();
            return ['SCCT', 'ESCOLA DE CCT'].includes(g) || f === 'MGA';
        });
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    if (cands.length === 0) {
        container.innerHTML = '<span class="text-xs text-gray-500 col-span-2 md:col-span-4 p-2">Nenhum médium apto encontrado.</span>';
        return;
    }

    const arrSelecionados = window['selecionados_' + containerId];
    let html = '';
    cands.forEach(m => {
        const idStr = String(m.id);
        const isChecked = arrSelecionados.includes(idStr) ? 'checked' : '';
        const nomeExibicao = m.nome_social || m.nome_completo;
        const color = tipo === 'batismo' ? 'text-sky-600 focus:ring-sky-500' : (tipo === 'consagracao' ? 'text-amber-600 focus:ring-amber-500' : 'text-yellow-600 focus:ring-yellow-500');
        
        html += `
            <label class="flex items-center space-x-2 text-xs md:text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input type="checkbox" value="${m.id}" class="rounded ${color}" ${isChecked} onchange="atualizarSelecao('${containerId}', this)">
                <span class="truncate" title="${m.nome_completo}">${nomeExibicao}</span>
            </label>
        `;
    });
    container.innerHTML = html;
};

window.atualizarSelecao = (containerId, checkbox) => {
    let arr = window['selecionados_' + containerId] || [];
    const val = String(checkbox.value);
    if(checkbox.checked) {
        if(!arr.includes(val)) arr.push(val);
    } else {
        arr = arr.filter(v => v !== val);
    }
    window['selecionados_' + containerId] = arr;
};

window.filtrarConvocados = (containerId, inputNomeId, selectGrauId) => {
    const termoNome = (document.getElementById(inputNomeId)?.value || '').toLowerCase().trim();
    const termoGrau = (document.getElementById(selectGrauId)?.value || '').toLowerCase().trim();
    
    const filtrados = (listaMediunsGlobal || []).filter(m => {
        const nomeStr = (m.nome_social ? m.nome_social : (m.nome_completo || '')).toLowerCase();
        const passaNome = !termoNome || nomeStr.includes(termoNome) || (m.nome_completo || '').toLowerCase().includes(termoNome);
        
        let passaGrau = true;
        if (termoGrau !== '') {
            const grauCompleto = `${m.grau || ''} ${m.funcao || ''}`.toLowerCase();
            passaGrau = grauCompleto.includes(termoGrau);
        }
        
        return passaNome && passaGrau;
    });

    const container = document.getElementById(containerId);
    if(!container) return;
    
    let html = '';
    const selecionados = window['selecionados_' + containerId] || [];

    if(filtrados.length === 0) {
        html = '<span class="text-xs text-gray-500 col-span-2 md:col-span-4 p-2">Nenhum médium encontrado.</span>';
    } else {
        filtrados.forEach(m => {
            const idStr = String(m.id);
            const isChecked = selecionados.includes(idStr) ? 'checked' : '';
            const nomeExibicao = m.nome_social ? m.nome_social : m.nome_completo;
            html += `
                <label class="flex items-center space-x-2 text-xs md:text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded" title="Grau: ${m.grau || '-'} / Função: ${m.funcao || '-'}">
                    <input type="checkbox" value="${m.id}" class="chk-convocado rounded text-red-500 focus:ring-red-500" ${isChecked} onchange="atualizarSelecao('${containerId}', this)">
                    <span class="truncate">${nomeExibicao}</span>
                </label>
            `;
        });
    }
    container.innerHTML = html;
};

window.excluirGira = async (id, dataInicioISO) => {
    const dataInicio = new Date(dataInicioISO);
    const agora = new Date();
    const diferencaHoras = (dataInicio - agora) / (1000 * 60 * 60);

    if (diferencaHoras < 2) {
        alert("⚠️ AÇÃO BLOQUEADA: Não é permitido excluir um evento que já iniciou, já passou, ou que começa em menos de 2 horas. Isso evita perda de dados de check-ins.");
        return;
    }

    if (!confirm("Tem certeza que deseja excluir este evento da agenda? A exclusão é irreversível.")) return;

    const { error } = await supabaseClient.from('agenda').delete().eq('id', id).eq('terreiro_id', idTerreiroGlobal);
    if (error) alert("Erro ao excluir o evento: " + error.message);
    else { alert("Evento apagado com sucesso!"); document.getElementById('menuAgendaGiras')?.click(); }
};

window.abrirModalEditarGira = async (id) => {
    const { data, error } = await supabaseClient.from('agenda').select('*').eq('id', id).eq('terreiro_id', idTerreiroGlobal).single();
    if (error) { alert("Erro ao buscar dados: " + error.message); return; }

    document.getElementById('editGiraId').value = data.id;
    document.getElementById('editGiraTitulo').value = data.titulo;
    
    const formataParaInput = (isoString) => {
        if (!isoString) return '';
        const dataBanco = new Date(isoString);
        const spDateString = dataBanco.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"});
        const spDate = new Date(spDateString);
        
        const ano = spDate.getFullYear();
        const mes = String(spDate.getMonth() + 1).padStart(2, '0');
        const dia = String(spDate.getDate()).padStart(2, '0');
        const horas = String(spDate.getHours()).padStart(2, '0');
        const minutos = String(spDate.getMinutes()).padStart(2, '0');
        
        return `${ano}-${mes}-${dia}T${horas}:${minutos}`;
    };

    document.getElementById('editGiraInicio').value = formataParaInput(data.data_hora_inicio);
    document.getElementById('editGiraFim').value = formataParaInput(data.data_hora_fim);
    if (document.getElementById('editGiraGeraAta')) document.getElementById('editGiraGeraAta').checked = data.gera_ata || false;
    if (document.getElementById('editGiraInformativo')) document.getElementById('editGiraInformativo').checked = (data.tipo === 'informativo');
    
    window.escalasEditAtual = data.escalas || {}; 

    if (document.getElementById('editGiraReqExu')) document.getElementById('editGiraReqExu').checked = data.req_escala_exu || false;
    if (document.getElementById('editGiraReqCorrente')) document.getElementById('editGiraReqCorrente').checked = data.req_escala_corrente || false;

    const chkEspecial = document.getElementById('editGiraEspecial');
    const boxEspecial = document.getElementById('editBoxConvocados');
    if (chkEspecial && boxEspecial) {
        chkEspecial.checked = data.especial || false;
        if (data.especial) {
            boxEspecial.classList.remove('hidden');
            window.renderizarCheckboxesConvocados('editListaCheckConvocados', data.convocados || []);
        } else {
            boxEspecial.classList.add('hidden');
        }
    }

    const chkBat = document.getElementById('editGiraReqBatismo');
    const boxBat = document.getElementById('editBoxBatismo');
    if (chkBat && boxBat) {
        chkBat.checked = (data.escalas && data.escalas.batizados && data.escalas.batizados.length > 0);
        if (chkBat.checked) { boxBat.classList.remove('hidden'); window.renderizarSacramentos('batismo', 'editListaCheckBatismo', data.escalas.batizados); }
        else boxBat.classList.add('hidden');
    }
    
    const chkCons = document.getElementById('editGiraReqConsagracao');
    const boxCons = document.getElementById('editBoxConsagracao');
    if (chkCons && boxCons) {
        chkCons.checked = (data.escalas && data.escalas.consagrados && data.escalas.consagrados.length > 0);
        if (chkCons.checked) { boxCons.classList.remove('hidden'); window.renderizarSacramentos('consagracao', 'editListaCheckConsagracao', data.escalas.consagrados); }
        else boxCons.classList.add('hidden');
    }

    const chkCor = document.getElementById('editGiraReqCoroacao');
    const boxCor = document.getElementById('editBoxCoroacao');
    if (chkCor && boxCor) {
        chkCor.checked = (data.escalas && data.escalas.coroados && data.escalas.coroados.length > 0);
        if (chkCor.checked) { boxCor.classList.remove('hidden'); window.renderizarSacramentos('coroacao', 'editListaCheckCoroacao', data.escalas.coroados); }
        else boxCor.classList.add('hidden');
    }

    document.getElementById('modalEditarGira').classList.remove('hidden');
};

window.fecharModalEditarGira = () => document.getElementById('modalEditarGira').classList.add('hidden');

window.abrirModalEscreverAta = async (id) => {
    try {
        const { data } = await supabaseClient.from('agenda').select('texto_ata').eq('id', id).eq('terreiro_id', idTerreiroGlobal).single();
        document.getElementById('ataEventoId').value = id;
        document.getElementById('ataTexto').value = data?.texto_ata || '';
        document.getElementById('modalEscreverAta').classList.remove('hidden');
        document.getElementById('msgEscreverAta').classList.add('hidden');
    } catch (error) {
        alert("Erro ao buscar texto: " + error.message);
    }
};

window.fecharModalEscreverAta = () => {
    document.getElementById('modalEscreverAta').classList.add('hidden');
};

window.encerrarAta = async (id) => {
        if(!confirm("Atenção! Ao encerrar a ATA, os check-ins serão bloqueados para este evento e o documento não poderá mais ser alterado. Confirmar fechamento?")) return;
        
        // 1. Busca os dados do evento para a automação de sacramentos
        const { data: evento } = await supabaseClient.from('agenda').select('escalas, data_hora_inicio').eq('id', id).eq('terreiro_id', idTerreiroGlobal).single();
        
        // 2. Trava a Ata
        const { error } = await supabaseClient.from('agenda').update({ ata_encerrada: true }).eq('id', id).eq('terreiro_id', idTerreiroGlobal);
        
        if (error) {
            alert("Erro ao encerrar: " + error.message);
        } else {
            // 3. Automação Pós-Gira: Grava a data dos sacramentos no perfil dos médiuns
            if (evento && evento.escalas) {
                try {
                    const dataGira = evento.data_hora_inicio.split('T')[0]; // Formato YYYY-MM-DD
                    const { batizados, consagrados, coroados } = evento.escalas;
                    
                    if (batizados && batizados.length > 0) {
                        await supabaseClient.from('mediuns').update({ data_batismo: dataGira }).in('id', batizados).is('data_batismo', null);
                    }
                    if (consagrados && consagrados.length > 0) {
                        await supabaseClient.from('mediuns').update({ data_consagracao: dataGira }).in('id', consagrados).is('data_consagracao', null);
                    }
                    if (coroados && coroados.length > 0) {
                        await supabaseClient.from('mediuns').update({ data_coroacao: dataGira }).in('id', coroados).is('data_coroacao', null);
                    }
                } catch(e) {
                    console.warn('Erro não-crítico ao atualizar datas de sacramentos:', e);
                }
            }

            alert("Sessão Encerrada e sacramentos lançados! O documento oficial está disponível para download.");
            document.getElementById('menuLivroAta')?.click();
        }
    };;

window.baixarLivroAnual = async () => {
    alert("Atenção: A consolidação do Livro Anual gera arquivo muito pesado. Esta função está sendo adaptada para rodar em segundo plano e será liberada em breve. Por favor, baixe as atas de forma individual na tabela abaixo.");
};

window.arquivarAnoAnterior = async () => {
    const anoAtual = new Date().getFullYear();
    if(!confirm(`ATENÇÃO EXTREMA: Você está prestes a excluir definitivamente todas as ATAs anteriores a ${anoAtual}. Certifique-se de já ter baixado e feito backup dos PDFs. Deseja prosseguir com a exclusão?`)) return;
    
    const { error } = await supabaseClient.from('agenda')
        .delete()
        .eq('terreiro_id', idTerreiroGlobal)
        .eq('gera_ata', true)
        .lte('data_hora_inicio', `${anoAtual}-01-01T00:00:00`);
        
    if (error) alert("Erro ao limpar dados antigos: " + error.message);
    else {
        alert("Limpeza do exercício anterior concluída com sucesso!");
        document.getElementById('menuLivroAta')?.click();
    }
};

window.gerarPDF_ATA = async (eventoId) => {
    try {
        const { data: evento, error: errEv } = await supabaseClient.from('agenda').select('*').eq('id', eventoId).eq('terreiro_id', idTerreiroGlobal).single();
        if (errEv || !evento) throw new Error("Erro ao buscar dados do evento.");

        const anoEvento = new Date(evento.data_hora_inicio).getFullYear();
        const { data: eventosAnteriores } = await supabaseClient
            .from('agenda')
            .select('id')
            .eq('terreiro_id', idTerreiroGlobal)
            .eq('gera_ata', true)
            .gte('data_hora_inicio', `${anoEvento}-01-01T00:00:00`)
            .lte('data_hora_inicio', evento.data_hora_inicio);
            
        const numeroAta = eventosAnteriores ? eventosAnteriores.length : 1;

        // 1. Presenças dos Médiuns
        const { data: presencas } = await supabaseClient.from('presencas').select('data_hora_checkin, usuario_id').eq('evento_id', eventoId).order('data_hora_checkin', { ascending: true });
        
        const { data: mediuns } = await supabaseClient.from('mediuns').select('id, auth_id, nome_completo, nome_social, grau, funcao').eq('terreiro_id', idTerreiroGlobal);
            
        const mapaMediuns = {};
        if(mediuns) {
            mediuns.forEach(m => {
                mapaMediuns[m.id] = m;
                if(m.auth_id) mapaMediuns[m.auth_id] = m;
            });
        }

        // 2. Presenças da Assistência
        const { data: assistencias } = await supabaseClient.from('presencas_assistencia')
            .select('nome_completo, primeira_vez, data_hora_checkin')
            .eq('evento_id', eventoId)
            .order('data_hora_checkin', { ascending: true });

        const dataEv = new Date(evento.data_hora_inicio);
        const dia = dataEv.getDate().toString().padStart(2, '0');
        const mesNum = (dataEv.getMonth() + 1).toString().padStart(2, '0');
        const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const mesExtenso = meses[dataEv.getMonth()];
        const ano = dataEv.getFullYear();
        const hora = dataEv.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const dataEventoFormatada = `${dia}/${mesNum}/${ano}`;
        const horaEncerramento = evento.data_hora_fim 
            ? new Date(evento.data_hora_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
            : hora;

        if (presencas && presencas.length > 0) {
            presencas.sort((a, b) => {
                const mediumA = mapaMediuns[a.usuario_id] || {};
                const mediumB = mapaMediuns[b.usuario_id] || {};
                
                const isDirigenteA = mediumA.funcao === 'Dirigente' || mediumA.grau === 'Dirigente';
                const isDirigenteB = mediumB.funcao === 'Dirigente' || mediumB.grau === 'Dirigente';
                
                if (isDirigenteA && !isDirigenteB) return -1;
                if (!isDirigenteA && isDirigenteB) return 1;
                
                const timeA = new Date(a.data_hora_checkin).getTime();
                const timeB = new Date(b.data_hora_checkin).getTime();
                
                return timeA - timeB;
            });
        }

        // Linhas da Corrente Mediúnica
        let trsMediuns = '';
        if (presencas && presencas.length > 0) {
            presencas.forEach((p, index) => {
                const medium = mapaMediuns[p.usuario_id] || { nome_completo: 'Médium não identificado', grau: '-', funcao: '-' };
                const nomeFinal = medium.nome_completo;
                const horaCheckin = new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                let grauExibicao = '-';
                const gStr = medium.grau && medium.grau !== '-' ? medium.grau : '';
                const fStr = medium.funcao && medium.funcao !== '-' ? medium.funcao : '';
                if (gStr && fStr) grauExibicao = `${gStr}/${fStr}`;
                else if (gStr) grauExibicao = gStr;
                else if (fStr) grauExibicao = fStr;

                const isDirigente = medium.funcao === 'Dirigente' || medium.grau === 'Dirigente';
                const estiloLinha = isDirigente ? 'font-weight: bold; background-color: #f8fafc;' : '';
                
                let borderStyle = '1px solid #ddd';
                const nextP = presencas[index + 1];
                if (isDirigente && nextP) {
                    const nextMedium = mapaMediuns[nextP.usuario_id] || {};
                    const isNextDirigente = nextMedium.funcao === 'Dirigente' || nextMedium.grau === 'Dirigente';
                    if (!isNextDirigente) {
                        borderStyle = '2px solid #000'; 
                    }
                }

                // --- INJEÇÃO DA LÓGICA DE ESCALAS E SACRAMENTOS ---
                let frasesAta = [];
                if (evento.escalas) {
                    const idMed = String(medium.id);
                    
                    // Condições Exu
                    if (evento.escalas.img_tr === idMed) frasesAta.push(`"${nomeFinal}" Entrou com a imagem de Tranca Rua das Almas`);
                    if (evento.escalas.flores_tr === idMed) frasesAta.push(`"${nomeFinal}" Entrou com as flores de Tranca Rua das Almas`);
                    if (evento.escalas.img_cigana === idMed) frasesAta.push(`"${nomeFinal}" Entrou com a imagem da Pombagira Cigana`);
                    if (evento.escalas.flores_cigana === idMed) frasesAta.push(`"${nomeFinal}" Entrou com as flores da Pombagira Cigana`);
                    if (evento.escalas.img_padilha === idMed) frasesAta.push(`"${nomeFinal}" Entrou com a imagem da Maria Padilha`);
                    if (evento.escalas.flores_padilha === idMed) frasesAta.push(`"${nomeFinal}" Entrou com as flores da Maria Padilha`);
                    
                    // Condições Sacramentos
                    if (evento.escalas.batizados && evento.escalas.batizados.includes(idMed)) frasesAta.push(`"${nomeFinal}" foi Batizado (a) nesta gira`);
                    if (evento.escalas.consagrados && evento.escalas.consagrados.includes(idMed)) frasesAta.push(`"${nomeFinal}" foi Consagrado (a) nesta gira`);
                    if (evento.escalas.coroados && evento.escalas.coroados.includes(idMed)) frasesAta.push(`"${nomeFinal}" foi Coroado (a) nesta gira`);
                }

                let discretasHtml = '';
                if (frasesAta.length > 0) {
                    discretasHtml = `<br><span style="font-size: 8px; color: #475569; font-style: italic; font-weight: normal;">↳ ${frasesAta.join('<br>↳ ')}</span>`;
                }
                // --- FIM DA INJEÇÃO ---

                trsMediuns += `
                    <tr style="${estiloLinha} page-break-inside: avoid;">
                        <td style="border-bottom: ${borderStyle}; padding: 6px 4px; overflow-wrap: break-word;">${nomeFinal}${discretasHtml}</td>
                        <td style="border-bottom: ${borderStyle}; padding: 6px 4px; text-align: center;">${grauExibicao}</td>
                        <td style="border-bottom: ${borderStyle}; padding: 6px 4px; text-align: right;">${horaCheckin}</td>
                    </tr>
                `;
            });
        } else {
            trsMediuns = `<tr><td colspan="3" style="text-align: center; padding: 15px; font-style: italic; color: #64748b;">Nenhum médium presente nesta sessão.</td></tr>`;
        }

        // Linhas da Assistência / Visitantes
        let trsAssist = '';
        if (assistencias && assistencias.length > 0) {
            assistencias.forEach((a) => {
                const horaCheckin = new Date(a.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const tagPrimeiraVez = a.primeira_vez ? ' <span style="color: #16a34a; font-size: 10px; font-weight: bold;">(1ª vez)</span>' : '';

                trsAssist += `
                    <tr style="page-break-inside: avoid;">
                        <td style="border-bottom: 1px solid #ddd; padding: 6px 4px; overflow-wrap: break-word;">${a.nome_completo}${tagPrimeiraVez}</td>
                        <td style="border-bottom: 1px solid #ddd; padding: 6px 4px; text-align: right;">${horaCheckin}</td>
                    </tr>
                `;
            });
        } else {
            trsAssist = `<tr><td colspan="2" style="text-align: center; padding: 15px; font-style: italic; color: #64748b;">Nenhum visitante registrado na assistência.</td></tr>`;
        }

        const nomeCasa = nomeTerreiroGlobal || 'Templo';
        
        let watermarkAta = '';
        if (logoTerreiroGlobal) {
            watermarkAta = `<div style="position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); opacity: 0.1; z-index: 0; pointer-events: none;">
                                <img src="${logoTerreiroGlobal}" style="width: 450px; max-width: 80%;">
                             </div>`;
        }

        const corpoTextoAta = evento.texto_ata 
            ? `<p style="text-align: justify; line-height: 1.8; font-size: 14px; margin-bottom: 25px; white-space: pre-wrap;">${evento.texto_ata}</p>`
            : `<p style="text-align: justify; line-height: 1.8; font-size: 14px; margin-bottom: 25px; text-indent: 40px;">
                Aos <strong>${dia}</strong> dias do mês de <strong>${mesExtenso}</strong> do ano de <strong>${ano}</strong>,
                com início às <strong>${hora}</strong>, realizou-se a sessão de <strong>${evento.titulo}</strong> nas dependências
                do templo <strong>${nomeCasa}</strong>. Abaixo, registram-se digitalmente a corrente mediúnica e a assistência que compuseram este trabalho:
               </p>`;

        const totalMediunsPres = presencas ? presencas.length : 0;
        const totalAssistPres = assistencias ? assistencias.length : 0;

        const div = document.createElement('div');
        div.style.padding = '40px';
        div.style.fontFamily = 'Arial, sans-serif';
        div.style.color = '#000';
        div.style.backgroundColor = '#fff';
        div.style.position = 'relative';
        
        div.innerHTML = `
            ${watermarkAta}
            <div style="position: relative; z-index: 1;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 25px;">
                    ${logoTerreiroGlobal ? `<div style="flex-shrink: 0;"><img src="${logoTerreiroGlobal}" style="max-height: 75px; max-width: 75px; object-fit: contain;"></div>` : ''}
                    <div style="text-align: left;">
                        <h1 style="font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 0 0 3px 0; color: #0f172a;">${nomeCasa}</h1>
                        <h2 style="font-size: 12px; font-weight: normal; margin: 0; letter-spacing: 2px; color: #475569; text-transform: uppercase;">LIVRO DE ATAS E PRESENÇAS</h2>
                    </div>
                </div>
                
                <h3 style="text-align: center; font-size: 15px; margin-bottom: 20px; text-transform: uppercase; background-color: rgba(243, 244, 246, 0.9); padding: 9px; border-radius: 4px;">
                    ATA Nº ${numeroAta.toString().padStart(3, '0')}/${ano} - ${evento.titulo}
                </h3>
                
                ${corpoTextoAta}
                
                <!-- BLOCO 1: CORRENTE MEDIÚNICA -->
                <div style="margin-bottom: 25px;">
                    <div style="border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: baseline;">
                        <span style="font-size: 13px; font-weight: bold; text-transform: uppercase;">1. Corrente Mediúnica</span>
                        <span style="font-size: 11px; font-weight: bold; color: #475569;">Total Presentes: ${totalMediunsPres}</span>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 15px; background-color: rgba(255, 255, 255, 0.6);">
                        <thead>
                            <tr>
                                <th style="border-bottom: 1px solid #000; padding: 6px 4px; text-align: left;">NOME DO MÉDIUM</th>
                                <th style="border-bottom: 1px solid #000; padding: 6px 4px; text-align: center; width: 18%;">GRAU</th>
                                <th style="border-bottom: 1px solid #000; padding: 6px 4px; text-align: right; width: 22%;">HORA CHECK-IN</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${trsMediuns}
                        </tbody>
                    </table>
                </div>

                <!-- BLOCO 2: ASSISTÊNCIA / VISITANTES -->
                <div style="margin-bottom: 35px; page-break-inside: auto;">
                    <div style="border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: baseline;">
                        <span style="font-size: 13px; font-weight: bold; text-transform: uppercase;">2. Assistência / Visitantes</span>
                        <span style="font-size: 11px; font-weight: bold; color: #475569;">Total Presentes: ${totalAssistPres}</span>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 15px; background-color: rgba(255, 255, 255, 0.6);">
                        <thead>
                            <tr>
                                <th style="border-bottom: 1px solid #000; padding: 6px 4px; text-align: left;">NOME DO VISITANTE</th>
                                <th style="border-bottom: 1px solid #000; padding: 6px 4px; text-align: right; width: 22%;">HORA CHECK-IN</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${trsAssist}
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-top: 40px; text-align: center; page-break-inside: avoid;">
                    <p style="margin: 0;">________________________________________________________</p>
                    <p style="font-size: 14px; margin-top: 5px;"><strong>Direção / Presidência</strong></p>
                    <p style="font-size: 9px; color: #64748b; margin-top: 18px; line-height: 1.5; max-width: 92%; margin-left: auto; margin-right: auto;">
                        Documento e presenças registrados e encerrados eletronicamente em ${dataEventoFormatada} às ${horaEncerramento}. As presenças foram validadas digitalmente mediante credencial individual de acesso e comprovação de presença física presencial por geolocalização (GPS no perímetro da sede), em conformidade com a Lei Federal nº 14.063/2020 e art. 107 do Código Civil.
                    </p>
                </div>
            </div>
        `;

        const opt = {
            margin:       [10, 10, 15, 10],
            filename:     `ATA_${numeroAta.toString().padStart(3, '0')}_${ano}_${evento.titulo.replace(/\s+/g, '_')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        alert("Gerando Livro de Presença (PDF)... Aguarde um instante.");
        html2pdf().set(opt).from(div).toPdf().get('pdf').then((pdf) => {
            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
                pdf.setTextColor(100, 100, 100);
                
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                
                pdf.text(`Página ${i} de ${totalPages}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
                pdf.text(`${nomeTerreiroGlobal || 'Templo'} — Livro de Atas e Presenças`, 15, pageHeight - 8, { align: 'left' });
            }
        }).save();

    } catch (error) {
        console.error(error);
        alert("Não foi possível gerar a ATA: " + error.message);
    }
};

window.salvarGrau = async (id) => {
    const btn = document.getElementById(`btnGrau_${id}`);
    const grau = document.getElementById(`grau_${id}`).value;
    const funcao = document.getElementById(`func_${id}`).value;
    
    // Captura os dados anteriores antes da alteração
    const md = mediunsGrauCache.find(m => m.id === id);
    const grauAnterior = md ? (md.grau || '-') : '-';
    const funcaoAnterior = md ? (md.funcao || '-') : '-';

    // Se não houve alteração, avisa o usuário e evita rodar o banco à toa
    if (grauAnterior === grau && funcaoAnterior === funcao) {
        btn.innerHTML = 'Sem mudança';
        setTimeout(() => { 
            btn.innerHTML = '<i class="fas fa-save md:hidden"></i> Salvar'; 
        }, 1500);
        return;
    }

    btn.innerHTML = 'Salvando...'; 
    btn.disabled = true;
    
    // Atualiza o médium
    const { error } = await supabaseClient
        .from('mediuns')
        .update({ grau, funcao })
        .eq('id', id)
        .eq('terreiro_id', idTerreiroGlobal);
    
    if (error) { 
        btn.innerHTML = 'Erro!'; 
        btn.classList.replace('bg-tema-primaria', 'bg-red-500'); 
        btn.disabled = false;
    } else {
        // Grava no histórico com tratamento de erro real
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            const responsavelId = session?.user?.id || null;
            const responsavelNome = perfilAdminLogado?.nome_completo || 'Administrador';

            // Extraímos o erro da inserção
            const { error: erroAuditoria } = await supabaseClient.from('historico_graus').insert([{
                medium_id: id,
                grau_anterior: grauAnterior,
                grau_novo: grau,
                funcao_anterior: funcaoAnterior,
                funcao_nova: funcao,
                responsavel_id: responsavelId,
                responsavel_nome: responsavelNome
            }]);

            // Se o Supabase retornar um erro, forçamos ele a ir para o bloco catch
            if (erroAuditoria) throw erroAuditoria;

            // Feedback de Sucesso (SÓ RODA SE A AUDITORIA GRAVAR COM SUCESSO)
            btn.innerHTML = 'Salvo <i class="fas fa-check"></i>'; 
            btn.classList.replace('bg-tema-primaria', 'bg-green-600');
            
            setTimeout(() => { 
                btn.innerHTML = '<i class="fas fa-save md:hidden"></i> Salvar'; 
                btn.classList.replace('bg-green-600', 'bg-tema-primaria'); 
                btn.disabled = false;
            }, 2000);
            
            if (md) { 
                md.grau = grau; 
                md.funcao = funcao; 
            }
        } catch (errHist) {
            console.error("Erro ao registrar auditoria de grau:", errHist);
            
            // Feedback de Erro no Histórico
            btn.innerHTML = 'Erro Histórico'; 
            btn.classList.replace('bg-tema-primaria', 'bg-orange-500');
            
            setTimeout(() => { 
                btn.innerHTML = '<i class="fas fa-save md:hidden"></i> Salvar'; 
                btn.classList.replace('bg-orange-500', 'bg-tema-primaria'); 
                btn.disabled = false;
            }, 3000);
        }
    }
};
window.imprimirHistoricoGraus = async () => {
    const btn = document.getElementById('btnImprimirHistoricoGraus');
    const originalHtml = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Gerando...';
        btn.disabled = true;
    }

    try {
        // 1. Verifica quais checkboxes estão marcados na tela
        const checkboxesMarcados = document.querySelectorAll('.chk-medium-print:checked');
        const idsSelecionados = Array.from(checkboxesMarcados).map(cb => cb.value);

        // 2. Busca os médiuns do Terreiro (filtrando se houver seleção)
        let queryMediuns = supabaseClient
            .from('mediuns')
            .select('id, nome_completo')
            .eq('terreiro_id', idTerreiroGlobal);
            
        if (idsSelecionados.length > 0) {
            queryMediuns = queryMediuns.in('id', idsSelecionados);
        }

        const { data: mediuns } = await queryMediuns;
        const idsMediuns = (mediuns || []).map(m => m.id);

        if (idsMediuns.length === 0) {
            alert("Não há médiuns na seleção para buscar o histórico.");
            return;
        }

        // 3. Busca as alterações ligadas a estes médiuns
        const { data: historico, error } = await supabaseClient
            .from('historico_graus')
            .select('*')
            .in('medium_id', idsMediuns);

        if (error) throw error;

        if (!historico || historico.length === 0) {
            alert("Ainda não há registros de alterações de graus ou funções para a seleção atual.");
            return;
        }

        // 4. Agrupa os registros por Médium
        const historicoAgrupado = {};

        historico.forEach(h => {
            const medium = mediuns.find(m => m.id === h.medium_id);
            const nomeMedium = medium ? medium.nome_completo : 'Médium Excluído';
            
            if (!historicoAgrupado[nomeMedium]) {
                historicoAgrupado[nomeMedium] = [];
            }
            historicoAgrupado[nomeMedium].push(h);
        });

        // 5. Ordena os nomes (A-Z) para o PDF
        const nomesOrdenados = Object.keys(historicoAgrupado).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        
        let htmlBlocos = '';

        // 6. Monta os blocos (caixas) por médium
        nomesOrdenados.forEach(nome => {
            // Ordena o histórico do médium por data (mais antigo para o mais novo)
            const registros = historicoAgrupado[nome].sort((a, b) => new Date(b.data_alteracao).getTime() - new Date(a.data_alteracao).getTime());
            
            let linhasHtml = '';
            
            // Adicionamos o "index" para saber qual é a linha atual
            registros.forEach((h, index) => {
                const dataFormatada = new Date(h.data_alteracao).toLocaleString('pt-BR');
                
                const formatarCargo = (grau, funcao) => {
                    const g = (grau && grau !== '-') ? grau : '';
                    const f = (funcao && funcao !== '-') ? funcao : '';
                    if (g && f) return `${g} / ${f}`;
                    if (g) return g;
                    if (f) return f;
                    return '-';
                };

                const cargoAnterior = formatarCargo(h.grau_anterior, h.funcao_anterior);
                const cargoNovo = formatarCargo(h.grau_novo, h.funcao_nova);
                const responsavel = h.responsavel_nome || 'Sistema';

                // REGRA DE COR: Verde e negrito se for o mais recente (index 0) OU se contiver "MG"
                const destaque = (index === 0 || cargoNovo.includes('MG'));
                const corTexto = destaque ? '#16a34a' : '#475569'; // Verde ou Cinza
                const pesoFonte = destaque ? 'bold' : 'normal';

                linhasHtml += `
                    <tr>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #475569; width: 25%;">${dataFormatada}</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #64748b; width: 25%;">${cargoAnterior}</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; font-weight: ${pesoFonte}; color: ${corTexto}; width: 25%;">${cargoNovo}</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #64748b; width: 25%; text-align: right;">${responsavel}</td>
                    </tr>
                `;
            });

            htmlBlocos += `
                <div style="margin-bottom: 25px; page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="background-color: #f8fafc; padding: 12px 15px; border-bottom: 1px solid #e2e8f0;">
                        <h3 style="margin: 0; font-size: 13px; font-weight: bold; color: #0f172a; text-transform: uppercase;">
                            <i class="fas fa-user-circle" style="color: #64748b; margin-right: 6px;"></i> ${nome}
                        </h3>
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #ffffff;">
                                <th style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: left; text-transform: uppercase;">Data da Alteração</th>
                                <th style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: left; text-transform: uppercase;">Grau/Função Anterior</th>
                                <th style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: left; text-transform: uppercase;">Grau/Função Novo</th>
                                <th style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: right; text-transform: uppercase;">Responsável</th>
                            </tr>
                        </thead>
                        <tbody style="background-color: #ffffff;">
                            ${linhasHtml}
                        </tbody>
                    </table>
                </div>
            `;
        });

        // 7. Monta o Documento Final
        const watermark = logoTerreiroGlobal
            ? `<div style="position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; z-index: 0; pointer-events: none;">
                 <img src="${logoTerreiroGlobal}" style="width: 350px; max-width: 80%;">
               </div>`
            : '';

        const div = document.createElement('div');
        div.style.padding = '30px';
        div.style.fontFamily = 'Arial, sans-serif';
        div.style.position = 'relative';

        const dataEmissao = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

        div.innerHTML = `
            ${watermark}
            <div style="position: relative; z-index: 1;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px;">
                    <div style="width: 80px;">
                        ${logoTerreiroGlobal ? `<img src="${logoTerreiroGlobal}" style="max-height: 60px; max-width: 80px; object-fit: contain;">` : ''}
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <h2 style="margin: 0; color: #1e3a8a; font-size: 16px; text-transform: uppercase; font-weight: bold;">${nomeTerreiroGlobal || 'Templo'}</h2>
                        <h3 style="margin: 5px 0 0 0; color: #475569; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Auditoria: Histórico de Alterações de Grau e Função</h3>
                        <p style="margin: 6px 0 0 0; color: #64748b; font-size: 10px;">Emitido em: ${dataEmissao} | Total de Registros: ${historico.length}</p>
                    </div>
                    <div style="width: 80px;"></div>
                </div>
                ${htmlBlocos}
            </div>
        `;

        const opt = {
            margin:       [10, 10, 10, 10],
            filename:     `Auditoria_Historico_Graus_${new Date().getTime()}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: ['css', 'legacy'] }
        };

        html2pdf().set(opt).from(div).save();

    } catch (err) {
        console.error("Erro na emissão do relatório de auditoria:", err);
        alert("Erro ao gerar histórico: " + err.message);
    } finally {
        if (btn) {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }
};

// =======================================================
// ADICIONE ESTA NOVA FUNÇÃO LOGO ABAIXO:
// Ela serve para a caixinha que marca/desmarca todos
// =======================================================
window.toggleTodosGraus = (source) => {
    const checkboxes = document.querySelectorAll('.chk-medium-print');
    checkboxes.forEach(cb => {
        cb.checked = source.checked;
    });
};

window.isentarAnoTodo = async (mediumId, ano) => {
    const { data: existentes } = await supabaseClient.from('financeiro')
        .select('mes, pago')
        .eq('medium_id', mediumId)
        .eq('ano', ano);
    const mesesJaPagos = new Set((existentes || []).filter(r => r.pago === true).map(r => r.mes));

    const upserts = Array.from({length: 12}, (_, i) => i + 1)
        .filter(mes => !mesesJaPagos.has(mes))
        .map(mes => ({
            medium_id: mediumId, mes: mes, ano: ano, pago: false, isento: true, origem: 'manual'
        }));

    if (upserts.length > 0) {
        const { error } = await supabaseClient.from('financeiro').upsert(upserts, { onConflict: 'medium_id,mes,ano' });
        if(error) alert('Erro: ' + error.message);
    }
    document.getElementById('menuFinanceiro')?.click();
};

window.salvarPagamento = async (mediumId, mes, ano, status, elementoCheckbox) => {
    const origem = elementoCheckbox ? elementoCheckbox.getAttribute('data-origem') : null;
    
    if (origem === 'asaas' || origem === 'pix_sistema') {
        alert("Atenção: Não é permitido desmarcar manualmente um pagamento que foi liquidado automaticamente pelo Asaas.");
        if (elementoCheckbox) elementoCheckbox.checked = true;
        return; 
    }

    // Feedback visual imediato na cor do checkbox
    if (elementoCheckbox) {
        if (status) {
            elementoCheckbox.style.accentColor = '#16a34a';
            elementoCheckbox.title = 'Pago (Manual)';
        } else {
            elementoCheckbox.style.accentColor = '';
            elementoCheckbox.title = 'Pendente (Esq. Pagar | Dir. Isentar)';
        }
    }

    try {
        // Salva direto no Supabase em segundo plano, sem refresh
        const { error } = await supabaseClient.from('financeiro').upsert({ 
            medium_id: mediumId, mes: mes, ano: ano, pago: status, isento: false, origem: 'manual' 
        }, { onConflict: 'medium_id,mes,ano' });
        
        if (error) throw error;
    } catch (err) {
        alert('Erro ao salvar pagamento: ' + err.message);
        // Se der falha de conexão, desfaz o clique
        if (elementoCheckbox) elementoCheckbox.checked = !status;
    }
};

window.toggleIsentoMes = async (event, mediumId, mes, ano, bloqueado) => {
    event.preventDefault(); 
    if (bloqueado) return;
    if(!confirm(`Deseja ISENTAR este médium do mês ${mes}/${ano}?`)) return;
    
    const { error } = await supabaseClient.from('financeiro').upsert({ 
        medium_id: mediumId, mes: mes, ano: ano, pago: false, isento: true, origem: 'manual' 
    }, { onConflict: 'medium_id,mes,ano' });
    
    if(error) alert('Erro: ' + error.message);
    document.getElementById('menuFinanceiro')?.click(); 
};

window.aprovarComprovante = async (comprovanteId) => {
    if (!confirm("Aprovar este comprovante? Os meses associados serão marcados como pagos e o documento será arquivado.")) return;

    try {
        const { data: comp, error: errComp } = await supabaseClient
            .from('comprovantes_mensalidade')
            .select('detalhes_pagamento')
            .eq('id', comprovanteId)
            .eq('terreiro_id', idTerreiroGlobal)
            .single();

        if (errComp) throw errComp;

        let upserts = [];
        if (comp.detalhes_pagamento && Array.isArray(comp.detalhes_pagamento)) {
            comp.detalhes_pagamento.forEach(det => {
                if (det.meses && Array.isArray(det.meses)) {
                    det.meses.forEach(mes => {
                        upserts.push({
                            medium_id: det.medium_id,
                            mes: mes,
                            ano: det.ano,
                            pago: true,
                            isento: false,
                            origem: 'pix_sistema'
                        });
                    });
                }
            });
        }

        if (upserts.length > 0) {
            const { error: errUpsert } = await supabaseClient
                .from('financeiro')
                .upsert(upserts, { onConflict: 'medium_id,mes,ano' });
            if (errUpsert) throw errUpsert;
        }

        const { error: errStatus } = await supabaseClient
            .from('comprovantes_mensalidade')
            .update({ status: 'aprovado' })
            .eq('id', comprovanteId)
            .eq('terreiro_id', idTerreiroGlobal);
        if (errStatus) throw errStatus;

        alert("Comprovante aprovado com sucesso! Baixas realizadas.");
        if(typeof window.carregarValidadorPagamentos === 'function') window.carregarValidadorPagamentos();

    } catch (err) {
        console.error(err);
        alert("Erro ao aprovar comprovante: " + err.message);
    }
};

window.rejeitarComprovante = async (comprovanteId) => {
    if (!confirm("Rejeitar este comprovante? As mensalidades continuarão pendentes.")) return;

    try {
        const { error } = await supabaseClient
            .from('comprovantes_mensalidade')
            .update({ status: 'rejeitado' })
            .eq('id', comprovanteId)
            .eq('terreiro_id', idTerreiroGlobal);

        if (error) throw error;
        
        alert("Comprovante rejeitado.");
        if(typeof window.carregarValidadorPagamentos === 'function') window.carregarValidadorPagamentos();
    } catch (err) {
        console.error(err);
        alert("Erro ao rejeitar comprovante: " + err.message);
    }
};

window.marcarDoacao = async (id, status) => {
    const payload = { entregue: status, data_entrega: status ? new Date().toISOString() : null };
    const { error } = await supabaseClient.from('doacoes_registradas').update(payload).eq('id', id).eq('terreiro_id', idTerreiroGlobal);
    if (!error) {
        if(typeof window.carregarDoacoesPrometidas === 'function') window.carregarDoacoesPrometidas();
    } else alert('Erro: ' + error.message);
};

window.excluirDoacao = async (id) => {
    if (!confirm('Deseja excluir este registro de doação permanentemente?')) return;
    const { error } = await supabaseClient.from('doacoes_registradas').delete().eq('id', id).eq('terreiro_id', idTerreiroGlobal);
    if (!error) {
        if(typeof window.carregarDoacoesPrometidas === 'function') window.carregarDoacoesPrometidas();
    } else alert('Erro ao excluir: ' + error.message);
};

window.alternarStatusCatalogo = async (id, status) => {
    const { error } = await supabaseClient.from('itens_doacao').update({ ativo: status }).eq('id', id).eq('terreiro_id', idTerreiroGlobal);
    if (!error) {
        if(typeof window.carregarDoacoesCatalogo === 'function') window.carregarDoacoesCatalogo();
    }
};

window.alternarModuloMensalidade = async (idTerreiro, vaiAtivar) => {
    const msg = vaiAtivar ? "Deseja ATIVAR o módulo de Tesouraria/Mensalidades para este Terreiro?" : "Desativar o módulo de Mensalidades deste Terreiro?";
    if(!confirm(msg)) return;
    const { error } = await supabaseClient.from('terreiros').update({ modulo_mensalidade_ativo: vaiAtivar }).eq('id', idTerreiro);
    if(error) alert("Erro: " + error.message); else document.getElementById('menuMaster')?.click();
};
window.alternarModuloLivroCurimba = async (idTerreiro, vaiAtivar) => {
    const msg = vaiAtivar ? "Deseja ATIVAR o módulo Livro Geral da Curimba para este Terreiro?" : "Desativar o módulo Livro Geral da Curimba deste Terreiro?";
    if(!confirm(msg)) return;
    const { error } = await supabaseClient.from('terreiros').update({ modulo_livro_curimba_ativo: vaiAtivar }).eq('id', idTerreiro);
    if(error) alert("Erro: " + error.message); else document.getElementById('menuMaster')?.click();
};

window.acessarTerreiroSaaS = (idTerreiro) => {
    localStorage.setItem('terreiroAtivoSaaS', idTerreiro);
    window.location.reload();
};

window.voltarParaMeuPainel = () => {
    localStorage.removeItem('terreiroAtivoSaaS');
    window.location.reload();
};

window.alternarBloqueioTerreiro = async (idTerreiro, vaiBloquear) => {
    const acaoStr = vaiBloquear ? "BLOQUEAR" : "DESBLOQUEAR";
    if(!confirm(`Deseja ${acaoStr} o terreiro ID ${idTerreiro}?`)) return;
    const { error } = await supabaseClient.from('terreiros').update({ status_bloqueado: vaiBloquear }).eq('id', idTerreiro);
    if(error) alert("Erro: " + error.message); else document.getElementById('menuMaster')?.click();
};

window.abrirModalImportacao = (idTerreiro, nomeTerreiro) => {
    document.getElementById('idTerreiroImport').value = idTerreiro;
    document.getElementById('nomeTerreiroImport').textContent = nomeTerreiro;
    document.getElementById('msgImportacao')?.classList.add('hidden');
    if (document.getElementById('formImportarCSV')) document.getElementById('formImportarCSV').reset();
    document.getElementById('modalImportarCSV')?.classList.remove('hidden');
};

window.fecharModalImportacao = () => {
    document.getElementById('modalImportarCSV')?.classList.add('hidden');
};

window.abrirModalFinanceiroMaster = async (idTerreiro, nomeTerreiro) => {
    document.getElementById('idTerreiroFinanceiroMaster').value = idTerreiro;
    document.getElementById('nomeTerreiroFinanceiroMaster').textContent = nomeTerreiro;
    document.getElementById('msgFinanceiroMaster').classList.add('hidden');
    
    const { data } = await supabaseClient.from('terreiros')
        .select('mensalidade_saas, taxa_plataforma_percentual, taxa_plataforma_fixa, asaas_wallet_id')
        .eq('id', idTerreiro).single();
    
    if (data) {
        document.getElementById('inputMensalidadeSaas').value = data.mensalidade_saas || 0;
        document.getElementById('inputTaxaPercentual').value = data.taxa_plataforma_percentual || 0;
        document.getElementById('inputTaxaFixa').value = data.taxa_plataforma_fixa || 0;
        document.getElementById('inputAsaasWalletId').value = data.asaas_wallet_id || '';
    }
    
    document.getElementById('modalMasterFinanceiro').classList.remove('hidden');
};

// ============================================================================
// NOVO MÓDULO: GESTÃO DE DOAÇÕES, CANTINA E RIFAS
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DAS ABAS INTERNAS (Doações, Cantina, Rifas) ---
    const btnsTab = {
        doacoes: document.getElementById('btnTabDoacoes'),
        cantina: document.getElementById('btnTabCantina'),
        rifas: document.getElementById('btnTabRifas')
    };
    const abas = {
        doacoes: document.getElementById('abaDoacoes'),
        cantina: document.getElementById('abaCantina'),
        rifas: document.getElementById('abaRifas')
    };

    function alternarAbaCampanha(abaAtiva) {
        Object.keys(btnsTab).forEach(k => {
            if (!btnsTab[k]) return;
            
            const baseClasses = "relative py-3 md:py-4 px-2 md:px-6 rounded-2xl text-xs md:text-base transition-all duration-300 transform hover:-translate-y-1 active:scale-95 flex flex-col items-center justify-center gap-1.5 md:gap-2 w-full";
            
            if (k === abaAtiva) {
                btnsTab[k].className = baseClasses + " font-black shadow-md bg-tema-secundaria text-white border-b-4 border-black/20";
                const icone = btnsTab[k].querySelector('i');
                if (icone) icone.classList.remove('opacity-70');
                if (abas[k]) abas[k].classList.remove('hidden');
            } else {
                btnsTab[k].className = baseClasses + " font-bold shadow-sm bg-white text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 hover:shadow-md";
                const icone = btnsTab[k].querySelector('i');
                if (icone) icone.classList.add('opacity-70');
                if (abas[k]) abas[k].classList.add('hidden');
            }
        });
        
        // Dispara o carregamento dos itens com um pequeno timeout para dar tempo da aba abrir visualmente
        setTimeout(() => {
            if (abaAtiva === 'rifas') carregarRifasAdmin();
            if (abaAtiva === 'doacoes') {
                if (typeof window.carregarDoacoesPrometidas === 'function') window.carregarDoacoesPrometidas();
                if (typeof window.carregarDoacoesCatalogo === 'function') window.carregarDoacoesCatalogo();
            }
            if (abaAtiva === 'cantina') {
                if (typeof carregarConfigCantina === 'function') carregarConfigCantina();
                if (typeof window.carregarDoacoesCatalogo === 'function') window.carregarDoacoesCatalogo();
            }
        }, 50);
    }

    if(btnsTab.doacoes) btnsTab.doacoes.addEventListener('click', () => alternarAbaCampanha('doacoes'));
    if(btnsTab.cantina) btnsTab.cantina.addEventListener('click', () => alternarAbaCampanha('cantina'));
    if(btnsTab.rifas) btnsTab.rifas.addEventListener('click', () => alternarAbaCampanha('rifas'));

    // Sobrescreve a função de clique do menu principal para abrir a aba Doações por padrão
    const menuDoacoes = document.getElementById('menuDoacoes');
    if (menuDoacoes) {
        menuDoacoes.addEventListener('click', () => {
            alternarAbaCampanha('doacoes');
        });
    }

    // --- MÓDULO CANTINA ---
    async function carregarConfigCantina() {
        if (!idTerreiroGlobal) return;
        const select = document.getElementById('cantinaGestor');
        
        // Carrega lista de médiuns para o select de gestor
        if (select && select.options.length <= 1) {
            const { data: mediuns } = await supabaseClient.from('mediuns').select('id, nome_completo').eq('terreiro_id', idTerreiroGlobal).neq('nome_completo', 'Administrador Sistema').order('nome_completo');
            if (mediuns) {
                mediuns.forEach(m => {
                    select.innerHTML += `<option value="${m.id}">${m.nome_completo}</option>`;
                });
            }
        }
        // Carrega Configuração Atual do Terreiro
        const { data } = await supabaseClient.from('terreiros').select('cantina_chave_pix, cantina_gestor_id').eq('id', idTerreiroGlobal).single();
        if (data) {
            document.getElementById('cantinaChavePix').value = data.cantina_chave_pix || '';
            document.getElementById('cantinaGestor').value = data.cantina_gestor_id || '';
        }
    }

    const btnSalvarCantina = document.getElementById('btnSalvarCantina');
    if (btnSalvarCantina) {
        btnSalvarCantina.addEventListener('click', async () => {
            const btnHtml = btnSalvarCantina.innerHTML;
            btnSalvarCantina.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            const pix = document.getElementById('cantinaChavePix').value.trim();
            const gestor = document.getElementById('cantinaGestor').value;
            
            const { error } = await supabaseClient.from('terreiros').update({
                cantina_chave_pix: pix,
                cantina_gestor_id: gestor ? parseInt(gestor) : null
            }).eq('id', idTerreiroGlobal);
            
            btnSalvarCantina.innerHTML = btnHtml;
            const msg = document.getElementById('msgCantinaConfig');
            msg.classList.remove('hidden');
            if(error) {
                msg.textContent = "Erro: " + error.message; msg.className = "text-xs font-bold text-red-600";
            } else {
                msg.textContent = "Salvo com sucesso!"; msg.className = "text-xs font-bold text-green-600";
                setTimeout(()=> msg.classList.add('hidden'), 3000);
            }
        });
    }

    // --- REESCREVENDO CATÁLOGO DE DOAÇÕES PARA SUPORTAR CATEGORIAS E NOVO LAYOUT ---
    
    // FORMULÁRIO DO TERREIRO
    const formNovoItemTerreiro = document.getElementById('formNovoItemTerreiro');
    if (formNovoItemTerreiro) {
        formNovoItemTerreiro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSalvarDoacaoTerreiro');
            const msg = document.getElementById('msgDoacaoTerreiro');
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adicionando...';
            
            const cat = document.getElementById('doacaoCategoriaTerreiro').value;
            const nome = document.getElementById('doacaoNomeTerreiro').value.trim();
            const val = document.getElementById('doacaoValorTerreiro').value;

            try {
                const { error } = await supabaseClient.from('itens_doacao').insert([{
                    terreiro_id: idTerreiroGlobal,
                    categoria: cat,
                    nome: nome,
                    valor_sugerido: val ? parseFloat(val) : null,
                    ativo: true
                }]);
                if (error) throw error;
                
                formNovoItemTerreiro.reset();
                window.carregarDoacoesCatalogo();
                msg.textContent = "Produto adicionado!"; msg.className = "text-xs font-bold text-green-600 block mt-2";
                msg.classList.remove('hidden'); setTimeout(()=> msg.classList.add('hidden'), 3000);
            } catch (err) {
                msg.textContent = "Erro: " + err.message; msg.className = "text-xs font-bold text-red-600 block mt-2";
                msg.classList.remove('hidden');
            } finally {
                btn.disabled = false; btn.innerHTML = 'Adicionar ao Catálogo';
            }
        });
    }

    // FORMULÁRIO DA CANTINA
    const formNovoItemCantina = document.getElementById('formNovoItemCantina');
    if (formNovoItemCantina) {
        formNovoItemCantina.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSalvarDoacaoCantina');
            const msg = document.getElementById('msgDoacaoCantina');
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adicionando...';
            
            const cat = 'cantina';
            const nome = document.getElementById('doacaoNomeCantina').value.trim();

            try {
                const { error } = await supabaseClient.from('itens_doacao').insert([{
                    terreiro_id: idTerreiroGlobal,
                    categoria: cat,
                    nome: nome,
                    valor_sugerido: null,
                    ativo: true
                }]);
                if (error) throw error;
                
                formNovoItemCantina.reset();
                window.carregarDoacoesCatalogo();
                msg.textContent = "Item adicionado com sucesso!"; msg.className = "text-xs font-bold text-green-600 block mt-2";
                msg.classList.remove('hidden'); setTimeout(()=> msg.classList.add('hidden'), 3000);
            } catch (err) {
                msg.textContent = "Erro: " + err.message; msg.className = "text-xs font-bold text-red-600 block mt-2";
                msg.classList.remove('hidden');
            } finally {
                btn.disabled = false; btn.innerHTML = 'Adicionar item para doação';
            }
        });
    }
    // REDEFINE A FUNÇÃO DE CARREGAR AS DUAS TABELAS (TERREIRO E CANTINA)
    window.carregarDoacoesCatalogo = async () => {
        if (!idTerreiroGlobal) return;
        const tbodyTerreiro = document.getElementById('tabelaItensTerreiro');
        const tbodyCantina = document.getElementById('tabelaItensCantina');
        
        if(!tbodyTerreiro || !tbodyCantina) return;

        try {
            const { data, error } = await supabaseClient.from('itens_doacao').select('*').eq('terreiro_id', idTerreiroGlobal).order('nome');
            if (error) throw error;
            
            tbodyTerreiro.innerHTML = '';
            tbodyCantina.innerHTML = '';
            
            let countTerreiro = 0;
            let countCantina = 0;

            if (data && data.length > 0) {
                data.forEach(item => {
                    const isCantina = item.categoria && item.categoria.toLowerCase().trim() === 'cantina';

                    const btn = item.ativo 
                        ? `<button onclick="alternarStatusCatalogo('${item.id}', false)" class="text-[10px] bg-gray-200 text-gray-700 px-2 py-1 rounded font-bold hover:bg-gray-300">Desativar</button>` 
                        : `<button onclick="alternarStatusCatalogo('${item.id}', true)" class="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold hover:bg-green-200">Ativar</button>`;
                    
                    let badgeCat = '';
                    if (item.categoria === 'limpeza') badgeCat = '<span class="text-[9px] font-bold text-blue-500 uppercase tracking-wider mt-0.5">Limpeza</span>';
                    if (item.categoria === 'firmeza') badgeCat = '<span class="text-[9px] font-bold text-purple-500 uppercase tracking-wider mt-0.5">Firmeza</span>';

                    let valorHtml = '';
                    const valorParsed = parseFloat(item.valor_sugerido);
                    if (!isNaN(valorParsed) && valorParsed > 0) {
                        valorHtml = `<span class="text-gray-400 font-normal text-[10px] mt-0.5">R$ ${valorParsed.toFixed(2)}</span>`;
                    }

                    const tr = `<tr class="border-b border-gray-100 ${item.ativo ? '' : 'opacity-40 bg-gray-50'} hover:bg-gray-50 transition-colors">
                        <td class="p-3 text-xs font-medium text-gray-800">
                            <div class="flex flex-col">
                                <span>${item.nome}</span>
                                ${valorHtml}
                                ${badgeCat}
                            </div>
                        </td>
                        <td class="p-3 text-center align-middle whitespace-nowrap">
                            ${btn} 
                            <button onclick="excluirItemCatalogo('${item.id}')" class="text-red-500 hover:text-red-700 ml-2"><i class="fas fa-trash text-[11px]"></i></button>
                        </td>
                    </tr>`;

                    if (isCantina) {
                        tbodyCantina.innerHTML += tr;
                        countCantina++;
                    } else {
                        tbodyTerreiro.innerHTML += tr;
                        countTerreiro++;
                    }
                });
            }
            
            if (countTerreiro === 0) tbodyTerreiro.innerHTML = '<tr><td colspan="2" class="p-6 text-center text-gray-500 text-xs">Catálogo do Terreiro vazio.</td></tr>';
            if (countCantina === 0) tbodyCantina.innerHTML = '<tr><td colspan="2" class="p-6 text-center text-gray-500 text-xs">Nenhum produto cadastrado na Cantina.</td></tr>';
            
        } catch (err) {
            console.error("Erro ao carregar catálogo:", err);
            tbodyTerreiro.innerHTML = `<tr><td colspan="2" class="p-6 text-center text-red-500 text-xs">Erro: ${err.message}</td></tr>`;
            tbodyCantina.innerHTML = `<tr><td colspan="2" class="p-6 text-center text-red-500 text-xs">Erro: ${err.message}</td></tr>`;
        }
    };

    window.excluirItemCatalogo = async (id) => {
        if(!confirm("Excluir definitivamente este item do catálogo?")) return;
        await supabaseClient.from('itens_doacao').delete().eq('id', id);
        window.carregarDoacoesCatalogo();
    };

    // --- MÓDULO RIFAS ---
    window.abrirModalNovaRifa = () => {
        document.getElementById('formNovaRifa').reset();
        document.getElementById('modalNovaRifa').classList.remove('hidden');
    };

    const formNovaRifa = document.getElementById('formNovaRifa');
    if (formNovaRifa) {
        formNovaRifa.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSalvarNovaRifa');
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            
            try {
                let imagemUrl = null;
                const fileInput = document.getElementById('rifaImagem');
                if (fileInput && fileInput.files && fileInput.files.length > 0) {
                    const arquivoOriginal = fileInput.files[0];
                    const arquivoComprimido = await comprimirImagem(arquivoOriginal, 800, 800, 0.85);
                    const nomeArquivo = `rifa_${idTerreiroGlobal}_${Date.now()}.${arquivoComprimido.name.split('.').pop()}`;
                    
                    const { error: errUp } = await supabaseClient.storage.from('logos').upload(nomeArquivo, arquivoComprimido);
                    if (!errUp) {
                        const { data: urlData } = supabaseClient.storage.from('logos').getPublicUrl(nomeArquivo);
                        imagemUrl = urlData.publicUrl;
                    }
                }

                const { error } = await supabaseClient.from('rifas').insert([{
                    terreiro_id: idTerreiroGlobal,
                    titulo: document.getElementById('rifaTitulo').value.trim(),
                    quantidade_numeros: parseInt(document.getElementById('rifaQtd').value),
                    valor_numero: parseFloat(document.getElementById('rifaValor').value),
                    chave_pix: document.getElementById('rifaPix').value.trim() || null,
                    descricao: document.getElementById('rifaDescricao').value.trim() || null,
                    imagem_url: imagemUrl,
                    status: 'aberta'
                }]);
                
                if (error) throw error;
                document.getElementById('modalNovaRifa').classList.add('hidden');
                carregarRifasAdmin();
            } catch (err) {
                alert("Erro ao criar rifa: " + err.message);
            } finally {
                btn.disabled = false; btn.innerHTML = 'Lançar Rifa';
            }
        });
    }

   async function carregarRifasAdmin() {
        if (!idTerreiroGlobal) return;
        const grid = document.getElementById('gridRifas');
        if (!grid) return;
        grid.innerHTML = '<div class="col-span-full text-center p-8 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i> Carregando rifas...</div>';

        const { data: rifas, error } = await supabaseClient.from('rifas')
            .select('*').eq('terreiro_id', idTerreiroGlobal).order('created_at', { ascending: false });

        if (error || !rifas || rifas.length === 0) {
            grid.innerHTML = '<div class="col-span-full p-6 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">Nenhuma rifa cadastrada ainda.</div>';
            return;
        }

        // Buscar dados do ganhador para as rifas encerradas
        const rifasEncerradasIds = rifas.filter(r => r.status === 'encerrada' && r.numero_vencedor).map(r => r.id);
        let ganhadores = [];
        if (rifasEncerradasIds.length > 0) {
            const { data: numVencedores } = await supabaseClient.from('rifa_numeros')
                .select('rifa_id, numero, nome_comprador, telefone_comprador')
                .in('rifa_id', rifasEncerradasIds);
            ganhadores = numVencedores || [];
        }

        grid.innerHTML = '';
        rifas.forEach(r => {
            const isEncerrada = r.status === 'encerrada';
            const bgCor = isEncerrada ? 'bg-gray-100 opacity-80' : 'bg-white border-t-4 border-indigo-500';
            const badge = isEncerrada 
                ? `<span class="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Encerrada</span>`
                : `<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"><i class="fas fa-circle text-[8px] animate-pulse"></i> Aberta</span>`;

            // Construir bloco de ganhador caso a rifa esteja encerrada
            let infoGanhadorHtml = '';
            if (isEncerrada && r.numero_vencedor) {
                const ganhador = ganhadores.find(g => g.rifa_id === r.id && g.numero === r.numero_vencedor);
                
                if (ganhador) {
                    const telNum = ganhador.telefone_comprador ? ganhador.telefone_comprador.replace(/\D/g, '') : '';
                    const ddi = telNum.startsWith('55') ? '' : '55';
                    const foneFormatado = ganhador.telefone_comprador || telNum;
                    
                    infoGanhadorHtml = `
                        <div class="bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs font-bold p-3 rounded-lg text-center mb-3">
                            <div class="mb-1"><i class="fas fa-trophy mr-1 text-yellow-600"></i> Número Vencedor: ${r.numero_vencedor}</div>
                            <div class="text-sm uppercase tracking-wider text-yellow-900 mb-1">${ganhador.nome_comprador}</div>
                            <a href="https://wa.me/${ddi}${telNum}" target="_blank" class="text-green-600 hover:text-green-700 text-sm flex items-center justify-center gap-1.5 transition">
                                <i class="fab fa-whatsapp text-base"></i> ${foneFormatado}
                            </a>
                        </div>
                    `;
                } else {
                    infoGanhadorHtml = `<div class="bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs font-bold p-2 rounded-lg text-center mb-3"><i class="fas fa-trophy mr-1 text-yellow-600"></i> Número Vencedor: ${r.numero_vencedor}</div>`;
                }
            }

            grid.innerHTML += `
                <div class="${bgCor} border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                    <div>
                        <div class="flex justify-between items-start mb-2">
                            <h4 class="font-bold text-gray-800 text-sm leading-tight pr-2">${r.titulo}</h4>${badge}
                        </div>
                        <p class="text-[11px] text-gray-500 mb-4 line-clamp-2">${r.descricao || 'Sem descrição'}</p>
                        
                        <div class="flex items-center gap-4 mb-4">
                            <div class="text-center">
                                <p class="text-[10px] text-gray-400 font-bold uppercase">Números</p>
                                <p class="text-lg font-black text-indigo-600">${r.quantidade_numeros}</p>
                            </div>
                            <div class="w-px h-8 bg-gray-200"></div>
                            <div class="text-center">
                                <p class="text-[10px] text-gray-400 font-bold uppercase">Valor</p>
                                <p class="text-sm font-bold text-gray-700">R$ ${r.valor_numero.toFixed(2)}</p>
                            </div>
                        </div>
                        ${infoGanhadorHtml}
                    </div>
                    
                    <button onclick="abrirCartelaAdmin('${r.id}', '${r.titulo.replace(/'/g, "\\'")}', ${r.quantidade_numeros},${r.valor_numero})" class="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-2 active:scale-95">
                        <i class="fas fa-th"></i> Ver Cartela / Gerenciar
                    </button>
                </div>
            `;
        });
    }
    // Modal da Cartela Visual e Sorteio
    window.rifaAtivaId = null;
    window.canalRealtimeAdminRifa = null;

    window.renderizarNumerosCartelaAdmin = async (idRifa, titulo, qtdNumeros, valorNum) => {
        const grid = document.getElementById('gridNumerosRifa');
        if (!grid) return;

        const { data: comprados } = await supabaseClient.from('rifa_numeros').select('*').eq('rifa_id', idRifa);
        
        let qtdLivre = qtdNumeros;
        let qtdPago = 0;
        let qtdPendente = 0;
        let htmlGrid = '';

        for (let i = 1; i <= qtdNumeros; i++) {
            const comprado = comprados ? comprados.find(c => c.numero === i) : null;
            
            let btnClass = "border-gray-200 text-gray-500 bg-white hover:bg-gray-50 hover:border-gray-300";
            let acao = ``;
            let tooltip = `Livre (R$ ${valorNum.toFixed(2)})`;

            if (comprado) {
                qtdLivre--;
                if (comprado.status_pagamento === 'aprovado' || comprado.status_pagamento === 'pago') {
                    qtdPago++;
                    btnClass = "border-green-600 bg-green-500 text-white shadow-sm cursor-not-allowed";
                    tooltip = `PAGO\nNome: ${comprado.nome_comprador}`;
                } else {
                    qtdPendente++;
                    btnClass = "border-yellow-500 bg-yellow-400 text-yellow-900 shadow-sm animate-pulse hover:bg-yellow-500";
                    
                    if (comprado.comprovante_url) {
                        tooltip = `PENDENTE (Analisar Comprovante)\nNome: ${comprado.nome_comprador}`;
                        const itemData = {
                            tipo: 'rifa',
                            id: comprado.id,
                            referencia_id: idRifa,
                            titulo: titulo,
                            subtitulo: `Número: ${String(i).padStart(2,'0')}`,
                            nome: comprado.nome_comprador,
                            valor: valorNum,
                            url: comprado.comprovante_url
                        };
                        const jsonStr = JSON.stringify(itemData).replace(/'/g, "\\'").replace(/"/g, "&quot;");
                        acao = `onclick="abrirModalComprovante(JSON.parse('${jsonStr}'))"`;
                    } else {
                        tooltip = `AGUARDANDO COMPROVANTE\nNome: ${comprado.nome_comprador}`;
                        acao = `onclick="alert('Aguardando envio do comprovante pelo comprador. O processo está travado até a anexação do arquivo.')"`;
                    }
                }
            }

            htmlGrid += `
                <button ${acao} class="aspect-square rounded-xl border-2 font-black text-sm md:text-base flex items-center justify-center transition-all ${btnClass}" title="${tooltip}">
                    ${String(i).padStart(2, '0')}
                </button>
            `;
        }

        grid.innerHTML = htmlGrid;

        const elLivres = document.getElementById('cartelaQtdLivres');
        const elPagos = document.getElementById('cartelaQtdPagos');
        const elPendentes = document.getElementById('cartelaQtdPendentes');
        if (elLivres) elLivres.textContent = qtdLivre;
        if (elPagos) elPagos.textContent = qtdPago;
        if (elPendentes) elPendentes.textContent = qtdPendente;
    };

    window.abrirCartelaAdmin = async (idRifa, titulo, qtdNumeros, valorNum) => {
        window.rifaAtivaId = idRifa;
        document.getElementById('cartelaTituloRifa').textContent = titulo;
        const grid = document.getElementById('gridNumerosRifa');
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10"><i class="fas fa-spinner fa-spin text-3xl"></i></div>';
        document.getElementById('modalCartelaRifa').classList.remove('hidden');

        const btnLink = document.getElementById('btnCopiarLinkRifa');
        btnLink.onclick = () => {
            const linkBase = window.location.origin;
            const linkPublico = `${linkBase}/rifas.html?t=${idTerreiroGlobal}&r=${idRifa}`;
            navigator.clipboard.writeText(linkPublico).then(() => {
                const ori = btnLink.innerHTML;
                btnLink.innerHTML = '<i class="fas fa-check text-green-400"></i> Link Copiado!';
                setTimeout(() => { btnLink.innerHTML = ori; }, 2500);
            });
        };

        const btnSorteio = document.getElementById('btnRealizarSorteio');
        btnSorteio.onclick = () => {
            if(!confirm("Atenção! Ao sortear, a rifa será ENCERRADA e nenhum número a mais poderá ser vendido. Deseja prosseguir?")) return;
            sortearRifa(idRifa, qtdNumeros);
        };

        await window.renderizarNumerosCartelaAdmin(idRifa, titulo, qtdNumeros, valorNum);

        if (window.canalRealtimeAdminRifa) {
            supabaseClient.removeChannel(window.canalRealtimeAdminRifa);
        }

        window.canalRealtimeAdminRifa = supabaseClient
            .channel(`admin_rifa_${idRifa}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'rifa_numeros' },
                (payload) => {
                    if (payload.new && payload.new.rifa_id && String(payload.new.rifa_id) !== String(idRifa)) return;
                    const modalVisivel = !document.getElementById('modalCartelaRifa').classList.contains('hidden');
                    if (modalVisivel && window.rifaAtivaId === idRifa) {
                        window.renderizarNumerosCartelaAdmin(idRifa, titulo, qtdNumeros, valorNum);
                    }
                }
            )
            .subscribe();
    };

    async function sortearRifa(idRifa, maxNumeros) {
        // Busca apenas os números efetivamente pagos ou aprovados
        const { data: vendidos } = await supabaseClient.from('rifa_numeros')
            .select('numero, nome_comprador, status_pagamento')
            .eq('rifa_id', idRifa)
            .in('status_pagamento', ['pago', 'aprovado']);

        if (!vendidos || vendidos.length === 0) {
            alert("Nenhum número com pagamento confirmado/aprovado foi encontrado. Aprove os pagamentos pendentes antes de realizar o sorteio.");
            return;
        }

        // Extrai todos os números em um array simples
        const numerosVendidos = vendidos.map(v => v.numero);
        
        // Sorteio Aleatório restrito apenas aos números registrados
        const indiceSorteado = Math.floor(Math.random() * numerosVendidos.length);
        const numeroVencedor = numerosVendidos[indiceSorteado];
        const ganhador = vendidos.find(v => v.numero === numeroVencedor);

        // Atualiza a Rifa no banco para Encerrada
        await supabaseClient.from('rifas').update({ 
            status: 'encerrada', 
            numero_vencedor: numeroVencedor 
        }).eq('id', idRifa);

        alert(`🎉 SORTEIO REALIZADO COM SUCESSO!\n\nNúmero Sorteado: ${numeroVencedor}\nGanhador(a): ${ganhador.nome_comprador}`);
        
        document.getElementById('modalCartelaRifa').classList.add('hidden');
        carregarRifasAdmin(); 
    }

    // --- MÓDULO EQUIPE DE VENDAS (RIFAS) ---
    const btnAbrirEquipeVendas = document.getElementById('btnAbrirEquipeVendas');
    if (btnAbrirEquipeVendas) {
        btnAbrirEquipeVendas.addEventListener('click', () => {
            if (!window.rifaAtivaId) return;
            abrirModalEquipeVendas(window.rifaAtivaId);
        });
    }

    window.abrirModalEquipeVendas = async (idRifa) => {
        const modal = document.getElementById('modalEquipeVendas');
        if (modal) modal.classList.remove('hidden');
        
        const selectVendedor = document.getElementById('selectVendedorRifa');
        if (selectVendedor && selectVendedor.options.length <= 1) {
            // Popula com a lista de médiuns global já existente
            listaMediunsGlobal.forEach(m => {
                selectVendedor.innerHTML += `<option value="${m.id}">${m.nome_completo}</option>`;
            });
        }
        
        await carregarListaVendedores(idRifa);
    };

    window.carregarListaVendedores = async (idRifa) => {
        const listaEl = document.getElementById('listaVendedoresRifa');
        if (!listaEl) return;
        
        listaEl.innerHTML = '<div class="text-center p-4 text-gray-500"><i class="fas fa-spinner fa-spin"></i> Carregando equipe...</div>';
        
        try {
            const { data, error } = await supabaseClient.from('rifas').select('vendedores_ids').eq('id', idRifa).single();
            
            if (error) throw error;
            
            const vendedores = data.vendedores_ids || [];
            if (vendedores.length === 0) {
                listaEl.innerHTML = '<div class="text-center p-4 text-gray-500 text-sm">Nenhum vendedor escalado para esta rifa.</div>';
                return;
            }

            listaEl.innerHTML = '';
            vendedores.forEach(vendedorId => {
                const medium = listaMediunsGlobal.find(m => m.id === vendedorId);
                const nome = medium ? medium.nome_completo : 'Médium Desconhecido';
                
                listaEl.innerHTML += `
                    <div class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 mb-2">
                        <span class="text-sm text-gray-700 font-medium"><i class="fas fa-user-tag text-indigo-500 mr-2"></i>${nome}</span>
                        <button onclick="removerVendedorEquipe('${idRifa}', ${vendedorId})" class="text-red-500 hover:text-red-700" title="Remover da Equipe">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            });
        } catch (err) {
            listaEl.innerHTML = `<div class="text-center p-4 text-red-500 text-sm">Erro ao carregar: ${err.message}</div>`;
        }
    };

    const btnAdicionarVendedor = document.getElementById('btnAdicionarVendedor');
    if (btnAdicionarVendedor) {
        btnAdicionarVendedor.addEventListener('click', async () => {
            if (!window.rifaAtivaId) return;
            const selectVendedor = document.getElementById('selectVendedorRifa');
            const mediumId = parseInt(selectVendedor.value);
            
            if (!mediumId) {
                alert('Por favor, selecione um médium da lista.');
                return;
            }

            const btnHtml = btnAdicionarVendedor.innerHTML;
            btnAdicionarVendedor.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btnAdicionarVendedor.disabled = true;

            try {
                const { data } = await supabaseClient.from('rifas').select('vendedores_ids').eq('id', window.rifaAtivaId).single();
                let vendedores = data.vendedores_ids || [];
                
                if (!vendedores.includes(mediumId)) {
                    vendedores.push(mediumId);
                    const { error } = await supabaseClient.from('rifas').update({ vendedores_ids: vendedores }).eq('id', window.rifaAtivaId);
                    if (error) throw error;
                } else {
                    alert('Este médium já faz parte da equipe desta rifa!');
                }
                
                selectVendedor.value = ''; // Reseta o select
                await carregarListaVendedores(window.rifaAtivaId);
            } catch (e) {
                alert("Erro ao adicionar vendedor: " + e.message);
            } finally {
                btnAdicionarVendedor.innerHTML = btnHtml;
                btnAdicionarVendedor.disabled = false;
            }
        });
    }

    window.removerVendedorEquipe = async (idRifa, mediumId) => {
        if (!confirm('Remover este vendedor da equipe?')) return;
        
        try {
            const { data } = await supabaseClient.from('rifas').select('vendedores_ids').eq('id', idRifa).single();
            let vendedores = data.vendedores_ids || [];
            
            // Filtra removendo apenas o ID selecionado
            vendedores = vendedores.filter(id => id !== mediumId);
            
            const { error } = await supabaseClient.from('rifas').update({ vendedores_ids: vendedores }).eq('id', idRifa);
            if (error) throw error;
            
            await carregarListaVendedores(idRifa);
        } catch (e) {
            alert("Erro ao remover vendedor: " + e.message);
        }
    };

    // ============================================================================
    // ABAS DO FINANCEIRO E RELATÓRIO DE ARRECADAÇÃO (RIFAS COM MÉDIUNS EM VERDE)
    // ============================================================================
    const btnTabFinMensalidades = document.getElementById('btnTabFinMensalidades');
    const btnTabFinArrecadacao = document.getElementById('btnTabFinArrecadacao');
    const abaFinMensalidades = document.getElementById('abaFinMensalidades');
    const abaFinArrecadacao = document.getElementById('abaFinArrecadacao');

    if (btnTabFinMensalidades) {
        btnTabFinMensalidades.addEventListener('click', () => {
            btnTabFinMensalidades.className = "relative py-3 md:py-4 px-4 md:px-6 rounded-2xl font-black text-xs md:text-base transition-all duration-300 shadow-md bg-tema-secundaria text-white transform hover:-translate-y-1 active:scale-95 border-b-4 border-black/20 flex flex-col items-center justify-center gap-1.5 w-full";
            btnTabFinArrecadacao.className = "relative py-3 md:py-4 px-4 md:px-6 rounded-2xl font-bold text-xs md:text-base transition-all duration-300 shadow-sm bg-white text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 hover:shadow-md transform hover:-translate-y-1 active:scale-95 flex flex-col items-center justify-center gap-1.5 w-full";
            abaFinMensalidades.classList.remove('hidden');
            abaFinArrecadacao.classList.add('hidden');
        });
    }

    if (btnTabFinArrecadacao) {
        btnTabFinArrecadacao.addEventListener('click', () => {
            btnTabFinArrecadacao.className = "relative py-3 md:py-4 px-4 md:px-6 rounded-2xl font-black text-xs md:text-base transition-all duration-300 shadow-md bg-tema-secundaria text-white transform hover:-translate-y-1 active:scale-95 border-b-4 border-black/20 flex flex-col items-center justify-center gap-1.5 w-full";
            btnTabFinMensalidades.className = "relative py-3 md:py-4 px-4 md:px-6 rounded-2xl font-bold text-xs md:text-base transition-all duration-300 shadow-sm bg-white text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 hover:shadow-md transform hover:-translate-y-1 active:scale-95 flex flex-col items-center justify-center gap-1.5 w-full";
            abaFinArrecadacao.classList.remove('hidden');
            abaFinMensalidades.classList.add('hidden');
            carregarSelectRifasFinanceiro();
        });
    }

    async function carregarSelectRifasFinanceiro() {
        const select = document.getElementById('selectRifaFinanceiro');
        if (!select) return; 

        // Busca todas as rifas do terreiro para calcular o total geral de arrecadação de todas as rifas
        const { data: todasRifas } = await supabaseClient.from('rifas').select('id, titulo, valor_numero').eq('terreiro_id', idTerreiroGlobal);
        
        if (todasRifas) {
            select.innerHTML = '<option value="">Selecione uma rifa...</option>';
            todasRifas.forEach(r => {
                select.innerHTML += `<option value="${r.id}">${r.titulo} (R$ ${r.valor_numero.toFixed(2)})</option>`;
            });

            // Calcula o total geral arrecadado em TODAS as rifas (apenas números aprovados ou todos vendidos)
            const idsRifas = todasRifas.map(r => r.id);
            if (idsRifas.length > 0) {
                const { data: todosNumerosVendidos } = await supabaseClient.from('rifa_numeros')
                    .select('rifa_id, status_pagamento')
                    .in('rifa_id', idsRifas);

                let somaGeralTodasRifas = 0;
                if (todosNumerosVendidos) {
                    todosNumerosVendidos.forEach(num => {
                        // Considera apenas os aprovados ou todos conforme regra da casa (vamos somar os aprovados ou todos válidos)
                        const rifaObj = todasRifas.find(r => r.id === num.rifa_id);
                        if (rifaObj && num.status_pagamento === 'aprovado') {
                            somaGeralTodasRifas += (rifaObj.valor_numero || 0);
                        }
                    });
                }
                const elTotalGeral = document.getElementById('totalArrecadadoGeralRifas');
                if (elTotalGeral) {
                    elTotalGeral.textContent = `Total Geral: ${somaGeralTodasRifas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
                }
            }
        }
    }

    const selectRifaFin = document.getElementById('selectRifaFinanceiro');
    if (selectRifaFin) {
        selectRifaFin.addEventListener('change', async (e) => {
            const idRifa = e.target.value;
            const tbody = document.getElementById('tabelaRelatorioRifa');
            
            if (!idRifa) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center p-6 text-gray-500">Selecione uma rifa para visualizar.</td></tr>';

                const elTotalRifa = document.getElementById('totalArrecadadoRifaSelecionada');
                if (elTotalRifa) {
                    elTotalRifa.textContent = `Total da Rifa: ${Number(0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
                }

                return;
            }
            tbody.innerHTML = '<tr><td colspan="3" class="text-center p-6 text-gray-500"><i class="fas fa-spinner fa-spin"></i> Buscando dados da rifa...</td></tr>';
            
            // Busca os dados da rifa selecionada para pegar o valor do número
            const { data: rifaInfo } = await supabaseClient.from('rifas').select('valor_numero').eq('id', idRifa).single();
            const valorUnitarioRifa = rifaInfo ? (parseFloat(rifaInfo.valor_numero) || 0) : 0;

            const { data: numeros } = await supabaseClient.from('rifa_numeros').select('*').eq('rifa_id', idRifa).order('numero', {ascending: true});
            const totalRifaSelecionada = (numeros || [])
                .filter(n => n.status_pagamento === 'aprovado')
                .length * valorUnitarioRifa;

            const elTotalRifa = document.getElementById('totalArrecadadoRifaSelecionada');
            if (elTotalRifa) {
                elTotalRifa.textContent = `Total da Rifa: ${totalRifaSelecionada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
            }
            
            if (!numeros || numeros.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center p-6 text-gray-500">Nenhum número vendido nesta rifa ainda.</td></tr>';
                return;
            }

            const agrupado = {};
            numeros.forEach(n => {
                const telLimpo = n.telefone_comprador ? n.telefone_comprador.replace(/\D/g, '') : '';
                const chave = telLimpo + '_' + n.nome_comprador;
                
                if (!agrupado[chave]) {
                    agrupado[chave] = {
                        nome: n.nome_comprador,
                        telefoneOriginal: n.telefone_comprador,
                        telefoneLimpo: telLimpo,
                        numeros: [],
                        vendedor_id: n.vendido_por_medium_id,
                        status: n.status_pagamento
                    };
                }
                agrupado[chave].numeros.push(n.numero);
            });

            tbody.innerHTML = '';
            Object.values(agrupado).forEach(comp => {
                const ehMedium = listaMediunsGlobal.find(m => m.telefone && m.telefone.replace(/\D/g, '') === comp.telefoneLimpo);
                
                const nomeExibicao = ehMedium 
                    ? `<span class="text-green-600 font-bold" title="Médium da Casa">${comp.nome} <i class="fas fa-check-circle text-[10px]"></i></span>` 
                    : `<span class="text-gray-800 font-medium">${comp.nome}</span>`;

                // Calcula o valor total arrecadado por este comprador nesta rifa (Qtd de números * valor unitário)
                const valorTotalComprador = comp.numeros.length * valorUnitarioRifa;
                const valorFmt = valorTotalComprador.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                let vendedorNome = '-';
                if (comp.vendedor_id) {
                    const v = listaMediunsGlobal.find(m => m.id === comp.vendedor_id);
                    if (v) vendedorNome = `<span class="text-gray-700">${v.nome_social || v.nome_completo.split(' ')[0]}</span>`;
                } else {
                    vendedorNome = '<span class="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">Link Externo</span>';
                }

                const numsStr = comp.numeros.map(n => String(n).padStart(2,'0')).join(', ');
                const badgePendente = comp.status !== 'aprovado' ? `<span class="bg-yellow-100 text-yellow-800 text-[9px] px-1 rounded font-bold ml-1">Pendente</span>` : '';

                tbody.innerHTML += `
                    <tr class="border-b border-gray-100 hover:bg-gray-50">
                        <td class="p-3">
                            ${nomeExibicao} <br>
                            <span class="text-[10px] text-gray-500 font-mono">${comp.telefoneOriginal}</span>
                        </td>
                        <td class="p-3 font-mono text-xs text-indigo-600 font-bold break-words max-w-[150px]">
                            ${numsStr} ${badgePendente}
                        </td>
                        <td class="p-3 text-xs flex justify-between items-center">
                            <span>${vendedorNome}</span>
                            <span class="font-black text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200 ml-2">${valorFmt}</span>
                        </td>
                    </tr>
                `;
            });
        });
    }

    // ============================================================================
    // NOVO MÓDULO: GESTÃO DE ESCALAS E MISSÕES (EXU E CORRENTE) E WHATSAPP
    // ============================================================================

    window.carregarEventosEscalas = async () => {
        console.log("Iniciando carregamento de escalas para o terreiro:", idTerreiroGlobal);
        if (!idTerreiroGlobal) return;
        
        const listaEventos = document.getElementById('listaEventosEscala');
        const painelMontagem = document.getElementById('painelMontagemEscala');
        
        if (!listaEventos || !painelMontagem) {
            console.error("Elementos da tela de escalas não encontrados no HTML.");
            return;
        }

        listaEventos.innerHTML = '<p class="text-xs text-gray-500 text-center py-4"><i class="fas fa-spinner fa-spin"></i> Buscando eventos...</p>';
        painelMontagem.classList.add('hidden');
        
        try {
            const agora = new Date().toISOString();
            
            // Diagnóstico
            const { data: checkTotal, error: errTotal } = await supabaseClient.from('agenda').select('titulo, req_escala_exu, req_escala_corrente').eq('terreiro_id', idTerreiroGlobal);
            console.log("Todas as giras deste terreiro:", checkTotal);

            const { data, error } = await supabaseClient.from('agenda')
                .select('id, titulo, data_hora_inicio, especial, req_escala_exu, req_escala_corrente, escalas')
                .eq('terreiro_id', idTerreiroGlobal)
                .gte('data_hora_inicio', agora)
                .or('req_escala_exu.eq.true,req_escala_corrente.eq.true')
                .order('data_hora_inicio', { ascending: true });

            console.log("Giras filtradas para escala:", data);

            if (error) throw error;

            if (!data || data.length === 0) {
                listaEventos.innerHTML = '<p class="text-xs text-gray-500 text-center py-4 border border-dashed border-gray-200 rounded-xl bg-gray-50">Nenhum evento futuro com escalas configuradas.</p>';
                return;
            }

            listaEventos.innerHTML = '';
            data.forEach(ev => {
                const dataFmt = new Date(ev.data_hora_inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                let badges = '';
                
                if (ev.req_escala_exu) badges += '<span class="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase"><i class="fas fa-fire"></i> Exu</span> ';
                if (ev.req_escala_corrente) badges += '<span class="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase"><i class="fas fa-hands-helping"></i> Corrente</span> ';
                
                const evJson = JSON.stringify(ev).replace(/'/g, "\\'").replace(/"/g, "&quot;");

                listaEventos.innerHTML += `
                    <div class="bg-gray-50 hover:bg-gray-100 border border-gray-200 p-3 rounded-xl cursor-pointer transition mb-3" onclick="abrirMontagemEscala(JSON.parse('${evJson}'))">
                        <h4 class="font-bold text-gray-800 text-sm mb-1">${ev.titulo}</h4>
                        <p class="text-[11px] text-gray-500 mb-2">${dataFmt}</p>
                        <div>${badges}</div>
                    </div>
                `;
            });

        } catch (err) {
            console.error("Erro na query de escalas:", err);
            listaEventos.innerHTML = `<p class="text-xs text-red-500 text-center py-4">Erro: ${err.message}</p>`;
        }
    };

    window.abrirMontagemEscala = (evento) => {
        document.getElementById('painelMontagemEscala').classList.remove('hidden');
        document.getElementById('painelMontagemEscala').classList.add('flex');
        
        document.getElementById('tituloMontagemEscala').textContent = evento.titulo;
        document.getElementById('dataMontagemEscala').textContent = new Date(evento.data_hora_inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        document.getElementById('escalaEventoId').value = evento.id;
        document.getElementById('msgEscala').classList.add('hidden');

        // Esconde o botão verde global de Notificar, pois agora será individual
        const btnNotifGlob = document.getElementById('btnNotificarEscala');
        if(btnNotifGlob) btnNotifGlob.classList.add('hidden');

        const container = document.getElementById('containerCamposEscala');
        container.innerHTML = '';
        
        const objSalvo = evento.escalas && Object.keys(evento.escalas).length > 0 ? evento.escalas : {};
        window.escalaAtualEmEdicao = objSalvo;

        let html = '';
        // Select de Médiuns pronto para injetar
        const opcoesMediuns = '<option value="">[ Selecione o Médium ]</option>' + listaMediunsGlobal.map(m => `<option value="${m.id}">${m.nome_completo}</option>`).join('');

        // Função auxiliar para injetar o botão do WhatsApp na tabela de Exu
        const btnWp = (idSelect, funcao) => `<button type="button" onclick="notificarMediumIndividual('${idSelect}', '${funcao}')" class="bg-green-100 text-green-600 px-3 py-2.5 rounded-lg hover:bg-green-200 transition shadow-sm shrink-0" title="Notificar este médium"><i class="fab fa-whatsapp text-lg"></i></button>`;

        // SE FOR EXU
        if (evento.req_escala_exu) {
            document.getElementById('escalaEventoTipo').value = 'exu';

            html += `
    <div class="space-y-4">
        <!-- Card Tranca Ruas -->
        <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div class="bg-gray-100 font-black text-gray-800 p-3 md:p-4 border-b border-gray-200 text-sm md:text-base">Tranca Ruas das Almas</div>
            <div class="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50">
                <div>
                    <label class="block text-[10px] md:text-xs font-bold text-gray-600 uppercase mb-1.5"><i class="fas fa-image text-blue-600 mr-1"></i> Imagem (Condução)</label>
                    <div class="flex items-center gap-2">
                        <select id="esc_img_tr" class="flex-1 w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">${opcoesMediuns}</select>
                        ${btnWp('esc_img_tr', '*Imagem* de _Tranca Ruas das Almas_')}
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] md:text-xs font-bold text-gray-600 uppercase mb-1.5"><i class="fas fa-leaf text-green-600 mr-1"></i> Flores</label>
                    <div class="flex items-center gap-2">
                        <select id="esc_flores_tr" class="flex-1 w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm">${opcoesMediuns}</select>
                        ${btnWp('esc_flores_tr', '*Flores* de _Tranca Ruas das Almas_')}
                    </div>
                </div>
            </div>
        </div>

        <!-- Card Cigana -->
        <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div class="bg-gray-100 font-black text-gray-800 p-3 md:p-4 border-b border-gray-200 text-sm md:text-base">Cigana Rainha das 7 Encruzilhadas</div>
            <div class="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50">
                <div>
                    <label class="block text-[10px] md:text-xs font-bold text-gray-600 uppercase mb-1.5"><i class="fas fa-image text-blue-600 mr-1"></i> Imagem (Condução)</label>
                    <div class="flex items-center gap-2">
                        <select id="esc_img_cigana" class="flex-1 w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">${opcoesMediuns}</select>
                        ${btnWp('esc_img_cigana', '*Imagem* de _Cigana Rainha das 7 Encruzilhadas_')}
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] md:text-xs font-bold text-gray-600 uppercase mb-1.5"><i class="fas fa-leaf text-green-600 mr-1"></i> Flores</label>
                    <div class="flex items-center gap-2">
                        <select id="esc_flores_cigana" class="flex-1 w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm">${opcoesMediuns}</select>
                        ${btnWp('esc_flores_cigana', '*Flores* de _Cigana Rainha das 7 Encruzilhadas_')}
                    </div>
                </div>
            </div>
        </div>

        <!-- Card Padilha -->
        <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div class="bg-gray-100 font-black text-gray-800 p-3 md:p-4 border-b border-gray-200 text-sm md:text-base">M. Padilha Rainha das 7 Encruzas</div>
            <div class="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50">
                <div>
                    <label class="block text-[10px] md:text-xs font-bold text-gray-600 uppercase mb-1.5"><i class="fas fa-image text-blue-600 mr-1"></i> Imagem (Condução)</label>
                    <div class="flex items-center gap-2">
                        <select id="esc_img_padilha" class="flex-1 w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">${opcoesMediuns}</select>
                        ${btnWp('esc_img_padilha', '*Imagem* de _Maria Padilha Rainha das 7 Encruzilhadas_')}
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] md:text-xs font-bold text-gray-600 uppercase mb-1.5"><i class="fas fa-leaf text-green-600 mr-1"></i> Flores</label>
                    <div class="flex items-center gap-2">
                        <select id="esc_flores_padilha" class="flex-1 w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm">${opcoesMediuns}</select>
                        ${btnWp('esc_flores_padilha', '*Flores* de _Maria Padilha Rainha das 7 Encruzilhadas_')}
                    </div>
                </div>
            </div>
        </div>
    </div>
`;
        } 
        // SE FOR CORRENTE
        else if (evento.req_escala_corrente) {
            document.getElementById('escalaEventoTipo').value = 'corrente';
            
            // Função auxiliar para injetar botão do WhatsApp na Corrente
            const btnWpCorrente = (idSelect) => `<button type="button" onclick="notificarMediumIndividual('${idSelect}', 'Passe Específico na Corrente')" class="bg-green-500 text-white px-3 py-2.5 rounded-lg hover:bg-green-600 transition shadow-sm" title="Notificar este médium"><i class="fab fa-whatsapp text-lg"></i></button>`;

            html += `
                <div class="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
                    <h4 class="font-bold text-emerald-900 mb-4"><i class="fas fa-hands-helping mr-1"></i> Médiuns Escalados para o Passe (Corrente)</h4>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-600 mb-1">Médium 1</label>
                            <div class="flex items-center gap-2">
                                <select id="esc_corrente_1" class="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white">${opcoesMediuns}</select>
                                ${btnWpCorrente('esc_corrente_1')}
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-600 mb-1">Médium 2</label>
                            <div class="flex items-center gap-2">
                                <select id="esc_corrente_2" class="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white">${opcoesMediuns}</select>
                                ${btnWpCorrente('esc_corrente_2')}
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-600 mb-1">Médium 3</label>
                            <div class="flex items-center gap-2">
                                <select id="esc_corrente_3" class="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white">${opcoesMediuns}</select>
                                ${btnWpCorrente('esc_corrente_3')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

        // Popula as opções se já existirem guardadas no BD
        if (evento.req_escala_exu) {
            if (objSalvo.img_tr) document.getElementById('esc_img_tr').value = objSalvo.img_tr;
            if (objSalvo.flores_tr) document.getElementById('esc_flores_tr').value = objSalvo.flores_tr;
            if (objSalvo.img_cigana) document.getElementById('esc_img_cigana').value = objSalvo.img_cigana;
            if (objSalvo.flores_cigana) document.getElementById('esc_flores_cigana').value = objSalvo.flores_cigana;
            if (objSalvo.img_padilha) document.getElementById('esc_img_padilha').value = objSalvo.img_padilha;
            if (objSalvo.flores_padilha) document.getElementById('esc_flores_padilha').value = objSalvo.flores_padilha;
        } else if (evento.req_escala_corrente) {
            if (objSalvo.corrente_1) document.getElementById('esc_corrente_1').value = objSalvo.corrente_1;
            if (objSalvo.corrente_2) document.getElementById('esc_corrente_2').value = objSalvo.corrente_2;
            if (objSalvo.corrente_3) document.getElementById('esc_corrente_3').value = objSalvo.corrente_3;
        }

        };

    // ============================================
    // SALVAR AS ESCALAS NO SUPABASE
    // ============================================
    const formEscala = document.getElementById('formSalvarEscala');
    if (formEscala) {
        formEscala.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSalvarEscala');
            const msg = document.getElementById('msgEscala');
            const idEvento = document.getElementById('escalaEventoId').value;
            const tipo = document.getElementById('escalaEventoTipo').value;

            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
            msg.classList.add('hidden');

            // Mantém batizados, consagrados e coroados já salvos na Agenda
            let jsonFinal = { ...(window.escalaAtualEmEdicao || {}) };

            if (tipo === 'exu') {
                Object.assign(jsonFinal, {
                    img_tr: document.getElementById('esc_img_tr').value,
                    flores_tr: document.getElementById('esc_flores_tr').value,
                    img_cigana: document.getElementById('esc_img_cigana').value,
                    flores_cigana: document.getElementById('esc_flores_cigana').value,
                    img_padilha: document.getElementById('esc_img_padilha').value,
                    flores_padilha: document.getElementById('esc_flores_padilha').value,
                });
            } else if (tipo === 'corrente') {
                Object.assign(jsonFinal, {
                    corrente_1: document.getElementById('esc_corrente_1').value,
                    corrente_2: document.getElementById('esc_corrente_2').value,
                    corrente_3: document.getElementById('esc_corrente_3').value,
                });
            }

            try {
                const { error } = await supabaseClient.from('agenda').update({ escalas: jsonFinal }).eq('id', idEvento).eq('terreiro_id', idTerreiroGlobal);
                if (error) throw error;

                window.escalaAtualEmEdicao = jsonFinal; // Atualiza o cache da tela
                
                msg.textContent = 'Escala gravada com sucesso!';
                msg.className = 'text-green-600 font-bold text-xs mt-2 block';
                msg.classList.remove('hidden');
                setTimeout(() => msg.classList.add('hidden'), 3000);
                
                window.carregarEventosEscalas(); // Atualiza a barra lateral

            } catch (err) {
                msg.textContent = 'Erro ao salvar: ' + err.message;
                msg.className = 'text-red-600 font-bold text-xs mt-2 block';
                msg.classList.remove('hidden');
            } finally {
                btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Gravar Escala';
            }
        });
    }

    // ============================================
    // WHATSAPP - NOTIFICAR INDIVIDUALMENTE
    // ============================================
    window.notificarMediumIndividual = (selectId, funcaoLocal) => {
        const selectEl = document.getElementById(selectId);
        if (!selectEl) return;
        
        const idMedium = selectEl.value;
        if (!idMedium) {
            alert('Por favor, selecione um médium na caixa ao lado antes de notificar.');
            return;
        }

        const md = listaMediunsGlobal.find(m => String(m.id) === String(idMedium));
        if (!md) {
            alert('Médium não encontrado.');
            return;
        }
        
        if (!md.telefone) {
            alert('Este médium não possui um número de WhatsApp cadastrado no sistema.');
            return;
        }

        const num = md.telefone.replace(/\D/g, '');
        if (num.length < 10) {
            alert('O número de telefone cadastrado parece estar incorreto ou incompleto.');
            return;
        }

        const primeiroNome = md.nome_social || md.nome_completo.split(' ')[0];
        const dataEvento = document.getElementById('dataMontagemEscala').textContent;
        const tituloEvento = document.getElementById('tituloMontagemEscala').textContent;

        let msgTxt = "";

        // Define a mensagem com base na função do médium (ignorando maiúsculas/minúsculas e variações de texto)
        const funcLower = funcaoLocal.toLowerCase();
        
        if (funcLower.includes('flores')) {
            msgTxt = `Olá, ${primeiroNome}! 🙏\nPassando para lembrar que você foi inscrito(a) para a função de ${funcaoLocal} na *${tituloEvento}* no dia *${dataEvento}*.\nLembrando que a responsabilidade e o custeio das flores é do Médium. Axé!`;
        } else if (funcLower.includes('passe específico na corrente')) {
            msgTxt = `Olá, ${primeiroNome}! 🙏\nPassando para lembrar que você foi inscrito(a) para a função de ${funcaoLocal} na *${tituloEvento}* no dia *${dataEvento}*.\nLembrando que é responsabilidade do Médium trazer as 7 espadas de Ogum. Axé!`;
        } else {
            // Mensagem padrão para "Imagem" ou qualquer outra função não listada acima
            msgTxt = `Olá, ${primeiroNome}! 🙏\nPassando para lembrar que você foi inscrito(a) para a função de ${funcaoLocal} na *${tituloEvento}* no dia *${dataEvento}*.\nContamos com a sua responsabilidade e pontualidade. Axé!`;
        }

        const url = `https://wa.me/55${num}?text=${encodeURIComponent(msgTxt)}`;
        
        window.open(url, '_blank');
    };

});

// ==========================================================
// NOVA ROTINA: Fundo de Certificados (A4)
// ==========================================================
const inputFundoCert = document.getElementById('inputFundoCertificado');
const previewFundoCert = document.getElementById('previewFundoCertificado');
const placeholderFundoCert = document.getElementById('placeholderFundoCertificado');
const btnSalvarFundoCert = document.getElementById('btnSalvarFundoCertificado');
const msgFundoCert = document.getElementById('msgFundoCertificado');

let arquivoFundoCertSelecionado = null;

if (inputFundoCert) {
    inputFundoCert.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            arquivoFundoCertSelecionado = file;
            const reader = new FileReader();
            reader.onload = (ev) => {
                previewFundoCert.src = ev.target.result;
                previewFundoCert.classList.remove('hidden');
                if (placeholderFundoCert) placeholderFundoCert.classList.add('hidden');
                if (btnSalvarFundoCert) btnSalvarFundoCert.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });
}

if (btnSalvarFundoCert) {
    btnSalvarFundoCert.addEventListener('click', async () => {
        if (!arquivoFundoCertSelecionado) return;

        btnSalvarFundoCert.disabled = true;
        btnSalvarFundoCert.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Salvando...';
        if (msgFundoCert) msgFundoCert.classList.add('hidden');

        try {
            const terreiroId = typeof idTerreiroGlobal !== 'undefined' ? idTerreiroGlobal : null;
            if (!terreiroId) throw new Error("ID do terreiro não encontrado.");

            const fileExt = arquivoFundoCertSelecionado.name.split('.').pop();
            const fileName = `fundo_certificado_${terreiroId}_${Date.now()}.${fileExt}`;

            // CORRIGIDO: supabaseClient.storage
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('logos')
                .upload(fileName, arquivoFundoCertSelecionado, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // CORRIGIDO: supabaseClient.storage
            const { data: publicUrlData } = supabaseClient.storage
                .from('logos')
                .getPublicUrl(fileName);

            const fundoUrl = publicUrlData.publicUrl;

            // CORRIGIDO: supabaseClient.from
            const { error: updateError } = await supabaseClient
                .from('terreiros')
                .update({ certificado_fundo_url: fundoUrl })
                .eq('id', terreiroId);

            if (updateError) throw updateError;

            if (msgFundoCert) {
                msgFundoCert.textContent = "Imagem salva com sucesso!";
                msgFundoCert.className = "text-[10px] mt-2 text-center w-full font-bold text-green-600";
                msgFundoCert.classList.remove('hidden');
            }
            btnSalvarFundoCert.innerHTML = '<i class="fas fa-check mr-1"></i> Salvo';

            setTimeout(() => {
                btnSalvarFundoCert.classList.add('hidden');
                if (msgFundoCert) msgFundoCert.classList.add('hidden');
                btnSalvarFundoCert.disabled = false;
                btnSalvarFundoCert.innerHTML = '<i class="fas fa-upload mr-1"></i> Salvar Imagem de Fundo';
            }, 3000);

        } catch (error) {
            console.error("Erro ao salvar fundo:", error);
            if (msgFundoCert) {
                msgFundoCert.textContent = "Erro ao salvar. Tente novamente.";
                msgFundoCert.className = "text-[10px] mt-2 text-center w-full font-bold text-red-600";
                msgFundoCert.classList.remove('hidden');
            }
            btnSalvarFundoCert.disabled = false;
            btnSalvarFundoCert.innerHTML = '<i class="fas fa-upload mr-1"></i> Salvar Imagem de Fundo';
        }
    });
}

async function carregarPreviewFundoCertificado() {
    if (typeof idTerreiroGlobal === 'undefined' || !idTerreiroGlobal) {
        setTimeout(carregarPreviewFundoCertificado, 1000);
        return;
    }

    if (!previewFundoCert) return;

    try {
        // CORRIGIDO: supabaseClient.from
        const { data, error } = await supabaseClient
            .from('terreiros')
            .select('certificado_fundo_url')
            .eq('id', idTerreiroGlobal)
            .single();

        if (data && data.certificado_fundo_url) {
            previewFundoCert.src = data.certificado_fundo_url;
            previewFundoCert.classList.remove('hidden');
            if (placeholderFundoCert) placeholderFundoCert.classList.add('hidden');
        }
    } catch (err) {
        console.error("Erro ao buscar imagem de fundo:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    carregarPreviewFundoCertificado();
});
