function yamlMockRequest(requestObj, mockTests){
    let mockNames = $client.mockTestCases;
    log(`[YamlMockService] provided mock names: ${toPrettyString(mockNames)}`);
    
    if (!mockNames || !mockTests) {
        log("[YamlMockService] No mocks found.");
        return false;
    }
    let mocks = [];
    _.each(mockNames, function(mockName){
        if (mockTests[mockName]) mocks.push(mockTests[mockName]);
    });

    if (mocks.length == 0) {
        log("[YamlMockService] No mocks found with provided names.");
    }
    
    // Подставляем токены на нужные места в моках
    mocks = mocks.map((mock) => setSecrets(mock));

    // Ищем подходящий по сигнатуре мок
    let foundMock;
    const foundMockIndex = mocks.findIndex((elem) => isEqualWithIgnore(elem.request, requestObj));
    log(`[YamlMockService] Found mock index: ${foundMockIndex}`)
    if (foundMockIndex > -1) {
        foundMock = mocks[foundMockIndex];
        if ($client.mockStrategy === "delete") mockNames.splice(foundMockIndex, 1);
    }
    if (foundMock) {
        return foundMock.response;
    }
}

function setSecrets(obj) {
    if (typeof(obj) === "string") return formatSecret(obj);
    if (Array.isArray(obj)) return obj.map(item => setSecrets(item));
    if (typeof obj === 'object' && obj !== null) return _.mapObject(obj, value => setSecrets(value))
    return obj;
}

// function formatSecret(str){
//     return str.replaceAll(/\$\{([^}]+)\}/g, (match, group) => Utils.getSecret(group));
// }

function formatSecret(str) {
    return str.replaceAll(/\$\{([^}]+)\}/g, (match, path) => {
        const parts = path.split('.');
        const secretRoot = Utils.getSecret(parts[0]);

        if (secretRoot === undefined) {
            log(`[YamlMockService] Secret not found: ${parts[0]}`);
            return match;
        }

        let value = secretRoot;
        for (let i = 1; i < parts.length; i++) {
            if (value == null || typeof value !== 'object') {
                log(`[YamlMockService] Invalid secret path: ${path}`);
                return match;
            }
            value = value[parts[i]];
        }

        if (value === undefined) {
            log(`[YamlMockService] Secret path not found: ${path}`);
            return match;
        }
        
        return value;
    });
}


function isEqualWithIgnore(mock, real) {
    // %IGNORE% → проверяем только наличие
    if (mock === "%IGNORE%") return (real !== undefined);

    // Проверка типов
    if (typeof mock !== typeof real) return false;

    // Примитивы и null
    if (typeof mock !== "object" || mock === null) {
        return mock === real;
    }

    // Массивы
    if (Array.isArray(mock)) {
        if (!Array.isArray(real)) return false;
        if (mock.length !== real.length) return false;

        return mock.every((item, i) =>
            isEqualWithIgnore(item, real[i])
        );
    }

    // Объекты
    if (typeof real !== "object" || real === null) return false;

    const mockKeys = Object.keys(mock);

    // В real должны быть ВСЕ поля из mock
    return mockKeys.every(key => {
        if (!(key in real)) return false;
        return isEqualWithIgnore(mock[key], real[key]);
    });
}

export { yamlMockRequest }
