export default {
    renderTemplate: function(template, context) {
      return template.replace(/\$\{(\w+)\}/g, (match, key) => {
        return context[key] || match;
      });
    },
    
    /**
     * Выполняет вызов LLM (модельного API) с заданными параметрами и встроенной поддержкой повторных попыток,
     * парсинга JSON-ответа и валидации результата.
     *
     * @async
     * @function simpleCall
     * @param {string} request - Текст запроса, передаваемый в LLM.
     * @param {number} [attempts=1] - Количество попыток выполнения запроса в случае ошибок.
     * @param {boolean} [parseJson=false] - Нужно ли попытаться распарсить результат как JSON.
     * @param {(result: any) => boolean} [validateFn] - Опциональная функция-валидатор результата.
     *        Должна вернуть true, если результат корректен, иначе false (или выбросить ошибку).
     * @param {object} [config=$injector.llmDefaultConfig] - Конфигурация HTTP-запроса (URL, body, headers и т.д.).
     * @returns {Promise<any>} Результат вызова LLM (распарсенный JSON или строка).
     *
     * @example
     * // Простой вызов без парсинга
     * const response = await LLM.simpleCall(prompt);
     *
     * @example
     * // Вызов с кастомной конфигурацией, парсингом и проверкой
     * const result = await LLM.simpleCall(
     *   prompt,
     *   2,
     *   true,
     *   r => Array.isArray(r.items),
     *   $injector.tProConfig
     * );
     */
    simpleCall: async function(request, attempts = 1, parseJson, validateFn, config = $.injector.llmDefaultConfig) {
        const startOfIntegration = $jsapi.currentTime();
        let body = config.body || {};
        body.messages = [];
        if (request) body.messages.push({
            "role": "user",
            "content": request
        });
        let openaiProxy = config.url.includes("openai-proxy");
        if (openaiProxy) {
            body = {
                "chat": body
            }
        }
        
        log(`[LLM.simpleCall] request body: ${toPrettyString(body).substring(0, 3500)}`)
        
        let attemptsLeft = attempts;
        let result;
        const httpClient = new HttpClient().init(
            {
                method: "post",
                url: config.url,
                data: body,
                headers: {
                    "Content-Type": "application/json",
                    "MLP-API-KEY": $secrets.get("MLP_API_KEY")
                }
            },
            "LLMSimpleCall",
            1,
            $session.llmMocks
        ).installMask("MLP-API-KEY");
        // TODO добавить хэндлеры
        while (attemptsLeft > 0 && !result) {
            try {
                attemptsLeft--;
                let res = await httpClient.execute();
                log(`LLM CALL RESULT: ${toPrettyString(res)}`);
                let data = res?.data
                if (openaiProxy) {
                    data = data.chat;
                }
                
                $.temp.tokensUsage ??= {};
                $.temp.tokensUsage.prompt_tokens = ($.temp.tokensUsage.prompt_tokens ?? 0) + (data.usage?.prompt_tokens ?? 0);
                $.temp.tokensUsage.completion_tokens = ($.temp.tokensUsage.completion_tokens ?? 0) + (data.usage?.completion_tokens ?? 0);
                $.temp.tokensUsage.total_tokens = ($.temp.tokensUsage.total_tokens ?? 0) + (data.usage?.total_tokens ?? 0);
                log(`[LLM.simpleCall] Tokens usage for this user request: ${toPrettyString($.temp.tokensUsage)}`);
                
                if (!res.isOk) {
                    throw new Error(`[LLM.simpleCall] Error in request ${res?.status}: ${res?.statusText}`)
                }
                
                let rawResult  = data.choices[0].message.content;
                
                try {
                    if (parseJson) rawResult = this.safeParseJson(rawResult);
                } catch (e) {
                    Logger.warn(`[LLM.simpleCall] JSON parse error: ${e.message}`);
                    throw e;
                }
                log(`[LLM.simpleCall] parsed rawResult: ${toPrettyString(rawResult)}`)
                if (validateFn && !validateFn(rawResult)) {
                    throw new Error("[LLM.simpleCall] Error in validating result");
                }
                result = rawResult;
            } catch(e) {
                Logger.warn(`[LLM.simpleCall] Error in request, in attempt ${attempts - attemptsLeft}: ${toPrettyString(e.message)}`); // TODO Backlog добавить timestamp в логи (обертка над log)
            }
        }
        Logger.info(`Длительность ответа LLM: ${$jsapi.currentTime() - startOfIntegration}`)
        return result;
    },
    
    safeParseJson: function(data) {
        // Находим первое вхождение { или [
        const startMatch = data.match(/[{\[]/);
        if (!startMatch) {
            throw new Error('Не найдены открывающие скобки { или [');
        }
        const startIndex = startMatch.index;
        // Находим последнее вхождение { или [
        const endMatch = data.match(/.*([}\]])/);
        if (!endMatch) {
            throw new Error('Не найдены закрывающие скобки } или ]');
        }
        
        const endIndex = data.lastIndexOf(endMatch[1]) + 1;
        const cleanStr = data.substring(startIndex, endIndex);
        
        log(`[safeParseJson] Cleaned string: ${cleanStr}`)
        try {
            return JSON.parse(cleanStr);
        } catch (e) {
            throw new Error(`[safeParseJson] Couldn't parse string: ${e.message}`);
        }
    }
}