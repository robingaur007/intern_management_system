/**
 * AI Service for generating task descriptions using Google Gemini API
 */

/**
 * List available Gemini models for debugging
 * @returns {Promise<Array>} List of available models
 */
export async function listAvailableModels() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to list models: ${response.status}`);
    }

    const data = await response.json();
    return data.models || [];
  } catch (error) {
    throw new Error(`Failed to list models: ${error.message}`);
  }
}

/**
 * Generate a task description using Google Gemini API
 * @param {string} taskTitle - The title of the task
 * @param {string} projectTitle - The title of the project (optional)
 * @returns {Promise<string>} Generated task description
 */
export async function generateTaskDescription(taskTitle, projectTitle = null) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.");
  }

  if (!taskTitle || taskTitle.trim() === "") {
    throw new Error("Task title is required to generate description.");
  }

  try {
    // Construct the prompt
    let prompt = `Generate a detailed, professional task description for an intern management system. 
Task Title: "${taskTitle}"`;

    if (projectTitle) {
      prompt += `\nProject: "${projectTitle}"`;
    }

    prompt += `\n\nRequirements:
- The description should be clear and actionable
- Include specific deliverables or outcomes expected
- Mention any important considerations or constraints
- Keep it professional but concise (2-4 sentences)
- Focus on what the intern needs to accomplish

Generate only the task description, no additional text or formatting.`;

    // First, try to get available models and use the first one that supports generateContent
    let availableModels = [];
    try {
      availableModels = await listAvailableModels();
      console.log('Available models:', availableModels.map(m => m.name));
    } catch (err) {
      console.warn('Could not list models, will try default models:', err.message);
    }

    // Extract model names that support generateContent
    const supportedModels = availableModels
      .filter(model => 
        model.supportedGenerationMethods?.includes('generateContent') ||
        model.supportedGenerationMethods?.includes('GENERATE_CONTENT')
      )
      .map(model => {
        // Extract just the model name (remove 'models/' prefix if present)
        const name = model.name.replace('models/', '');
        return name;
      });

    // Try models in order: available models first, then fallback defaults
    const modelsToTry = [
      ...supportedModels,
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-2.0-flash-exp',
      'gemini-2.5-flash-lite',
    ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

    let lastError = null;

    for (const modelName of modelsToTry) {
      // Try both v1 and v1beta
      for (const version of ['v1', 'v1beta']) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: prompt
                  }]
                }]
              })
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            lastError = new Error(
              errorData.error?.message || 
              `API request failed with status ${response.status} for model ${modelName} (${version})`
            );
            continue; // Try next model/version
          }

          const data = await response.json();
          
          if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            lastError = new Error("Invalid response format from Gemini API");
            continue; // Try next model/version
          }

          const generatedText = data.candidates[0].content.parts[0].text;
          console.log(`Successfully used model: ${modelName} (${version})`);
          return generatedText.trim();

        } catch (err) {
          lastError = err;
          continue; // Try next model/version
        }
      }
    }

    // If all models failed, provide helpful error message
    const availableModelNames = availableModels.length > 0 
      ? availableModels.map(m => m.name).join(', ')
      : 'none found';
    
    throw new Error(
      `All model attempts failed. Last error: ${lastError?.message || 'Unknown error'}. ` +
      `Available models: ${availableModelNames}. ` +
      `Please check your API key at https://makersuite.google.com/app/apikey and ensure it has access to Gemini models.`
    );

  } catch (error) {
    if (error.message.includes("API key")) {
      throw error;
    }
    throw new Error(`Failed to generate task description: ${error.message}`);
  }
}

