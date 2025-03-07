/**
 * Distribution Data Processor
 * 
 * This module processes fund distribution data from a text file for browser environments.
 * 
 * INPUT:
 * - fileContent (string): Content of the distributions.txt file
 * 
 * MAIN FUNCTIONS:
 * 
 * processDistributionData(fileContent)
 *   Processes the distribution data file content
 *   - fileContent (string): The raw text content of the distributions file
 *   Returns: {Object} - Structured fund distribution data with the following format:
 *     {
 *       [Fund Ticker]: {
 *         [Date]: {
 *           reinvestNAV: Number,  // NAV price used for reinvestment (default 1.00 for MMF funds)
 *           totalDistributions: Number  // Sum of all capital gains and dividends
 *         },
 *         ...
 *       },
 *       ...
 *     }
 * 
 * loadDistributionFile(filePath = 'distributions.txt')
 *   Loads the distribution file using fetch API and processes it
 *   - filePath (string): Path to the distributions.txt file relative to the HTML file
 *   Returns: {Promise<Object>} - Promise resolving to the structured fund distribution data
 * 
 * getFundData(ticker, data)
 *   Retrieves all distribution data for a specific fund
 *   - ticker (string): The fund ticker symbol
 *   - data (Object): The processed data object from processDistributionData
 *   Returns: {Object} - All distribution data for the specified fund
 * 
 * getDistributionsByDate(date, data)
 *   Retrieves all fund distributions for a specific date
 *   - date (string): The date in 'MM/DD/YYYY' format
 *   - data (Object): The processed data object from processDistributionData
 *   Returns: {Object} - All fund distributions for the specified date
 */

/**
 * Distribution Data Processor
 * 
 * Processes fund distribution data from separate MMF and mutual fund files
 */

// Known MMF tickers (expand as needed)
const MMF_TICKERS = new Set(['AFAXX']);

/**
 * Determines fund type from ticker
 */
function isMoneyMarketFund(ticker) {
  return MMF_TICKERS.has(ticker);
}

/**
 * Gets appropriate filename for a ticker
 */
function getFundFileName(ticker) {
  const typePrefix = isMoneyMarketFund(ticker) ? 'mmf' : 'mutual';
  return `${typePrefix}_${ticker}_distributions.txt`;
}

/**
 * Processes raw file content based on fund type
 */
function processDistributionData(fileContent, ticker) {
  const fundType = isMoneyMarketFund(ticker) ? 'mmf' : 'mutual';
  const fundData = { [ticker]: {} };
  const lines = fileContent.split('\n').filter(l => l.trim());
  
  if (!lines.length) return fundData;
  
  // Skip header line
  const dataLines = lines.slice(1);

  dataLines.forEach(line => {
    const parts = line.trim().split('\t');
    
    if (fundType === 'mmf') {
      // Process Money Market Fund (daily rates)
      const [rateStr, date] = parts;
      fundData[ticker][date] = {
        reinvestNAV: 1.00,
        totalDistributions: parseFloat(rateStr)
      };
    } else {
      // Process Mutual Fund (distribution records)
      const date = parts[0].length === 8 ? 
        `${parts[0].slice(0,6)}20${parts[0].slice(6)}` : 
        parts[0];
        
      fundData[ticker][date] = {
        reinvestNAV: parseFloat(parts[7].replace('$', '')),
        totalDistributions: [
          parts[3],  // Regular dividend
          parts[4],  // Special dividend
          parts[5],  // Long-term gains
          parts[6]   // Short-term gains
        ].reduce((sum, val) => sum + parseFloat(val.replace('$', '') || 0, 0)
      };
    }
  });

  return fundData;
}

/**
 * Main loader function - called from external scripts
 */
async function loadFundByTicker(ticker) {
  try {
    const fileName = getFundFileName(ticker);
    const response = await fetch(fileName);
    
    if (!response.ok) throw new Error(`File not found for ${ticker}`);
    
    const fileContent = await response.text();
    return processDistributionData(fileContent, ticker);
  } catch (error) {
    console.error(`Failed to load data for ${ticker}:`, error);
    return { [ticker]: {} };
  }
}

// Browser environment export
if (typeof window !== 'undefined') {
  window.distributionProcessor = {
    loadFundByTicker,
    getFundFileName,
    isMoneyMarketFund
  };
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
