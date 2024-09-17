document.addEventListener('DOMContentLoaded', () => {
  // Get references to DOM elements
  const inputField = document.getElementById('input');
  const outputDiv = document.getElementById('output');

  // Import Fengari modules
  const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;


  // Initialize the file system object
  let fileSystem = {};
  let path = 'https://api.github.com/repos/christiantobin/christiantobin.github.io/contents/dir/'
  // Fetch repository contents to build the file system
  fetch(path)
    .then(response => response.json())
    .then(data => {
      buildFileSystem(data, fileSystem);
    })
    .catch(error => {
      console.error('Error fetching repository contents:', error);
      // Fallback to default file system
      fileSystem = {
        'hello.lua': null,
        'resume.txt': null,
        'documents': {},
        'scripts': {},
      };
    });

  // Command history for navigation
  let commandHistory = [];
  let historyIndex = -1;

  // Command definitions
  const commands = {
    help: () => {
      return `Available commands:
- help: Show available commands
- ls [dir]: List files and directories
- cat [file]: View file contents
- clear: Clear the terminal
- bash [script]: Emulate running a bash script
- lua [script]: Execute a Lua script
- open [file]: Open a file (e.g., PDF, image)
`;
    },
    ls: (args) => {
      let dir = navigateToDir(args[0] || '.', fileSystem);
      if (typeof dir === 'string') {
        return dir; // Error message
      }
      return Object.keys(dir).join('\n');
    },
    cat: (args) => {
      let filename = args[0];
      if (!filename) {
        return 'Usage: cat [filename]';
      }
      let file = navigateToFile(filename, fileSystem);
      if (typeof file === 'string') {
        return file; // Error message
      }
      if (file === null) {
        // Fetch and display file contents
        let filePath = getFilePath(filename);
        let apiUrl = path + `${filePath}`;
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
      let scriptName = args[0];
      if (!scriptName) {
        return 'Usage: bash [script]';
      }
      let file = navigateToFile(scriptName, fileSystem);
      if (typeof file === 'string') {
        return file; // Error message
      }
      if (file === null) {
        // Fetch and execute bash script
        let filePath = getFilePath(scriptName);
        let apiUrl = path + `${filePath}`;
        return fetch(apiUrl)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch ${scriptName}: ${response.statusText}`);
            }
            return response.text();
          })
          .then(scriptContent => {
            executeBashScript(scriptContent);
          })
          .catch(error => {
            appendOutput(`Error fetching script: ${error.message}`);
          });
      } else {
        return `bash: ${scriptName}: Is a directory`;
      }
    },
    lua: (args) => {
      let scriptName = args[0];
      if (!scriptName) {
        return 'Usage: lua [script]';
      }
      let file = navigateToFile(scriptName, fileSystem);
      if (typeof file === 'string') {
        return file; // Error message
      }
      if (file === null) {
        // Fetch and execute Lua script
        let filePath = getFilePath(scriptName);
        let apiUrl = path + `${filePath}`;
        return fetch(apiUrl)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch ${scriptName}: ${response.statusText}`);
            }
            return response.text();
          })
          .then(scriptContent => {
            return executeLuaScript(scriptContent);
          })
          .catch(error => {
            return `Error fetching script: ${error.message}`;
          });
      } else {
        return `lua: ${scriptName}: Is a directory`;
      }
    },
    open: (args) => {
      let filename = args[0];
      if (!filename) {
        return 'Usage: open [filename]';
      }
      let filePath = getFilePath(filename);
      let fileUrl = path + `${filePath}`;
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

  // Append output to the terminal
  function appendOutput(text) {
    // Escape HTML to prevent XSS
    text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    outputDiv.innerHTML += `${text}\n`;
  }

  // Build the file system object from GitHub repository contents
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
        currentDir[item.name] = null; // File placeholder
      }
    });
  }

  // Navigate to a directory based on the given path
  function navigateToDir(path, currentDir) {
    let parts = path.split('/').filter(part => part.length);
    for (let part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        // Handle parent directory logic if needed
        return 'Error: Parent directory navigation not supported.';
      } else if (currentDir[part] && typeof currentDir[part] === 'object') {
        currentDir = currentDir[part];
      } else {
        return `ls: cannot access '${path}': No such file or directory`;
      }
    }
    return currentDir;
  }

  // Navigate to a file based on the given path
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
          return `Error: ${path} is not a directory`;
        }
      } else {
        return `Error: ${path} does not exist`;
      }
    }
    return currentDir;
  }

  // Get the file path in the repository
  function getFilePath(filename) {
    // Adjust this function based on your repository structure
    return filename;
  }

  // Execute a bash script (simple emulation)
  function executeBashScript(scriptContent) {
    let lines = scriptContent.split('\n');
    lines.forEach(line => {
      let [cmd, ...args] = line.trim().split(' ');
      if (commands[cmd]) {
        let result = commands[cmd](args);
        if (result instanceof Promise) {
          result.then(res => {
            if (res) appendOutput(res);
          });
        } else if (result) {
          appendOutput(result);
        }
      } else {
        appendOutput(`bash: ${cmd}: command not found`);
      }
    });
  }


  // Execute a Lua script using Fengari
  function executeLuaScript(scriptContent) {
    return new Promise((resolve) => {
      try {
        // Create a new Lua state
        const L = lauxlib.luaL_newstate();

        // Open standard libraries
        lualib.luaL_openlibs(L);

        let output = '';

        // Redirect print function
        lua.lua_getglobal(L, to_luastring('_G'));
        lua.lua_pushstring(L, to_luastring('print'));
        lua.lua_pushcfunction(L, (L) => {
          const n = lua.lua_gettop(L);
          for (let i = 1; i <= n; i++) {
            const value = to_jsstring(lua.lua_tostring(L, i));
            output += value + ' ';
          }
          output += '\n';
          return 0;
        });
        lua.lua_settable(L, -3);

        // Load and execute the script
        const status = lauxlib.luaL_loadstring(L, to_luastring(scriptContent));

        if (status === lua.LUA_OK) {
          const callStatus = lua.lua_pcall(L, 0, lua.LUA_MULTRET, 0);
          if (callStatus === lua.LUA_OK) {
            resolve(output);
          } else {
            const error = to_jsstring(lua.lua_tostring(L, -1));
            resolve(`Lua error: ${error}`);
          }
        } else {
          const error = to_jsstring(lua.lua_tostring(L, -1));
          resolve(`Lua error: ${error}`);
        }
      } catch (error) {
        resolve(`Error executing Lua script: ${error.message}`);
      }
    });
  }
});
