import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// API válasz típusdefiníciója
interface OpenRouterResponse {
  id?: string;
  provider?: string;
  model?: string;
  object?: string;
  created?: number;
  choices?: Array<{
    logprobs?: null;
    finish_reason?: string;
    native_finish_reason?: string;
    index?: number;
    message: {
      role: string;
      content: string;
      refusal?: string | null;
      reasoning?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: any;
}

@Component({
  selector: 'app-movie-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movie-chat.component.html',
  styleUrls: ['./movie-chat.component.scss']
})
export class MovieChatComponent {
  userMessage = '';
  aiResponse = '';
  isLoading = false;

  private apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private apiKey = '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';

  constructor(private http: HttpClient) {}

  sendToAI() {
    if (!this.userMessage.trim()) return;

    this.isLoading = true;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    });

    const body = {
      model: 'deepseek/deepseek-r1-distill-llama-70b:free', // Ingyenes modell
      messages: [{ role: 'user', content: this.userMessage }]
    };

    this.http.post<OpenRouterResponse>(this.apiUrl, body, { headers }).subscribe({
      next: (response) => {
        console.log('API válasz:', response);
        if (response && response.choices && response.choices.length > 0 && response.choices[0].message && response.choices[0].message.content) {
          this.aiResponse = response.choices[0].message.content;
        } else {
          this.aiResponse = 'Nincs válasz az AI-tól.';
          console.error('Hiányzó vagy hibás válasz:', response);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Hiba az AI hívásnál:', err);
        this.aiResponse = 'Hiba történt az AI elérésekor: ' + (err.message || 'Ismeretlen hiba');
        this.isLoading = false;
      }
    });
  }
}