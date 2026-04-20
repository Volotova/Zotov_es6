import { plainToInstance } from "class-transformer";

global.DeserializeMarker = class DeserializeMarker {
    constructor() {
        this.__className__ = "DeserializeMarker";
    }
};

global.deserialize = function(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deserialize(item));
    }
    
    let deserializedObj = {};
    let className = null;
    for (const key in obj) {
        if (!obj.hasOwnProperty(key)) continue;
        if (key === '__className__') {
            className = obj[key];
        } else {
            deserializedObj[key] = deserialize(obj[key]);
        }
    }
    
    if (className) {
        const ClassReference = $global[className];
        if (typeof ClassReference === 'function') {
            return plainToInstance(ClassReference, deserializedObj);
            // const instance = Object.create(ClassReference.prototype);
            // Object.assign(instance, deserializedObj);
            // return instance;
        } else {
            console.warn(`Class "${className}" not found in global scope`);
            return deserializedObj;
        }
    }
    return deserializedObj;
}

// Возвращает объекты в context без десериализации и без await. Для простых присваиваний 
global.$ = new Proxy(
    {},
    {
        get(target, name) {
            return $context[name];
        },
    }
);

global.session = async function() {
    let obj = await $session;
    if (!obj.deserializeMarker || obj.deserializeMarker.constructor === Object) {
        log("[DESERIALIZER]Deserializing session start...");
        obj = deserialize(obj);
        $session = obj;
        log("[DESERIALIZER]Deserializing session end.");
        obj.deserializeMarker = new DeserializeMarker();
    }
    return obj;
};

global.sessionSync = function() {
    let obj = $session;
    if (!obj.deserializeMarker || obj.deserializeMarker.constructor === Object) {
        log("[DESERIALIZER]Deserializing session start...");
        obj = deserialize(obj);
        $session = obj;
        log("[DESERIALIZER]Deserializing session end.");
        obj.deserializeMarker = new DeserializeMarker();
    }
    return obj;
}

global.client = async function() {
    let obj = await $client;
    if (!obj.deserializeMarker || obj.deserializeMarker.constructor === Object) {
        log("[DESERIALIZER]Deserializing client start...");
        obj = deserialize(obj);
        $client = obj;
        log("[DESERIALIZER]Deserializing client end.");
        obj.deserializeMarker = new DeserializeMarker();
    }
    return obj;
};

global.clientSync = function() {
    let obj = $client;
    if (!obj.deserializeMarker || obj.deserializeMarker.constructor === Object) {
        log("[DESERIALIZER]Deserializing client start...");
        obj = deserialize(obj);
        $client = obj;
        log("[DESERIALIZER]Deserializing client end.");
        obj.deserializeMarker = new DeserializeMarker();
    }
    return obj;
};

// TODO проверить в асинхронных функциях, мб нужен await temp
global.temp = function() {
    let obj = $.temp;
    if (!obj.deserializeMarker || obj.deserializeMarker.constructor === Object) {
        log("[DESERIALIZER]Deserializing temp start...");
        obj = deserialize(obj);
        $context.temp = obj;
        log("[DESERIALIZER]Deserializing temp end.");
        obj.deserializeMarker = new DeserializeMarker();
    }
    return obj;
};

export default {};