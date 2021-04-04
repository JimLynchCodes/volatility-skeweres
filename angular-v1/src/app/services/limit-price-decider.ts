import { BuyOrSell } from './td-api/td-api.service';

/**
 *  bot will never place BUY order higher than (midpoint - buffer),
 *  and will never place SELL order lower than (midpoint + buffer)
 */
export const minCentsBuffer = 0.05;

export function decideLimitPrice(buyOrSell: BuyOrSell, currentBid, currentAsk, prevPlacedLimitPrice, prevBid, prevAsk) {

    const currentMidPoint = +((currentBid + currentAsk) / 2).toFixed(2);

    console.log('3-- currentBid ' + currentBid)
    console.log('3-- currentAsk ' + currentAsk)
    console.log('3-- prevPlacedLimitPrice ' + prevPlacedLimitPrice)
    console.log('3-- currentMidPoint ' + currentMidPoint)

    let decidedOn
    let worstPossiblePrice

    if (buyOrSell === BuyOrSell.Buy) {

        if (!prevPlacedLimitPrice)
            decidedOn = currentBid;

        if (currentBid < prevBid)
            decidedOn = currentBid

        else {
            const oneCentMore = prevPlacedLimitPrice + 0.01;
            worstPossiblePrice = +(currentMidPoint - minCentsBuffer).toFixed(2);

            decidedOn = Math.min(oneCentMore, worstPossiblePrice);
        }

        console.log('3-- decided on BUY ', decidedOn);
    }

    if (buyOrSell === BuyOrSell.Sell) {

        console.log('3-- it\'s a sell order...')

        if (!prevPlacedLimitPrice)
            decidedOn = currentAsk;


        if (currentAsk > prevAsk)
            decidedOn = currentAsk

        else {
            const oneCentLess = prevPlacedLimitPrice - 0.01;
            worstPossiblePrice = +(currentMidPoint + minCentsBuffer).toFixed(2)

            console.log('3-- one cent less than mid ' + oneCentLess);
            console.log('3-- minSellPrice ' + worstPossiblePrice);

            decidedOn = Math.max(
                oneCentLess,
                worstPossiblePrice
            )
        }

        console.log('3-- decided on SELL ' + decidedOn);
    }

    if (decidedOn)
        return {
            limitPriceToPlace: +decidedOn.toFixed(2),
            midpoint: +currentMidPoint.toFixed(2),
            worstPossiblePrice
        }

    return null;
}