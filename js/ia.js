// ============================================================================
// MÓDULO: ASSISTENTE IA & CONSULTAS ANALÍTICAS (ia.html)
// ============================================================================

(function () {
    let perfilLogado = null;
    let idTerreiro = null;
    let recognition = null;
    let gravandoAudio = false;

    document.addEventListener('DOMContentLoaded', async () => {
        const hist = document.getElementById('historicoMensagens');
        const inputPergunta = document.getElementById('inputPergunta');
        const formChat = document.getElementById('formChat');
        const btnMic = document.getElementById('btnMicrofone');
        const boxGravando = document.getElementById('statusGravando');
        const btnCancelarVoz = document.getElementById('btnCancelarVoz');

        // 1. Checa Sessão e Pega Terreiro ID
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'index.html';
            return;
        }

        const { data: medData } = await supabaseClient
            .from('mediuns')
            .select('id, nome_completo, terreiro_id, is_admin')
            .eq('auth_id', session.user.id)
            .limit(1);

        if (!medData || medData.length === 0) {
            alert('Ficha do usuário não localizada.');
            window.location.href = 'index.html';
            return;
        }

        perfilLogado = medData[0];
        idTerreiro = perfilLogado.terreiro_id;

        // Atualiza cabeçalho com nome do terreiro
        const { data: terr } = await supabaseClient
            .from('terreiros')
            .select('nome')
            .eq('id', idTerreiro)
            .single();

        if (terr && terr.nome) {
            const elSub = document.getElementById('subtituloTerreiro');
            if (elSub) elSub.textContent = `Consultas da Casa: ${terr.nome}`;
        }

        // 2. Configura Reconhecimento de Voz (Web Speech API)
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.lang = 'pt-BR';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => {
                gravandoAudio = true;
                boxGravando?.classList.remove('hidden');
                btnMic?.classList.replace('bg-slate-800', 'bg-rose-600');
                btnMic?.classList.add('animate-pulse');
            };

            recognition.onresult = (event) => {
                const textoTranscrito = event.results[0][0].transcript;
                if (inputPergunta) {
                    inputPergunta.value = textoTranscrito;
                    formChat.dispatchEvent(new Event('submit'));
                }
            };

            recognition.onerror = (e) => {
                console.error('Erro no reconhecimento de voz:', e);
                pararGravacao();
            };

            recognition.onend = () => {
                pararGravacao();
            };

            btnMic?.addEventListener('click', () => {
                if (gravandoAudio) {
                    recognition.stop();
                } else {
                    recognition.start();
                }
            });

            btnCancelarVoz?.addEventListener('click', () => {
                if (recognition) recognition.abort();
                pararGravacao();
            });
        } else {
            if (btnMic) {
                btnMic.title = "Navegador não suporta reconhecimento de voz";
                btnMic.classList.add('opacity-40', 'cursor-not-allowed');
            }
        }

        function pararGravacao() {
            gravandoAudio = false;
            boxGravando?.classList.add('hidden');
            btnMic?.classList.replace('bg-rose-600', 'bg-slate-800');
            btnMic?.classList.remove('animate-pulse');
        }

        // 3. Atalhos de Perguntas Rápidas
        document.querySelectorAll('.btn-sugestao').forEach(btn => {
            btn.addEventListener('click', () => {
                const txt = btn.textContent.replace(/^[^a-zA-ZÀ-ÿ0-9]+/, '').trim();
                if (inputPergunta) {
                    inputPergunta.value = txt;
                    formChat.dispatchEvent(new Event('submit'));
                }
            });
        });

        // 4. Submissão do Formulário de Pergunta
        formChat?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pergunta = inputPergunta.value.trim();
            if (!pergunta) return;

            // Adiciona balão do usuário
            adicionarBalao('usuario', pergunta);
            inputPergunta.value = '';

            // Adiciona balão "Pensando..."
            const idLoader = 'loader_' + Date.now();
            adicionarLoader(idLoader);

            try {
                const resposta = await processarPerguntaNoBanco(pergunta, idTerreiro);
                removerLoader(idLoader);
                adicionarBalao('ia', resposta);
            } catch (err) {
                console.error(err);
                removerLoader(idLoader);
                adicionarBalao('ia', `❌ Desculpe, tive um problema ao consultar as informações: ${err.message}`);
            }
        });

        function adicionarBalao(remetente, conteudoHtml) {
            const div = document.createElement('div');
            div.className = `flex items-start gap-3 ${remetente === 'usuario' ? 'justify-end' : ''}`;

            if (remetente === 'usuario') {
                div.innerHTML = `
                    <div class="bg-blue-600 text-white rounded-2xl rounded-tr-none p-3.5 text-xs md:text-sm max-w-[85%] md:max-w-[70%] shadow-md">
                        ${conteudoHtml}
                    </div>
                    <div class="w-8 h-8 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs shrink-0 font-bold">
                        Você
                    </div>
                `;
            } else {
                div.innerHTML = `
                    <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm shrink-0 shadow-md">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="bg-slate-800/90 border border-slate-700/80 rounded-2xl rounded-tl-none p-4 text-xs md:text-sm text-slate-200 leading-relaxed max-w-[88%] md:max-w-[75%] shadow-sm">
                        ${conteudoHtml}
                    </div>
                `;
            }

            hist.appendChild(div);
            hist.scrollTop = hist.scrollHeight;
        }

        function adicionarLoader(id) {
            const div = document.createElement('div');
            div.id = id;
            div.className = "flex items-start gap-3";
            div.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm shrink-0 shadow-md">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-400 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                    Consultando banco de dados da Casa...
                </div>
            `;
            hist.appendChild(div);
            hist.scrollTop = hist.scrollHeight;
        }

        function removerLoader(id) {
            const el = document.getElementById(id);
            if (el) el.remove();
        }
    });

    // ========================================================================
    // MOTOR DE CONSULTAS SQL/TABELAS (ISOLADO POR TERREIRO_ID)
    // ========================================================================
    async function processarPerguntaNoBanco(pergunta, terreiroId) {
        const pNorm = pergunta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // 1. PRESENÇAS / QUEM MAIS FREQUENTOU
        if (pNorm.includes('frequen') || pNorm.includes('presenca') || pNorm.includes('participou') || pNorm.includes('mais foi')) {
            const ano = pNorm.includes('2025') ? 2025 : (pNorm.includes('2027') ? 2027 : 2026);
            
            // Busca presenças do terreiro no ano
            const { data: presencas, error: errP } = await supabaseClient
                .from('presencas')
                .select(`
                    id,
                    usuario_id,
                    agenda:evento_id!inner(id, titulo, data_hora_inicio, terreiro_id)
                `)
                .eq('agenda.terreiro_id', terreiroId)
                .gte('agenda.data_hora_inicio', `${ano}-01-01T00:00:00`)
                .lte('agenda.data_hora_inicio', `${ano}-12-31T23:59:59`);

            if (errP) throw errP;

            if (!presencas || presencas.length === 0) {
                return `Não encontrei nenhum registro de presença cadastrado para o ano de **${ano}** neste terreiro.`;
            }

            // Agrupa por usuario_id
            const contagem = {};
            presencas.forEach(pr => {
                contagem[pr.usuario_id] = (contagem[pr.usuario_id] || 0) + 1;
            });

            // Busca os nomes dos médiuns envolvidos
            const authIds = Object.keys(contagem);
            const { data: meds } = await supabaseClient
                .from('mediuns')
                .select('auth_id, nome_completo, nome_social, grau')
                .in('auth_id', authIds)
                .eq('terreiro_id', terreiroId);

            const ranking = (meds || []).map(m => ({
                nome: m.nome_social || m.nome_completo,
                grau: m.grau || '-',
                total: contagem[m.auth_id] || 0
            })).sort((a, b) => b.total - a.total);

            let resposta = `<strong class="text-emerald-400">📊 Ranking de Presença nas Giras em ${ano}:</strong><br><br>`;
            ranking.slice(0, 10).forEach((item, idx) => {
                const medalha = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx + 1}º`));
                resposta += `${medalha} <strong>${item.nome}</strong> (${item.grau}) — <strong>${item.total}</strong> presenças<br>`;
            });

            return resposta;
        }

        // 2. AFILHADOS / PADRINHOS
        if (pNorm.includes('afilh') || pNorm.includes('padrinho') || pNorm.includes('madrinha')) {
            const { data: todosMeds, error: errM } = await supabaseClient
                .from('mediuns')
                .select('id, nome_completo, nome_social, padrinhos_batismo, padrinhos_consagracao, padrinhos_coroacao')
                .eq('terreiro_id', terreiroId)
                .eq('status_ativo', true);

            if (errM) throw errM;

            // Extrai possíveis nomes citados na pergunta
            const nomesPossiveis = ['bruno', 'brunao', 'diogo', 'thatiana', 'thaty', 'paula', 'magnum', 'vinicius'];
            const alvo = nomesPossiveis.find(n => pNorm.includes(n)) || '';

            let afilhadosEncontrados = [];

            (todosMeds || []).forEach(m => {
                const textos = [
                    m.padrinhos_batismo || '',
                    m.padrinhos_consagracao || '',
                    m.padrinhos_coroacao || ''
                ].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

                if (alvo && textos.includes(alvo)) {
                    afilhadosEncontrados.push(m.nome_social || m.nome_completo);
                }
            });

            if (afilhadosEncontrados.length > 0) {
                return `<strong class="text-blue-400">🕊️ Afilhados encontrados para "${alvo.toUpperCase()}":</strong><br><br>` +
                       `O médium possui <strong>${afilhadosEncontrados.length}</strong> afilhado(s) registrados na Casa:<br>` +
                       afilhadosEncontrados.map(n => `• ${n}`).join('<br>');
            } else if (alvo) {
                return `Não localizei nenhum afilhado registrado sob a responsabilidade de "${alvo}".`;
            }
        }

        // 3. GUIAS ESPECÍFICOS (ex: Caboclo, Exu, Preto Velho)
        if (pNorm.includes('guia') || pNorm.includes('caboclo') || pNorm.includes('exu') || pNorm.includes('preto velho') || pNorm.includes('cigano') || pNorm.includes('flechas')) {
            const { data: mediunsGuias } = await supabaseClient
                .from('mediuns')
                .select('nome_completo, nome_social, grau, guia_caboclo, guia_preto_velho, guia_exu_pombagira, guia_crianca, guia_oriental, guia_cigano')
                .eq('terreiro_id', terreiroId)
                .eq('status_ativo', true);

            // Termo buscado
            const termos = ['sete flechas', '7 flechas', 'pena branca', 'jurema', 'tranca ruas', 'marabo', 'maria padilha', 'catarina', 'joaquim'];
            const termoMatch = termos.find(t => pNorm.includes(t)) || '';

            const encontrados = (mediunsGuias || []).filter(m => {
                const unificado = [
                    m.guia_caboclo, m.guia_preto_velho, m.guia_exu_pombagira, m.guia_crianca, m.guia_oriental, m.guia_cigano
                ].filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return termoMatch ? unificado.includes(termoMatch) : false;
            });

            if (encontrados.length > 0) {
                return `<strong class="text-emerald-400">🌿 Médiuns que trabalham na linha/entidade "${termoMatch.toUpperCase()}":</strong><br><br>` +
                       encontrados.map(m => `• <strong>${m.nome_social || m.nome_completo}</strong> (${m.grau || '-'})`).join('<br>');
            }
        }

        // 4. MENSALIDADES / FINANCEIRO
        if (pNorm.includes('mensalidade') || pNorm.includes('financeiro') || pNorm.includes('em dia') || pNorm.includes('devedor') || pNorm.includes('pendente')) {
            const anoAtual = 2026;
            const { data: fin } = await supabaseClient
                .from('financeiro')
                .select('medium_id, mes, pago, isento')
                .eq('ano', anoAtual);

            const { data: todosMed } = await supabaseClient
                .from('mediuns')
                .select('id, nome_completo, nome_social')
                .eq('terreiro_id', terreiroId)
                .eq('status_ativo', true);

            const totalAtivos = (todosMed || []).length;
            const pagadores = new Set((fin || []).filter(f => f.pago === true).map(f => f.medium_id));

            return `<strong class="text-amber-400">💰 Panorama de Mensalidades (${anoAtual}):</strong><br><br>` +
                   `• Total de médiuns ativos na corrente: <strong>${totalAtivos}</strong><br>` +
                   `• Médiuns com pagamentos registrados no ano: <strong>${pagadores.size}</strong><br>` +
                   `• Taxa de adimplência geral: <strong>${totalAtivos > 0 ? Math.round((pagadores.size / totalAtivos) * 100) : 0}%</strong>`;
        }

        // Fallback Geral Informativo
        return `Entendi sua pergunta, mas para essa busca específica você pode consultar diretamente a aba correspondente no Painel de Gestão ou perguntar algo como:<br><br>` +
               `• *"Quem mais participou das giras em 2026?"*<br>` +
               `• *"Quantos afilhados tem o médium Bruno Rafael?"*<br>` +
               `• *"Médiuns com Caboclo Sete Flechas"*<br>` +
               `• *"Situação das mensalidades"*`;
    }
})();
