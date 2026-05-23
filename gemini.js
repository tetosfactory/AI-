/**
 * Gemini API Service for AI Recipe Chef
 */
const GeminiService = {
    // Model definition
    MODEL_NAME: 'gemini-2.5-flash',
    
    /**
     * Call the Gemini API to analyze an image of ingredients and return recipes
     * @param {string} base64Image - Base64 encoded image data (without data:image/... prefix)
     * @param {string} mimeType - The mime type of the image (e.g., 'image/jpeg')
     * @param {string} apiKey - Gemini API Key
     * @returns {Promise<Object>} Analyzed ingredients and recipes JSON
     */
    async analyzeImage(base64Image, mimeType, apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL_NAME}:generateContent?key=${apiKey}`;
        
        const systemInstruction = 
            "あなたは優秀なプロの料理シェフです。提供された食材の写真を認識し、それらの食材（および一般的な調味料や家庭に常備されている材料）を使って作れる美味しいレシピを3〜4個提案してください。\n" +
            "一般的な調味料（塩、コショウ、砂糖、醤油、みりん、味噌、酢、酒、油、ケチャップ、マヨネーズ、小麦粉、片栗粉、ニンニク、ショウガ、水、ダシなど）は、写真に写っていなくても自由に使って良いものとします。";

        const promptText = 
            "添付された食材の写真を分析し、認識した食材のリストと、それらを使って作れるレシピを提案してください。\n" +
            "回答は必ず指定されたJSONフォーマットに従って返してください。余計なマークダウン装飾（例: ```json）や、説明の文言は一切含めず、純粋なJSON文字列のみを出力してください。";

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: promptText },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Image
                            }
                        }
                    ]
                }
            ],
            systemInstruction: {
                parts: [
                    { text: systemInstruction }
                ]
            },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: this.getRecipeSchema()
            }
        };

        return this._executeRequest(url, requestBody);
    },

    /**
     * Call the Gemini API to suggest recipes from a list of manually entered ingredients
     * @param {string[]} ingredientsList - Array of ingredients (e.g. ['キャベツ', '豚肉'])
     * @param {string} apiKey - Gemini API Key
     * @returns {Promise<Object>} Recipes JSON
     */
    async analyzeTextIngredients(ingredientsList, apiKey, mainIngredient = null, isUpgrade = false) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL_NAME}:generateContent?key=${apiKey}`;
        
        let systemInstruction = 
            "あなたは優秀なプロの料理シェフです。提供された食材のテキストを基に、それらの食材（および一般的な調味料や家庭に常備されている材料）を使って作れる美味しいレシピを3〜4個提案してください。\n" +
            "一般的な調味料（塩、コショウ、砂糖、醤油、みりん、味噌、酢、酒、油、ケチャップ、マヨネーズ、小麦粉、片栗粉、ニンニク、ショウガ、水、ダシなど）は、リストに記載されていなくても自由に使って良いものとします。";

        if (isUpgrade) {
            systemInstruction += "\n今回は「食材をプラスするアップグレードレシピ」がテーマです。手持ちの食材に『もう1〜2個の食材を追加購入（プラス）することで、劇的に豪華で美味しくなるレシピ』を提案してください。追加する食材はスーパー等で手軽に買える一般的なものとします。";
        }

        const ingredientsText = ingredientsList.join(', ');
        let promptText = `以下の食材リストを使って作れるレシピを提案してください。\n食材リスト: ${ingredientsText}\n\n`;

        if (mainIngredient) {
            promptText += `【重要】今回は「${mainIngredient}」を主役に据えた（メイン食材とした）レシピを中心に提案してください。\n\n`;
        }

        if (isUpgrade) {
            promptText += `【重要】今回は元の食材リストにない別の食材を追加するレシピを提案してください。各レシピの match_status フィールドには、「追加食材: 〇〇」のように、追加で用意すべき主要な食材の名前を分かりやすく記載してください。\n\n`;
        }

        promptText += `回答は必ず指定されたJSONフォーマットに従って返してください。余計なマークダウン装飾や説明の文言は一切含めず、純粋なJSON文字列のみを出力してください。`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: promptText }
                    ]
                }
            ],
            systemInstruction: {
                parts: [
                    { text: systemInstruction }
                ]
            },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: this.getRecipeSchema()
            }
        };

        const result = await this._executeRequest(url, requestBody);
        
        // Ensure the ingredients in the result matches our input list if Gemini's parser returns something else
        if (!result.ingredients || result.ingredients.length === 0) {
            result.ingredients = ingredientsList;
        }
        return result;
    },

    /**
     * Common helper to execute request and parse JSON response
     */
    async _executeRequest(url, requestBody) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || `HTTP error! status: ${response.status}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
                throw new Error('AIから有効な応答が返されませんでした。プロンプトまたは画像を調整してください。');
            }

            const responseText = data.candidates[0].content.parts[0].text;
            
            // Parse JSON response safely
            try {
                return JSON.parse(responseText.trim());
            } catch (parseError) {
                console.error("JSON parsing error on response:", responseText);
                throw new Error('AIからの応答をレシピ形式にパースできませんでした。もう一度お試しください。');
            }

        } catch (error) {
            console.error("Gemini API call failed:", error);
            throw error;
        }
    },

    /**
     * Define the structural schema for structured recipe replies
     */
    getRecipeSchema() {
        return {
            type: "OBJECT",
            properties: {
                ingredients: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                    description: "写真またはテキストから認識・整理された食材名リスト"
                },
                recipes: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            name: { 
                                type: "STRING", 
                                description: "レシピの名前（例：シャキシャキキャベツと豚バラの塩麹炒め）" 
                            },
                            time: { 
                                type: "STRING", 
                                description: "調理時間の目安（例：15分、30分）" 
                            },
                            difficulty: { 
                                type: "STRING", 
                                description: "難易度（例：簡単、普通、少し凝っている）" 
                            },
                            match_status: { 
                                type: "STRING", 
                                description: "手持ち食材とのマッチ具合（例：手元の食材のみ、一部調味料が必要、など）" 
                            },
                            description: { 
                                type: "STRING", 
                                description: "レシピの特徴や味わいについての短い説明（1-2文）" 
                            },
                            materials: {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        name: { type: "STRING", description: "材料名・調味料名" },
                                        amount: { type: "STRING", description: "必要な分量（例：150g、1/2個、大さじ1、少々）" }
                                    },
                                    required: ["name", "amount"]
                                },
                                description: "調味料を含む、調理に必要な材料と分量のリスト"
                            },
                            steps: {
                                type: "ARRAY",
                                items: { type: "STRING" },
                                description: "具体的な調理手順ステップ（順序通りに記載）"
                            },
                            tips: { 
                                type: "STRING", 
                                description: "この料理をさらに美味しく作るためのワンポイントアドバイスや代替食材の提案" 
                            }
                        },
                        required: ["name", "time", "difficulty", "match_status", "description", "materials", "steps", "tips"]
                    },
                    description: "提案するレシピのリスト（3〜4品）"
                }
            },
            required: ["ingredients", "recipes"]
        };
    }
};
