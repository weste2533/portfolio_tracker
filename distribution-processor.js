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
 * Determines if a fund is a Money Market Fund (MMF) based on its ticker
 * @param {string} ticker - Fund ticker symbol
 * @returns {boolean} - True if the fund is a MMF, false otherwise
 */
function isMoneyMarketFund(ticker) {
  // List of known Money Market Fund tickers
  // This list should be expanded based on actual requirements
  const mmfTickers = ['AFAXX'];
  return mmfTickers.includes(ticker);
}

/**
 * Converts a 2-digit year date to 4-digit year format.
 * @param {string} input - Date string in 'MM/DD/YY' format
 * @returns {string} - Date string in 'MM/DD/YYYY' format
 */
function parseDistributionDate(input) {
  const [month, day, year] = input.split('/');
  return `${month}/${day}/20${year}`;
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
    
    // Process each line
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Check if this is a fund ticker line
      if (trimmedLine.match(/^[A-Z]+$/)) {
        currentTicker = trimmedLine;
        distributionData[currentTicker] = {};
      } 
      // Otherwise, parse as distribution data
      else if (currentTicker && trimmedLine.includes(',')) {
        const parts = trimmedLine.split(',').map(part => part.trim());
        
        // Validate we have at least date and some values
        if (parts.length >= 2) {
          const date = parseDistributionDate(parts[0]);
          
          // Find NAV value (if provided)
          let reinvestNAV = null;
          let totalDistributions = 0;
          
          // Parse all values for total distributions (skip the date)
          for (let i = 1; i < parts.length; i++) {
            const value = parseFloat(parts[i].replace('$', ''));
            
            // Skip non-numeric values
            if (!isNaN(value)) {
              // If a value is labeled as NAV or the last value (assuming NAV convention)
              if (parts[i].toLowerCase().includes('nav') || i === parts.length - 1) {
                reinvestNAV = value;
              } else {
                // Otherwise, treat as a distribution
                totalDistributions += value;
              }
            }
          }
          
          // For MMF funds, assume reinvest NAV is $1.00
          if (isMoneyMarketFund(currentTicker)) {
            reinvestNAV = 1.00;
          }
          
          // Store the processed data
          distributionData[currentTicker][date] = {
            reinvestNAV: reinvestNAV || 1.00, // Default to 1.00 if not found
            totalDistributions
          };
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
