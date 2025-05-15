import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ListService } from '../../services/list.service';
import { FormsModule } from '@angular/forms';

interface List {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-lists-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lists-page.component.html',
  styleUrls: ['./lists-page.component.scss']
})
export class ListsPageComponent implements OnInit {
  currentUser: any = null;
  lists: List[] = [];
  isLoading: boolean = true;
  showCreateForm: boolean = false;
  newListName: string = '';
  errorMessage: string = '';
  editingList: List | null = null;
  showConfirmDialog: boolean = false;
  confirmMessage: string = '';
  listToDelete: List | null = null;

  constructor(
    private authService: AuthService,
    private listService: ListService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.loadLists();
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        console.error('Hiba a felhasználói állapot lekérdezése közben:', err);
        this.isLoading = false;
      }
    });
  }

  loadLists() {
    this.listService.getLists(this.currentUser.uid).subscribe({
      next: (lists) => {
        this.lists = lists.filter(list => !list.isDefault);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Hiba a listák lekérdezése közben:', err);
        this.isLoading = false;
      }
    });
  }

  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
    this.newListName = '';
    this.errorMessage = '';
  }

  createList() {
    if (!this.newListName.trim()) {
      this.errorMessage = 'A lista neve nem lehet üres.';
      return;
    }

    this.listService.createList(this.currentUser.uid, this.newListName).subscribe({
      next: () => {
        this.loadLists();
        this.toggleCreateForm();
      },
      error: (err) => {
        this.errorMessage = err.message || 'Hiba a lista létrehozása közben.';
      }
    });
  }

  deleteList(list: List) {
    this.confirmMessage = `Biztosan törlöd a "${list.name}" listát?`;
    this.listToDelete = list;
    this.showConfirmDialog = true;
  }

  confirmDelete(confirmed: boolean) {
    if (confirmed && this.listToDelete) {
      this.performDelete(this.listToDelete);
    }
    this.showConfirmDialog = false;
    this.listToDelete = null;
    this.confirmMessage = '';
  }

  performDelete(list: List) {
    this.listService.deleteList(this.currentUser.uid, list.id).subscribe({
      next: () => {
        this.loadLists();
      },
      error: (err) => {
        console.error('Hiba a lista törlése közben:', err);
      }
    });
  }

  startEditing(list: List) {
    this.editingList = { ...list };
  }

  cancelEditing() {
    this.editingList = null;
    this.errorMessage = '';
  }

  saveListName() {
    if (!this.editingList || !this.editingList.name.trim()) {
      this.errorMessage = 'A lista neve nem lehet üres.';
      return;
    }

    this.listService.renameList(this.currentUser.uid, this.editingList.id, this.editingList.name).subscribe({
      next: () => {
        this.loadLists();
        this.editingList = null;
        this.errorMessage = '';
      },
      error: (err) => {
        this.errorMessage = err.message || 'Hiba a lista átnevezése közben.';
      }
    });
  }

  viewList(list: List) {
    this.router.navigate(['/list', list.id]);
  }
}