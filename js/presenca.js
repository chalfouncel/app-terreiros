let idTerreiroGlobal = null;
let idGiraGlobal = null;
let coordsTerreiro = null;
let hrFimGiraGlobal = null;
let hrInicioPermitidoGlobal = null;

document.addEventListener('DOMContentLoaded', async () => {
    
    // Variáveis do Modal de Doação
    const modalDoacao = document.getElementById('modalDoacao');
    const btnAbrirDoacao = document.getElementById('btnAbrirDoacao');
    const btnAbrirDoacaoSucesso = document.getElementById('btnAbrirDoacaoSucesso');
    const btnFecharDoacao = document.getElementById('btnFecharDoacao');
    const btnCopiarPix = document.getElementById('btnCopiarPix');
    const chavePix = document.getElementById('chavePix');
    const listaItensDoacao = document.getElementById('listaItensDoacao');
    const btnConfirmarDoacao = document.getElementById('btnConfirmarDoacao');
    const qtdTotalDoacao = document.getElementById('qtdTotalDoacao');
    let carrinhoDoacoes = {};

    const tituloTerreiro = document.getElementById('nomeTerreiro');
    if (tituloTerreiro) tituloTerreiro.textContent = "Carregando sistema...";

    // 1. Verifica Sessão de Login
    const { data: { session }, error: erroSessao } = await supabaseClient.auth.getSession();
    
    if (erroSessao || !session) {
        window.location.href = 'index.html';
        return;
    }

    try {
        let perfil = null;
        const authId = session.user.id;

        // TENTATIVA 1: Busca o médium pelo vínculo correto (auth_id)
        const { data: p1 } = await supabaseClient.from('mediuns').select('*').eq('auth_id', authId).limit(1);
        
        if (p1 && p1.length > 0) {
            perfil = p1[0];
        } else {
            // AUTO-CONSERTO DO BANCO DE DADOS
            if (session.user.email) {
                const possivelId = session.user.email.split('@')[0];
                if (!isNaN(possivelId)) {
                    const { data: p2 } = await supabaseClient.from('mediuns').select('*').eq('id', possivelId).limit(1);
                    if (p2 && p2.length > 0) perfil = p2[0];
                }
            }
            
            if (!perfil && session.user.phone) {
                const { data: p3 } = await supabaseClient.from('mediuns').select('*').eq('telefone', session.user.phone).limit(1);
                if (p3 && p3.length > 0) perfil = p3[0];
            }
            
            const localId = localStorage.getItem('medium_id');
            if (!perfil && localId) {
                const { data: p4 } = await supabaseClient.from('mediuns').select('*').eq('id', localId).limit(1);
                if (p4 && p4.length > 0) perfil = p4[0];
            }

            if (perfil) {
                await supabaseClient.from('mediuns').update({ auth_id: authId }).eq('id', perfil.id);
            }
        }

        if (!perfil) {
            alert("Aviso: Sua senha está certa, mas sua ficha de médium foi deletada ou está sem nenhum vínculo. Fale com a Administração.");
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
            return;
        }

        // ====================================================================
        // LOGIN BEM SUCEDIDO! CARREGANDO A TELA
        // ====================================================================
        idTerreiroGlobal = perfil.terreiro_id;
        
        const nomeCurto = perfil.nome_completo ? perfil.nome_completo.split(' ')[0] : 'Médium';
        const txtNome = document.getElementById('nomeMedium');
        if (txtNome) txtNome.textContent = 'Olá, ' + nomeCurto;

        // LIBERAÇÃO DO PAINEL ADMIN
        const temAcessoAoPainel = perfil.is_admin === true || 
                                  perfil.perm_agenda === true || 
                                  perfil.perm_grau === true || 
                                  perfil.perm_financeiro === true || 
                                  perfil.perm_doacoes === true || 
                                  perfil.perm_admin === true;

        if (temAcessoAoPainel) {
            const areaAdmin = document.getElementById('areaAdmin');
            if (areaAdmin) areaAdmin.classList.remove('hidden');
        }

        const btnPainel = document.getElementById('btnPainelAdmin');
        if (btnPainel) {
            btnPainel.addEventListener('click', () => window.location.href = 'admin.html');
        }

        // BUSCA DADOS DO TERREIRO
        if (idTerreiroGlobal) {
            const { data: terreiros } = await supabaseClient.from('terreiros').select('*').eq('id', idTerreiroGlobal).limit(1);
            
            if (terreiros && terreiros.length > 0) {
                const terreiro = terreiros[0];
                if (tituloTerreiro) tituloTerreiro.textContent = terreiro.nome || 'Terreiro sem Nome';
                coordsTerreiro = { lat: terreiro.latitude, lng: terreiro.longitude };
                
                const root = document.documentElement;
                if(terreiro.cor_primaria) root.style.setProperty('--cor-primaria', terreiro.cor_primaria);
                if(terreiro.cor_secundaria) root.style.setProperty('--cor-secundaria', terreiro.cor_secundaria);
                if(terreiro.cor_fundo) root.style.setProperty('--cor-fundo', terreiro.cor_fundo);
                if(terreiro.cor_texto) root.style.setProperty('--cor-texto', terreiro.cor_texto);

                const img = document.getElementById('logoTerreiro');
                if(terreiro.logo_url && img) {
                    img.src = terreiro.logo_url;
                    img.classList.remove('hidden');
                }

                // Inicia o carregamento dos itens de doação após pegar o ID do terreiro
                carregarItensDoacao();
            }
        } else {
            if (tituloTerreiro) tituloTerreiro.textContent = 'Sem Terreiro Vinculado';
        }

        // ====================================================================
        // VERIFICA O PRÓXIMO EVENTO AGENDADO
        // ====================================================================
        const horaNavegador = new Date();

        const { data: girasFuturas } = await supabaseClient.from('agenda').select('*')
            .eq('terreiro_id', idTerreiroGlobal)
            .or('ata_encerrada.eq.false,ata_encerrada.is.null') 
            .order('data_hora_inicio', { ascending: true });

        const divSemGira = document.getElementById('estadoSemGira');
        const divComGira = document.getElementById('estadoComGira');

        let gira = null;

        if (girasFuturas && girasFuturas.length > 0) {
            gira = girasFuturas.find(g => {
                let hrFim;
                const hrInicio = new Date(g.data_hora_inicio);
                
                if (g.data_hora_fim) {
                    hrFim = new Date(g.data_hora_fim);
                } else {
                    hrFim = new Date(hrInicio.getTime() + (4 * 60 * 60 * 1000));
                }
                
                const aindaRolando = hrFim > horaNavegador;

                // Nova Regra: Se a gira é especial, o médium precisa estar na lista de convocados
                let acessoPermitido = true;
                if (g.especial === true) {
                    const convocados = g.convocados || [];
                    const meuId = String(perfil.id);
                    
                    // Se o médium não estiver na lista E não for Admin da casa
                    if (!convocados.includes(meuId) && !perfil.is_admin) {
                        acessoPermitido = false;
                    }
                }
                
                return aindaRolando && acessoPermitido;
            });
        }

        if (gira) {
            idGiraGlobal = gira.id;
            
            const hrInicioGira = new Date(gira.data_hora_inicio);
            
            if (gira.data_hora_fim) {
                hrFimGiraGlobal = new Date(gira.data_hora_fim);
            } else {
                hrFimGiraGlobal = new Date(hrInicioGira.getTime() + (4 * 60 * 60 * 1000));
            }
            
            hrInicioPermitidoGlobal = new Date(hrInicioGira.getTime() - (90 * 60000));

            if (divSemGira) divSemGira.classList.add('hidden');
            if (divComGira) divComGira.classList.remove('hidden');
            
            const titleGira = document.getElementById('tituloGira');
            if (titleGira) titleGira.textContent = gira.titulo;

            const imgCartaz = document.getElementById('cartazGira');
            if (imgCartaz) {
                if (gira.imagem_url) {
                    imgCartaz.src = gira.imagem_url;
                    imgCartaz.classList.remove('hidden');
                } else {
                    imgCartaz.classList.add('hidden');
                }
            }
            
            const txtHrInicio = hrInicioGira.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            const txtHrFim = hrFimGiraGlobal.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            
            const ehHoje = hrInicioGira.getDate() === horaNavegador.getDate() &&
                           hrInicioGira.getMonth() === horaNavegador.getMonth() &&
                           hrInicioGira.getFullYear() === horaNavegador.getFullYear();

            const textHorario = document.getElementById('horarioGira');
            if (textHorario) {
                if (ehHoje) {
                    textHorario.innerHTML = `<i class="far fa-clock"></i> ${txtHrInicio} às ${txtHrFim}`;
                } else {
                    const dataFormatada = hrInicioGira.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
                    textHorario.innerHTML = `<i class="far fa-calendar-alt"></i> Dia ${dataFormatada} - ${txtHrInicio} às ${txtHrFim}`;
                    
                    const elementos = document.querySelectorAll('#estadoComGira span, #estadoComGira div, #estadoComGira p');
                    elementos.forEach(el => {
                        if (el.textContent.trim().toUpperCase() === 'EVENTO HOJE') {
                            el.textContent = 'PRÓXIMO EVENTO';
                        }
                    });
                }
            }

            const { data: presencas } = await supabaseClient.from('presencas').select('*')
                .eq('usuario_id', authId).eq('evento_id', idGiraGlobal).limit(1);

            if (presencas && presencas.length > 0) {
                const areaPonto = document.getElementById('areaBaterPonto');
                const areaSucesso = document.getElementById('areaSucesso');
                const horaFeito = document.getElementById('horaCheckinFeito');
                
                if (areaPonto) areaPonto.classList.add('hidden');
                if (areaSucesso) areaSucesso.classList.remove('hidden');
                if (horaFeito) horaFeito.textContent = new Date(presencas[0].data_hora_checkin).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            } else {
                const btnPonto = document.getElementById('btnCheckin');
                const btnAgora = new Date();
                
                if (btnPonto) {
                    if (btnAgora < hrInicioPermitidoGlobal) {
                        btnPonto.disabled = true;
                        btnPonto.innerHTML = '<i class="fas fa-lock"></i> Libera 90 min antes';
                        btnPonto.classList.add('opacity-60', 'cursor-not-allowed', 'bg-gray-500');
                        btnPonto.classList.remove('bg-tema-secundaria', 'hover:opacity-90');
                    } else if (btnAgora > hrFimGiraGlobal) {
                        btnPonto.disabled = true;
                        btnPonto.innerHTML = '<i class="fas fa-times-circle"></i> Gira Encerrada';
                        btnPonto.classList.add('opacity-60', 'cursor-not-allowed', 'bg-gray-500');
                        btnPonto.classList.remove('bg-tema-secundaria', 'hover:opacity-90');
                    }
                }
            }
        } else {
            if (divComGira) divComGira.classList.add('hidden');
            if (divSemGira) divSemGira.classList.remove('hidden');
        }

    } catch (error) {
        console.error("Erro fatal:", error);
        const divSemGira = document.getElementById('estadoSemGira');
        if (divSemGira) {
            divSemGira.classList.remove('hidden');
            divSemGira.innerHTML = `
                <i class="fas fa-exclamation-triangle text-red-500 text-5xl mb-4"></i>
                <h2 class="text-xl font-bold text-gray-700">Erro Interno</h2>
                <p class="text-red-500 mt-2 font-bold">${error.message}</p>
                <p class="text-gray-500 text-sm mt-2">Tente atualizar a página.</p>
            `;
        }
    }

    // ====================================================================
    // FUNÇÕES DO MODAL E DO CARRINHO DE DOAÇÕES
    // ====================================================================

    async function carregarItensDoacao() {
        try {
            const { data: itens, error } = await supabaseClient
                .from('itens_doacao')
                .select('*')
                .eq('terreiro_id', idTerreiroGlobal)
                .eq('ativo', true)
                .order('nome', { ascending: true }); // Baseado nas colunas corretas do seu banco

            if (error) throw error;

            if (!itens || itens.length === 0) {
                if(listaItensDoacao) listaItensDoacao.innerHTML = '<p class="text-center text-gray-500 text-sm py-4">Apenas doações via PIX no momento.</p>';
                return;
            }

            let html = '';
            itens.forEach(item => {
                html += `
                <div class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 px-1">
                    <div class="flex-1 pr-2">
                        <p class="text-xs font-medium text-gray-800 leading-tight">${item.nome}</p>
                        ${item.descricao ? `<p class="text-[10px] text-gray-500 mt-0.5">${item.descricao}</p>` : ''}
                    </div>
                    <div class="flex items-center space-x-2 bg-gray-100 rounded p-1">
                        <button type="button" class="btn-qtd w-6 h-6 rounded bg-white text-red-500 font-bold shadow-sm flex items-center justify-center border border-gray-200 active:scale-95" data-id="${item.id}" data-delta="-1">
                            <i class="fas fa-minus text-[10px] pointer-events-none"></i>
                        </button>
                        <span class="w-4 text-center text-xs font-bold text-gray-700" id="qtd-item-${item.id}">0</span>
                        <button type="button" class="btn-qtd w-6 h-6 rounded bg-white text-green-600 font-bold shadow-sm flex items-center justify-center border border-gray-200 active:scale-95" data-id="${item.id}" data-delta="1">
                            <i class="fas fa-plus text-[10px] pointer-events-none"></i>
                        </button>
                    </div>
                </div>`;
            });

            if(listaItensDoacao) listaItensDoacao.innerHTML = html;
        } catch (err) {
            console.error('Erro ao carregar itens:', err);
            if(listaItensDoacao) listaItensDoacao.innerHTML = '<p class="text-center text-red-500 text-xs py-4">Erro ao carregar itens.</p>';
        }
    }

    if (listaItensDoacao) {
        listaItensDoacao.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-qtd');
            if (!btn) return;
            
            const itemId = btn.getAttribute('data-id');
            const delta = parseInt(btn.getAttribute('data-delta'));
            
            if (!carrinhoDoacoes[itemId]) carrinhoDoacoes[itemId] = 0;
            
            carrinhoDoacoes[itemId] += delta;
            if (carrinhoDoacoes[itemId] < 0) carrinhoDoacoes[itemId] = 0;
            
            document.getElementById(`qtd-item-${itemId}`).textContent = carrinhoDoacoes[itemId];
            
            let total = 0;
            for (let id in carrinhoDoacoes) total += carrinhoDoacoes[id];
            
            if (total > 0) {
                if(qtdTotalDoacao) qtdTotalDoacao.textContent = total;
                if(btnConfirmarDoacao) {
                    btnConfirmarDoacao.classList.remove('hidden');
                    btnConfirmarDoacao.classList.add('flex');
                }
            } else {
                if(btnConfirmarDoacao) {
                    btnConfirmarDoacao.classList.add('hidden');
                    btnConfirmarDoacao.classList.remove('flex');
                }
            }
        });
    }

    if (btnConfirmarDoacao) {
        btnConfirmarDoacao.addEventListener('click', async () => {
            const { data: { session } } = await supabaseClient.auth.getSession();
            const originalText = btnConfirmarDoacao.innerHTML;
            btnConfirmarDoacao.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
            btnConfirmarDoacao.disabled = true;

            const insercoes = [];
            for (let itemId in carrinhoDoacoes) {
                if (carrinhoDoacoes[itemId] > 0) {
                    insercoes.push({
                        terreiro_id: idTerreiroGlobal,
                        medium_auth_id: session.user.id,
                        item_id: parseInt(itemId),
                        quantidade: carrinhoDoacoes[itemId]
                    });
                }
            }

            try {
                const { error } = await supabaseClient.from('doacoes_registradas').insert(insercoes);
                if (error) throw error;

                btnConfirmarDoacao.innerHTML = '<i class="fas fa-check mr-2"></i> Doação Registrada!';
                btnConfirmarDoacao.classList.replace('bg-green-600', 'bg-blue-600');
                
                setTimeout(() => {
                    if(btnFecharDoacao) btnFecharDoacao.click();
                    carrinhoDoacoes = {};
                    if(btnConfirmarDoacao) {
                        btnConfirmarDoacao.classList.add('hidden');
                        btnConfirmarDoacao.classList.remove('flex');
                    }
                    carregarItensDoacao(); 
                    btnConfirmarDoacao.innerHTML = originalText;
                    btnConfirmarDoacao.disabled = false;
                    btnConfirmarDoacao.classList.replace('bg-blue-600', 'bg-green-600');
                }, 2000);

            } catch (err) {
                console.error('Erro ao salvar:', err);
                btnConfirmarDoacao.innerHTML = '<i class="fas fa-times mr-2"></i> Erro ao salvar';
                btnConfirmarDoacao.classList.replace('bg-green-600', 'bg-red-600');
                setTimeout(() => {
                    btnConfirmarDoacao.innerHTML = originalText;
                    btnConfirmarDoacao.disabled = false;
                    btnConfirmarDoacao.classList.replace('bg-red-600', 'bg-green-600');
                }, 3000);
            }
        });
    }

    const abrirModal = () => {
        if(modalDoacao) {
            modalDoacao.classList.remove('hidden');
            setTimeout(() => {
                modalDoacao.querySelector('div').classList.remove('scale-95');
                modalDoacao.querySelector('div').classList.add('scale-100');
            }, 10);
        }
    };

    if(btnAbrirDoacao) btnAbrirDoacao.addEventListener('click', abrirModal);
    if(btnAbrirDoacaoSucesso) btnAbrirDoacaoSucesso.addEventListener('click', abrirModal);

    if(btnFecharDoacao) {
        btnFecharDoacao.addEventListener('click', () => {
            modalDoacao.querySelector('div').classList.remove('scale-100');
            modalDoacao.querySelector('div').classList.add('scale-95');
            setTimeout(() => {
                modalDoacao.classList.add('hidden');
                if(btnCopiarPix) {
                    btnCopiarPix.innerHTML = '<i class="fas fa-copy mr-2"></i> Copiar Chave';
                    btnCopiarPix.classList.replace('bg-green-600', 'bg-gray-800');
                }
            }, 200);
        });
    }

    if(btnCopiarPix) {
        btnCopiarPix.addEventListener('click', () => {
            if(chavePix) {
                navigator.clipboard.writeText(chavePix.innerText).then(() => {
                    btnCopiarPix.innerHTML = '<i class="fas fa-check mr-2"></i> Chave Copiada!';
                    btnCopiarPix.classList.replace('bg-gray-800', 'bg-green-600');
                });
            }
        });
    }

    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }
});

