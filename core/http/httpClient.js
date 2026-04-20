import axios from 'axios';
import { yamlMockRequest } from "./yamlMockService.js"


// TODO добавить возврат статуса из execute

global.HttpClient = class HttpClient {
    /**
     * Конструктор класса ApiRequest
     * @param {Object} options - Конфигурация запроса
     * @param {string} name - Имя вызова
     * @param {number} attempts - Количество повторных попыток
     */
    constructor() {
        this.__className__ = "HttpClient"
    }
    
    init(
        options = {
            "headers": {
                "Content-Type": "application/json"
            }
        },
        name = "HttpClient",
        attempts = 1,
        mockTests
    ) {
        Logger.debug("Ininitializing HttpClient...");
        this.options = options;
        this.options.timeout = this.options.timeout || 10000;
        this.attempts = attempts;
        this.name = name;
        this.errorHandlers = [];
        this.maskFields = [];
        this.useMock = !!$.testContext;
        this.mockTests = mockTests;
        Logger.info("Initialized HttpClient", this.name);
        return this;
    }

    clone(name) {
        const newClient = new HttpClient().init(
            Utils.cloneDeep(this.options), name || this.name, this.attempts, this.mockTests);
        newClient.useMock = this.useMock;
        newClient.maskFields = Utils.cloneDeep(this.maskFields);
        newClient.errorHandlers = Utils.cloneDeep(this.errorHandlers);
        return newClient;
    }

    /**
     * Переустанавливает конфигурацию запроса
     * @param {Object} updates - Обновления конфигурации
     */
    reinstallOptions(updates) {
        this.options = updates;
        return this;
    }
    
    /**
     * Обновляет конфигурацию запроса
     * @param {Object} updates - Обновления конфигурации
     */
    updateOptions(updates) {
        this.options = { ...this.options, ...updates };
        return this;
    }

    /**
    * Добавляет обработчик для специфических ошибок
    * @param {number[]} statuses - Список статусов, для которых вызовется функция
    * @param {Function} handler - Функция-обработчик
    * @param {boolean} onlyFinal - Если true, то хэндлер будет запущен только при последней попытке
    * @param {boolean} dontCount - Считать ли попытку запроса при данной ошибке. True, например, при истекшей авторизации
    */
    // TODO параметры: возможность повторного использования (или просто кидаем хэндлер 2 раза?)
    addErrorHandler(statuses, handler, onlyFinal = false, dontCount = false) {
        const handlerValue = (handler && typeof handler === 'function') ? handler.toString() : handler;
        const valueToAdd = { statuses, handler: handlerValue, onlyFinal, dontCount };
        Logger.info("[addErrorHandler] adding handler", valueToAdd);
        this.errorHandlers.push(valueToAdd);
        return this;
    }

    /**
     * Добавляет поля для маскировки
     * @param {string[]} fields - Массив полей для маскировки
     */
    installMask(fields) {
        if (Array.isArray(fields)) {
            this.maskFields = [...this.maskFields, ...fields]; // Добавляем новые поля к существующим
        } else if (typeof fields == "string") {
            this.maskFields.push(fields);
        } else {
            Logger.warn("[installMask] fields must be an array. Fields in params", fields);
        }
        return this;
    }

    /**
     * Рекурсивно маскирует указанные поля в объекте
     * @param {Object} obj - Объект для маскировки
     * @returns {Object} - Копия объекта с замаскированными полями
     */
    mask(obj) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.mask(item));
        }
        
        const maskValue = (value) => {
            if (typeof value === 'string' && value.length > 0) {
                if (value.length <= 6) {
                    return '*'.repeat(value.length);
                }
                return value.substring(0, 2) + '*'.repeat(6) + value.substring(value.length - 2);
            }
            if (value !== undefined && value !== null) { 
                if (Array.isArray(value)) {
                    return '[***]';
                } else {
                    return '{***}';
                }
            }
            return '***';
        };
    
        const maskedObj = {};
        for (const key in obj) {
            maskedObj[key] = this.maskFields.includes(key) ? maskValue(obj[key]) : this.mask(obj[key]);
        }
        return maskedObj;
    }
    
    /**
     * Проверяет соответствие статуса паттерну
     * @param {string|number} pattern - Паттерн для проверки
     * @param {number} status - HTTP статус
     * @returns {boolean} - Соответствует ли статус паттерну
     */
    matchStatus(pattern, status) {
        if (pattern === 'Any' || pattern === 'any') {
            return true;
        }

        if (typeof pattern === 'number') {
            return pattern === status;
        }

        if (typeof pattern === 'string') {
            // Паттерны типа "4**", "3**" и т.д.
            if (pattern.endsWith('**') && pattern.length === 3) {
                const firstDigit = parseInt(pattern[0]);
                return Math.floor(status / 100) === firstDigit;
            }
            
            // Точное совпадение со строкой
            const patternNum = parseInt(pattern);
            if (!isNaN(patternNum)) {
                return patternNum === status;
            }
        }

        return false;
    }

    /**
     * Выполняет запрос с обработкой ошибок и повторами
     * @returns {Promise<Object>} - Результат запроса
     */
    async execute(options = {}, _attempts) {
        let requestOptions;
        const attempts = _attempts || this.attempts || 0; 
        let attemptsMade = 0;
        let lastError = null;

        // Сбрасываем флаги использования перед выполнением
        this.errorHandlers.forEach(handler => handler.used = false);
        let response;
        while (attemptsMade < attempts) {
            Logger.info(`[HttpClient] Processing... Attempt: ${attemptsMade + 1}`);
            // Пересобираем конфиги на случай изменения запроса в handler
            if (options?.data && this.options?.data) {
                options.data = { ...this.options.data, ...options.data }
            } else {
                options.data = options.data || this.options.data;
            }
            requestOptions = { ...this.options, ...options };
            Logger.info("[HttpClient] Request options", this.mask(requestOptions));
            try {
                if (this.useMock) {
                    const mockResponse = yamlMockRequest(requestOptions, this.mockTests || $MockTests);
                    
                    if (!mockResponse) {
                        Logger.warn("[HttpClient] NO MOCK FOUND");
                        return;
                    }
                    Logger.info(`[HttpClient] Mock response used`, mockResponse);

                    if (mockResponse.error) {
                        throw {
                            response: {
                                data: mockResponse.data,
                                status: mockResponse.status || -1,
                                statusText: mockResponse.statusText,
                                isOk: false
                            }
                        }
                    }
                    
                    return {
                        data: mockResponse.data,
                        status: mockResponse.status || 200,
                        statusText: mockResponse.statusText,
                        isOk: true
                    }
                }
                
                response = await axios(requestOptions);
                Logger.integration(this.name, response.status, response.statusText);
                const result = {
                    data: response.data,
                    status: response.status,
                    statusText: response.statusText,
                    isOk: true
                };
                Logger.info("[HttpClient] Http Response", this.mask(result));
                return result;
            } catch (error) {
                lastError = error;
                Logger.info("[httpClient] error handling", {
                    message: lastError?.message,
                    name: lastError?.name,
                    status: lastError?.response?.status,
                    statusText: lastError?.response?.statusText,
                    code: lastError?.code
                });
                const status = error.response?.status;
                const handlers = this.errorHandlers.filter(h =>
                    h.statuses.some(pattern => this.matchStatus(pattern, status)) && !h.used && (!h.onlyFinal || attemptsMade == (attempts - 1))
                );
                
                if (handlers.length > 0) {
                    let count = true;
                    for (const handler of handlers) {
                        try {
                            Logger.info("[HttpClient] Using handler", handler);
                            handler.used = true;
                            const func = eval(`(${handler.handler})`);
                            await func(this);
                            if (handler.dontCount) {
                                count = false;
                            }
                        } catch (handlerError) {
                            Logger.warn(`[${this.name}] Error handler failed`, handlerError);
                        }
                    }
                    if (count) {
                        attemptsMade++;
                    } else {
                        Logger.info("[HttpClient] Attempt doesn't count");
                    }
                } else {
                    // Если обработчиков не найдено - увеличиваем счетчик
                    attemptsMade++;
                }
            }
        }
        const data = lastError?.response?.data;
        const status = lastError?.response?.status || lastError?.code;
        const statusText = lastError?.response?.statusText || lastError?.message;
        Logger.integration(this.name, status, statusText);

        // Извлекаем текст ошибки: приоритетно из тела ответа, затем statusText, затем axios message
        let errorMessage = statusText; // Берём statusText (например "Unauthorized"), который уже используется в Logger.integration

        if (data) {
            // Если в теле ответа есть более детальное описание - используем его
            if (typeof data === 'string') {
                errorMessage = data;
            } else if (data.message) {
                errorMessage = data.message;
            } else if (data.error) {
                errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
            } else if (data.Message) {
                errorMessage = data.Message;
            }
        }

        const res = {
            data,
            status,
            statusText,
            isOk: false,
            errorMessage,
            errorName: lastError?.name,
            errorCode: lastError?.code
        };
        const optionsForReport = {
            url: requestOptions.url,
            fields: JSON.stringify(this.mask(requestOptions))
        }
        await sendBugReport(
            "integrationError",
            $jsapi.currentTime(),
            res,
            optionsForReport
        )
        return res;
    }
    
    /**
     * Выполняет GET запрос
     * @param {string} url - URL запроса
     * @param {Object} options - Дополнительные опции
     * @param {number} attempts - Количество попыток
     * @returns {Promise<Object>} - Результат запроса
     */
    async get(url, options = {}, attempts) {
        return await this.execute({ ...options, method: 'get', url }, attempts);
    }
    
    /**
     * Выполняет POST запрос
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @param {Object} options - Дополнительные опции
     * @param {number} attempts - Количество попыток
     * @returns {Promise<Object>} - Результат запроса
     */
    async post(url, data = {}, options = {}, attempts) {
        return await this.execute({ ...options, method: 'post', url, data }, attempts);
    }
    
    /**
     * Выполняет PUT запрос
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @param {Object} options - Дополнительные опции
     * @param {number} attempts - Количество попыток
     * @returns {Promise<Object>} - Результат запроса
     */
    async put(url, data = {}, options = {}, attempts) {
        return await this.execute({ ...options, method: 'put', url, data }, attempts);
    }
    
    /**
     * Выполняет DELETE запрос
     * @param {string} url - URL запроса
     * @param {Object} options - Дополнительные опции
     * @param {number} attempts - Количество попыток
     * @returns {Promise<Object>} - Результат запроса
     */
    async delete(url, options = {}, attempts) {
        return await this.execute({ ...options, method: 'delete', url }, attempts);
    }
}


export default {};
