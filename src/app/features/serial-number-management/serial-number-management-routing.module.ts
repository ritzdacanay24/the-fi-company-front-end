import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Import components
import { SnUploadComponent } from './components/sn-upload/sn-upload.component';
import { SnListComponent } from './components/sn-list/sn-list.component';
import { SnAssignmentComponent } from './components/sn-assignment/sn-assignment.component';

const routes: Routes = [
  {
    path: '',
    component: SnListComponent,
    data: { title: 'Serial Number Management Dashboard' }
  },
  {
    path: 'upload',
    component: SnUploadComponent,
    data: { title: 'Upload Serial Numbers' }
  },
  {
    path: 'list',
    component: SnListComponent,
    data: { title: 'Serial Numbers List' }
  },
  {
    path: 'assignment',
    component: SnAssignmentComponent,
    data: { title: 'Assign Serial Numbers' }
  },
  {
    path: 'assignment/:serialNumber',
    component: SnAssignmentComponent,
    data: { title: 'Assign Serial Number' }
  },
  {
    path: 'generator',
    loadComponent: () => import('./components/sn-generator/sn-generator.component').then(c => c.SnGeneratorComponent),
    data: { title: 'Generate Serial Numbers' }
  },
  {
    path: 'stats',
    loadComponent: () => import('./components/sn-stats/sn-stats.component').then(c => c.SnStatsComponent),
    data: { title: 'Serial Number Statistics' }
  },

  {
    path: '**',
    redirectTo: ''
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SerialNumberManagementRoutingModule { }