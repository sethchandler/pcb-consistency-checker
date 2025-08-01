/**
 * Core consistency checking function - standalone and reusable
 * Can be integrated into any application that needs consistency analysis
 */

/**
 * Error codes for consistency checking
 */
const ERROR_CODES = {
    MISSING_PARAMS: 'MISSING_PARAMS',
    INVALID_FORMAT: 'INVALID_FORMAT',
    INVALID_API_KEY: 'INVALID_API_KEY',
    RATE_LIMIT: 'RATE_LIMIT',
    MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    NETWORK_ERROR: 'NETWORK_ERROR',
    PARSE_ERROR: 'PARSE_ERROR',
    NO_RESPONSE: 'NO_RESPONSE',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Analyzes text content for consistency issues using OpenAI API
 * @param {Object} options - Configuration object
 * @param {string} options.prompt - The analysis prompt/instructions
 * @param {string} options.content - The structured text content to analyze
 * @param {string} options.apiKey - OpenAI API key
 * @param {string} options.model - Model to use (e.g., 'gpt-4o', 'gpt-4o-mini')
 * @param {string} options.outputFormat - Desired output format ('json' or 'markdown')
 * @param {number} options.temperature - Optional temperature (default: 0.3)
 * @param {number} options.maxTokens - Optional max tokens (default: 4000)
 * @returns {Promise<Object>} Result object with consistent structure for both success and error cases
 * 
 * Success response:
 * {
 *   success: true,
 *   format: 'json' | 'markdown',
 *   model: 'gpt-4o-mini',
 *   timestamp: '2024-01-01T00:00:00.000Z',
 *   usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
 *   data: { ... },  // The actual analysis results
 *   rawResponse: '...' // Raw AI response for debugging
 * }
 * 
 * Error response:
 * {
 *   success: false,
 *   errorCode: 'INVALID_API_KEY',
 *   error: 'Invalid API key',
 *   errorDetails: { ... },
 *   timestamp: '2024-01-01T00:00:00.000Z',
 *   model: 'gpt-4o-mini',
 *   format: 'json'
 * }
 */
async function analyzeConsistency(options) {
    const {
        prompt,
        content,
        apiKey,
        model = 'gpt-4o-mini',
        outputFormat = 'json',
        temperature = 0.3,
        maxTokens = 4000
    } = options;

    // Validate required parameters
    if (!prompt || !content || !apiKey) {
        return {
            success: false,
            errorCode: ERROR_CODES.MISSING_PARAMS,
            error: 'Missing required parameters: prompt, content, and apiKey are required',
            timestamp: new Date().toISOString(),
            model: model,
            format: outputFormat
        };
    }

    if (!['json', 'markdown'].includes(outputFormat)) {
        return {
            success: false,
            errorCode: ERROR_CODES.INVALID_FORMAT,
            error: 'Invalid outputFormat: must be "json" or "markdown"',
            timestamp: new Date().toISOString(),
            model: model,
            format: outputFormat
        };
    }

    // Prepare the analysis prompt
    let fullPrompt = prompt;
    
    // Add format-specific instructions
    if (outputFormat === 'json') {
        fullPrompt += '\n\n**IMPORTANT**: Return your analysis as a JSON object with this structure:\n';
        fullPrompt += '```json\n{\n';
        fullPrompt += '  "summary": "Brief summary of findings",\n';
        fullPrompt += '  "inconsistenciesFound": true/false,\n';
        fullPrompt += '  "totalIssues": number,\n';
        fullPrompt += '  "inconsistencies": [\n';
        fullPrompt += '    {\n';
        fullPrompt += '      "id": "unique-id",\n';
        fullPrompt += '      "sources": ["Source 1", "Source 2"],\n';
        fullPrompt += '      "nature": "Description of the inconsistency",\n';
        fullPrompt += '      "suggestedFix": "How to resolve this",\n';
        fullPrompt += '      "severity": "high" | "medium" | "low"\n';
        fullPrompt += '    }\n';
        fullPrompt += '  ]\n';
        fullPrompt += '}\n```\n';
        fullPrompt += 'Return ONLY the JSON object, no other text.';
    } else {
        fullPrompt += '\n\n**IMPORTANT**: Format your response as clean Markdown with a table for inconsistencies.';
    }

    // Add the content to analyze
    fullPrompt = fullPrompt.replace('[CASE FILE CONTENT FOLLOWS]', content);

    try {
        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert analyst specializing in identifying factual inconsistencies and contradictions in documents.'
                    },
                    {
                        role: 'user',
                        content: fullPrompt
                    }
                ],
                temperature: temperature,
                max_tokens: maxTokens
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // Determine specific error code based on status and error message
            let errorCode = ERROR_CODES.UNKNOWN_ERROR;
            let errorMessage = errorData.error?.message || 'Unknown error';
            
            if (response.status === 401) {
                errorCode = ERROR_CODES.INVALID_API_KEY;
                errorMessage = 'Invalid API key. Please check your OpenAI API key.';
            } else if (response.status === 429) {
                errorCode = ERROR_CODES.RATE_LIMIT;
                errorMessage = 'API rate limit exceeded. Please try again later.';
            } else if (response.status === 404 && errorData.error?.message?.includes('model')) {
                errorCode = ERROR_CODES.MODEL_NOT_FOUND;
                errorMessage = `Model "${model}" not found or not accessible with your API key.`;
            } else if (response.status === 402 || (errorData.error?.message?.includes('quota') || errorData.error?.message?.includes('billing'))) {
                errorCode = ERROR_CODES.QUOTA_EXCEEDED;
                errorMessage = 'API quota exceeded or billing issue. Please check your OpenAI account.';
            }
            
            return {
                success: false,
                errorCode: errorCode,
                error: errorMessage,
                errorDetails: {
                    status: response.status,
                    statusText: response.statusText,
                    apiError: errorData.error
                },
                timestamp: new Date().toISOString(),
                model: model,
                format: outputFormat
            };
        }

        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content || '';

        if (!aiResponse) {
            return {
                success: false,
                errorCode: ERROR_CODES.NO_RESPONSE,
                error: 'No response received from AI model',
                errorDetails: {
                    usage: data.usage
                },
                timestamp: new Date().toISOString(),
                model: model,
                format: outputFormat
            };
        }

        // Process the response based on output format
        let processedResult;
        
        if (outputFormat === 'json') {
            // Try to parse JSON response
            try {
                // Extract JSON from the response (in case there's extra text)
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    processedResult = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON object found in response');
                }
            } catch (parseError) {
                // If parsing fails, create a structured response from markdown
                processedResult = parseMarkdownToJSON(aiResponse);
            }
        } else {
            // For markdown, use the response as-is
            processedResult = aiResponse;
        }

        // Return standardized result
        return {
            success: true,
            format: outputFormat,
            model: model,
            timestamp: new Date().toISOString(),
            usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0
            },
            data: processedResult,
            rawResponse: aiResponse
        };

    } catch (error) {
        // Handle network errors and other exceptions
        let errorCode = ERROR_CODES.UNKNOWN_ERROR;
        
        if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
            errorCode = ERROR_CODES.NETWORK_ERROR;
        } else if (error.message?.includes('JSON')) {
            errorCode = ERROR_CODES.PARSE_ERROR;
        }
        
        return {
            success: false,
            errorCode: errorCode,
            error: error.message || 'An unexpected error occurred',
            errorDetails: {
                name: error.name,
                stack: error.stack
            },
            timestamp: new Date().toISOString(),
            model: model,
            format: outputFormat
        };
    }
}

