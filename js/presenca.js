let idTerreiroGlobal = null;
let idGiraGlobal = null;
let coordsTerreiro = null;
let hrFimGiraGlobal = null;
let hrInicioPermitidoGlobal = null;

document.addEventListener('DOMContentLoaded', async () => {
    
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
            // ====================================================================
            // AUTO-CONSERTO: Se falhou, a conta está desvinculada no banco.
            // O sistema vai atuar como detetive para achar a ficha e consertar!
            // ====================================================================
            
            // Tenta achar pelo E-mail "fantasma" do Supabase (Ex: se fez login com o ID 32 -> 32@...com)
            if (session.user.email) {
                const possivelId = session.user.email.split('@')[0];
                if (!isNaN(possivelId)) {
                    const { data: p2 } = await supabaseClient.from('mediuns').select('*').eq('id', possivelId).limit(1);
                    if (p2 && p2.length > 0) perfil = p2[0];
                }
            }
            
            // Tenta achar pelo Telefone
            if (!perfil && session.user.phone) {
                const { data: p3 } = await supabaseClient.from('mediuns').select('*').eq('telefone', session.user.phone).limit(1);
                if (p3 && p3.length > 0) perfil = p3[0];
            }
            
            // Tenta achar pelo cache local do celular
            const localId = localStorage.getItem('medium_id');
            if (!perfil && localId) {
                const { data: p4 } = await supabaseClient.from('mediuns').select('*').eq('id', localId).limit(1);
                if (p4 && p4.length > 0) perfil = p4[0];
            }

            // SE O DETETIVE ACHOU A FICHA, ELE CONSERTA O BANCO DE DADOS NA HORA!
            if (perfil) {
                await supabaseClient.from('mediuns').update({ auth_id: authId }).eq('id', perfil.id);
                console.log("Sucesso: A ficha do médium foi vinculada automaticamente!");
            }
        }

        // Se mesmo com o detetive não achar ninguém (Erro gravíssimo no banco)
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

        // LIBERAÇÃO DO PAINEL ADMIN PARA QUEM TEM PERMISSÃO
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
            }
        } else {
            if (tituloTerreiro) tituloTerreiro.textContent = 'Sem Terreiro Vinculado';
        }

        // ====================================================================
        // VERIFICA GIRA DE HOJE (CORRIGIDO PARA IGNORAR GIRAS QUE JÁ ACABARAM)
        // ====================================================================
        const agora = new Date();
        const agoraIso = agora.toISOString(); // Hora exata de agora
        
        // Final do dia de hoje para limitar a busca (23:59:59)
        const fimDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999).toISOString();

        const { data: giras } = await supabaseClient.from('agenda').select('*')
            .eq('terreiro_id', idTerreiroGlobal)
            .eq('ata_encerrada', false)
            .gte('data_hora_fim', agoraIso)  // <-- MAGICA AQUI: O Fim da gira tem que ser no futuro
            .lte('data_hora_inicio', fimDia) // <-- MAGICA AQUI: O Início tem que ser antes do fim de hoje
            .order('data_hora_inicio', { ascending: true })
            .limit(1);

        const divSemGira = document.getElementById('estadoSemGira');
        const divComGira = document.getElementById('estadoComGira');

        if (giras && giras.length > 0) {
            const gira = giras[0];
            idGiraGlobal = gira.id;
            
            // Define variáveis globais de horário
            const hrInicioGira = new Date(gira.data_hora_inicio);
            hrFimGiraGlobal = new Date(gira.data_hora_fim);
            hrInicioPermitidoGlobal = new Date(hrInicioGira.getTime() - (90 * 60000)); // Libera 90 min antes

            if (divSemGira) divSemGira.classList.add('hidden');
            if (divComGira) divComGira.classList.remove('hidden');
            
            const titleGira = document.getElementById('tituloGira');
            if (titleGira) titleGira.textContent = gira.titulo;
            
            const txtHrInicio = hrInicioGira.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            const txtHrFim = hrFimGiraGlobal.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            const textHorario = document.getElementById('horarioGira');
            if (textHorario) textHorario.innerHTML = `<i class="far fa-clock"></i> ${txtHrInicio} às ${txtHrFim}`;

            // Verifica Check-in Atual
            const { data: presencas } = await supabaseClient.from('presencas').select('*')
                .eq('usuario_id', authId).eq('evento_id', idGiraGlobal).limit(1);

            if (presencas && presencas.length > 0) {
                // Já bateu ponto
                const areaPonto = document.getElementById('areaBaterPonto');
                const areaSucesso = document.getElementById('areaSucesso');
                const horaFeito = document.getElementById('horaCheckinFeito');
                
                if (areaPonto) areaPonto.classList.add('hidden');
                if (areaSucesso) areaSucesso.classList.remove('hidden');
                if (horaFeito) horaFeito.textContent = new Date(presencas[0].data_hora_checkin).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            } else {
                // Não bateu ponto ainda - Controla o botão por horário
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

    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }
});

// GPS
const btnCheckin = document.getElementById('btnCheckin');
if (btnCheckin) {
    btnCheckin.addEventListener('click', async () => {
        const msg = document.getElementById('msgCheckin');
        
        // Trava 1: Se o cara abriu o App cedão e não atualizou a página, previne dele clicar antes da hora
        const agoraClick = new Date();
        if (hrInicioPermitidoGlobal && agoraClick < hrInicioPermitidoGlobal) {
            if (msg) { msg.textContent = "A gira ainda não começou. Aguarde o horário."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; }
            return;
        }
        if (hrFimGiraGlobal && agoraClick > hrFimGiraGlobal) {
            if (msg) { msg.textContent = "Esta gira já foi encerrada."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; }
            return;
        }

        btnCheckin.disabled = true;
        btnCheckin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando GPS...';
        if (msg) msg.classList.add('hidden');

        if (!coordsTerreiro || !coordsTerreiro.lat) {
            if (msg) { msg.textContent = "O administrador ainda não configurou o GPS do terreiro."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; }
            restaurarBotao(btnCheckin); return;
        }

        if (!navigator.geolocation) {
            if (msg) { msg.textContent = "Seu navegador não suporta GPS."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; }
            restaurarBotao(btnCheckin); return;
        }

        navigator.geolocation.getCurrentPosition(async (posicao) => {
            const latUsuario = posicao.coords.latitude, lonUsuario = posicao.coords.longitude;
            const distanciaMetros = calcularDistancia(latUsuario, lonUsuario, coordsTerreiro.lat, coordsTerreiro.lng);
            
            // TRAVA DE SEGURANÇA: 50 METROS
            if (distanciaMetros > 50) {
                if (msg) { msg.innerHTML = `Você está muito longe do terreiro.<br>Distância atual: ${Math.round(distanciaMetros)} metros. (Máximo: 50m)`; msg.className = "mt-3 text-sm font-bold text-red-500 block"; }
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
                if (msg) { msg.textContent = "Erro ao registrar: " + error.message; msg.className = "mt-3 text-sm font-bold text-red-500 block"; }
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
            if (msg) { msg.textContent = "Ative a localização do celular no navegador."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; }
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
