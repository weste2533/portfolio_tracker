/**
 * Distribution Data Processor
 * 
 * This module processes fund distribution data from a text file for browser environments.
 */

/**
 * Determines if a fund is a Money Market Fund (MMF) based on its ticker
 * @param {string} ticker - Fund ticker symbol
 * @returns {boolean} - True if the fund is a MMF, false otherwise
 */
function isMoneyMarketFund(ticker) {
  // List of known Money Market Fund tickers
  const mmfTickers = ['AFAXX'];
  return mmfTickers.includes(ticker);
}

/**
 * Processes the distribution data file content
 * @param {string} fileContent - The raw text content of the distributions file
 * @returns {Object} - Structured fund distribution data
 */
function processDistributionData(fileContent) {
  try {
    const lines = fileContent.split('\n');
    
    const distributionData = {};
    let currentTicker = null;
    let headers = [];
    let isMoneyMarket = false;
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Check if this is a fund ticker line (all uppercase)
      if (/^[A-Z]+$/.test(trimmedLine)) {
        currentTicker = trimmedLine;
        distributionData[currentTicker] = {};
        headers = []; // Reset headers
        isMoneyMarket = isMoneyMarketFund(currentTicker);
        
        // Next line should be headers for regular funds
        if (!isMoneyMarket && i + 1 < lines.length) {
          headers = lines[i + 1].split('\t').map(h => h.trim());
        }
      } 
      // Process data lines
      else if (currentTicker) {
        // Different processing for money market funds
        if (isMoneyMarket) {
          // Money market format: Rate [tab] As of Date
          const parts = trimmedLine.split('\t').map(part => part.trim());
          if (parts.length >= 2) {
            const rate = parseFloat(parts[0]);
            const date = formatDate(parts[1]);
            
            if (!isNaN(rate) && date) {
              distributionData[currentTicker][date] = {
                reinvestNAV: 1.00, // Fixed NAV for money market funds
                totalDistributions: rate
              };
            }
          }
        } 
        // Processing for regular mutual funds
        else if (headers.length > 0) {
          const parts = trimmedLine.split('\t').map(part => part.trim());
          
          // Skip header row
          if (parts[0] === headers[0]) continue;
          
          // Verify we have enough data
          if (parts.length >= 5) {
            let date = "";
            let reinvestNAV = 1.00;
            let totalDistributions = 0;
            
            // Find index of each required column
            const recordDateIdx = headers.indexOf('Record Date');
            const navIdx = headers.indexOf('Reinvest NAV');
            
            // Get date (Record Date column)
            if (recordDateIdx >= 0 && parts[recordDateIdx]) {
              date = formatDate(parts[recordDateIdx]);
            }
            
            // Get NAV (Reinvest NAV column)
            if (navIdx >= 0 && parts[navIdx]) {
              reinvestNAV = parseFloat(parts[navIdx].replace('$', ''));
              if (isNaN(reinvestNAV)) reinvestNAV = 1.00;
            }
            
            // Calculate total distributions (sum of all dividend and capital gains columns)
            for (let j = 0; j < headers.length; j++) {
              const header = headers[j].toLowerCase();
              if (header.includes('dividend') || header.includes('cap. gains')) {
                const value = parseFloat(parts[j]?.replace('$', '') || '0');
                if (!isNaN(value)) {
                  totalDistributions += value;
                }
              }
            }
            
            // Store the processed data if we have a valid date
            if (date) {
              distributionData[currentTicker][date] = {
                reinvestNAV,
                totalDistributions
              };
            }
          }
        }
      }
    }
    
    return distributionData;
  } catch (error) {
    console.error('Error processing distribution data:', error);
    return {};
  }
}

/**
 * Formats a date string to MM/DD/YYYY format
 * @param {string} dateStr - Input date string
 * @returns {string} - Formatted date string
 */
function formatDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Handle various date formats
    let date;
    
    // If already in MM/DD/YYYY format
    if (dateStr.includes('/')) {
      return dateStr;
    }
    
    // Handle dates in format like "03/13/24"
    if (dateStr.match(/\d{2}\/\d{2}\/\d{2}/)) {
      const [month, day, shortYear] = dateStr.split('/');
      const year = parseInt(shortYear) < 50 ? `20${shortYear}` : `19${shortYear}`;
      return `${month}/${day}/${year}`;
    }
    
    // Try to parse as standard date
    date = new Date(dateStr);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Format to MM/DD/YYYY
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}/${day}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error, dateStr);
    return null;
  }
}

/**
 * Loads the distribution file using fetch API and processes it
 * @param {string} filePath - Path to the distributions.txt file relative to the HTML file
 * @returns {Promise<Object>} - Promise resolving to the structured fund distribution data
 */
async function loadDistributionFile(filePath = 'distributions.txt') {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
    }
    const fileContent = await response.text();
    return processDistributionData(fileContent);
  } catch (error) {
    console.error('Error loading distribution file:', error);
    return {};
  }
}

/**
 * Retrieves all distribution data for a specific fund
 * @param {string} ticker - The fund ticker symbol
 * @param {Object} data - The processed data object from processDistributionData
 * @returns {Object} - All distribution data for the specified fund
 */
function getFundData(ticker, data) {
  return data[ticker] || {};
}

/**
 * Retrieves all fund distributions for a specific date
 * @param {string} date - The date in 'MM/DD/YYYY' format
 * @param {Object} data - The processed data object from processDistributionData
 * @returns {Object} - All fund distributions for the specified date
 */
function getDistributionsByDate(date, data) {
  const result = {};
  
  for (const ticker in data) {
    if (data[ticker][date]) {
      result[ticker] = data[ticker][date];
    }
  }
  
  return result;
}

// Export functions for both module environments and browser globals
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  // Node.js environment
  module.exports = {
    processDistributionData,
    loadDistributionFile,
    getFundData,
    getDistributionsByDate
  };
} else {
  // Browser environment
  window.distributionProcessor = {
    processDistributionData,
    loadDistributionFile,
    getFundData,
    getDistributionsByDate
  };
}
