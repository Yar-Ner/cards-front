import { Component, signal, ViewChild, ElementRef, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http'; // <-- Импортируем клиент
import { ChangeDetectorRef } from '@angular/core';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit { // Реализуем OnInit для автозагрузки
  currentIndex = 0;
  showTable = false;
  showAdd = false;
  cards: any[] = []; // Изначально массив пустой
  protected readonly title = signal('cards');
  
  private apiUrl = 'https://cards-hfn3.onrender.com/api/cards';

  // Внедряем HttpClient через конструктор
  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  // Этот метод Angular вызовет сам сразу при старте приложения
  ngOnInit() {
    this.loadCards();
  }

  // 1. ПОЛУЧЕНИЕ JSON С СЕРВЕРА
loadCards() {
  this.http.get<any>(this.apiUrl).subscribe({
    next: (data) => {
      // 1. Извлекаем массив (с проверкой, что это массив)
      const incomingCards = Array.isArray(data) ? data : (data.cards || []);
      
      // 2. Проходимся по каждой карточке и принудительно ставим flag = false
      this.cards = incomingCards.map((card: any) => ({
        ...card,       // Копируем все существующие поля (id, question, answer)
        flag: false    // Явно задаем или сбрасываем флаг в false
      }));

      this.cdr.detectChanges(); // Синхронизируем с HTML шаблоном
    },
  });
}

  // 2. ОБНОВЛЕНИЕ JSON НА СЕРВЕРЕ
  // Этот метод мы будем вызывать каждый раз, когда массив cards изменился (удалили или добавили элемент)
  syncWithServer() {
    this.http.post(this.apiUrl, this.cards).subscribe({
      next: () => console.log(''),
    });
  }

  next() {
    if (this.cards.length === 0) return;
    
    if (this.currentIndex + 1 === this.cards.length) {
      this.currentIndex = 0;
    } else {
      this.currentIndex = this.currentIndex + 1;
    }
    this.cards[this.currentIndex].flag = false;
  }

  @ViewChild('myModal') modal!: ElementRef<HTMLDialogElement>;
  Modal() {
    if (this.showTable) {
      this.modal.nativeElement.showModal();
    } else {
      this.modal.nativeElement.close();
    }
    this.showTable = !this.showTable;
  }

  delItem(id: any) {
    this.cards.splice(id, 1);
    this.cards.forEach((card, i) => {
        card.id = i + 1;
      });

      // 3. Отправляем красивый массив без дыр на сервер
      this.syncWithServer(); 
      
      // Корректируем текущий индекс теста, чтобы не улететь за границы
      if (this.currentIndex >= this.cards.length && this.cards.length > 0) {
        this.currentIndex = this.cards.length - 1;
      }
    }

  showaddItem() {
    this.showAdd = !this.showAdd;
  }

  idLastItem: number = 0;
  
  // Допустим, это метод, который вызывается при отправке формы добавления
  addItem(newQuestion: string, newAnswer: string) {
    // Вычисляем ID для новой карточки безопасным способом (.at(-1))
    const lastItem = this.cards.at(-1);
    const nextId = lastItem ? lastItem.id + 1 : 1;

    const newCard = {
      id: nextId,
      question: newQuestion,
      answer: newAnswer,
      flag: false
    };

    this.cards.push(newCard);
    this.syncWithServer(); // <-- Отправляем обновленный массив на сервер для перезаписи JSON
    this.showAdd = false;
  }

  reverse() {
    if (this.cards[this.currentIndex]) {
      this.cards[this.currentIndex].flag = !this.cards[this.currentIndex].flag;
    }
  }
}