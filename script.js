
let commandHistory = [];
let historyIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
  const inputField = document.getElementById('input');
  const outputDiv = document.getElementById('output');

  const fileSystem = {
    'documents': {},
    'photos': {},
    'script.sh': null,
    'notes.txt': null,
  };

  const commands = {
    help: () => {
      return `Available commands:
- help: Show available commands
- ls: List files and directories
- clear: Clear the terminal`;
    },
    ls: () => {
      return Object.keys(fileSystem).join('\n');
    },
    clear: () => {
      outputDiv.innerHTML = '';
      return '';
    },
  };

  inputField.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const inputValue = inputField.value.trim();
      if (inputValue) {
        commandHistory.push(inputValue);
        historyIndex = commandHistory.length;
        processCommand(inputValue);
      }
      inputField.value = '';
    } else if (event.key === 'ArrowUp') {
      if (historyIndex > 0) {
        historyIndex--;
        inputField.value = commandHistory[historyIndex];
      }
      event.preventDefault();
    } else if (event.key === 'ArrowDown') {
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        inputField.value = commandHistory[historyIndex];
      } else {
        historyIndex = commandHistory.length;
        inputField.value = '';
      }
      event.preventDefault();
    }
  });
  function processCommand(input) {
    const [cmd, ...args] = input.split(' ');
    const commandFunc = commands[cmd];

    appendOutput(`$ ${input}`);

    if (commandFunc) {
      const result = commandFunc(args);
      if (result) appendOutput(result);
    } else {
      appendOutput(`Command not found: ${cmd}`);
    }

    window.scrollTo(0, document.body.scrollHeight);
  }

  function appendOutput(text) {
    outputDiv.innerHTML += `${text}\n`;
  }
});
