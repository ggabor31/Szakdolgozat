import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ProfileComponent } from './profile.component';

const routes: Routes = [
  { path: '', component: ProfileComponent } // Üres path a modul root-ján
];

@NgModule({
  imports: [CommonModule, ProfileComponent, RouterModule.forChild(routes)],
  exports: [RouterModule, ProfileComponent]
})
export class ProfileModule {}