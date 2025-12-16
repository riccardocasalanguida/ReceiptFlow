// Funzioni per analizzare e processare gli scontrini

/**
 * Estrae il nome del cliente dalla prima riga dello scontrino
 * @param {string} text - Testo dello scontrino
 * @returns {string} - Nome del cliente (lowercase)
 */
export function extractClientName(text) {
  // Prende la prima riga non vuota
  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return 'sconosciuto';
  
  const firstLine = lines[0].trim().toLowerCase();
  return firstLine || 'sconosciuto';
}

/**
 * Estrae il totale complessivo dallo scontrino
 * @param {string} text - Testo dello scontrino
 * @returns {number} - Importo totale (0 se non trovato)
 */
export function extractTotal(text) {
  // Cerca "TOTALE COMPLESSIVO" seguito da un numero
  const totalRegex = /TOTALE\s+COMPLESSIVO\s+(\d+[.,]\d+)/i;
  const match = text.match(totalRegex);
  
  if (match) {
    // Converte "100,88" o "100.88" in 100.88
    const amount = match[1].replace(',', '.');
    return parseFloat(amount);
  }
  
  return 0;
}

/**
 * Estrae i numeri dei documenti (dopo "DOC." ma non "DOC.GEST.")
 * @param {string} text - Testo dello scontrino
 * @returns {string} - Numero documento senza trattino (es: "17500001")
 */
export function extractDocNumber(text) {
  // Cerca "DOC." seguito da numero-numero (ma NON "DOC.GEST.")
  const docRegex = /DOC\.(\d+-\d+)/g;
  const gestRegex = /DOC\.GEST/i;
  
  const matches = [];
  let match;
  
  // Trova tutti i match di "DOC.XXXX-YYYY"
  while ((match = docRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const docNumber = match[1];
    
    // Salta se è "DOC.GEST."
    const beforeMatch = text.substring(Math.max(0, match.index - 5), match.index);
    if (beforeMatch.includes('GEST')) continue;
    
    // Rimuove il trattino: "1750-0001" -> "17500001"
    const cleanNumber = docNumber.replace('-', '');
    matches.push(cleanNumber);
  }
  
  return matches[0] || 'N/D';
}

/**
 * Raggruppa gli scontrini per cliente
 * @param {Array} receipts - Array di scontrini {id, image, text, date}
 * @returns {Object} - Oggetto con clienti come chiavi
 */
export function groupReceiptsByClient(receipts) {
  const grouped = {};
  
  receipts.forEach(receipt => {
    const clientName = extractClientName(receipt.text);
    
    if (!grouped[clientName]) {
      grouped[clientName] = {
        clientName: clientName,
        receipts: [],
        totals: [],
        docNumbers: [],
      };
    }
    
    const total = extractTotal(receipt.text);
    const docNumber = extractDocNumber(receipt.text);
    
    grouped[clientName].receipts.push(receipt);
    grouped[clientName].totals.push(total);
    grouped[clientName].docNumbers.push(docNumber);
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
  
  Object.keys(groupedData).forEach(clientName => {
    const clientData = groupedData[clientName];
    
    // Somma tutti i totali
    const totalSum = clientData.totals.reduce((sum, val) => sum + val, 0);
    
    // Lista numeri documenti
    const docNumbersList = clientData.docNumbers.join(', ');
    
    stats[clientName] = {
      clientName: clientName.toUpperCase(),
      receiptCount: clientData.receipts.length,
      totalSum: totalSum.toFixed(2),
      docNumbers: docNumbersList,
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
  
  Object.keys(stats).forEach(clientName => {
    const clientStats = stats[clientName];
    
    report += `📋 CLIENTE: ${clientStats.clientName}\n`;
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
  
  report += `💰 TOTALE GENERALE: €${grandTotal}\n`;
  report += '═══════════════════════════════════\n';
  
  return report;
}