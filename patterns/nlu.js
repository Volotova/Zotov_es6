/*
 * Функции для работы с parseTree
 */
export default {
    checkSameNumbers() {
        const numbers = $.parseTree.NumberRepeat || $.parseTree.rate?.[0]?.NumberRepeat;
        if (!numbers) return false;
        if (numbers.length === 1) return true;
        return numbers.every(element => 
            element.Number[0].value === numbers[0].Number[0].value
        );
    },

    checkRateValidity(minValue, maxValue) {
        if (!$.parseTree || $.parseTree._Minus) return false;
        const rate = $.parseTree._Number;
        if (!rate) return false;
        return (rate >= minValue && rate <= maxValue) ? rate : false;
    }
}