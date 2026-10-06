let idTerreiroGlobal = null;
let idMediumGlobal = null;
let idGiraGlobal = null;
let coordsTerreiro = null;

document.addEventListener('DOMContentLoaded', async () => {
    
    // Verifica se está logado
    const { data: { session }, error: erroSessao } = await supabaseClient.auth.getSession();
    
    if (erroSessao || !session) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // 1. BUSCA O PERFIL DO MÉDIUM (AGORA INCLUINDO AS PERMISSÕES!)
        const { data: perfil, error: erroPerfil } = await supabaseClient
            .from('mediuns')
            .select('id, nome_completo, terreiro_id, is_admin, perm_agenda, perm_grau, perm_financeiro, perm_doacoes, perm_admin')
            .eq('auth_id', session.user.id)
            .single();

        if (erroPerfil) throw erroPerfil;

        idMediumGlobal = perfil.id;
        idTerreiroGlobal = perfil.terreiro_id;
        
        document.getElementById('nomeMedium').textContent = 'Olá, ' + perfil.nome_completo.split(' ')[0];

        // ========================================================
        // 2. LÓGICA DE EXIBIÇÃO DO BOTÃO ADMIN
        // ========================================================
        const temAcessoAoPainel = perfil.is_admin || 
                                  perfil.perm_agenda || 
                                  perfil.perm_grau || 
                                  perfil.perm_financeiro || 
                                  perfil.perm_doacoes || 
                                  perfil.perm_admin;

        if (temAcessoAoPainel) {
            document.getElementById('areaAdmin').classList.remove('hidden'); // Exibe o botão!
        }

        // Evento de clique para ir para o painel
        document.getElementById('btnPainelAdmin').addEventListener('click', () => {
            window.location.href = 'admin.html';
        });
        // ========================================================

        // 3. BUSCA DADOS DO TERREIRO (Nome, Logo, Cores, GPS)
        if (idTerreiroGlobal) {
            const { data: terreiro } = await supabaseClient
                .from('terreiros')
                .select('*')
                .eq('id', idTerreiroGlobal)
                .single();
            
            if (terreiro) {
                document.getElementById('nomeTerreiro').textContent = terreiro.nome;
                coordsTerreiro = { lat: terreiro.latitude, lng: terreiro.longitude };
                
                // Aplicar Cores
                const root = document.documentElement;
                if(terreiro.cor_primaria) root.style.setProperty('--cor-primaria', terreiro.cor_primaria);
                if(terreiro.cor_secundaria) root.style.setProperty('--cor-secundaria', terreiro.cor_secundaria);
                if(terreiro.cor_fundo) root.style.setProperty('--cor-fundo', terreiro.cor_fundo);
                if(terreiro.cor_texto) root.style.setProperty('--cor-texto', terreiro.cor_texto);

                // Aplicar Logo
                if(terreiro.logo_url) {
                    const img = document.getElementById('logoTerreiro');
                    img.src = terreiro.logo_url;
                    img.classList.remove('hidden');
                }
            }
        }

        // 4. VERIFICA SE TEM GIRA HOJE
        const hoje = new Date();
        const inicioDia = new Date(hoje.setHours(0,0,0,0)).toISOString();
        const fimDia = new Date(hoje.setHours(23,59,59,999)).toISOString();

        const { data: giras, error: erroGira } = await supabaseClient
            .from('agenda')
            .select('*')
            .eq('terreiro_id', idTerreiroGlobal)
            .gte('data_hora_inicio', inicioDia)
            .lte('data_hora_inicio', fimDia)
            .order('data_hora_inicio', { ascending: true })
            .limit(1);

        if (giras && giras.length > 0) {
            // TEM GIRA!
            const gira = giras[0];
            idGiraGlobal = gira.id;
            
            document.getElementById('estadoSemGira').classList.add('hidden');
            document.getElementById('estadoComGira').classList.remove('hidden');
            
            document.getElementById('tituloGira').textContent = gira.titulo;
            
            const hrInicio = new Date(gira.data_hora_inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            const hrFim = new Date(gira.data_hora_fim).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            document.getElementById('horarioGira').innerHTML = `<i class="far fa-clock"></i> ${hrInicio} às ${hrFim}`;

            // Verifica se já fez check-in
            const { data: checkinExistente } = await supabaseClient
                .from('presencas')
                .select('*')
                .eq('usuario_id', session.user.id)
                .eq('evento_id', idGiraGlobal)
                .single();

            if (checkinExistente) {
                document.getElementById('areaBaterPonto').classList.add('hidden');
                document.getElementById('areaSucesso').classList.remove('hidden');
                document.getElementById('horaCheckinFeito').textContent = new Date(checkinExistente.data_hora_checkin).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            }

        } else {
            // NÃO TEM GIRA!
            document.getElementById('estadoComGira').classList.add('hidden');
            document.getElementById('estadoSemGira').classList.remove('hidden');
        }

    } catch (error) {
        console.error("Erro geral:", error);
    }

    // 5. BOTÃO DE SAIR
    document.getElementById('btnSair').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });
});

