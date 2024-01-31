
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { GraphicsDemandComponent } from './graphics-demand/graphics-demand.component';
import { GraphicsComponent } from './graphics.component';
import { GraphicsProductionComponent } from './graphics-production/graphics-production.component';
import { GraphicsListComponent } from './graphics-list/graphics-list.component';
import { GraphicsEditComponent } from './graphics-edit/graphics-edit.component';

const routes: Routes = [
  {
    path: '',
    component: GraphicsComponent,
    children: [
      {
        path: '',
        redirectTo: 'demand',
        pathMatch: 'full'
      },
      {
        path: 'list',
        component: GraphicsListComponent
      },
      {
        path: 'edit',
        component: GraphicsEditComponent
      },
    ]
  },
  {
    path: 'bom',
    loadChildren: () => import('./graphics-bom/graphics-bom-routing.module').then(m => m.GraphicsBomRoutingModule)
  },
  {
    path: 'demand',
    component: GraphicsDemandComponent
  },
  {
    path: 'production',
    component: GraphicsProductionComponent
  },
]

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [RouterModule]
})
export class GraphicsRoutingModule { }
