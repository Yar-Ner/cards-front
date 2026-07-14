import { Component, signal, ViewChild, ElementRef, OnInit} from '@angular/core';
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
  regBool = true;
currentUser: any = null;
  protected readonly title = signal('cards');
  
  private apiUrl = 'https://cards-hfn3.onrender.com/api/';


  // Внедряем HttpClient через конструктор
  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  // Этот метод Angular вызовет сам сразу при старте приложения
ngOnInit() {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    this.currentUser = JSON.parse(savedUser);
    this.loadCards(); // Загрузит карточки только если нашли юзера в памяти!
  } else {
    this.cards = []; // Если никто не авторизован, просто оставляем пустой экран
  }
  this.cdr.detectChanges();
}

  // 1. ПОЛУЧЕНИЕ JSON С СЕРВЕРА

loadCards() {
  // Если currentUser еще равен null или у него нет id, метод просто завершится
  // и не будет отправлять некорректный запрос на сервер!
  if (!this.currentUser || !this.currentUser.id) {
    this.cards = [];
    return;
  }

  this.http.get<any>(`${this.apiUrl}cards?userId=${this.currentUser.id}`).subscribe({
    next: (data) => {
      const incomingCards = Array.isArray(data) ? data : (data.cards || []);
      this.cards = incomingCards.map((card: any) => ({
        ...card,
        flag: false
      }));
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Ошибка при загрузке карточек:', err);
    }
  });
}

login(email: string, pass: string) {
  if (!email || !pass) {
    alert('Пожалуйста, заполните почту и пароль!');
    return;
  }

  const body = { email: email, password: pass };
  
  this.http.post<any>(this.apiUrl+"login", body).subscribe({
    next: (user) => {
      // 1. Сначала строго сохраняем пользователя
      this.currentUser = user;
      localStorage.setItem('user', JSON.stringify(user));
      
      // 2. Принудительно запускаем проверку изменений, чтобы Angular обновил иконку
      this.cdr.detectChanges(); 

      // 3. Закрываем модалку
      this.RegModal(); 
      
      // 4. И только теперь загружаем его карточки, когда currentUser.id гарантированно существует
      this.loadCards(); 
    },
    error: (err) => {
      console.error(err);
      alert(err.error?.message || 'Неверный логин или пароль');
    }
  });
}

registration(name: string, email: string, pass: string) {
  if (!name || !email || !pass) {
    alert('Пожалуйста, заполните все поля для регистрации!');
    return;
  }

  const body = { username: name, email: email, password: pass };
  
  this.http.post<any>(this.apiUrl  + 'register', body).subscribe({
    next: (user) => {
      this.currentUser = user;
      localStorage.setItem('user', JSON.stringify(user));
      
      this.cdr.detectChanges();
      this.RegModal();
      this.loadCards();
    },
    error: (err) => {
      console.error(err);
      alert(err.error?.message || 'Ошибка регистрации');
    }
  });
}
logPage(){
  this.regBool = !this.regBool;
}
logout() {
    this.currentUser = null;
    localStorage.removeItem('user');
    this.cards = [];
    this.currentIndex = 0;
    
    // ПРИНУДИТЕЛЬНО ОБНОВЛЯЕМ ШАБЛОН (Аватар снова превратится в кнопку "Личный аккаунт")
    this.cdr.detectChanges(); 
  }

  // 2. ОБНОВЛЕНИЕ JSON НА СЕРВЕРЕ
  // Этот метод мы будем вызывать каждый раз, когда массив cards изменился (удалили или добавили элемент)
syncWithServer() {
  // Проверяем авторизацию перед отправкой
  if (!this.currentUser || !this.currentUser.id) return;

  // Добавляем 'cards' в путь запроса, чтобы он шел на /api/cards
  this.http.post(`${this.apiUrl}cards?userId=${this.currentUser.id}`, this.cards).subscribe({
    next: () => console.log('Синхронизировано с сервером'),
    error: (err) => {
      console.error('Ошибка синхронизации:', err);
      alert('Не удалось сохранить изменения на сервере!');
    }
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

  @ViewChild('myModal', { static: false }) modal!: ElementRef<HTMLDialogElement>;
  Modal() {
    this.showTable = !this.showTable;
    if (this.showTable) {
      this.modal.nativeElement.showModal();
    } else {
      this.modal.nativeElement.close();
    }
    
  }
  showReg = false

  @ViewChild('authDialog', { static: false }) regmodal!: ElementRef<HTMLDialogElement>;
  
  RegModal() {
    this.showReg = !this.showReg;
    if (this.showReg) {
      this.regmodal.nativeElement.showModal();
    } else {
      this.regmodal.nativeElement.close();
    }
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
