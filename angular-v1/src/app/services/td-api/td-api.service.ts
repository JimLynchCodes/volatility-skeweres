import qs from 'qs'
import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { BehaviorSubject } from 'rxjs';

const tokenEndpoint = 'https://api.tdameritrade.com/v1/oauth2/token'

const getPositionEndpoint = 'https://api.tdameritrade.com/v1/accounts?fields=positions'

const getOrdersEndpoint = 'https://api.tdameritrade.com/v1/accounts?fields=orders'

const getQuotesEndpoint = 'https://api.tdameritrade.com/v1/marketdata/GME/quotes'

const getQuotesEndpointBase = 'https://api.tdameritrade.com/v1/marketdata/'

const accountsBaseEndpoint = 'https://api.tdameritrade.com/v1/accounts'

export enum BuyOrSell {
  Buy = 'Buy',
  Sell = 'Sell',
  Waiting = 'Waiting'
}

enum TdTokenStatus {
  missing_tokens = 'missing_tokens',
  valid_access_token = 'valid_access_token',
  invalid_access_token_valid_refresh_token = 'invalid_access_token_valid_refresh_token',
  both_tokens_expired = 'both_tokens_expired',
}

interface TokenHolder {
  access_token: string,
  expires_in: number
  expiry_date: Date
  refresh_token: string
  refresh_token_expires_in: number
  refresh_token_expiry_date: Date
}

@Injectable({
  providedIn: 'root'
})
export class TdApiService {

  positions = new BehaviorSubject([])
  orders = new BehaviorSubject([])
  quotes = new BehaviorSubject([])

  logoutWatcher = new BehaviorSubject(false)

  accessToken
  refreshToken

  accountId
  accessTokenExpiryDate: Date;
  refreshTokenExpiryDate: Date;

  currentWorkingOrders

  currentlyCallingForNewAccessToken = false

  logout() {

    console.log('logging out!');

    this.positions.next([])
    this.orders.next([])
    this.quotes.next([])

    delete this.accessToken
    delete this.refreshToken
    delete this.accountId
    delete this.accessTokenExpiryDate
    delete this.refreshTokenExpiryDate

    this.logoutWatcher.next(true)

    localStorage.clear()
  }

  constructor(private http: HttpClient) { }

  async refreshData() {
    // await Promise.all([this.refreshPositions(), this.refreshOrders()])
    await this.refreshPositions()
    await this.refreshOrders()
    await this.refreshQuotes()
  }

  async init() {
    console.log('TD Service is starting up!')

    const tokenStatus = this.getCurrentTokenStatus()
    console.log('current token status: ', tokenStatus)
    await this.getNewTokensIfNecessary(tokenStatus)

  }

  /**
   *  Checks the localstorage for tokens. If they are expired, go to "logged out mode".
   */
  getCurrentTokenStatus(): TdTokenStatus {

    const now = new Date();

    this.accessToken = localStorage.getItem('a_token')
    this.accessTokenExpiryDate = new Date(parseInt(localStorage['a_ex_date'], 10));
    this.refreshToken = localStorage.getItem('r_token')
    this.refreshTokenExpiryDate = new Date(parseInt(localStorage['r_ex_date'], 10));

    // console.log('a_expiry date:, ', this.accessTokenExpiryDate)
    // console.log('r_expiry date:, ', this.refreshTokenExpiryDate)
    // console.log('c_expiry date:, ', now)


    if (!this.accessToken && !this.refreshToken)
      return TdTokenStatus.missing_tokens

    if (this.accessToken && this.accessTokenExpiryDate && now < this.accessTokenExpiryDate)
      return TdTokenStatus.valid_access_token

    if (this.refreshToken && this.refreshTokenExpiryDate && now < this.refreshTokenExpiryDate)
      return TdTokenStatus.invalid_access_token_valid_refresh_token

    return TdTokenStatus.both_tokens_expired
  }

  async getNewTokensIfNecessary(tokenStatus: TdTokenStatus) {

    console.log('do we need to call for new tokens? ', tokenStatus)

    switch (tokenStatus) {

      case TdTokenStatus.missing_tokens:
        // (Nothing to do - logged out mode)
        break;

      case TdTokenStatus.valid_access_token:
        // (Nothing to do) - access token is valid!
        break;

      case TdTokenStatus.invalid_access_token_valid_refresh_token:
        await this.callWithRefreshTokenForNewAccessToken(this.refreshToken)
        break;

      case TdTokenStatus.both_tokens_expired:
        // Show "You have been logged out" somewhere?

        break;

      default:
        console.log('unrecognized token status: ', tokenStatus)

    }

  }

