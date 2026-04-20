// Функция получения причины неперехода
async function getEndReasonResult(metricsData) {
    
    // Если дошли до конечной стадии - причины неперехода нет
    if (metricsData.onFinalStage) {
        return;
    }
    
    // Если клиент бросил трубку - причина неперехода - Client Hang Up
    if ($.request?.rawRequest?.event === "hangup" && !((await session()).botHangUp)) {
        Logger.info("[getEndReasonResult] setting end reason to \"Client Hang Up\"");
        return "Client Hang Up";
    }
    
    const stateEndReason = metricsData.stateEndReason;
    if (!stateEndReason) {
        Logger.warn("[getEndReasonResult] no stateEndReason in session");
        return;
    }
    if (stateEndReason.includes("CatchAll")) {
        Logger.info("[getEndReasonResult] setting end reason to \"CatchAll\"");
        return "CatchAll";
    }
    
    // Учитываем поиск по родительскому стейту TODO: убрать, для таких случаев использовать setEndReason()
    const parentEndReason = stateEndReason.substring(0, stateEndReason.lastIndexOf("/")) || "undefined";
    // TODO учесть в доке, что используем более конкретное название словаря
    return $EndReasonMapping[stateEndReason] || $EndReasonMapping[parentEndReason]
}


export default {
    
    // Работа с метриками Metabase
    
    async initMetrics() {
        $analytics.setSessionData("MField_LocalTime", Utils.getLocalHour());
        log("Utils.getLocalHour(): " + Utils.getLocalHour())
        $session.metrics = {};
        
        // Устанавливаем в препроцесс обновление stateEndReason
        bind("preProcess", async function(ctx) {
            const targetState = ctx.temp?.classifierTargetState;
            let metrics = await $session.metrics; 
            if (targetState && targetState !== "/Events_HANGUP" && ctx.currentState !== "/Events_HANGUP") {
                // ctx.session.metrics = ctx.session.metrics || {};
                metrics.stateEndReason = targetState;
            }
        }, "/", "metricsPreProcess");
        
        // Устанавливаем в постпроцесс счетчики. TODO: Не обновлялось, надо пересмотреть
        bind("postProcess", async function(ctx) {
            if (ctx.request.query) {
                // ctx.session.metrics = ctx.session.metrics || {};
                let metrics = await $session.metrics; 
                if (!ctx.temp.gotReplicaChunk) {
                    metrics.replicsCount = (metrics.replicsCount || 0) + 1;
                }
        
                if (ctx.session.stateEndReason?.includes("CatchAll")) {
                    metrics.catchAllCount = (metrics.catchAllCount || 0) + 1;
        
                    if (ctx.request?.rawRequest?.event === "hangup") {
                        metrics.catchAllCount += 1;
                    }
                }
            }
        }, "/", "metricsPostProcess");
    },
    
    setUserType(userType) {
        if ($injector?.features?.metrics && userType) {
            $analytics.setSessionData("MField_UserType", userType);
            Logger.info(`Set user type to \"${userType}\"`);
        }
    },
    
    setStage(stage) {
        if ($injector?.features?.metrics) {
            $session.metrics ||= {};
            $session.metrics.stage = stage;
            Logger.info(`Set stage to \"${stage}\"`);
        }
    },
    
    setFinalStage(stage) {
        if ($injector?.features?.metrics) {
            $session.metrics ||= {};
            $session.metrics.onFinalStage = true;
            delete $session.metrics.endReason;
            this.setStage(stage);
            Logger.info(`Set stage to final: \"${stage}\"`);
        }
    },
    
    setEndReason(endReason) {
        if ($injector?.features?.metrics) {
            $session.metrics ||= {};
            $session.metrics.endReason = endReason;
        }
    },
    
    setQuestionData(questionType, value) {
        if ($injector?.features?.metrics) {
            $session.metrics ||= {};
            $session.metrics.questionData = $session.metrics.questionData || {};
            $session.metrics.questionData[questionType] = value;
        }
    },

    async setMetricsResults() {
        const metricsData = (await session()).metrics;
        if (!metricsData) {
            Logger.warn("[setMetricsResults] METRICS DATA IS UNDEFINED");
            return;
        }
        
        if (metricsData.stage) $analytics.setSessionData("MField_AnalyticsData", metricsData.stage);
        $analytics.setSessionData("MField_ReplicsCount", metricsData.replicsCount ?? "0");
        $analytics.setSessionData("MField_CatchAllCount", metricsData.catchAllCount ?? "0");
        
        let endReason = await getEndReasonResult(metricsData) ?? metricsData.endReason;
        if (endReason) {
            $analytics.setSessionData("MField_EndReason", endReason)
        }

        if (metricsData.questionData) {
            for (const [key, value] of Object.entries(metricsData.questionData)) {
                const questionValue = value || endReason;
                if (!questionValue) {
                    Logger.warn(`[setMetricsResults] no data to put for question ${key}`);
                } else {
                    $analytics.setSessionData(`MQuestion_${key}`, questionValue);
                }
            }
        }
    },
    
    // Работа со встроенной аналитикой

    setCallStatus(callStatus) {
        const oldStatus = $context.session.callStatus;
        $context.session.callStatus = callStatus;
        Logger.info(`Changed call status from ${oldStatus} to ${callStatus}`);
    },
    
    // setCallStatus(callStatus) {
    //     const oldStatus = $.session.callStatus;
    //     $.session.callStatus = callStatus;
    //     Logger.info(`Changed call status from ${oldStatus} to ${callStatus}`);
    // },
    
    setCallbackStatus() {
        this.setCallStatus(`CALLBACK ${$.session.callStatus || ""}`);
    },
    
    saveValue(column, value) {
        $.session.reportInfo ||= {};
        $.session.reportInfo[column] = value;
        $.temp.reportInfoChanges ||= [];
        $.temp.reportInfoChanges.push(`${column}: ${value}`);
        Logger.info(`Saved analytics value \"${column}\": \"${value}\"`);
    },
    
    setValuesInJaicp() {
        if ($.session.callStatus) $analytics.setSessionResult($.session.callStatus)
        if ($.session.reportInfo) {
            for (const [key, value] of Object.entries($.session.reportInfo)) {
                if (key && value) {
                    $analytics.setSessionData(key, value);
                }
            }
        }
    }
}
