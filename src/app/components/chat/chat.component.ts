import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, query, orderBy, onSnapshot } from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  @Input() movieId!: string;
  messages: ChatMessage[] = [];
  newMessage: string = '';
  user: any = null;
  isChatOpen: boolean = false;
  notificationMessage: string | null = null; // Új változó: az értesítés szövege
  showNotification: boolean = false; // Új változó: az értesítés látható-e

  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.getCurrentUser().subscribe(user => {
      this.user = user;
      if (this.movieId) {
        this.loadMessages();
      }
    });
  }

  loadMessages() {
    const messagesRef = collection(this.firestore, `chats/${this.movieId}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    onSnapshot(q, (snapshot) => {
      this.messages = snapshot.docs.map(doc => ({
        id: doc.id,
        userId: doc.data()['userId'],
        userName: doc.data()['userName'],
        message: doc.data()['message'],
        createdAt: doc.data()['createdAt']
      }));
      this.scrollToBottom();
    });
  }

  async sendMessage() {
    if (!this.user) {
      this.showNotificationMessage('Kérlek, jelentkezz be az üzenetküldéshez! 🍿');
      return;
    }

    if (!this.newMessage.trim()) {
      return;
    }

    try {
      const userData = await this.authService.getUserData(this.user.uid);
      const userName = userData?.username || 'Névtelen';

      const messageData = {
        userId: this.user.uid,
        userName: userName,
        message: this.newMessage,
        createdAt: new Date().toISOString()
      };

      const messagesRef = collection(this.firestore, `chats/${this.movieId}/messages`);
      await addDoc(messagesRef, messageData);

      this.newMessage = '';
    } catch (err) {
      console.error('Hiba az üzenet küldése közben:', err);
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 0);
  }

  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen) {
      this.scrollToBottom();
    }
  }

  // Új metódus: Értesítés megjelenítése
  showNotificationMessage(message: string) {
    this.notificationMessage = message;
    this.showNotification = true;
    // 3 másodperc után automatikusan eltűnik az értesítés
    setTimeout(() => {
      this.showNotification = false;
      this.notificationMessage = null;
    }, 3000);
  }
}