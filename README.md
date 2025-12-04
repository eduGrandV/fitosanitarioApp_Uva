# Vinhedo Digital - Monitoramento de Pragas e Doenças

Vinhedo Digital é uma aplicação móvel desenvolvida em React Native (Expo) para auxiliar agrônomos e técnicos no monitoramento fitossanitário de videiras.  
O aplicativo permite coleta offline, cálculo automático de infestação e sincronização inteligente com sistemas legados.

## Funcionalidades Principais

### Coleta de Dados (Offline-First)
- Seleção de áreas, válvulas e pontos georreferenciados  
- Suporte a múltiplas pragas/doenças por planta  
- Captura automática do GPS  
- Indicadores visuais de status da planta  

### Inteligência e Cálculos
- Cálculo de infestação com classificação:
  - Baixo (0–33.3%)
  - Médio (33.4–66.7%)
  - Alto (> 66.8%)
- Análise separada para cada doença registrada  

### Sincronização Inteligente (Smart Sync)
- Divisão automática de registros complexos em múltiplos pacotes simples  
- Conversão ID → Nome da doença  
- Sanitização de dados antes do envio  

### Relatórios e Histórico
- Edição de registros antigos  
- Geração de PDF com:
  - resumo de infestação por válvula  
  - detalhamento por planta  
  - assinatura do responsável técnico  
- Envio automático por e-mail  

## Tecnologias Utilizadas
- React Native, Expo  
- TypeScript  
- AsyncStorage (offline)  
- Expo Location (GPS)  
- Expo Print (PDF)  
- Expo Mail Composer  
- StyleSheet e DropDownPicker  

## Estrutura de Dados (Core)

```ts
export interface PlantaDoenca {
  doencasIds: number[];
  nota: 0 | 1;
}

export interface PontoData {
  plantas: {
    planta1: PlantaDoenca;
    planta2: PlantaDoenca;
    planta3: PlantaDoenca;
  };
  location?: LocationObject | null;
}
```
## Como Funciona o Smart Sync

1. O App identifica todas as doenças marcadas (ex: 609 e 612)
2. O registro é dividido:
   - **Cópia A** → somente dados referentes ao ID 609
   - **Cópia B** → somente dados referentes ao ID 612
3. Os IDs são convertidos para strings (ex: "Oídio-F")
4. Cada pacote é enviado individualmente ao backend

## Instalação e Execução

### Clonar o repositório
```bash
# Baixar o projeto
$ git clone https://github.com/seu-usuario/vinhedo-digital.git

# Entrar no diretório
$ cd vinhedo-digital
````
Instalar dependências:
```bash
# Instalação das dependências
$ npm install
```


