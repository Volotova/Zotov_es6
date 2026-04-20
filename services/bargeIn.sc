theme: /

    state: BargeIn || noContext = true
        event!: bargeInIntent
        script:
            var bargeInIf = $dialer.getBargeInIntentStatus().bargeInIf;
            log("[bargeIn] bargeInIf: " + bargeInIf);
            if (bargeInIf == "disable") return;
            if (bargeInIf == "Any") {
                $dialer.bargeInInterrupt(true);
            }
            var bargeInIntentText = $dialer.getBargeInIntentStatus().text;
            var res = $nlp.matchPatterns(bargeInIntentText, [bargeInIf]);
            log("[bargeIn] NLP match result: " + toPrettyString(res));
            if (res) {
                $dialer.bargeInInterrupt(true);
            } 
            // TODO Обработка массива паттернов перебивания
            // TODO BargeInByIndex? 