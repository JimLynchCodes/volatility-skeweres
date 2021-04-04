import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AppRoutingModule, routes } from './app-routing.module';
import { AppComponent } from './app.component';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { ModalModule } from 'ngx-bootstrap/modal';
import { HttpClientModule } from '@angular/common/http';
import { AlertModule } from 'ngx-bootstrap/alert';
import { FooterNavComponent } from './components/footer-nav/footer-nav.component';
import { TradeBotPageComponent } from './pages/trade-bot-page/trade-bot-page.component';
import { RouterModule } from '@angular/router';
import { NewsFeedItemComponent } from './components/news-feed-item/news-feed-item.component';
import { ToastsContainerComponent } from './components/toasts-container/toasts-container.component';
import { LoginCallbackComponent } from './old-pages/login-callback/login-callback.component';
import { NotFoundComponent } from './old-pages/not-found/not-found.component';
import { EnableGainslockConfirmComponent } from './components/modals/enable-gainslock-confirm/enable-gainslock-confirm.component';
import { NgxSelectModule } from 'ngx-select-ex';
import { AskCancelOrderComponent } from './components/modals/ask-cancel-order/ask-cancel-order.component';
import { OpenOrderItemComponent } from './components/open-order-item/open-order-item.component';
import { MoneyWithCommasPipe } from './pipes/money-with-commas/money-with-commas.pipe';
import { AskPlaceTradeComponent } from './components/modals/ask-place-trade/ask-place-trade.component';
import { OwnedPositionItemComponent } from './components/owned-position-item/owned-position-item.component';
import { SuggestedOrderItemComponent } from './components/suggested-order-item/suggested-order-item.component';
import { PartialMaskAccountPipe } from './partial-mask-account.pipe';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
// NOT RECOMMENDED (Angular 9 doesn't support this kind of import)


@NgModule({
  declarations: [
    AppComponent,
    FooterNavComponent,
    TradeBotPageComponent,
    NewsFeedItemComponent,
    ToastsContainerComponent,
    LoginCallbackComponent,
    NotFoundComponent,
    EnableGainslockConfirmComponent,
    AskCancelOrderComponent,
    OpenOrderItemComponent,
    MoneyWithCommasPipe,
    AskPlaceTradeComponent,
    OwnedPositionItemComponent,
    SuggestedOrderItemComponent,
    PartialMaskAccountPipe
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    RouterModule.forRoot(routes),
    TooltipModule.forRoot(),
    ModalModule.forRoot(),
    FormsModule,
    HttpClientModule,
    AlertModule.forRoot(),
    NgxSelectModule,
    BsDropdownModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
