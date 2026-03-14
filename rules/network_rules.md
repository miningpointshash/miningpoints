# Regras de Negócio - Rede e Comissões (Mining Points)

Este documento define as regras para o cálculo de bônus de rede (Unilevel) e plano de carreira.

## 1. Estrutura de Ganhos de Rede (Unilevel)

Sobre as taxas geradas (ex: 10% de fee em apostas) ou ativações de planos, 80% do valor arrecadado é distribuído para a rede ascendente (upline) em 7 níveis.

| Nível | Porcentagem | Descrição |
| :--- | :--- | :--- |
| **1º Nível** | **30%** | Patrocinador Direto |
| **2º Nível** | **20%** | Patrocinador do 1º Nível |
| **3º Nível** | **10%** | ... |
| **4º Nível** | **05%** | ... |
| **5º Nível** | **05%** | ... |
| **6º Nível** | **05%** | ... |
| **7º Nível** | **05%** | ... |
| **TOTAL** | **80%** | O restante (20%) vai para Premiações/Empresa |

---

## 2. Plano de Carreira e Pontuação

O sistema utiliza pontos para definir o Rank (Nível de Carreira) e liberar prêmios.

### Regra de Pontuação
- **1 Ponto = $1 Dólar** (ou 100 MPH).
- **Volume Direto:** Conta 100% dos pontos gerados pelos indicados diretos.
- **Volume Indireto:** Conta 50% dos pontos gerados pela rede indireta (até o 6º nível de profundidade a partir do direto).

### Tabela de Ranks e Prêmios

| Rank | Volume Necessário (Pontos) | Linhas Diretas Válidas | Prêmio (USD) |
| :--- | :--- | :--- | :--- |
| **Start (N0)** | - | 1 | $25 (Bônus Inicial) |
| **N1** | 30.000 | 3 | $300 |
| **N2** | 120.000 | 6 | $1.200 |
| **N3** | 500.000 | 12 | $5.000 |
| **N4** | 1.500.000 | 24 | $15.000 |
| **N5** | 3.000.000 | 36 | $30.000 |
| **N6** | 10.000.000 | 48 | $100.000 |
| **N7** | 50.000.000 | - | $500.000 |

*Nota: Linhas diretas válidas referem-se a indicados diretos que estejam ativos (com plano ou movimentação mínima).*

---

## 3. Implementação Técnica

### Banco de Dados (Supabase)

#### Tabela `profiles` (Colunas Adicionais)
- `network_volume`: Volume total acumulado (considerando a regra de 50% indiretos).
- `personal_volume`: Volume gerado pelo próprio usuário.
- `active_lines`: Contagem de indicados diretos ativos.
- `rank`: Nível atual (N0, N1, etc).

#### Tabela `transactions` (Campos de Rastreio)
- `origin_user_id`: ID do usuário que gerou a comissão (quem apostou/comprou).
- `commission_level`: Nível da rede que gerou o ganho (1 a 7).

### Lógica de Distribuição (Trigger/Function)
Ao registrar uma transação geradora de comissão (ex: `game_fee` ou `plan_purchase`):
1. Identificar a árvore de patrocinadores (até 7 níveis acima).
2. Calcular o valor para cada nível com base na tabela Unilevel.
3. Inserir transações de crédito (`unilevel_bonus`) nas carteiras dos patrocinadores.
4. Atualizar o `network_volume` dos patrocinadores (recursivamente).
5. Verificar se algum patrocinador atingiu novo Rank e creditar prêmio (`career_prize`) se aplicável.