// ==========================================
// FUNÇÃO DE BATER O PONTO (COM GPS)
// ==========================================
document.getElementById('btnCheckin').addEventListener('click', async () => {
    const btn = document.getElementById('btnCheckin');
    const msg = document.getElementById('msgCheckin');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando GPS...';
    msg.classList.add('hidden');

    // 1. Verifica se o Admin já configurou o GPS da casa
    if (!coordsTerreiro || !coordsTerreiro.lat) {
        msg.textContent = "O administrador ainda não configurou o GPS do terreiro.";
        msg.className = "mt-3 text-sm font-bold text-red-500 block";
        restaurarBotao(btn);
        return;
    }

    // 2. Pede permissão de localização do celular
    if (!navigator.geolocation) {
        msg.textContent = "Seu navegador não suporta GPS.";
        msg.className = "mt-3 text-sm font-bold text-red-500 block";
        restaurarBotao(btn);
        return;
    }

    navigator.geolocation.getCurrentPosition(async (posicao) => {
        const latUsuario = posicao.coords.latitude;
        const lonUsuario = posicao.coords.longitude;
        
        // 3. Calcula a distância (Fórmula de Haversine)
        const distanciaMetros = calcularDistancia(latUsuario, lonUsuario, coordsTerreiro.lat, coordsTerreiro.lng);
        
        // Raio de tolerância em metros (ex: 100 metros)
        const TOLERANCIA = 100; 

        if (distanciaMetros > TOLERANCIA) {
            msg.innerHTML = `Você está muito longe do terreiro.<br>Distância atual: ${Math.round(distanciaMetros)} metros.`;
            msg.className = "mt-3 text-sm font-bold text-red-500 block";
            restaurarBotao(btn);
            return;
        }

        // 4. Salva no Banco de Dados
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

        const { error } = await supabaseClient.from('presencas').insert([{
            evento_id: idGiraGlobal,
            usuario_id: session.user.id,
            data_hora_checkin: new Date().toISOString()
        }]);

        if (error) {
            msg.textContent = "Erro ao registrar: " + error.message;
            msg.className = "mt-3 text-sm font-bold text-red-500 block";
            restaurarBotao(btn);
        } else {
            // Sucesso!
            document.getElementById('areaBaterPonto').classList.add('hidden');
            document.getElementById('areaSucesso').classList.remove('hidden');
            document.getElementById('horaCheckinFeito').textContent = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        }

    }, (err) => {
        msg.textContent = "Erro de GPS. Ative a localização do celular e permita o acesso no navegador.";
        msg.className = "mt-3 text-sm font-bold text-red-500 block";
        restaurarBotao(btn);
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
});

function restaurarBotao(btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Confirmar Presença';
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Raio da Terra em metros
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}
