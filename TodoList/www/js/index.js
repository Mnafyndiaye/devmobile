/* global window, document */

(function () {
  var STORAGE_KEY = 'todo-items';
  var THEME_KEY = 'todo-theme';
  var todos = [];
  var currentFilter = 'all';

  // --- HTML ELEMENT REFERENCES ---
  var themeToggleBtn = document.getElementById('theme-toggle');
  var todoForm = document.getElementById('todo-form');
  var todoInput = document.getElementById('todo-input');
  var todoPriority = document.getElementById('todo-priority');
  var todoCategory = document.getElementById('todo-category');
  var todoDueDate = document.getElementById('todo-duedate');

  var todoSearch = document.getElementById('todo-search');
  var todoList = document.getElementById('todo-list');
  var todoEmpty = document.getElementById('todo-empty');
  var clearCompletedBtn = document.getElementById('clear-completed');

  var progressText = document.getElementById('progress-text');
  var progressPercent = document.getElementById('progress-percent');
  var progressBarFill = document.getElementById('progress-bar-fill');

  // Modal Edit Dialog Elements
  var editModal = document.getElementById('edit-modal');
  var modalForm = document.getElementById('modal-form');
  var editIndex = document.getElementById('edit-index');
  var editInput = document.getElementById('edit-input');
  var editPriority = document.getElementById('edit-priority');
  var editCategory = document.getElementById('edit-category');
  var editDueDate = document.getElementById('edit-duedate');
  var btnEditCancel = document.getElementById('btn-edit-cancel');

  // Set minimum date for input to today's date
  var todayISO = new Date().toISOString().split('T')[0];
  if (todoDueDate) todoDueDate.min = todayISO;
  if (editDueDate) editDueDate.min = todayISO;

  // --- THEME MANAGEMENT ---
  function initTheme() {
    var storedTheme = window.localStorage.getItem(THEME_KEY);
    // Default to dark theme if not set
    var activeTheme = storedTheme || 'dark';
    document.documentElement.setAttribute('data-theme', activeTheme);
    updateThemeIcon(activeTheme);
  }

  function toggleTheme() {
    var currentTheme = document.documentElement.getAttribute('data-theme');
    var nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    window.localStorage.setItem(THEME_KEY, nextTheme);
    updateThemeIcon(nextTheme);
  }

  function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    var icon = themeToggleBtn.querySelector('i');
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-moon';
    } else {
      icon.className = 'fa-solid fa-sun';
    }
  }

  // --- DATA MANAGEMENT ---
  function loadTodos() {
    var stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      todos = [];
      return;
    }

    try {
      var rawTodos = JSON.parse(stored) || [];
      // Upgrade structure if legacy format exists
      todos = rawTodos.map(function (item) {
        if (typeof item === 'string') {
          return createTodoObject(item);
        }
        return {
          id: item.id || generateId(),
          text: item.text || '',
          completed: !!item.completed,
          priority: item.priority || 'medium',
          category: item.category || 'personal',
          dueDate: item.dueDate || '',
          createdAt: item.createdAt || Date.now()
        };
      });
    } catch (e) {
      todos = [];
    }
  }

  // --- RENDERING ENGINE ---
  function renderTodos() {
    if (!todoList) return;
    todoList.innerHTML = '';

    var searchQuery = todoSearch ? todoSearch.value.trim().toLowerCase() : '';

    // Filter tasks
    var filtered = todos.filter(function (todo) {
      // Filter by tab
      if (currentFilter === 'active' && todo.completed) return false;
      if (currentFilter === 'completed' && !todo.completed) return false;

      // Filter by search text
      if (searchQuery) {
        var matchText = todo.text.toLowerCase().indexOf(searchQuery) !== -1;
        var matchCategory = todo.category.toLowerCase().indexOf(searchQuery) !== -1;
        var matchPriority = todo.priority.toLowerCase().indexOf(searchQuery) !== -1;
        return matchText || matchCategory || matchPriority;
      }

      return true;
    });

    // Sort: Uncompleted high-to-low priority first, then completed at the end
    var priorityWeights = { high: 3, medium: 2, low: 1 };
    filtered.sort(function (a, b) {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      if (!a.completed) {
        var pDiff = priorityWeights[b.priority] - priorityWeights[a.priority];
        if (pDiff !== 0) return pDiff;
      }
      return b.createdAt - a.createdAt;
    });

    if (filtered.length === 0) {
      if (todoEmpty) todoEmpty.style.display = 'flex';
      updateProgress();
      return;
    }

    if (todoEmpty) todoEmpty.style.display = 'none';

    filtered.forEach(function (todo) {
      var li = document.createElement('li');
      li.className = todo.completed ? 'todo-item completed' : 'todo-item';
      li.setAttribute('data-id', todo.id);
      li.setAttribute('data-priority', todo.priority);

      // Custom checkbox
      var leftDiv = document.createElement('div');
      leftDiv.className = 'todo-item-left';

      var checkboxLabel = document.createElement('label');
      checkboxLabel.className = 'custom-checkbox';

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-toggle';
      checkbox.checked = todo.completed;

      var checkmark = document.createElement('span');
      checkmark.className = 'checkmark';

      checkboxLabel.appendChild(checkbox);
      checkboxLabel.appendChild(checkmark);
      leftDiv.appendChild(checkboxLabel);

      // Text & Metadata info
      var contentDiv = document.createElement('div');
      contentDiv.className = 'todo-item-content';

      var textSpan = document.createElement('span');
      textSpan.className = 'todo-item-text';
      textSpan.textContent = todo.text;
      contentDiv.appendChild(textSpan);

      // Metadata Row
      var metaDiv = document.createElement('div');
      metaDiv.className = 'todo-item-meta';

      // Priority Badge
      var priorityBadge = document.createElement('span');
      priorityBadge.className = 'badge badge-priority-' + todo.priority;
      priorityBadge.innerHTML = '<i class="fa-solid fa-circle" style="font-size:0.5rem"></i> ' + todo.priority;
      metaDiv.appendChild(priorityBadge);

      // Category Badge
      var catBadge = document.createElement('span');
      catBadge.className = 'badge badge-cat-' + todo.category;
      var catIcon = 'fa-tag';
      if (todo.category === 'work') catIcon = 'fa-briefcase';
      if (todo.category === 'personal') catIcon = 'fa-user';
      if (todo.category === 'shopping') catIcon = 'fa-cart-shopping';
      if (todo.category === 'ideas') catIcon = 'fa-lightbulb';
      catBadge.innerHTML = '<i class="fa-solid ' + catIcon + '"></i> ' + todo.category;
      metaDiv.appendChild(catBadge);

      // Due Date Badge
      if (todo.dueDate) {
        var dateBadge = document.createElement('span');
        var isTaskOverdue = isOverdue(todo.dueDate) && !todo.completed;
        dateBadge.className = 'badge badge-date' + (isTaskOverdue ? ' overdue' : '');

        var dateIcon = isTaskOverdue ? 'fa-triangle-exclamation' : 'fa-calendar-days';
        dateBadge.innerHTML = '<i class="fa-solid ' + dateIcon + '"></i> ' + formatDate(todo.dueDate);
        metaDiv.appendChild(dateBadge);
      }

      contentDiv.appendChild(metaDiv);
      leftDiv.appendChild(contentDiv);
      li.appendChild(leftDiv);

      // Action Buttons
      var actionsDiv = document.createElement('div');
      actionsDiv.className = 'todo-item-actions';

      var editBtn = document.createElement('button');
      editBtn.className = 'action-btn action-btn-edit';
      editBtn.title = 'Edit Task';
      editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
      actionsDiv.appendChild(editBtn);

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'action-btn action-btn-delete';
      deleteBtn.title = 'Delete Task';
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
      actionsDiv.appendChild(deleteBtn);

      li.appendChild(actionsDiv);
      todoList.appendChild(li);
    });

    updateProgress();
  }

  function saveTodos() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  function createTodoObject(text, priority, category, dueDate) {
    return {
      id: generateId(),
      text: text,
      completed: false,
      priority: priority || 'medium',
      category: category || 'personal',
      dueDate: dueDate || '',
      createdAt: Date.now()
    };
  }

  // --- PROGRESS TRACKING ---
  function updateProgress() {
    var total = todos.length;
    var completed = todos.filter(function (t) { return t.completed; }).length;

    if (progressText) {
      progressText.textContent = completed + ' of ' + total + ' tasks completed';
    }

    var percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    if (progressPercent) {
      progressPercent.textContent = percentage + '%';
    }

    if (progressBarFill) {
      progressBarFill.style.width = percentage + '%';
    }
  }

  // --- CONFETTI ANIMATION CELEBRATION ---
  function triggerConfetti() {
    var canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var particles = [];
    var colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (var i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height - 20,
        r: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.08 + 0.02,
        tiltAngle: 0,
        speed: Math.random() * 4 + 3
      });
    }

    var animationFrameId;
    var startTime = Date.now();
    var duration = 3000;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var active = false;

      particles.forEach(function (p) {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += p.speed;
        p.x += Math.sin(p.tiltAngle) * 0.5;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();

        if (p.y < canvas.height) {
          active = true;
        }
      });

      if (active && (Date.now() - startTime < duration)) {
        animationFrameId = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationFrameId);
      }
    }

    window.addEventListener('resize', function () {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }, { once: true });

    draw();
  }

  // --- DATE HELPERS ---
  function isOverdue(dueDateString) {
    if (!dueDateString) return false;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var dueDate = new Date(dueDateString);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    var parts = dateString.split('-');
    if (parts.length === 3) {
      var date = new Date(parts[0], parts[1] - 1, parts[2]);
      var options = { month: 'short', day: 'numeric' };
      if (date.getFullYear() !== new Date().getFullYear()) {
        options.year = 'numeric';
      }
      return date.toLocaleDateString(undefined, options);
    }
    return dateString;
  }

  // --- ACTIONS ---
  function addTodo(text, priority, category, dueDate) {
    var newTodo = createTodoObject(text, priority, category, dueDate);
    todos.unshift(newTodo);
    saveTodos();
    renderTodos();
  }

  function toggleTodo(id) {
    var index = todos.findIndex(function (t) { return t.id === id; });
    if (index === -1) return;

    var wasCompleted = todos[index].completed;
    todos[index].completed = !todos[index].completed;
    saveTodos();
    renderTodos();

    // Celebration: if task became completed and all tasks are completed, trigger confetti!
    if (!wasCompleted && todos.length > 0 && todos.every(function (t) { return t.completed; })) {
      triggerConfetti();
    }
  }

  function deleteTodo(id) {
    var index = todos.findIndex(function (t) { return t.id === id; });
    if (index === -1) return;

    todos.splice(index, 1);
    saveTodos();
    renderTodos();
  }

  function openEditModal(id) {
    var index = todos.findIndex(function (t) { return t.id === id; });
    if (index === -1) return;

    var todo = todos[index];
    editIndex.value = id;
    editInput.value = todo.text;
    editPriority.value = todo.priority;
    editCategory.value = todo.category;
    editDueDate.value = todo.dueDate;

    if (editModal) editModal.classList.add('active');
    editInput.focus();
  }

  function closeEditModal() {
    if (editModal) editModal.classList.remove('active');
    modalForm.reset();
  }

  function saveEdit(id, text, priority, category, dueDate) {
    var index = todos.findIndex(function (t) { return t.id === id; });
    if (index === -1) return;

    todos[index].text = text;
    todos[index].priority = priority;
    todos[index].category = category;
    todos[index].dueDate = dueDate;

    saveTodos();
    renderTodos();
    closeEditModal();
  }

  function clearCompleted() {
    todos = todos.filter(function (t) { return !t.completed; });
    saveTodos();
    renderTodos();
  }

  // --- INITIALIZATION & EVENT BINDINGS ---
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    loadTodos();
    renderTodos();

    // Theme Toggle Click
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Submit New Task Form
    if (todoForm) {
      todoForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var val = todoInput.value.trim();
        if (!val) return;

        addTodo(
          val,
          todoPriority.value,
          todoCategory.value,
          todoDueDate.value
        );

        // Reset text input and date, keep selections
        todoInput.value = '';
        todoDueDate.value = '';
        todoInput.focus();
      });
    }

    // Task Item Events (Delegated)
    if (todoList) {
      // Checkbox click
      todoList.addEventListener('change', function (event) {
        if (event.target.classList.contains('todo-toggle')) {
          var id = event.target.closest('li').getAttribute('data-id');
          toggleTodo(id);
        }
      });

      // Edit / Delete Buttons click
      todoList.addEventListener('click', function (event) {
        var button = event.target.closest('.action-btn');
        if (!button) return;

        var id = button.closest('li').getAttribute('data-id');
        if (button.classList.contains('action-btn-edit')) {
          openEditModal(id);
        } else if (button.classList.contains('action-btn-delete')) {
          deleteTodo(id);
        }
      });

      // Swipe gestures using jQuery
      var touchStartX = 0;
      var touchStartY = 0;
      var touchEndX = 0;
      var touchEndY = 0;

      $('#todo-list').on('touchstart', 'li', function (e) {
        var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      });

      $('#todo-list').on('touchend', 'li', function (e) {
        var touch = e.originalEvent.changedTouches[0] || e.originalEvent.touches[0];
        touchEndX = touch.clientX;
        touchEndY = touch.clientY;

        var diffX = touchEndX - touchStartX;
        var diffY = touchEndY - touchStartY;

        // Swipe threshold is 60px horizontally and less than 40px vertically
        if (Math.abs(diffX) > 60 && Math.abs(diffY) < 40) {
          var id = $(this).attr('data-id');
          if (diffX < 0) {
            // Swipe Left -> Delete task with smooth animation
            var $li = $(this);
            $li.css({
              'transform': 'translateX(-100px)',
              'opacity': '0',
              'transition': 'all 0.3s ease'
            });
            setTimeout(function () {
              deleteTodo(id);
            }, 300);
          } else {
            // Swipe Right -> Check/uncheck task as done
            toggleTodo(id);
          }
        }
      });
    }

    // Search input typing
    if (todoSearch) {
      todoSearch.addEventListener('input', renderTodos);
    }

    // Filter tabs click
    var tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        currentFilter = tab.getAttribute('data-filter');
        renderTodos();
      });
    });

    // Clear completed button click
    if (clearCompletedBtn) {
      clearCompletedBtn.addEventListener('click', clearCompleted);
    }

    // Modal Events
    if (btnEditCancel) {
      btnEditCancel.addEventListener('click', closeEditModal);
    }

    if (modalForm) {
      modalForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var id = editIndex.value;
        var val = editInput.value.trim();
        if (!val || !id) return;

        saveEdit(
          id,
          val,
          editPriority.value,
          editCategory.value,
          editDueDate.value
        );
      });
    }

    // Close modal on overlay click
    if (editModal) {
      editModal.addEventListener('click', function (event) {
        if (event.target === editModal) {
          closeEditModal();
        }
      });
    }
  });
})();
