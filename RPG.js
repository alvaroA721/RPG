document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'ordem_paranormal_ficha_v1';

    // Seletores principais
    const classeSelect = document.querySelector('select[name="classe"]');
    const nexSelect = document.querySelector('select[name="nex"]');

    // Atributos na ordem do HTML: [AGI, FOR, INT, PRE, VIG]
    const attrInputs = document.querySelectorAll('.grid-5 input[type="number"]');
    const [agiInput, forInput, intInput, preInput, vigInput] = attrInputs;

    // Status: [PV, PE, SAN] e Defesa
    const statusInputs = document.querySelectorAll('.grid-3 input[type="text"]');
    const [pvInput, peInput, sanInput] = statusInputs;
    const defesaInput = document.querySelector('.grid-2 input[type="number"]');

    // Tabela de Perícias (segunda tabela da ficha)
    const tabelas = document.querySelectorAll('table');
    const periciasRows = tabelas[1] ? tabelas[1].querySelectorAll('tbody tr') : [];

    // Regras base por Classe (Ordem Paranormal RPG)
    const REGRAS_CLASSES = {
        combatente: {
            pvBase: 20, pvPorNex: 4,
            peBase: 2,  pePorNex: 2,
            sanBase: 12, sanPorNex: 3
        },
        especialista: {
            pvBase: 16, pvPorNex: 3,
            peBase: 3,  pePorNex: 3,
            sanBase: 16, sanPorNex: 4
        },
        ocultista: {
            pvBase: 12, pvPorNex: 2,
            peBase: 4,  pePorNex: 4,
            sanBase: 20, sanPorNex: 5
        }
    };

    // Retorna o valor numérico de um atributo
    function getAtributo(sigla) {
        const mapa = {
            AGI: parseInt(agiInput.value, 10) || 0,
            FOR: parseInt(forInput.value, 10) || 0,
            INT: parseInt(intInput.value, 10) || 0,
            PRE: parseInt(preInput.value, 10) || 0,
            VIG: parseInt(vigInput.value, 10) || 0
        };
        return mapa[sigla] ?? 0;
    }

    // Atualiza campos no formato "ATUAL / MÁX" preservando dano já sofrido
    function atualizarCampoStatus(input, novoMax) {
        const valorAtual = input.value.trim();
        const maxAnterior = input.dataset.lastMax;

        if (!valorAtual || !valorAtual.includes('/')) {
            input.value = `${novoMax} / ${novoMax}`;
        } else {
            const [atualStr] = valorAtual.split('/').map(s => s.trim());
            // Se estava com vida/PE/SAN cheia, acompanha o novo máximo
            if (atualStr === maxAnterior) {
                input.value = `${novoMax} / ${novoMax}`;
            } else {
                input.value = `${atualStr} / ${novoMax}`;
            }
        }
        input.dataset.lastMax = String(novoMax);
    }

    // 1. Cálculo de PV, PE, SAN e Defesa
    function calcularStatus() {
        const agi = getAtributo('AGI');
        const pre = getAtributo('PRE');
        const vig = getAtributo('VIG');

        // Defesa base = 10 + AGI
        defesaInput.value = 10 + agi;

        const classe = classeSelect.value;
        const regra = REGRAS_CLASSES[classe];
        if (!regra) return;

        const nex = parseInt(nexSelect.value, 10) || 5;
        // 5% = nível 1 (0 avanços); 99% = nível 20 (19 avanços)
        const nivel = nex === 99 ? 20 : (nex === 100 ? 21 : Math.floor(nex / 5));
        const avancos = Math.max(0, nivel - 1);

        const pvMax = (regra.pvBase + vig) + avancos * (regra.pvPorNex + vig);
        const peMax = (regra.peBase + pre) + avancos * (regra.pePorNex + pre);
        const sanMax = regra.sanBase + avancos * regra.sanPorNex;

        atualizarCampoStatus(pvInput, pvMax);
        atualizarCampoStatus(peInput, peMax);
        atualizarCampoStatus(sanInput, sanMax);
    }

    // 2. Cálculo de Bônus Total das Perícias (Treino + Outros)
    function calcularPericias() {
        periciasRows.forEach(row => {
            const treinoSelect = row.cells[2].querySelector('select');
            const outrosInput = row.cells[3].querySelector('input');
            const totalInput = row.cells[4].querySelector('input');

            const treino = parseInt(treinoSelect.value, 10) || 0;
            const outros = parseInt(outrosInput.value, 10) || 0;
            const total = treino + outros;

            totalInput.readOnly = true;
            totalInput.value = total >= 0 ? `+${total}` : `${total}`;
        });
    }

    // 3. Rolador de Dados integrado ao clicar no nome da perícia
    function configurarRolagemPericias() {
        const toast = document.createElement('div');
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#18181b',
            color: '#f4f4f5',
            border: '1px solid #dc2626',
            borderLeft: '4px solid #dc2626',
            borderRadius: '6px',
            padding: '14px 18px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.8)',
            fontSize: '0.9rem',
            zIndex: '1000',
            display: 'none',
            maxWidth: '320px'
        });
        document.body.appendChild(toast);

        let toastTimeout;

        periciasRows.forEach(row => {
            const nomeCell = row.cells[0];
            nomeCell.style.cursor = 'pointer';
            nomeCell.title = 'Clique para rolar o teste desta perícia';

            nomeCell.addEventListener('click', () => {
                const nomePericia = nomeCell.textContent.trim();
                const siglaAttr = row.cells[1].textContent.trim();
                const valorAttr = getAtributo(siglaAttr);
                const bonus = parseInt(row.cells[4].querySelector('input').value, 10) || 0;

                // Regra Ordem Paranormal: Atributo 0 rola 2d20 e pega o menor
                const qtdDados = valorAttr > 0 ? valorAttr : 2;
                const dados = Array.from({ length: qtdDados }, () => Math.floor(Math.random() * 20) + 1);
                const melhorDado = valorAttr > 0 ? Math.max(...dados) : Math.min(...dados);
                const resultadoFinal = melhorDado + bonus;
                const bonusTexto = bonus >= 0 ? `+ ${bonus}` : `- ${Math.abs(bonus)}`;

                toast.innerHTML = `
                    <strong style="color: #ef4444; text-transform: uppercase;">${nomePericia} (${siglaAttr})</strong><br>
                    <span style="color: #a1a1aa; font-size: 0.82rem;">Dados: [${dados.join(', ')}] ${valorAttr === 0 ? '(menor)' : ''}</span><br>
                    <span style="font-size: 1.15rem; font-weight: bold;">Total: ${resultadoFinal}</span>
                    <span style="color: #a1a1aa; font-size: 0.82rem;">(${melhorDado} ${bonusTexto})</span>
                `;
                toast.style.display = 'block';

                clearTimeout(toastTimeout);
                toastTimeout = setTimeout(() => {
                    toast.style.display = 'none';
                }, 5000);
            });
        });
    }

    // 4. Salvar e Carregar automaticamente no navegador (localStorage)
    const todosCampos = document.querySelectorAll('.sheet input, .sheet select');

    function salvarFicha() {
        const dados = Array.from(todosCampos).map(campo => campo.value);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    }

    function carregarFicha() {
        const salvo = localStorage.getItem(STORAGE_KEY);
        if (!salvo) return;

        try {
            const dados = JSON.parse(salvo);
            todosCampos.forEach((campo, index) => {
                if (dados[index] !== undefined) {
                    campo.value = dados[index];
                }
            });
            // Registra os máximos carregados para manter o controle de dano
            [pvInput, peInput, sanInput].forEach(inp => {
                if (inp.value.includes('/')) {
                    inp.dataset.lastMax = inp.value.split('/')[1].trim();
                }
            });
        } catch (e) {
            console.error('Erro ao carregar dados salvos da ficha:', e);
        }
    }

    // Botão para resetar a ficha
    function adicionarBotaoLimpar() {
        const sheet = document.querySelector('.sheet');
        const container = document.createElement('div');
        container.style.textAlign = 'right';
        container.style.marginTop = '10px';

        const btnLimpar = document.createElement('button');
        btnLimpar.type = 'button';
        btnLimpar.textContent = 'Limpar Ficha';
        btnLimpar.className = 'nav-btn';
        btnLimpar.style.cursor = 'pointer';

        btnLimpar.addEventListener('click', () => {
            if (confirm('Deseja realmente apagar todos os dados desta ficha?')) {
                localStorage.removeItem(STORAGE_KEY);
                location.reload();
            }
        });

        container.appendChild(btnLimpar);
        sheet.appendChild(container);
    }

    // Eventos de escuta
    [classeSelect, nexSelect, ...attrInputs].forEach(el => {
        el.addEventListener('change', () => {
            calcularStatus();
            salvarFicha();
        });
    });

    periciasRows.forEach(row => {
        const treinoSelect = row.cells[2].querySelector('select');
        const outrosInput = row.cells[3].querySelector('input');

        treinoSelect.addEventListener('change', () => {
            calcularPericias();
            salvarFicha();
        });

        outrosInput.addEventListener('input', () => {
            calcularPericias();
            salvarFicha();
        });
    });

    todosCampos.forEach(campo => {
        campo.addEventListener('input', salvarFicha);
        campo.addEventListener('change', salvarFicha);
    });

    // Inicialização
    carregarFicha();
    calcularPericias();
    if (!localStorage.getItem(STORAGE_KEY)) {
        calcularStatus();
    }
    configurarRolagemPericias();
    adicionarBotaoLimpar();
});