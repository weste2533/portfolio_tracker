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
/**
 * Converts a date string to 4-digit year format.
 * @param {string} input - Date string in 'MM/DD/YY' or 'MM/DD/YYYY' format
 * @returns {string} - Date string in 'MM/DD/YYYY' format
 */
function parseDistributionDate(input) {
  const [month, day, year] = input.split('/');
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${month}/${day}/${fullYear}`;
}

/**
 * Processes the distribution data file content
 * @param {string} fileContent - The raw text content of the distributions file
 * @returns {Object} - Structured fund distribution data
 */
function processDistributionData(fileContent) {
  try {
    console.log('Processing file content...');
    const lines = fileContent.split('\n');
    console.log(`Total lines: ${lines.length}`);
    
    const distributionData = {};
    let currentTicker = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        console.log('Skipping empty line');
        continue;
      }

      // Handle ticker line
      if (trimmedLine.match(/^[A-Z]+$/)) {
        currentTicker = trimmedLine;
        distributionData[currentTicker] = {};
        console.log(`\n--- New ticker found: ${currentTicker} ---`);
      } 
      // Handle data line
      else if (currentTicker && trimmedLine.includes('\t')) {
        console.log(`\nProcessing data line: ${trimmedLine}`);
        const parts = trimmedLine.split('\t').map(part => part.trim());

        // Check if current ticker is MMF
        if (isMoneyMarketFund(currentTicker)) {
          if (parts.length < 2) {
            console.log('Skipping MMF line due to insufficient parts');
            continue;
          }
          const [rate, rawDate] = parts;
          const date = parseDistributionDate(rawDate);
          const cleanRate = parseFloat(rate);
          
          if (isNaN(cleanRate)) {
            console.log('Invalid rate for MMF:', rate);
            continue;
          }

          // Initialize date entry if not exists
          if (!distributionData[currentTicker][date]) {
            distributionData[currentTicker][date] = {
              reinvestNAV: 1.00,
              totalDistributions: 0
            };
          }
          
          distributionData[currentTicker][date].totalDistributions += cleanRate;
          console.log(`Added rate ${cleanRate} to MMF ${currentTicker} on ${date}`);
        } else {
          // Skip lines where the first part is not a valid date
          const isDateValid = parts[0].match(/^\d{1,2}\/\d{1,2}\/(\d{2}|\d{4})$/);
          if (!isDateValid) {
            console.log('Skipping non-MMF line due to invalid date format');
            continue;
          }

          const rawDate = parts[0];
          const date = parseDistributionDate(rawDate);
          console.log(`Parsed date: ${date} (from ${rawDate})`);

          let reinvestNAV = null;
          let totalDistributions = 0;

          for (let i = 1; i < parts.length; i++) {
            const cleanValue = parts[i].replace(/[^0-9.]/g, '');
            const value = parseFloat(cleanValue);
            console.log(`Part ${i}: "${parts[i]}" → ${value}`);

            if (!isNaN(value)) {
              if (parts[i].toLowerCase().includes('nav') || i === parts.length - 1) {
                reinvestNAV = value;
                console.log(`Identified NAV: ${value}`);
              } else {
                totalDistributions += value;
                console.log(`Added to distributions: ${value} (Total: ${totalDistributions})`);
              }
            }
          }

          // MMF override (though MMF is handled separately)
          if (isMoneyMarketFund(currentTicker)) {
            console.log(`${currentTicker} is MMF - overriding NAV to 1.00`);
            reinvestNAV = 1.00;
          }

          const finalNAV = reinvestNAV || 1.00;
          console.log(`Storing entry: ${date} → NAV: ${finalNAV}, Total: ${totalDistributions}`);
          
          distributionData[currentTicker][date] = {
            reinvestNAV: finalNAV,
            totalDistributions
          };
        }
      }
    }

    console.log('\nFinal processed data structure:');
    console.log(JSON.stringify(distributionData, null, 2));
    return distributionData;
  } catch (error) {
    console.error('Error processing distribution data:', error);
    return {};
  }
}

async function loadDistributionFile(filePath = 'distributions.txt') {
  try {
    console.log(`\nAttempting to load file from: ${filePath}`); // Debug
    const response = await fetch(filePath);
    console.log(`Response status: ${response.status} ${response.statusText}`); // Debug
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const fileContent = await response.text();
    console.log('File content sample:', fileContent.slice(0, 200)); // Debug
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
