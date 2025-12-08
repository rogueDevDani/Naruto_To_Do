import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TodoComponent } from './todo.component'; // ✅ FIXED IMPORT

describe('TodoComponent', () => {
  let component: TodoComponent;
  let fixture: ComponentFixture<TodoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoComponent] // if standalone
      // OR declarations: [TodoComponent] if not standalone
    })
      .compileComponents();

    fixture = TestBed.createComponent(TodoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
