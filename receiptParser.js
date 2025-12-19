/**
 * Estrae il nome del cliente dalle prime 2 lettere della prima riga
 * @param {string} text - Testo dello scontrino
 * @returns {string} - Codice cliente (2 lettere, uppercase)
 */
export function extractClientName(text) {
  // Prende la prima riga non vuota
  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return 'XX';
  
  const firstLine = lines[0].trim();
  
  // Estrae solo le prime 2 lettere (ignora numeri e caratteri speciali)
  const lettersOnly = firstLine.replace(/[^a-zA-Z]/g, '');
  
  if (lettersOnly.length >= 2) {
    return lettersOnly.substring(0, 2).toUpperCase();
  } else if (lettersOnly.length === 1) {
    return lettersOnly.toUpperCase() + 'X';
  }
  
  return 'XX';
}

/**
 * Estrae il totale complessivo dallo scontrino
 * @param {string} text - Testo dello scontrino
 * @returns {number} - Importo totale (0 se non trovato)
 */
export function extractTotal(text) {
  // Cerca "TOTALE COMPLESSIVO" seguito da un numero
  // Supporta vari formati: "100.88", "100,88", "100. 88", ecc.
  const totalRegex = /TOTALE\s+COMPLESSIVO\s+(\d+[.,\s]*\d+)/i;
  const match = text.match(totalRegex);
  
  if (match) {
    // Rimuove spazi e converte virgola in punto
    const amount = match[1].replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(amount);
    
    // Verifica che sia un numero valido
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  
  console.warn('Totale non trovato nello scontrino');
  return 0;
}

/**
 * Estrae TUTTI i numeri dei documenti (dopo "DOC." ma non "DOC.GEST.")
 * @param {string} text - Testo dello scontrino
 * @returns {Array} - Array di numeri documento senza trattino
 */
export function extractDocNumbers(text) {
  const numbers = [];
  
  // Split il testo in righe per analizzarle una per una
  const lines = text.split('\n');
  
  lines.forEach(line => {
    // Salta righe con "DOC.GEST"
    if (line.includes('DOC.GEST')) return;
    
    // Cerca pattern "DOC.XXXX-YYYY" nella riga
    const docRegex = /DOC\.(\d+)-(\d+)/gi;
    let match;
    
    while ((match = docRegex.exec(line)) !== null) {
      const number1 = match[1];
      const number2 = match[2];
      const combined = number1 + number2;
      numbers.push(combined);
    }
  });
  
  // Rimuove duplicati
  const unique = [...new Set(numbers)];
  
  return unique;
}

/**
 * Raggruppa gli scontrini per cliente
 * @param {Array} receipts - Array di scontrini {id, image, text, date}
 * @returns {Object} - Oggetto con clienti come chiavi
 */
export function groupReceiptsByClient(receipts) {
  const grouped = {};
  
  receipts.forEach((receipt, index) => {
    const clientCode = extractClientName(receipt.text);
    
    console.log(`Scontrino #${index + 1}:`);
    console.log(`  - Cliente: ${clientCode}`);
    console.log(`  - Totale: ${extractTotal(receipt.text)}`);
    console.log(`  - Doc: ${extractDocNumbers(receipt.text)}`);
    
    if (!grouped[clientCode]) {
      grouped[clientCode] = {
        clientCode: clientCode,
        receipts: [],
        totals: [],
        docNumbers: [],
      };
    }
    
    const total = extractTotal(receipt.text);
    const docNums = extractDocNumbers(receipt.text);
    
    grouped[clientCode].receipts.push(receipt);
    grouped[clientCode].totals.push(total);
    grouped[clientCode].docNumbers.push(...docNums); // Spread per aggiungere tutti i numeri
  });
  
  return grouped;
}

/**
 * Calcola le statistiche per cliente
 * @param {Object} groupedData - Risultato di groupReceiptsByClient
 * @returns {Object} - Statistiche per ogni cliente
 */
export function calculateClientStats(groupedData) {
  const stats = {};
  
  Object.keys(groupedData).forEach(clientCode => {
    const clientData = groupedData[clientCode];
    
    // Somma TUTTI i totali
    const totalSum = clientData.totals.reduce((sum, val) => {
      console.log(`  Addendo: ${val}, Somma parziale: ${sum + val}`);
      return sum + val;
    }, 0);
    
    console.log(`Cliente ${clientCode} - Totale finale: ${totalSum}`);
    
    // Lista numeri documenti (rimuove duplicati)
    const uniqueDocs = [...new Set(clientData.docNumbers)];
    const docNumbersList = uniqueDocs.join(', ');
    
    stats[clientCode] = {
      clientCode: clientCode,
      receiptCount: clientData.receipts.length,
      totalSum: totalSum.toFixed(2),
      docNumbers: docNumbersList || 'N/D',
      receipts: clientData.receipts,
    };
  });
  
  return stats;
}

/**
 * Genera un report testuale per cliente
 * @param {Object} stats - Risultato di calculateClientStats
 * @returns {string} - Report formattato
 */
export function generateClientReport(stats) {
  let report = '═══════════════════════════════════\n';
  report += '       REPORT CLIENTI\n';
  report += '═══════════════════════════════════\n\n';
  
  // Ordina i clienti alfabeticamente
  const sortedClients = Object.keys(stats).sort();
  
  sortedClients.forEach(clientCode => {
    const clientStats = stats[clientCode];
    
    report += `📋 CLIENTE: ${clientStats.clientCode}\n`;
    report += `───────────────────────────────────\n`;
    report += `• N° Scontrini: ${clientStats.receiptCount}\n`;
    report += `• Totale: €${clientStats.totalSum}\n`;
    report += `• Doc. N°: ${clientStats.docNumbers}\n`;
    report += `\n`;
  });
  
  report += '═══════════════════════════════════\n';
  
  // Totale generale
  const grandTotal = Object.values(stats)
    .reduce((sum, client) => sum + parseFloat(client.totalSum), 0)
    .toFixed(2);
  
  const totalReceipts = Object.values(stats)
    .reduce((sum, client) => sum + client.receiptCount, 0);
  
  report += `📊 TOTALI GENERALI:\n`;
  report += `• Scontrini: ${totalReceipts}\n`;
  report += `• Importo: €${grandTotal}\n`;
  report += '═══════════════════════════════════\n';
  
  return report;
}