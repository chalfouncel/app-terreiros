let idTerreiroGlobal = null;
let idGiraGlobal = null;
let coordsTerreiro = null;

document.addEventListener('DOMContentLoaded', async () => {
    
    const tituloTerreiro = document.getElementById('nomeTerreiro');
    if (tituloTerreiro) tituloTerreiro.textContent = "Carregando sistema...";

    // Verifica Sessão
    const { data: { session }, error: erroSessao } = await supabaseClient.auth.getSession();
    
    if (erroSessao || !session) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // CORREÇÃO AQUI: Em vez de .single() que trava se houver duplicidade de testes, usamos .limit(1)
        const { data: perfis, error: erroPerfil } = await supabaseClient
            .from('mediuns')
            .select('*')
            .eq('auth_id', session.user.id)
            .limit(1);

        if (erroPerfil) {
            alert("Erro de leitura do banco: " + erroPerfil.message);
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
            return;
        }

        if (!perfis || perfis.length === 0) {
            alert("Seu cadastro não foi encontrado no banco de dados.");
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
            return;
        }

        // Pega o primeiro perfil com segurança
        const perfil = perfis[0];

        idTerreiroGlobal = perfil.terreiro_id;
        
        const nomeCurto = perfil.nome_completo ? perfil.nome_completo.split(' ')[0] : 'Médium';
        const txtNome = document.getElementById('nomeMedium');
        if (txtNome) txtNome.textContent = 'Olá, ' + nomeCurto;

        // ========================================================
        // 2. LÓGICA DE EXIBIÇÃO DO BOTÃO ADMIN 
        // ========================================================
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
            btnPainel.addEventListener('click', () => {
                window.location.href = 'admin.html';
            });
        }
        // ========================================================

        // 3. BUSCA DADOS DO TERREIRO 
        if (idTerreiroGlobal) {
            const { data: terreiros } = await supabaseClient
                .from('terreiros')
                .select('*')
                .eq('id', idTerreiroGlobal)
                .limit(1);
            
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

        // 4. VERIFICA SE TEM GIRA HOJE
        const hoje = new Date();
        const inicioDia = new Date(hoje.setHours(0,0,0,0)).toISOString();
        const fimDia = new Date(hoje.setHours(23,59,59,999)).toISOString();

        const { data: giras } = await supabaseClient
            .from('agenda')
            .select('*')
            .eq('terreiro_id', idTerreiroGlobal)
            .gte('data_hora_inicio', inicioDia)
            .lte('data_hora_inicio', fimDia)
            .order('data_hora_inicio', { ascending: true })
            .limit(1);

        const divSemGira = document.getElementById('estadoSemGira');
        const divComGira = document.getElementById('estadoComGira');

        if (giras && giras.length > 0) {
            const gira = giras[0];
            idGiraGlobal = gira.id;
            
            if (divSemGira) divSemGira.classList.add('hidden');
            if (divComGira) divComGira.classList.remove('hidden');
            
            const titleGira = document.getElementById('tituloGira');
            if (titleGira) titleGira.textContent = gira.titulo;
            
            const hrInicio = new Date(gira.data_hora_inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            const hrFim = new Date(gira.data_hora_fim).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            const textHorario = document.getElementById('horarioGira');
            if (textHorario) textHorario.innerHTML = `<i class="far fa-clock"></i> ${hrInicio} às ${hrFim}`;

            const { data: presencas } = await supabaseClient
                .from('presencas')
                .select('*')
                .eq('usuario_id', session.user.id)
                .eq('evento_id', idGiraGlobal)
                .limit(1);

            if (presencas && presencas.length > 0) {
                const areaPonto = document.getElementById('areaBaterPonto');
                const areaSucesso = document.getElementById('areaSucesso');
                const horaFeito = document.getElementById('horaCheckinFeito');
                
                if (areaPonto) areaPonto.classList.add('hidden');
                if (areaSucesso) areaSucesso.classList.remove('hidden');
                if (horaFeito) horaFeito.textContent = new Date(presencas[0].data_hora_checkin).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
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
                <p class="text-gray-500 text-sm mt-2">Atualize a página e tente novamente.</p>
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

const btnCheckin = document.getElementById('btnCheckin');
if (btnCheckin) {
    btnCheckin.addEventListener('click', async () => {
        const msg = document.getElementById('msgCheckin');
        
        btnCheckin.disabled = true;
        btnCheckin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando GPS...';
        if (msg) msg.classList.add('hidden');

        if (!coordsTerreiro || !coordsTerreiro.lat) {
            if (msg) {
                msg.textContent = "O administrador ainda não configurou o GPS do terreiro.";
                msg.className = "mt-3 text-sm font-bold text-red-500 block";
            }
            restaurarBotao(btnCheckin);
            return;
        }

        if (!navigator.geolocation) {
            if (msg) {
                msg.textContent = "Seu navegador não suporta GPS.";
                msg.className = "mt-3 text-sm font-bold text-red-500 block";
            }
            restaurarBotao(btnCheckin);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (posicao) => {
            const latUsuario = posicao.coords.latitude;
            const lonUsuario = posicao.coords.longitude;
            
            const distanciaMetros = calcularDistancia(latUsuario, lonUsuario, coordsTerreiro.lat, coordsTerreiro.lng);
            const TOLERANCIA = 100; 

            if (distanciaMetros > TOLERANCIA) {
                if (msg) {
                    msg.innerHTML = `Você está muito longe do terreiro.<br>Distância atual: ${Math.round(distanciaMetros)} metros.`;
                    msg.className = "mt-3 text-sm font-bold text-red-500 block";
                }
                restaurarBotao(btnCheckin);
                return;
            }

            const { data: { session } } = await supabaseClient.auth.getSession();
            
            btnCheckin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

            const { error } = await supabaseClient.from('presencas').insert([{
                evento_id: idGiraGlobal,
                usuario_id: session.user.id,
                data_hora_checkin: new Date().toISOString()
            }]);

            if (error) {
                if (msg) {
                    msg.textContent = "Erro ao registrar: " + error.message;
                    msg.className = "mt-3 text-sm font-bold text-red-500 block";
                }
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
            if (msg) {
                msg.textContent = "Erro de GPS. Ative a localização do celular e permita o acesso no navegador.";
                msg.className = "mt-3 text-sm font-bold text-red-500 block";
            }
            restaurarBotao(btnCheckin);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    });
}

function restaurarBotao(btn) {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Confirmar Presença';
    }
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}
