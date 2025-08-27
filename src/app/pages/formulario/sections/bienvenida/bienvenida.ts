import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-bienvenida',
  standalone: true,
  imports: [],
  templateUrl: './bienvenida.html',
  styleUrls: ['./bienvenida.scss'],
})
export class Bienvenida {
  @Output() comenzar = new EventEmitter<void>();

  iniciar() {
    this.comenzar.emit();
  }
}