// ====================================================================
// GPS DO CHECK-IN
// ====================================================================

const btnCheckin = document.getElementById('btnCheckin');
if (btnCheckin) {
    btnCheckin.addEventListener('click', async () => {
        const msg = document.getElementById('msgCheckin');
        
        const agoraClick = new Date();
        if (hrInicioPermitidoGlobal && agoraClick < hrInicioPermitidoGlobal) {
            if (msg) { msg.textContent = "A gira ainda não começou. Aguarde o horário."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; msg.classList.remove('hidden'); }
            return;
        }
        if (hrFimGiraGlobal && agoraClick > hrFimGiraGlobal) {
            if (msg) { msg.textContent = "Esta gira já foi encerrada."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; msg.classList.remove('hidden'); }
            return;
        }

        btnCheckin.disabled = true;
        btnCheckin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando GPS...';
        if (msg) msg.classList.add('hidden');

        if (!coordsTerreiro || !coordsTerreiro.lat) {
            if (msg) { msg.textContent = "O administrador ainda não configurou o GPS do terreiro."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; msg.classList.remove('hidden'); }
            restaurarBotao(btnCheckin); return;
        }

        if (!navigator.geolocation) {
            if (msg) { msg.textContent = "Seu navegador não suporta GPS."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; msg.classList.remove('hidden'); }
            restaurarBotao(btnCheckin); return;
        }

        navigator.geolocation.getCurrentPosition(async (posicao) => {
            const latUsuario = posicao.coords.latitude, lonUsuario = posicao.coords.longitude;
            const distanciaMetros = calcularDistancia(latUsuario, lonUsuario, coordsTerreiro.lat, coordsTerreiro.lng);
            
            if (distanciaMetros > 50) {
                if (msg) { msg.innerHTML = `Você está muito longe do terreiro.<br>Distância atual: ${Math.round(distanciaMetros)} metros. (Máximo: 50m)`; msg.className = "mt-3 text-sm font-bold text-red-500 block"; msg.classList.remove('hidden'); }
                restaurarBotao(btnCheckin); return;
            }

            const { data: { session } } = await supabaseClient.auth.getSession();
            btnCheckin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

            const { error } = await supabaseClient.from('presencas').insert([{ 
                evento_id: idGiraGlobal, 
                usuario_id: session.user.id, 
                data_hora_checkin: new Date().toISOString(),
                localizacao_valida: true,
                distancia_metros: Math.round(distanciaMetros)
            }]);

            if (error) {
                if (msg) { msg.textContent = "Erro ao registrar: " + error.message; msg.className = "mt-3 text-sm font-bold text-red-500 block"; msg.classList.remove('hidden'); }
                restaurarBotao(btnCheckin);
            } else {
                const areaPonto = document.getElementById('areaBaterPonto');
                const areaSucesso = document.getElementById('areaSucesso');
                const horaFeito = document.getElementById('horaCheckinFeito');
                if (areaPonto) areaPonto.classList.add('hidden');
                if (areaSucesso) areaSucesso.classList.remove('hidden');
                if (horaFeito) horaFeito.textContent = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            }
        }, (err) => {
            if (msg) { msg.textContent = "Ative a localização do celular no navegador."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; msg.classList.remove('hidden'); }
            restaurarBotao(btnCheckin);
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });
}

function restaurarBotao(btn) { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Confirmar Presença'; } }

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3, p1 = lat1 * Math.PI/180, p2 = lat2 * Math.PI/180, dp = (lat2-lat1) * Math.PI/180, dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
}
