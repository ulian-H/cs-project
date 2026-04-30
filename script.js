document.addEventListener('DOMContentLoaded', () => {
  const todoListEl = document.getElementById('todo-list');
  const titleInput = document.getElementById('title-input');
  const descInput = document.getElementById('desc-input');
  const addBtn = document.getElementById('add-btn');

  let todos = [
    { id: 1, title: 'todo1', desc: '這是 todo1 的描述。', checked: false, expanded: false },
    { id: 2, title: 'todo2', desc: '這是 todo2 的描述。', checked: false, expanded: false }
  ];
  let nextId = 3;

  function createTodoElement(todo) {
    const li = document.createElement('li');
    li.className = 'todo-item';
    li.dataset.id = todo.id;

    const row = document.createElement('div');
    row.className = 'todo-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = !!todo.checked;
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      todo.checked = checkbox.checked;
    });

    const titleDiv = document.createElement('div');
    titleDiv.className = 'todo-title';
    titleDiv.textContent = todo.title;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.textContent = '刪除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTodo(todo.id);
    });

    row.appendChild(checkbox);
    row.appendChild(titleDiv);
    row.appendChild(deleteBtn);

    row.addEventListener('click', () => {
      toggleExpand(todo.id, li);
    });

    const descDiv = document.createElement('div');
    descDiv.className = 'todo-desc';
    descDiv.textContent = todo.desc || '';

    if (todo.expanded) li.classList.add('expanded');

    li.appendChild(row);
    li.appendChild(descDiv);
    return li;
  }

  function render() {
    todoListEl.innerHTML = '';
    todos.forEach(t => {
      todoListEl.appendChild(createTodoElement(t));
    });
  }

  function addTodo() {
    const title = titleInput.value.trim();
    const desc = descInput.value.trim();
    if (!title) {
      titleInput.focus();
      return;
    }
    todos.push({ id: nextId++, title, desc, checked: false, expanded: false });
    render();
    titleInput.value = '';
    descInput.value = '';
    titleInput.focus();
    // scroll to new item
    setTimeout(() => {
      const last = todoListEl.lastElementChild;
      if (last) last.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  }

  function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    render();
  }

  function toggleExpand(id, liElem) {
    const idx = todos.findIndex(t => t.id === id);
    if (idx === -1) return;
    todos[idx].expanded = !todos[idx].expanded;
    if (liElem) liElem.classList.toggle('expanded', todos[idx].expanded);
    else render();
  }

  addBtn.addEventListener('click', addTodo);
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTodo();
    }
  });

  render();
});