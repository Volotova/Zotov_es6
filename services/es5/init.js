$global.CATCHALL_LIMIT = $injector.catchAllLimit || 2;

bind("preProcess", function(ctx) {
    ctx.session.chatHistory = ctx.session.chatHistory || [];
    ctx.session.chatHistory.push("USER: " + ctx.request.query);
})

bind("postProcess", function(ctx) {
    if (!_.isEmpty(ctx.temp.reportInfoChanges)) {
        var changes = "PMI_LOG Report data changes for request:\n";
        _.each(ctx.temp.reportInfoChanges, function(item) {
            changes += "- " + toPrettyString(item) + "\n";
        });
        log(changes);
    }
});

bind("postProcess", function(ctx) {
    // remember last state
    ctx.session.lastState = ctx.currentState;
    // check if last state === current state
    if (ctx.session.counterInARow) {
        if (ctx.session.counterInARow.changed === true) {
            ctx.session.counterInARow.changed = false
        } else if (ctx.session.counterInARow.changed === false) {
            ctx.session.counterInARow.value = 0
        }
    } 
});

bind("postProcess", function(ctx) {
    // TODO Обработка массива паттернов перебивания
    var bargeInOn = _.some(ctx.temp.answers, function(elem) {
        return elem.bargeIn && elem.bargeIn !== "disable";
    });
    if (bargeInOn) {
        $dialer.bargeInResponse({
            bargeIn: "forced",
            bargeInTrigger: "final",
            noInterruptTime: 0
        });
    }
    _.each(ctx.temp.answers, function(elem) {
        if (elem.type === "audio") {
            if (bargeInOn) {
                $reactions.audio({"value": elem.audioUrl, "bargeInIf": elem.bargeIn});
            } else {
                $reactions.audio(elem.audioUrl);
            }
        } else {
            if (bargeInOn) {
                $reactions.answer({"value": elem.text, "bargeInIf": elem.bargeIn});
            } else {
                $reactions.answer(elem.text);
            }
        }
    });

    // Сохраняем реплики для повтора
    if (ctx.temp.answers) {
        ctx.temp.answersToRepeat = ctx.temp.answersToRepeat || 1;
        if (ctx.temp.answersToRepeat == "All") {
            ctx.session.lastAnswer = ctx.temp.answers;
        } else {
            try {
                var sliceVal = ctx.temp.answersToRepeat * -1;
                ctx.session.lastAnswer = ctx.temp.answers.slice(sliceVal);
            } catch (e) {
                log("PMI_LOG WARN couldn't save lastAnswer");
            }
        }
    }
});

bind("onAnyError", function(ctx) {
    // TODO перевод на ES6 как починят
    log("ERROR: " + ctx.exception.message);
    var requestData = $.request.data.botData || "";
    sendBugReportEs5("onScriptError", $jsapi.currentTime(), ctx.exception.message);
    ctx.session.endedOnError = true;
    ctx.session.botHangUp = true;
    ctx.session.callStatus = "Ошибка сценария";
    $dialer.hangUp("(Бот повесил трубку)");
});

