import { NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';
import type { SandboxState } from '@/types/sandbox';
import { appConfig } from '@/config/app.config';

// Store active sandbox globally
declare global {
  var activeSandbox: any;
  var sandboxData: any;
  var existingFiles: Set<string>;
  var sandboxState: SandboxState;
}

export async function POST() {
  let sandbox: any = null;

  try {
    console.log('[create-ai-sandbox] Creating base sandbox...');
    
    // Kill existing sandbox if any
    if (global.activeSandbox) {
      console.log('[create-ai-sandbox] Killing existing sandbox...');
      try {
        await global.activeSandbox.kill();
      } catch (e) {
        console.error('Failed to close existing sandbox:', e);
      }
      global.activeSandbox = null;
    }
    
    // Clear existing files tracking
    if (global.existingFiles) {
      global.existingFiles.clear();
    } else {
      global.existingFiles = new Set<string>();
    }

    // Create base sandbox - we'll set up Vite ourselves for full control
    console.log(`[create-ai-sandbox] Creating base E2B sandbox with ${appConfig.e2b.timeoutMinutes} minute timeout...`);
    sandbox = await Sandbox.create({ 
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: appConfig.e2b.timeoutMs
    });
    
    const sandboxId = (sandbox as any).sandboxId || Date.now().toString();
    const host = (sandbox as any).getHost(appConfig.e2b.vitePort);
    
    console.log(`[create-ai-sandbox] Sandbox created: ${sandboxId}`);
    console.log(`[create-ai-sandbox] Sandbox host: ${host}`);

    // Set up a basic Vite React app using Python to write files
    console.log('[create-ai-sandbox] Setting up Vite React app...');
    
    // Write all files in a single Python script to avoid multiple executions
    const setupScript = `
import os
import json

print('Setting up React app with Vite and Tailwind...')

# Create directory structure
os.makedirs('/home/user/app/src', exist_ok=True)

# Package.json
package_json = {
    "name": "sandbox-app",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
        "dev": "vite --host",
        "build": "vite build",
        "preview": "vite preview"
    },
    "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0"
    },
    "devDependencies": {
        "@vitejs/plugin-react": "^4.0.0",
        "vite": "^4.3.9",
        "tailwindcss": "^3.3.0",
        "postcss": "^8.4.31",
        "autoprefixer": "^10.4.16"
    }
}

with open('/home/user/app/package.json', 'w') as f:
    json.dump(package_json, f, indent=2)
print('✓ package.json')

# Vite config for E2B - with allowedHosts
vite_config = """import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// E2B-compatible Vite configuration
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: false,
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1']
  }
})"""

with open('/home/user/app/vite.config.js', 'w') as f:
    f.write(vite_config)
print('✓ vite.config.js')

# Tailwind config - standard without custom design tokens
tailwind_config = """/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}"""

with open('/home/user/app/tailwind.config.js', 'w') as f:
    f.write(tailwind_config)
print('✓ tailwind.config.js')

# PostCSS config
postcss_config = """export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}"""

with open('/home/user/app/postcss.config.js', 'w') as f:
    f.write(postcss_config)
print('✓ postcss.config.js')

# Index.html
index_html = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sandbox App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>"""

with open('/home/user/app/index.html', 'w') as f:
    f.write(index_html)
print('✓ index.html')

# Main.jsx
main_jsx = """import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)"""

with open('/home/user/app/src/main.jsx', 'w') as f:
    f.write(main_jsx)
print('✓ src/main.jsx')

# App.jsx with explicit Tailwind test
app_jsx = """function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <p className="text-lg text-gray-400">
          Sandbox Ready<br/>
          Start building your React app with Vite and Tailwind CSS!
        </p>
      </div>
    </div>
  )
}

export default App"""

with open('/home/user/app/src/App.jsx', 'w') as f:
    f.write(app_jsx)
print('✓ src/App.jsx')

# Index.css with explicit Tailwind directives
index_css = """@tailwind base;
@tailwind components;
@tailwind utilities;

/* Force Tailwind to load */
@layer base {
  :root {
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: rgb(17 24 39);
}"""

with open('/home/user/app/src/index.css', 'w') as f:
    f.write(index_css)
print('✓ src/index.css')

print('\\nAll files created successfully!')
`;

    // Execute the setup script
    await sandbox.runCode(setupScript);
    
    // Install dependencies
    console.log('[create-ai-sandbox] Installing dependencies...');
    await sandbox.runCode(`
import subprocess
import sys
import time
import random

print('Installing npm packages...')

def run_with_retry(command, max_retries=3, base_delay=2):
    """Run a command with exponential backoff retry logic"""
    for attempt in range(max_retries):
        try:
            print(f'Attempt {attempt + 1}/{max_retries}: {" ".join(command)}')
            result = subprocess.run(
                command,
                cwd='/home/user/app',
                capture_output=True,
                text=True,
                timeout=120  # 2 minute timeout per attempt
            )
            
            if result.returncode == 0:
                print(f'✓ Command succeeded on attempt {attempt + 1}')
                return result
            else:
                print(f'⚠ Attempt {attempt + 1} failed with exit code {result.returncode}')
                if result.stderr:
                    print(f'Error output: {result.stderr[:500]}')
                    
        except subprocess.TimeoutExpired:
            print(f'⚠ Attempt {attempt + 1} timed out')
        except Exception as e:
            print(f'⚠ Attempt {attempt + 1} failed with exception: {str(e)}')
        
        if attempt < max_retries - 1:
            delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
            print(f'Waiting {delay:.1f} seconds before retry...')
            time.sleep(delay)
    
    print(f'✗ All {max_retries} attempts failed')
    return None

# Install dependencies with retry logic
install_result = run_with_retry(['npm', 'install'])
if install_result and install_result.returncode == 0:
    print('✓ Dependencies installed successfully')
else:
    print('⚠ Warning: npm install failed after retries, but continuing...')
    `);
    
    // Start Vite dev server
    console.log('[create-ai-sandbox] Starting Vite dev server...');
    await sandbox.runCode(`
import subprocess
import os
import time
import signal

os.chdir('/home/user/app')

# Kill any existing Vite processes
try:
    subprocess.run(['pkill', '-f', 'vite'], capture_output=True, timeout=10)
except subprocess.TimeoutExpired:
    print('⚠ pkill timed out, continuing...')

time.sleep(1)

# Start Vite dev server with retry logic
env = os.environ.copy()
env['FORCE_COLOR'] = '0'
env['NODE_OPTIONS'] = '--max-old-space-size=2048'

def start_dev_server_with_retry(max_retries=3):
    """Start dev server with retry logic"""
    for attempt in range(max_retries):
        try:
            print(f'Starting dev server - attempt {attempt + 1}/{max_retries}')
            
            process = subprocess.Popen(
                ['npm', 'run', 'dev'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                preexec_fn=os.setsid if hasattr(os, 'setsid') else None
            )
            
            # Wait a bit to see if process starts successfully
            time.sleep(3)
            
            # Check if process is still running
            if process.poll() is None:
                print(f'✓ Vite dev server started successfully with PID: {process.pid}')
                return process
            else:
                stdout, stderr = process.communicate()
                print(f'⚠ Dev server failed to start on attempt {attempt + 1}')
                if stderr:
                    print(f'Error: {stderr[:500]}')
                    
        except Exception as e:
            print(f'⚠ Exception starting dev server on attempt {attempt + 1}: {str(e)}')
        
        if attempt < max_retries - 1:
            delay = 2 * (2 ** attempt) + random.uniform(0, 1)
            print(f'Waiting {delay:.1f} seconds before retry...')
            time.sleep(delay)
    
    print('✗ Failed to start dev server after all retries')
    return None

process = start_dev_server_with_retry()
if process:
    print('Waiting for server to be ready...')
else:
    print('⚠ Dev server startup failed, but sandbox is still available')
    `);
    
    // Wait for Vite to be fully ready
    await new Promise(resolve => setTimeout(resolve, appConfig.e2b.viteStartupDelay * 1.5));
    
    // Force Tailwind CSS to rebuild by touching the CSS file
    await sandbox.runCode(`
import os
import time

try:
    # Touch the CSS file to trigger rebuild
    css_file = '/home/user/app/src/index.css'
    if os.path.exists(css_file):
        os.utime(css_file, None)
        print('✓ Triggered CSS rebuild')
        
        # Also ensure PostCSS processes it
        time.sleep(3)
        print('✓ Tailwind CSS should be loaded')
    else:
        print('⚠ CSS file not found, skipping rebuild trigger')
except Exception as e:
    print(f'⚠ Failed to trigger CSS rebuild: {str(e)}')
    `);

    // Store sandbox globally
    global.activeSandbox = sandbox;
    global.sandboxData = {
      sandboxId,
      url: `https://${host}`
    };
    
    // Set extended timeout on the sandbox instance if method available
    if (typeof sandbox.setTimeout === 'function') {
      sandbox.setTimeout(appConfig.e2b.timeoutMs);
      console.log(`[create-ai-sandbox] Set sandbox timeout to ${appConfig.e2b.timeoutMinutes} minutes`);
    }
    
    // Initialize sandbox state
    global.sandboxState = {
      fileCache: {
        files: {},
        lastSync: Date.now(),
        sandboxId
      },
      sandbox,
      sandboxData: {
        sandboxId,
        url: `https://${host}`
      }
    };
    
    // Track initial files
    global.existingFiles.add('src/App.jsx');
    global.existingFiles.add('src/main.jsx');
    global.existingFiles.add('src/index.css');
    global.existingFiles.add('index.html');
    global.existingFiles.add('package.json');
    global.existingFiles.add('vite.config.js');
    global.existingFiles.add('tailwind.config.js');
    global.existingFiles.add('postcss.config.js');
    
    console.log('[create-ai-sandbox] Sandbox ready at:', `https://${host}`);
    
    return NextResponse.json({
      success: true,
      sandboxId,
      url: `https://${host}`,
      message: 'Sandbox created and Vite React app initialized'
    });

  } catch (error) {
    console.error('[create-ai-sandbox] Error:', error);
    
    // Clean up on error
    if (sandbox) {
      try {
        await sandbox.kill();
      } catch (e) {
        console.error('Failed to close sandbox on error:', e);
      }
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create sandbox',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}