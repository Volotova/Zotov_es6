/**
 * Класс, отвечающий за формирование цепочки функций и ее вызов. 
 * Пример: 
 *      // Объявление методов и классов. Должны быть глобальными.
 *      $.global.testFunction = function(num) {log(num)};
 *      $.global.User = class User {greet = function() {log(this)}};
 * 
 *      // Формирование цепочки и вызов
 *      $.session.preMatchChain = new BindChain();
 *      $.session.user1 = new User();
 *      $.session.preMatchChain.push("tag1", testFunction, null,  "AAAA");
 *      $.session.preMatchChain.push("tag2", $.session.user1.greet, $.session.user1);
 *      $.session.preMatchChain.execute(); // Вызов обеих функций
 * 
 *      // Редактирование и вызов
 *      $.session.preMatchChain.removeByTag(tag1);
 *      $.session.preMatchChain.execute(); // Вызовется только функция greet
 * 
 *      // Также допускается добавление статичных методов глобальных классов
 *      $.global.Product = class Product {static printText = function(text){log(text)}}
 *      $.session.preMatchChain.push("tag2", Porduct.price, null, "smth");
 * 
 *      Примечание: аргументы кладутся в цепочку не по ссылке, а по значению, то есть без возможности авторедактирования.
 */
global.BindChain = class BindChain {
    constructor() {
        this.__className__ = "BindChain";
    }
    
    init() {
        Logger.debug("Initializing bind chain...")
        this.chain = []; // Хранит объекты { tag: string, funcString: string, args: any[] }
        return this;
    }
    
    /**
     * Добавляет функцию в цепочку с указанием тега
     * @param {string} tag - Уникальный идентификатор группы функций
     * @param {Function} func - Функция для добавления
     * @param {...any} args - Аргументы для вызова функции:
     *    Первым аргументом должен быть параметр, который будет передаваться в функцию как this, иначе - должен быть === null (например для static или global методов).
     * @returns {boolean}
     */
    push(tag, func, ...args) {
        if (typeof func !== 'function') {
            Logger.warn("[BindChain] Couldn't add function. Expected a function.");
            return false;
        }
        if (typeof tag !== 'string') {
            Logger.warn("[BindChain] Tag must be a string.");
            return false;
        }
        
        const funcString = func.toString();
        this.chain.push({ tag, funcString, args });
        return true;
    }
    
    /**
     * Добавляет функцию в начало цепочки
     * @param {string} tag - Уникальный идентификатор группы функций
     * @param {Function} func - Функция для добавления
     * @param {...any} args - Аргументы для вызова функции:
     *    Первым аргументом должен быть параметр, который будет передаваться в функцию как this, иначе - должен быть === null (например для static или global методов).
     * @returns {boolean}
     */
    unshift(tag, func, ...args) {
        if (typeof func !== 'function') {
            Logger.warn("[BindChain] Couldn't add function. Expected a function.");
            return false;
        }
        if (typeof tag !== 'string') {
            Logger.warn("[BindChain] Tag must be a string.");
            return false;
        }
        
        const funcString = func.toString();
        this.chain.unshift({ tag, funcString, args });
        return true;
    }
    
    /**
     * Удаляет все функции с указанным тегом
     * @param {string} tag - Тег для удаления
     * @returns {number} - Количество удаленных функций
     */
    removeByTag(tag) {
        const initialLength = this.chain.length;
        this.chain = this.chain.filter(item => item.tag !== tag);
        return initialLength - this.chain.length;
    }
    
    /**
     * Выполняет все функции в цепочке
     */
    execute() {
        if (this.chain) {
            this.chain.forEach(item => {
                try {
                    const func = this._createFunction(item.funcString);
                    Logger.info(`[BindChain] Created function: ${func}\nits type is ${typeof func}`);
                    func.call(...item.args);
                } catch (e) {
                    Logger.warn(`[BindChain] Error in BindChain [${item && item.tag}]: ${e.message}`);
                }
            });
        }
    }
    
    /**
     * Создает функцию из строки
     * @param {string} funcString - Строковое представление функции
     * @returns {Function}
     */
    _createFunction(funcString) {
        return eval(`(${funcString})`);
    }
}




// TODO ДОБАВИТЬ В ДОКУ, ЧТО У БИНДОВ ОБЯЗАТЕЛЬНО ДОЛЖНО БЫТЬ ИМЯ

export default {
    installBind: async function() {
        let $s = await session();
        $s.preMatchChain = new BindChain().init();
        $s.preProcessChain = new BindChain().init();
        $s.postProcessChain = new BindChain().init();
        bind("preMatch", async function(ctx) {
            const chain = (await session()).preMatchChain;
            if (chain.chain) {
                chain.execute();
            }
        }, "/", "preMatchBind");
        bind("preProcess", async function(ctx) {
            const chain = (await session()).preProcessChain;
            if (chain.chain) {
                chain.execute();
            }
        }, "/", "preProcessBind");
        bind("postProcess", async function(ctx) {
            const chain = (await session()).postProcessChain;
            if (chain.chain) {
                chain.execute();
            }
        }, "/", "postProcessBind");
    }
}
    