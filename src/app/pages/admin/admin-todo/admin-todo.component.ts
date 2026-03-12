import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

type AdminTodoItem = {
    id: string;
    text: string;
    completed: boolean;
    createdAt: number;
    updatedAt?: number;
};


@Component({
    selector: 'app-admin-todo',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-todo.component.html',
    styleUrls: ['./admin-todo.component.scss']
})
export class AdminTodoComponent implements OnInit {
    private readonly platformId = inject(PLATFORM_ID);

    // Versioned storage key so the stored shape can evolve without breaking old data.
    private readonly storageKey = 'adminTodo:v1';

    // Single UI source-of-truth; persisted after each mutation.
    todos: AdminTodoItem[] = [];
    newTodoText = '';

    // Edit mode state for a single row.
    editingId: string | null = null;
    editText = '';

    // Disabled when not in the browser (SSR) or when storage is blocked.
    storageEnabled = false;

    ngOnInit(): void {
        // On init, restore from localStorage when available; otherwise start empty.
        this.storageEnabled = this.isLocalStorageAvailable();
        this.todos = this.storageEnabled ? this.loadFromStorage() : [];
    }

    get totalCount(): number {
        return this.todos.length;
    }

    get remainingCount(): number {
        return this.todos.filter(todoItem => !todoItem.completed).length;
    }

    trackById(index: number, todoItem: AdminTodoItem): string {
        // Track by id to avoid re-rendering the whole list on updates.
        void index;
        return todoItem.id;
    }

    addTodo(): void {
        // Add non-empty todos; newest items go to the top.
        const text = this.newTodoText.trim();
        if (!text) {
            return;
        }

        const now = Date.now();
        const newItem: AdminTodoItem = {
            id: this.generateId(),
            text,
            completed: false,
            createdAt: now,
            updatedAt: now,
        };

        this.todos = [newItem, ...this.todos];
        this.newTodoText = '';
        this.persist();
    }

    toggleCompleted(item: AdminTodoItem): void {
        // Immutable update (map) keeps change detection predictable.
        this.todos = this.todos.map(todoItem =>
            todoItem.id === item.id
                ? {
                    ...todoItem,
                    completed: !todoItem.completed,
                    updatedAt: Date.now(),
                }
                : todoItem
        );
        this.persist();
    }

    startEdit(item: AdminTodoItem): void {
        // Copies text into a buffer so cancel can revert without losing the original.
        this.editingId = item.id;
        this.editText = item.text;
    }

    cancelEdit(): void {
        this.editingId = null;
        this.editText = '';
    }

    saveEdit(item: AdminTodoItem): void {
        // Same validation as add: trim and reject empty.
        const text = this.editText.trim();
        if (!text) {
            return;
        }

        this.todos = this.todos.map(todoItem =>
            todoItem.id === item.id
                ? {
                    ...todoItem,
                    text,
                    updatedAt: Date.now(),
                }
                : todoItem
        );

        this.cancelEdit();
        this.persist();
    }

    deleteTodo(item: AdminTodoItem): void {
        this.todos = this.todos.filter(todoItem => todoItem.id !== item.id);
        if (this.editingId === item.id) {
            this.cancelEdit();
        }
        this.persist();
    }

    clearCompleted(): void {
        this.todos = this.todos.filter(todoItem => !todoItem.completed);
        if (this.editingId && !this.todos.some(todoItem => todoItem.id === this.editingId)) {
            this.cancelEdit();
        }
        this.persist();
    }

    clearAll(): void {
        this.todos = [];
        this.cancelEdit();
        this.persist();
    }

    private persist(): void {
        // Persist the current list to localStorage.
        if (!this.storageEnabled) {
            return;
        }

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.todos));
        } catch {
            // If storage becomes unavailable (privacy mode / quota), stop writing.
            this.storageEnabled = false;
        }
    }

    private loadFromStorage(): AdminTodoItem[] {
        // Defensive parse/validation so corrupted storage doesn't crash the page.
        try {
            const rawStorageValue = localStorage.getItem(this.storageKey);
            if (!rawStorageValue) {
                return [];
            }

            const parsedValue: unknown = JSON.parse(rawStorageValue);
            if (!Array.isArray(parsedValue)) {
                return [];
            }

            return parsedValue
                .map((rawTodoItem: any): AdminTodoItem | null => {
                    const id = typeof rawTodoItem?.id === 'string' ? rawTodoItem.id : null;
                    const text = typeof rawTodoItem?.text === 'string' ? rawTodoItem.text : null;
                    const completed = typeof rawTodoItem?.completed === 'boolean' ? rawTodoItem.completed : false;
                    const createdAt = typeof rawTodoItem?.createdAt === 'number' ? rawTodoItem.createdAt : Date.now();
                    const updatedAt = typeof rawTodoItem?.updatedAt === 'number' ? rawTodoItem.updatedAt : undefined;

                    if (!id || !text) {
                        return null;
                    }

                    return { id, text, completed, createdAt, updatedAt };
                })
                .filter((todoItem: AdminTodoItem | null): todoItem is AdminTodoItem => todoItem !== null)
                .sort((leftTodoItem, rightTodoItem) => rightTodoItem.createdAt - leftTodoItem.createdAt);
        } catch {
            return [];
        }
    }

    private isLocalStorageAvailable(): boolean {
        // Guards localStorage access for SSR and browsers that block storage.
        if (!isPlatformBrowser(this.platformId)) {
            return false;
        }

        try {
            const testKey = '__adminTodoStorageTest__';
            localStorage.setItem(testKey, '1');
            localStorage.removeItem(testKey);
            return true;
        } catch {
            return false;
        }
    }

    private generateId(): string {
        // Prefer crypto-safe IDs when available; fall back to a timestamp-based id.
        const cryptoAny = globalThis.crypto as unknown as { randomUUID?: () => string } | undefined;
        if (cryptoAny?.randomUUID) {
            return cryptoAny.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
}