  async handleNewSuccessfulLogin(callbackCode: string = ''): Promise<void> {
    return this.callWithCodeForAccessAndRefreshTokens(callbackCode)
  }

  private async callWithRefreshTokenForNewAccessToken(refreshToken: string): Promise<void> {

    console.log('calling with refresh token for a new access token!', refreshToken)

    const tokenHeaders = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    })

    // const body = {
    //   grant_type: 'refresh_token',
    //   refresh_token: refreshToken,
    //   client_id: environment.td_client,
    //   redirect_uri: environment.redirect_uri
    // }

    const body = {
      grant_type: 'refresh_token',
      access_type: '',
      refresh_token: refreshToken,
      code: '',
      client_id: environment.td_client + '@AMER.OAUTHAP',
      redirect_uri: environment.redirect_uri
    }

    const ok = qs.stringify(body)

    console.log(ok)

    if (!this.currentlyCallingForNewAccessToken) {
      this.currentlyCallingForNewAccessToken = true;
      console.log('calling for new access token...')

      return new Promise(resolve => {
        this.http.post<TokenHolder>(tokenEndpoint, ok, { headers: tokenHeaders }).subscribe(async response => {
          console.log('got a refresh response... ', response)
          this.setTokens(response.access_token, response.expires_in);

          this.refreshData();
          resolve();

          this.currentlyCallingForNewAccessToken = false
        }, () => {
          this.currentlyCallingForNewAccessToken = false
        })
      })
    } else {
      console.log('already calling for new access token...')
    }
  }

  private async callWithCodeForAccessAndRefreshTokens(code: string): Promise<void> {

    const tokenHeaders = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    })

    const body = {
      grant_type: 'authorization_code',
      access_type: 'offline',
      refresh_token: '',
      code: code,
      client_id: environment.td_client,
      redirect_uri: environment.redirect_uri
    }

    console.log('calling for token(s)...')

    return new Promise(resolve => {
      this.http.post<TokenHolder>(tokenEndpoint, qs.stringify(body), { headers: tokenHeaders }).subscribe(async response => {
        // console.log('got a response... ', response)
        this.setTokens(response.access_token, response.expires_in, response.refresh_token, response.refresh_token_expires_in);

        await this.refreshData()
        resolve()
      })
    })
  }

  private setTokens(accessToken, accessTokenExpirationTime, refreshToken = undefined, refreshTokenExpirationTime = undefined) {

    const now = new Date()
    console.log('setting tokens, now: ', now)

    if (accessToken && accessTokenExpirationTime) {
      localStorage.setItem('a_token', accessToken)
      localStorage.setItem('a_ex_time', accessTokenExpirationTime)

      const accessTokenExpiryDate = new Date(now.getTime() + accessTokenExpirationTime * 1000)

      localStorage['a_ex_date'] = '' + accessTokenExpiryDate.getTime();

      this.accessToken = accessToken
      this.accessTokenExpiryDate = accessTokenExpiryDate
      console.log('saved a token!')
    }

    if (refreshToken) {
      localStorage.setItem('r_token', refreshToken)
      localStorage.setItem('r_ex_time', refreshTokenExpirationTime)

      // console.log('got refresh time: ', refreshTokenExpirationTime)

      const refreshTokenExpiryDate = new Date(now.getTime() + refreshTokenExpirationTime * 1000)

      localStorage['r_ex_date'] = '' + refreshTokenExpiryDate.getTime();

      this.refreshToken = refreshToken
      this.refreshTokenExpiryDate = refreshTokenExpiryDate
    }

  }

  // returns positions
  async getPositions(): Promise<any> {

    console.log('refreshing positions...')

    const tokenStatus = await this.getCurrentTokenStatus();
    await this.getNewTokensIfNecessary(tokenStatus)

    if (tokenStatus !== TdTokenStatus.missing_tokens && tokenStatus !== TdTokenStatus.both_tokens_expired) {

      const positionsHeaders = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      })

      if (!this.currentlyCallingForNewAccessToken) {

        if (this.accessToken) {

          return new Promise(resolve => {
            this.http.get(getPositionEndpoint, { headers: positionsHeaders }).subscribe((positions: any) => {

              const positionsWithFreeCash = positions.map(position => {
                position.securitiesAccount.freeCash = position.securitiesAccount?.currentBalances?.cashBalance
                  || position?.securitiesAccount?.currentBalances?.cashAvailableForTrading;
                return position;
              })

              resolve(positionsWithFreeCash)
            })
          })
        } else {
          console.log('Error, trying to call with no access token!')
        }
      } else {
        console.log('Currently calling for access token!')
      }
    }
  }

  async refreshPositions(): Promise<void> {

    console.log('refreshing positions...')

    const tokenStatus = await this.getCurrentTokenStatus();
    await this.getNewTokensIfNecessary(tokenStatus)

    if (tokenStatus !== TdTokenStatus.missing_tokens && tokenStatus !== TdTokenStatus.both_tokens_expired) {

      const positionsHeaders = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      })

      if (!this.currentlyCallingForNewAccessToken) {

        if (this.accessToken) {

          return new Promise(resolve => {
            this.http.get(getPositionEndpoint, { headers: positionsHeaders }).subscribe((positions: any) => {

              console.log('got positions: ', positions);

              this.positions.next(positions);
              resolve()
            })
          })
        } else {
          console.log('Error, trying to call with no access token!')
        }
      } else {
        console.log('Currently callingf or access token!')
      }
    }
  }

  async getWorkingOrders(): Promise<any> {
    const tokenStatus = await this.getCurrentTokenStatus();
    await this.getNewTokensIfNecessary(tokenStatus)

    if (tokenStatus !== TdTokenStatus.missing_tokens && tokenStatus !== TdTokenStatus.both_tokens_expired) {

      const ordersHeaders = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      })

      if (!this.currentlyCallingForNewAccessToken) {

        if (this.accessToken) {
          return new Promise(resolve => {
            this.http.get(getOrdersEndpoint, { headers: ordersHeaders }).subscribe((orders: any) => {

              console.log('got orders: ', orders)

              resolve(orders)
            })
          })
        } else {
          console.log('Error, trying to call with no access token!')
        }
      } else {
        console.log('Currently callingf or access token!')
      }

    }
    else {
      console.log('can\'t refresh positions! ', tokenStatus)
    }
  }

  async refreshOrders(): Promise<void> {

    console.log('refreshing orders...')

    const tokenStatus = await this.getCurrentTokenStatus();
    await this.getNewTokensIfNecessary(tokenStatus)

    if (tokenStatus !== TdTokenStatus.missing_tokens && tokenStatus !== TdTokenStatus.both_tokens_expired) {

      const ordersHeaders = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      })

      if (!this.currentlyCallingForNewAccessToken) {

        if (this.accessToken) {
          return new Promise(resolve => {
            this.http.get(getOrdersEndpoint, { headers: ordersHeaders }).subscribe((orders: any) => {

              console.log('got orderssss: ', orders)

              this.currentWorkingOrders = orders

              this.orders.next(orders);
              resolve()
            })
          })
        } else {
          console.log('Error, trying to call with no access token!')
        }
      } else {
        console.log('Currently callingf or access token!')
      }

    }
    else {
      console.log('can\'t refresh positions! ', tokenStatus)
    }
  }

  async getQuotes(symbol: string) {
    console.log('refreshing quotes...')

    const tokenStatus = await this.getCurrentTokenStatus();
    await this.getNewTokensIfNecessary(tokenStatus)

    if (tokenStatus !== TdTokenStatus.missing_tokens && tokenStatus !== TdTokenStatus.both_tokens_expired) {

      const ordersHeaders = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      })

      if (!this.currentlyCallingForNewAccessToken) {

        if (this.accessToken) {
          return new Promise(resolve => {
            this.http.get(getQuotesEndpointBase + symbol + '/quotes', { headers: ordersHeaders }).subscribe((orders: any) => {

              console.log('got quotes: ', orders)

              resolve(orders);
            })
          })
        } else {
          console.log('Error, trying to call with no access token!')
        }
      } else {
        console.log('Currently callingf or access token!')
      }

    }
    else {
      console.log('can\'t refresh positions! ', tokenStatus)
    }
  }

  async refreshQuotes(): Promise<void> {

    console.log('refreshing quotes...')

    const tokenStatus = await this.getCurrentTokenStatus();
    await this.getNewTokensIfNecessary(tokenStatus)

    if (tokenStatus !== TdTokenStatus.missing_tokens && tokenStatus !== TdTokenStatus.both_tokens_expired) {

      const ordersHeaders = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      })

      if (!this.currentlyCallingForNewAccessToken) {

        if (this.accessToken) {
          return new Promise(resolve => {
            this.http.get(getQuotesEndpoint, { headers: ordersHeaders }).subscribe((orders: any) => {

              console.log('got quotes: ', orders)

              this.quotes.next(orders);
              resolve()
            })
          })
        } else {
          console.log('Error, trying to call with no access token!')
        }
      } else {
        console.log('Currently callingf or access token!')
      }

    }
    else {
      console.log('can\'t refresh positions! ', tokenStatus)
    }
  }

  async placeHardcodedOrder(ticker: string, buyPrice: number) {

    const placeOrderEndpoint = `https://api.tdameritrade.com/v1/accounts/${this.accountId}/orders`

    const requestBody = {
      "orderType": "MARKET",
      "session": "NORMAL",
      "duration": "DAY",
      "orderStrategyType": "SINGLE",
      "orderLegCollection": [
        {
          "instruction": "Buy",
          "quantity": 15,
          "instrument": {
            "symbol": "XYZ",
            "assetType": "EQUITY"
          }
        }
      ]
    }

    const ordersHeaders = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    })

    if (!this.currentlyCallingForNewAccessToken) {

      if (this.accessToken) {

        try {
          const placeOrderResult = await this.http.post(placeOrderEndpoint, requestBody, { headers: ordersHeaders })
          console.log('order placed! ', placeOrderResult)
        }
        catch (err) {
          console.log('err placing order! ', err)

        }
      } else {
        console.log('Error, trying to call with no access token!')
      }
    } else {
      console.log('Currently callingf or access token!')
    }

  }

  async placeLimitOrder(buyOrSell: BuyOrSell, ticker: string, price: number, qty: number, account: string) {

    const placeOrderEndpoint = `https://api.tdameritrade.com/v1/accounts/${account}/orders`

    const requestBody = {
      price,
      "orderType": "LIMIT",
      "session": "NORMAL",
      "duration": "GOOD_TILL_CANCEL",
      "orderStrategyType": "SINGLE",
      "orderLegCollection": [
        {
          "instruction": buyOrSell,
          "quantity": qty,
          "instrument": {
            "symbol": ticker,
            "assetType": "EQUITY"
          }
        }
      ]
    }

    const ordersHeaders = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    })

    if (!this.currentlyCallingForNewAccessToken) {

      if (this.accessToken) {

        try {
          const placeOrderResult = await this.http.post(placeOrderEndpoint, requestBody, { headers: ordersHeaders }).toPromise();
          console.log('order placed! ', placeOrderResult)

          return true;

        }
        catch (err) {
          console.log('err placing order! ', err)

        }
      } else {
        console.log('Error, trying to call with no access token!')
      }
    } else {
      console.log('Currently calling for access token!')
    }


  }

  getSharesOfUnderlyingCurrentlyHeld(underlyingChoice: string, accountsData: any, selectedAccount: any): number {
    console.log('accountsData: ' + accountsData)
    console.log('trying to get shares held for ' + underlyingChoice)

    let qty = 0

    console.log('accounts data: ', accountsData)

    accountsData.forEach(account => {
      if (account.securitiesAccount.accountId === selectedAccount) {

        if (account.securitiesAccount.positions) {

          account.securitiesAccount.positions.forEach(position => {

            if (position.instrument.symbol === underlyingChoice) {
              qty = position.longQuantity;
            }
          })
        }
      }
    })

    return qty;
  }

  getPlForUnderlyingSelected(underlyingChoice: string, accountsData: any, selectedAccount: any): any {
    console.log('accountsData: ' + accountsData)
    console.log('trying to get shares held for ' + underlyingChoice)

    console.log('accounts data: ', accountsData)

    let currentUnderlyingDayPlDollars = '$0.00'
    let currentUnderlyingDayPlPercentage = '0.00%'

    accountsData.forEach(account => {
      if (account.securitiesAccount.accountId === selectedAccount) {

        console.log('checking account: ', account)
        if (account.securitiesAccount.positions) {

          account.securitiesAccount.positions.forEach(position => {

            console.log('checking position 1: ', position)
            console.log('checking equals underlyingChoice 1: ', underlyingChoice)
            console.log('checking equals symbol  1: ', position.instrument.symbol)
            if (position.instrument.symbol === underlyingChoice) {

              console.log('checking equals underlying 2: ', position)

              currentUnderlyingDayPlDollars = '$' + position.currentDayProfitLoss.toFixed(2);
              currentUnderlyingDayPlPercentage = position.currentDayProfitLossPercentage.toFixed(2) + '%';
            }
          })
        }
      }

    })

    return {
      currentUnderlyingDayPlDollars,
      currentUnderlyingDayPlPercentage
    }
  }

  getWorkingOrdersDataForTicker(currentOrders: any, selectedAccount: any, underlyingChoice: string) {

    let sharesOfUnderlyingToBuy = 0;
    let priceOfUnderlyingToBuy = 0;
    let sharesOfUnderlyingToSell = 0;
    let priceOfUnderlyingToSell = 0;

    console.log('orders: ', currentOrders)

    currentOrders.forEach(account => {
      if (account.securitiesAccount.accountId === selectedAccount) {

        if (account.securitiesAccount.orderStrategies) {

          account.securitiesAccount.orderStrategies.forEach(order => {

            if (order.status === 'QUEUED' || order.status === 'WORKING' && order.orderLegCollection) {

              order.orderLegCollection.forEach(orderDetails => {

                if (orderDetails.instrument.assetType === 'EQUITY' &&
                  orderDetails.instrument.symbol === underlyingChoice) {

                  if (orderDetails.instruction === 'SELL') {

                    sharesOfUnderlyingToSell = orderDetails.quantity;
                    priceOfUnderlyingToSell = order.price;
                  }

                  if (orderDetails.instruction === 'BUY') {
                    sharesOfUnderlyingToBuy = orderDetails.quantity;
                    priceOfUnderlyingToBuy = order.price;
                  }

                }
              })
            }
          })
        }
      }
    })

    console.log('shares to sell: ', sharesOfUnderlyingToSell)
    console.log('price to sell: ', priceOfUnderlyingToSell)

    return {
      sharesOfUnderlyingToBuy,
      priceOfUnderlyingToBuy,
      sharesOfUnderlyingToSell,
      priceOfUnderlyingToSell,
    }
  }

  getIdsOfOrdersToCancel(currentOrders: any, selectedAccount: any, underlyingChoice: string) {

    const ids = []

    currentOrders.forEach(account => {
      if (account.securitiesAccount.accountId === selectedAccount) {

        if (account.securitiesAccount.orderStrategies) {

          account.securitiesAccount.orderStrategies.forEach(order => {

            if (order.status === 'QUEUED' || order.status === 'WORKING' && order.orderLegCollection) {

              order.orderLegCollection.forEach(orderDetails => {

                if (orderDetails.instrument.assetType === 'EQUITY' &&
                  orderDetails.instrument.symbol === underlyingChoice) {

                  ids.push(order.orderId);

                }
              })
            }
          })
        }
      }
    })

    return ids;
  }

  async cancelOrders(idsOfOrdersToCancel: string[], account: string) {
    return Promise.all(idsOfOrdersToCancel.map(orderId => this.cancelOrder(orderId, account)))
  }

  async cancelOrder(orderId: string, account: string) {

    const cancelOrderHeaders = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    })

    const cancelOrderEndpoint = `${accountsBaseEndpoint}/${account}/orders/${orderId}`

    console.log('calling to cancel order: ', orderId)

    return new Promise(resolve => {
      this.http.delete(cancelOrderEndpoint, { headers: cancelOrderHeaders }).subscribe((response: any) => {

        console.log('cancelled order! ', response)

        this.refreshOrders();

        resolve()
      })
    })

  }

  async getOptionChainForSymbol(symbol: string) {

    const getOptionChainHeaders = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    })

    console.log(`getting option chain for ${symbol}! `)

    const queryParams = `?symbol=${symbol}&contractType=ALL&strikeCount=20&includeQuotes=TRUE&strategy=SINGLE&range=ALL`

    const getOptionChainEndpoint = 'https://api.tdameritrade.com/v1/marketdata/chains'

    return new Promise(resolve => {
      this.http.get(getOptionChainEndpoint + queryParams, { headers: getOptionChainHeaders }).subscribe((response: any) => {
        // console.log(`got option chain for ${symbol}! `, response)
        resolve(response)
      })
    })

  }

}
