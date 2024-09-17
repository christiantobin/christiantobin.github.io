// script.js

document.addEventListener('DOMContentLoaded', () => {
  // Get references to DOM elements
  const inputField = document.getElementById('input');
  const outputDiv = document.getElementById('output');
  const promptSpan = document.getElementById('prompt');

  // Import Fengari modules
  const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;

  // Initialize the file system object
  const fileSystem = {
    'documents': {
      'resume.pdf': null,
    },
    'scripts': {
      'test.lua': null,
      'test.sh': null,
    },
    'games': {},
  };

  // Variables to keep track of the current working directory and path
  let currentDir = fileSystem;
  let currentPath = []; // Use an array to represent the path for easier manipulation

  // Base path for raw content
  const basePath = 'https://raw.githubusercontent.com/christiantobin/christiantobin.github.io/main/dir/';

  // Command history for navigation
  let commandHistory = [];
  let historyIndex = -1;

  // Function to update the prompt
  function updatePrompt() {
    const pathString = '/' + currentPath.join('/');
    promptSpan.textContent = ``;
  }

  // Initialize the prompt
  updatePrompt();

  // Run startup commands (simulate .bashrc)
  runStartupCommands();

  // Command definitions
  const commands = {
    help: () => {
      return `Available commands:
- help: Show available commands
- ls [dir]: List files and directories
- cd [dir]: Change directory
- cat [file]: View file contents
- clear: Clear the terminal
- bash [script]: Emulate running a bash script
- lua [script]: Execute a Lua script
- open [file]: Open a file (e.g., PDF, image)
`;
    },
    ls: (args) => {
      let dirToUse;
      if (!args[0] || args[0] === '.') {
        dirToUse = currentDir;
      } else {
        let result = navigateToDir(args[0]);
        if (typeof result === 'string') {
          return result; // Error message
        }
        dirToUse = result.dir;
      }
      return Object.keys(dirToUse).join('\n');
    },
    cd: (args) => {
      let path = args[0];
      if (!path) {
        // Change to root directory
        currentDir = fileSystem;
        currentPath = [];
        updatePrompt();
        return '';
      }

      let result = navigateToDir(path);
      if (typeof result === 'string') {
        return result; // Error message
      } else {
        // Update the current directory and path
        currentDir = result.dir;
        currentPath = result.path;
        updatePrompt();
        return '';
      }
    },
    cat: (args) => {
      let filename = args[0];
      if (!filename) {
        return 'Usage: cat [filename]';
      }
      let file = navigateToFile(filename);
      if (typeof file === 'string') {
        return file; // Error message
      }
      if (file === null) {
        // Fetch and display file contents
        let filePath = getFilePath(filename);
        let apiUrl = basePath + filePath;
        return fetch(apiUrl)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch ${filename}: ${response.statusText}`);
            }
            return response.text();
          })
          .then(content => {
            appendOutput(content);
          })
          .catch(error => {
            appendOutput(`Error fetching file: ${error.message}`);
          });
      } else {
        return `cat: ${filename}: Is a directory`;
      }
    },
    clear: () => {
      outputDiv.innerHTML = '';
      return '';
    },
    bash: (args) => {
      // Existing bash command implementation
    },
    lua: (args) => {
      // Existing lua command implementation
    },
    open: (args) => {
      let filename = args[0];
      if (!filename) {
        return 'Usage: open [filename]';
      }
      let filePath = getFilePath(filename);
      let fileUrl = basePath + filePath;
      appendOutput(`Opening ${filename}...`);
      window.open(fileUrl, '_blank');
      return '';
    },
  };

  // Process user input
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

  // Function to process commands
  function processCommand(input) {
    appendOutput(`$ ${input}`);

    const [cmd, ...args] = input.split(' ');
    const commandFunc = commands[cmd];

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

  // Append output to the terminal
  function appendOutput(text) {
    // Escape HTML to prevent XSS
    text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    outputDiv.innerHTML += `${text}\n`;
  }

  // Navigate to a directory based on the given path
  function navigateToDir(path) {
    let parts = path.split('/').filter(part => part.length);
    let current = path.startsWith('/') ? fileSystem : currentDir;
    let newPath = path.startsWith('/') ? [] : currentPath.slice();

    for (let part of parts) {
      if (part === '.') {
        continue;
      } else if (part === '..') {
        if (newPath.length > 0) {
          newPath.pop();
          current = getDirFromPath(newPath);
        } else {
          return 'cd: Already at root directory';
        }
      } else if (current[part] && typeof current[part] === 'object') {
        current = current[part];
        newPath.push(part);
      } else {
        return `cd: ${path}: No such file or directory`;
      }
    }
    return { dir: current, path: newPath };
  }

  // Navigate to a file based on the given path
  function navigateToFile(path) {
    let parts = path.split('/').filter(part => part.length);
    let current = path.startsWith('/') ? fileSystem : currentDir;

    for (let i = 0; i < parts.length; i++) {
      let part = parts[i];
      if (current[part] !== undefined) {
        if (i === parts.length - 1) {
          return current[part];
        } else if (typeof current[part] === 'object') {
          current = current[part];
        } else {
          return `Error: ${path} is not a directory`;
        }
      } else {
        return `Error: ${path} does not exist`;
      }
    }
    return current;
  }

  // Get directory object from path array
  function getDirFromPath(pathArray) {
    let current = fileSystem;
    for (let part of pathArray) {
      if (current[part] && typeof current[part] === 'object') {
        current = current[part];
      } else {
        return null;
      }
    }
    return current;
  }

  // Function to get the file path in the repository
  function getFilePath(filename) {
    // Build the file path based on the current directory
    let fullParts = currentPath.concat(filename.split('/').filter(Boolean));
    return fullParts.join('/');
  }

  // Function to simulate .bashrc
  function runStartupCommands() {
    // Simulate neofetch output
    const neofetchOutput = simulateNeofetch();
    appendOutput(neofetchOutput);

    // Display welcome message
    const welcomeMessage = 'Welcome user, thanks for visiting my site!\n- Christian\n\nPlease enter a command below or type \'help\' for a list of commands.';
    appendOutput(welcomeMessage);
  }

  // Function to simulate neofetch
  function simulateNeofetch() {
    const asciiArt = `
                     ++                     
                  ++****++                  
               ++**********++               
            ++****************++            
         ++*********---**===*****++         
     +++********--#-**--*+=*********+++     
   ++***********-*--=-=-*-*-************+   OS: Web-based Terminal Emulator
   +************************************+   Host: christiantobin.github.io
   +*******----------------------*******+   Kernel: JavaScript ES6
   +************************************+   Uptime: since page load
   +********--*--+#--*-+*--+#--*********+   Shell: Bash-like Emulator
   +********************************###*+   Resolution: Responsive
   +*********--*+*-*---*-*-*----**#####*+   DE: N/A
   +********+*-#-#-*---*-#-=----#######*+   WM: N/A
   +************************###########*+   Terminal: Custom Web Terminal
   +**********************#############*+   CPU: JavaScript Virtual Machine
   +*********-*#*#*--##**-#############*+   GPU: Browser Rendering Engine
   +*****************###################+   Memory: Unlimited
     ++***********##################*++     
         ++*****#################++         
            ++################++            
               ++##########++               
                  ++####++                  
                     ++                     
`;
    const systemInfo = ``;
    return asciiArt + systemInfo;
  }

  // Existing functions for bash and lua scripts remain unchanged
});
