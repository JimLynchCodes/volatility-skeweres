import { BuyOrSell } from './td-api/td-api.service';

export function decideBuyOrSell(sharesOfUnderlyingCurrentlyHeld: number, betSize: number) {

    if (sharesOfUnderlyingCurrentlyHeld >= betSize)
        return BuyOrSell.Sell

    else
        return BuyOrSell.Buy

}