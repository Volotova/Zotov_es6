function counter(param) {
    var ctx = $jsapi.context();
    var key = param || ctx.currentState;
    ctx.session.counter = ctx.session.counter || {};
    ctx.session.counter[key] = ctx.session.counter[key] || 0;
    ctx.session.counter[key] += 1;
    return ctx.session.counter[key];
}
