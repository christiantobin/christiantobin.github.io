let commandHistory = [];
let historyIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
  const inputField = document.getElementById('input');
  const outputDiv = document.getElementById('output');

  const repoLink = 'https://api.github.com/repos/christiantobin/christiantobin.github.io/dir/contents/'

  let fileSystem = {};
  fetch(repoLink)
    .then(response => response.json())
    .then(data => {
      // Build the file system object
      buildFileSystem(data, fileSystem);
    })
    .catch(error => {
      console.error('Error fetching repository contents:', error);
      // Fallback to default file system
      fileSystem = {
        'documents': {},
        'photos': {},
        'script.sh': null,
        'notes.txt': null,
      };
    });
  let commands = {
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

  commands.ls = (args, currentDir = fileSystem) => {
    let dir = navigateToDir(args, currentDir);
    if (typeof dir === 'string') {
      return dir; // Return error message
    }
    return Object.keys(dir).join('\n');
  };

  commands.cat = (args, currentDir = fileSystem) => {
    let filename = args[0];
    if (!filename) {
      return 'Usage: cat [filename]';
    }
    let file = navigateToFile(filename, currentDir);
    if (typeof file === 'string') {
      return file; // Return error message
    }
    if (file === null) {
      // Fetch file contents from GitHub
      let filePath = filename;
      let apiUrl = repoLink + `${filePath}`;
      return fetch(apiUrl)
        .then(response => response.text())
        .then(content => {
          appendOutput(content);
        })
        .catch(error => {
          appendOutput(`Error fetching file: ${error}`);
        });
    } else {
      return `cat: ${filename}: Is a directory`;
    }
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

  function buildFileSystem(contents, currentDir) {
    contents.forEach(item => {
      if (item.type === 'dir') {
        currentDir[item.name] = {};
        // Fetch contents of the directory
        fetch(item.url)
          .then(response => response.json())
          .then(data => {
            buildFileSystem(data, currentDir[item.name]);
          });
      } else if (item.type === 'file') {
        currentDir[item.name] = null; // or store file info if needed
      }
    });
  }
  commands.open = (args) => {
    let filename = args[0];
    if (!filename) {
      return 'Usage: open [filename]';
    }
    let filePath = filename;
    let fileUrl = repoLink + `${filePath}`;
    appendOutput(`Opening ${filename}...`);
    window.open(fileUrl, '_blank');
    return '';
  };
  commands.bash = (args) => {
    let scriptName = args[0];
    if (!scriptName) {
      return 'Usage: bash [script]';
    }
    let file = navigateToFile(scriptName, fileSystem);
    if (typeof file === 'string') {
      return file; // Return error message
    }
    if (file === null) {
      // Fetch script content
      let filePath = scriptName;
      let apiUrl = repoLink + `${filePath}`;
      return fetch(apiUrl)
        .then(response => response.text())
        .then(scriptContent => {
          return executeBashScript(scriptContent);
        })
        .catch(error => {
          return `Error fetching script: ${error}`;
        });
    } else {
      return `bash: ${scriptName}: Is a directory`;
    }
  };

  // Function to execute bash script content
  function executeBashScript(scriptContent) {
    let lines = scriptContent.split('\n');
    for (let line of lines) {
      let [cmd, ...args] = line.trim().split(' ');
      if (commands[cmd]) {
        let result = commands[cmd](args);
        if (result) appendOutput(result);
      } else {
        appendOutput(`bash: ${cmd}: command not found`);
      }
    }
    return '';
  }
  function processCommand(input) {
    const [cmd, ...args] = input.split(' ');
    const commandFunc = commands[cmd];

    appendOutput(`$ ${input}`);

    if (commandFunc) {
      let result = commandFunc(args);
      if (result instanceof Promise) {
        result.then(res => {
          if (res) appendOutput(res);
        }).catch(error => {
          appendOutput(`Error: ${error}`);
        });
      } else if (result) {
        appendOutput(result);
      }
    } else {
      appendOutput(`Command not found: ${cmd}`);
    }

    window.scrollTo(0, document.body.scrollHeight);
  }
  function appendOutput(text) {
    outputDiv.innerHTML += `${text}\n`;
  }

  function navigateToDir(args, currentDir) {
    let path = args[0] || '.';
    let parts = path.split('/').filter(part => part.length);
    for (let part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        // Handle parent directory logic if needed
      } else if (currentDir[part] && typeof currentDir[part] === 'object') {
        currentDir = currentDir[part];
      } else {
        return `ls: cannot access '${path}': No such file or directory`;
      }
    }
    return currentDir;
  }

  commands.lua = (args) => {
    let scriptName = args[0];
    if (!scriptName) {
      return 'Usage: lua [script]';
    }
    let file = navigateToFile(scriptName, fileSystem);
    if (typeof file === 'string') {
      return file; // Return error message
    }
    if (file === null) {
      // Fetch script content
      let filePath = scriptName;
      let apiUrl = repoLink + `${filePath}`;
      return fetch(apiUrl)
        .then(response => response.text())
        .then(scriptContent => {
          // Run the Lua script
          let lua = new Lua.State();
          lua.execute(scriptContent);
          let output = lua.getOutput(); // Implement getOutput to capture Lua output
          appendOutput(output);
        })
        .catch(error => {
          return `Error fetching script: ${error}`;
        });
    } else {
      return `lua: ${scriptName}: Is a directory`;
    }
  };
  function navigateToFile(path, currentDir) {
    let parts = path.split('/').filter(part => part.length);
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i];
      if (currentDir[part] !== undefined) {
        if (i === parts.length - 1) {
          return currentDir[part];
        } else if (typeof currentDir[part] === 'object') {
          currentDir = currentDir[part];
        } else {
          return `cat: ${path}: Not a directory`;
        }
      } else {
        return `cat: ${path}: No such file or directory`;
      }
    }
    return currentDir;
  }
});
