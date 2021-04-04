import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TradeBotPageComponent } from './pages/trade-bot-page/trade-bot-page.component';
import { LoginCallbackComponent } from './old-pages/login-callback/login-callback.component';
import { NotFoundComponent } from './old-pages/not-found/not-found.component';

export const routes: Routes = [
  { path: 'trade-bot', component: TradeBotPageComponent },
  { path: 'not-found', component: NotFoundComponent },
  { path: 'login-callback', component: LoginCallbackComponent },
  { path: '', redirectTo: '/trade-bot', pathMatch: 'full' },
  { path: '**', redirectTo: '/not-found', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