/**
 * Helper function to parse markdown table into JSON structure
 * @param {string} markdown - Markdown response from AI
 * @returns {Object} Structured JSON object
 */
function parseMarkdownToJSON(markdown) {
    const inconsistencies = [];
    
    // Try to find markdown table
    const tableRegex = /\|([^|]+)\|([^|]+)\|([^|]+)\|/g;
    const matches = [...markdown.matchAll(tableRegex)];
    
    // Skip header rows
    for (let i = 2; i < matches.length; i++) {
        const match = matches[i];
        if (match && !match[0].includes('---')) {
            const sources = match[1].trim().split(/[,\n]/).map(s => s.trim()).filter(s => s);
            const nature = match[2].trim();
            const suggestedFix = match[3].trim();
            
            if (nature && sources.length > 0) {
                inconsistencies.push({
                    id: `issue-${Date.now()}-${i}`,
                    sources: sources,
                    nature: nature,
                    suggestedFix: suggestedFix,
                    severity: 'medium' // Default severity
                });
            }
        }
    }
    
    return {
        summary: inconsistencies.length > 0 
            ? `Found ${inconsistencies.length} inconsistencies in the analyzed content`
            : 'No inconsistencies found in the analyzed content',
        inconsistenciesFound: inconsistencies.length > 0,
        totalIssues: inconsistencies.length,
        inconsistencies: inconsistencies
    };
}

/**
 * Convenience function to check if API key is valid format
 * @param {string} apiKey - API key to validate
 * @returns {boolean} True if valid format
 */
function isValidAPIKey(apiKey) {
    return apiKey && apiKey.trim().startsWith('sk-') && apiKey.trim().length > 20;
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = {
        analyzeConsistency,
        parseMarkdownToJSON,
        isValidAPIKey,
        ERROR_CODES
    };
} else if (typeof window !== 'undefined') {
    // Browser
    window.consistencyCheckCore = {
        analyzeConsistency,
        parseMarkdownToJSON,
        isValidAPIKey,
        ERROR_CODES
    };
}